// Web Crypto API helpers for Edge Runtime compatibility
async function createHash(algorithm: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomBytes(size: number): string {
  const array = new Uint8Array(size);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}
import { EventEmitter } from 'events';
import {
  Address,
  Hash,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  keccak256,
  concat,
  toBytes,
  hexToBytes
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from '@/lib/wagmi';

// Multi-signature operation types
export type MultiSigOperation = 
  | 'EMERGENCY_PAUSE'
  | 'EMERGENCY_UNPAUSE'
  | 'WITHDRAW_FUNDS'
  | 'UPDATE_OPERATORS'
  | 'UPDATE_LIMITS'
  | 'CHANGE_PARAMETERS'
  | 'UPGRADE_CONTRACT';

// Multi-signature proposal status
export type ProposalStatus = 
  | 'pending'
  | 'approved'
  | 'executed'
  | 'rejected'
  | 'expired'
  | 'cancelled';

// Signer role types
export type SignerRole = 
  | 'owner'
  | 'operator'
  | 'security'
  | 'emergency'
  | 'auditor';

// Multi-signature configuration
interface MultiSigConfig {
  threshold: number;
  signers: Address[];
  roles: Record<Address, SignerRole[]>;
  timelock: number; // seconds
  operationLimits: Record<MultiSigOperation, {
    requiredSigners: number;
    timelock: number;
    dailyLimit?: bigint;
    restrictions?: string[];
  }>;
}

// Multi-signature proposal
interface MultiSigProposal {
  id: string;
  operation: MultiSigOperation;
  target: Address;
  value: bigint;
  data: Hash;
  description: string;
  proposer: Address;
  createdAt: number;
  executionTime: number;
  expiresAt: number;
  status: ProposalStatus;
  signatures: Map<Address, {
    signature: Hash;
    timestamp: number;
    message: Hash;
  }>;
  requiredSignatures: number;
  metadata: Record<string, any>;
}

// Signature verification result
interface SignatureVerification {
  isValid: boolean;
  signer: Address;
  message: Hash;
  error?: string;
}

// Event types
interface MultiSigEvents {
  'proposal:created': (proposal: MultiSigProposal) => void;
  'proposal:signed': (proposalId: string, signer: Address) => void;
  'proposal:approved': (proposal: MultiSigProposal) => void;
  'proposal:executed': (proposal: MultiSigProposal, txHash: Hash) => void;
  'proposal:rejected': (proposal: MultiSigProposal, reason: string) => void;
  'proposal:expired': (proposal: MultiSigProposal) => void;
  'signer:added': (signer: Address, roles: SignerRole[]) => void;
  'signer:removed': (signer: Address) => void;
  'config:updated': (newConfig: Partial<MultiSigConfig>) => void;
}

export class MultiSigManager extends EventEmitter {
  private static instance: MultiSigManager;
  private publicClient;
  private walletClients = new Map<Address, any>();
  private config: MultiSigConfig;
  private proposals = new Map<string, MultiSigProposal>();
  private dailyLimits = new Map<string, { used: bigint; resetTime: number }>();
  private isInitialized = false;

  constructor() {
    super();
    this.publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(monadTestnet.rpcUrls.default.http[0])
    });
    
    // Default configuration
    this.config = {
      threshold: 3,
      signers: [],
      roles: {},
      timelock: 86400, // 24 hours
      operationLimits: {
        EMERGENCY_PAUSE: {
          requiredSigners: 2,
          timelock: 0 // No timelock for emergency
        },
        EMERGENCY_UNPAUSE: {
          requiredSigners: 3,
          timelock: 3600 // 1 hour
        },
        WITHDRAW_FUNDS: {
          requiredSigners: 4,
          timelock: 86400, // 24 hours
          dailyLimit: parseEther('1000')
        },
        UPDATE_OPERATORS: {
          requiredSigners: 3,
          timelock: 43200 // 12 hours
        },
        UPDATE_LIMITS: {
          requiredSigners: 3,
          timelock: 21600 // 6 hours
        },
        CHANGE_PARAMETERS: {
          requiredSigners: 3,
          timelock: 43200 // 12 hours
        },
        UPGRADE_CONTRACT: {
          requiredSigners: 5,
          timelock: 172800 // 48 hours
        }
      }
    };
  }

  static getInstance(): MultiSigManager {
    if (!MultiSigManager.instance) {
      MultiSigManager.instance = new MultiSigManager();
    }
    return MultiSigManager.instance;
  }

  async initialize(
    signers: Address[],
    threshold: number,
    roles?: Record<Address, SignerRole[]>
  ): Promise<boolean> {
    try {
      if (signers.length < 3) {
        throw new Error('Multi-signature wallet requires at least 3 signers');
      }
      
      if (threshold > signers.length || threshold < 2) {
        throw new Error('Invalid threshold value');
      }

      this.config.signers = signers;
      this.config.threshold = threshold;
      
      if (roles) {
        this.config.roles = roles;
      } else {
        // Assign default roles
        this.config.roles = {};
        signers.forEach((signer, index) => {
          if (index === 0) {
            this.config.roles[signer] = ['owner', 'operator', 'security'];
          } else if (index < 3) {
            this.config.roles[signer] = ['operator', 'security'];
          } else {
            this.config.roles[signer] = ['security'];
          }
        });
      }

      this.isInitialized = true;
      console.log(`🔐 Multi-signature wallet initialized with ${signers.length} signers, threshold: ${threshold}`);
      return true;
    } catch (error) {
      console.error('Multi-signature initialization failed:', error);
      return false;
    }
  }

  async createProposal(
    operation: MultiSigOperation,
    target: Address,
    value: bigint,
    data: Hash,
    description: string,
    proposerPrivateKey: Hash,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      const proposerAccount = privateKeyToAccount(proposerPrivateKey);
      const proposer = proposerAccount.address;
      
      if (!this.config.signers.includes(proposer)) {
        throw new Error('Proposer is not a valid signer');
      }

      const operationConfig = this.config.operationLimits[operation];
      if (!operationConfig) {
        throw new Error('Invalid operation type');
      }

      const proposalId = await this.generateProposalId(operation, target, value, data, proposer);
      const now = Date.now();
      const executionTime = now + (operationConfig.timelock * 1000);
      const expiresAt = executionTime + (7 * 24 * 60 * 60 * 1000);

      const proposal: MultiSigProposal = {
        id: proposalId,
        operation,
        target,
        value,
        data,
        description,
        proposer,
        createdAt: now,
        executionTime,
        expiresAt,
        status: 'pending',
        signatures: new Map(),
        requiredSignatures: operationConfig.requiredSigners,
        metadata
      };

      this.proposals.set(proposalId, proposal);
      this.emit('proposal:created', proposal);
      
      return proposalId;
    } catch (error: any) {
      console.error('Create proposal failed:', error);
      throw error;
    }
  }

  async signProposal(proposalId: string, privateKey: Hash): Promise<boolean> {
    try {
      const proposal = this.proposals.get(proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      const signerAccount = privateKeyToAccount(privateKey);
      const signer = signerAccount.address;
      
      if (!this.config.signers.includes(signer)) {
        throw new Error('Invalid signer');
      }

      const messageHash = this.createMessageHash(proposal);
      const signature = await signerAccount.signMessage({
        message: { raw: hexToBytes(messageHash) }
      });

      proposal.signatures.set(signer, {
        signature,
        timestamp: Date.now(),
        message: messageHash
      });

      if (proposal.signatures.size >= proposal.requiredSignatures) {
        proposal.status = 'approved';
        this.emit('proposal:approved', proposal);
      }

      this.proposals.set(proposalId, proposal);
      this.emit('proposal:signed', proposalId, signer);
      
      return true;
    } catch (error: any) {
      console.error('Sign proposal failed:', error);
      return false;
    }
  }

  getProposal(proposalId: string): MultiSigProposal | null {
    return this.proposals.get(proposalId) || null;
  }

  getAllProposals(): MultiSigProposal[] {
    return Array.from(this.proposals.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getConfiguration(): MultiSigConfig {
    return { ...this.config };
  }

  private async generateProposalId(
    operation: MultiSigOperation,
    target: Address,
    value: bigint,
    data: Hash,
    proposer: Address
  ): Promise<string> {
    const timestamp = Date.now();
    const nonce = randomBytes(4);
    const message = `${operation}${target}${value}${data}${proposer}${timestamp}${nonce}`;
    return await createHash('sha256', message);
  }

  private createMessageHash(proposal: MultiSigProposal): Hash {
    const message = concat([
      toBytes(proposal.operation),
      hexToBytes(proposal.target),
      toBytes(proposal.value.toString()),
      hexToBytes(proposal.data),
      toBytes(proposal.executionTime.toString())
    ]);
    return keccak256(message);
  }

  getStatistics(): {
    totalProposals: number;
    pendingProposals: number;
    approvedProposals: number;
    executedProposals: number;
    rejectedProposals: number;
    expiredProposals: number;
    totalSigners: number;
    threshold: number;
  } {
    const proposals = Array.from(this.proposals.values());
    
    return {
      totalProposals: proposals.length,
      pendingProposals: proposals.filter(p => p.status === 'pending').length,
      approvedProposals: proposals.filter(p => p.status === 'approved').length,
      executedProposals: proposals.filter(p => p.status === 'executed').length,
      rejectedProposals: proposals.filter(p => p.status === 'rejected').length,
      expiredProposals: proposals.filter(p => p.status === 'expired').length,
      totalSigners: this.config.signers.length,
      threshold: this.config.threshold
    };
  }
}

// Export singleton instance getter function to avoid build-time initialization
export function getMultiSigManager(): MultiSigManager {
  return MultiSigManager.getInstance();
}

// Legacy export for compatibility
export const multiSigManager = {
  getInstance: () => MultiSigManager.getInstance(),
  createProposal: (...args: any[]) => getMultiSigManager().createProposal(...(args as [any, any, any, any, any, any, any])),
  signProposal: (proposalId: string, signerPrivateKey: any) => getMultiSigManager().signProposal(proposalId, signerPrivateKey),
  getProposal: (proposalId: string) => getMultiSigManager().getProposal(proposalId),
  getAllProposals: () => getMultiSigManager().getAllProposals(),
  getConfiguration: () => getMultiSigManager().getConfiguration(),
  getStatistics: () => getMultiSigManager().getStatistics()
};