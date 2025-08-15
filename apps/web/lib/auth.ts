/**
 * Comprehensive Authentication System
 * JWT-based authentication with API key support and signature verification
 */

import { NextRequest } from 'next/server';

// Web Crypto API helpers for Edge Runtime compatibility
async function createHash(algorithm: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  let hashAlgorithm: string;
  switch (algorithm) {
    case 'sha256':
      hashAlgorithm = 'SHA-256';
      break;
    case 'sha1':
      hashAlgorithm = 'SHA-1';
      break;
    default:
      hashAlgorithm = 'SHA-256';
  }
  
  const hashBuffer = await crypto.subtle.digest(hashAlgorithm, dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Base64 URL encoding/decoding for JWT
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

// Edge Runtime compatible JWT implementation
async function signJWT(payload: any, secret: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${data}.${encodedSignature}`;
}

async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  
  // Verify signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const signature = Uint8Array.from(base64UrlDecode(encodedSignature), c => c.charCodeAt(0));
  const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
  
  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }
  
  // Decode payload
  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  
  // Check expiration
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new Error('JWT expired');
  }
  
  return payload;
}

async function createHmac(algorithm: string, secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  let hashAlgorithm: string;
  switch (algorithm) {
    case 'sha256':
      hashAlgorithm = 'SHA-256';
      break;
    case 'sha1':
      hashAlgorithm = 'SHA-1';
      break;
    default:
      hashAlgorithm = 'SHA-256';
  }
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: hashAlgorithm },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomBytes(size: number): string {
  const array = new Uint8Array(size);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Environment variables for security
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const API_SECRET = process.env.API_SECRET || 'fallback-api-secret-change-in-production';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface UserSession {
  id: string;
  address: string;
  nonce: number;
  issuedAt: number;
  expiresAt: number;
  permissions: string[];
  sessionId: string;
}

export interface ApiKeyData {
  keyId: string;
  keyHash: string;
  permissions: string[];
  isActive: boolean;
  createdAt: number;
  lastUsed?: number;
  rateLimit: {
    requests: number;
    windowMs: number;
    current: number;
    resetTime: number;
  };
}

export class AuthenticationService {
  private static instance: AuthenticationService;
  private sessions: Map<string, UserSession> = new Map();
  private apiKeys: Map<string, ApiKeyData> = new Map();
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();

  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * Generate a secure session token for wallet address
   */
  async createSession(address: string, signature: string, message: string): Promise<{ token: string; session: UserSession }> {
    // Verify signature (simplified - would use eth signature verification in production)
    if (!this.verifySignature(address, signature, message)) {
      throw new Error('Invalid signature');
    }

    const sessionId = randomBytes(32);
    const session: UserSession = {
      id: randomBytes(16),
      address: address.toLowerCase(),
      nonce: Date.now(),
      issuedAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION,
      permissions: ['game:play', 'game:result', 'payout:request'],
      sessionId
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Generate JWT token using Edge Runtime compatible function
    const token = await signJWT({
      sessionId,
      address: session.address,
      permissions: session.permissions,
      exp: Math.floor(session.expiresAt / 1000)
    }, JWT_SECRET);

    return { token, session };
  }

  /**
   * Validate and decode JWT token
   */
  async validateToken(token: string): Promise<UserSession | null> {
    try {
      const decoded = await verifyJWT(token, JWT_SECRET);
      const session = this.sessions.get(decoded.sessionId);
      
      if (!session || session.expiresAt < Date.now()) {
        return null;
      }

      return session;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate API key for server-to-server authentication
   */
  async generateApiKey(permissions: string[] = ['game:result', 'payout:create']): Promise<{ keyId: string; secretKey: string }> {
    const keyId = `ak_${randomBytes(16)}`;
    const secretKey = randomBytes(32);
    const keyHash = await createHash('sha256', secretKey);

    const apiKeyData: ApiKeyData = {
      keyId,
      keyHash,
      permissions,
      isActive: true,
      createdAt: Date.now(),
      rateLimit: {
        requests: 1000,
        windowMs: 60 * 60 * 1000, // 1 hour
        current: 0,
        resetTime: Date.now() + 60 * 60 * 1000
      }
    };

    this.apiKeys.set(keyId, apiKeyData);
    return { keyId, secretKey };
  }

  /**
   * Validate API key
   */
  async validateApiKey(keyId: string, secretKey: string): Promise<ApiKeyData | null> {
    const apiKeyData = this.apiKeys.get(keyId);
    if (!apiKeyData || !apiKeyData.isActive) {
      return null;
    }

    const providedHash = await createHash('sha256', secretKey);
    if (providedHash !== apiKeyData.keyHash) {
      return null;
    }

    // Check rate limit
    if (Date.now() > apiKeyData.rateLimit.resetTime) {
      apiKeyData.rateLimit.current = 0;
      apiKeyData.rateLimit.resetTime = Date.now() + apiKeyData.rateLimit.windowMs;
    }

    if (apiKeyData.rateLimit.current >= apiKeyData.rateLimit.requests) {
      throw new Error('Rate limit exceeded');
    }

    apiKeyData.rateLimit.current++;
    apiKeyData.lastUsed = Date.now();
    
    return apiKeyData;
  }

  /**
   * Create request signature for API calls
   */
  async createRequestSignature(method: string, path: string, body: any, timestamp: number, secretKey: string): Promise<string> {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const message = `${method.toUpperCase()}:${path}:${bodyString}:${timestamp}`;
    return await createHmac('sha256', secretKey, message);
  }

  /**
   * Verify request signature
   */
  async verifyRequestSignature(
    method: string, 
    path: string, 
    body: any, 
    timestamp: number, 
    signature: string, 
    secretKey: string
  ): Promise<boolean> {
    // Check timestamp (reject requests older than 5 minutes)
    if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
      return false;
    }

    const expectedSignature = await this.createRequestSignature(method, path, body, timestamp, secretKey);
    return signature === expectedSignature;
  }

  /**
   * Verify wallet signature (simplified)
   */
  private verifySignature(address: string, signature: string, message: string): boolean {
    // In production, this would use ethers.js to verify the signature
    // For now, just check if signature is provided
    return signature.length > 0 && message.includes(address);
  }

  /**
   * Check if user has permission
   */
  hasPermission(session: UserSession | ApiKeyData, permission: string): boolean {
    return session.permissions.includes(permission) || session.permissions.includes('*');
  }

  /**
   * Revoke session
   */
  revokeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Authentication middleware
export async function authenticateRequest(request: NextRequest): Promise<{
  isAuthenticated: boolean;
  user?: UserSession | ApiKeyData;
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('Authorization');
    const apiKeyHeader = request.headers.get('X-API-Key');
    const signatureHeader = request.headers.get('X-Signature');
    const timestampHeader = request.headers.get('X-Timestamp');

    const auth = AuthenticationService.getInstance();

    // JWT Token Authentication
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = await auth.validateToken(token);
      
      if (session) {
        return { isAuthenticated: true, user: session };
      }
      return { isAuthenticated: false, error: 'Invalid or expired token' };
    }

    // API Key Authentication
    if (apiKeyHeader && signatureHeader && timestampHeader) {
      const [keyId, secretKey] = apiKeyHeader.split(':');
      if (!keyId || !secretKey) {
        return { isAuthenticated: false, error: 'Invalid API key format' };
      }

      try {
        const apiKeyData = await auth.validateApiKey(keyId, secretKey);
        if (!apiKeyData) {
          return { isAuthenticated: false, error: 'Invalid API key' };
        }

        // Verify request signature
        const timestamp = parseInt(timestampHeader);
        const body = await request.text();
        const isValidSignature = auth.verifyRequestSignature(
          request.method,
          request.nextUrl.pathname,
          body,
          timestamp,
          signatureHeader,
          secretKey
        );

        if (!isValidSignature) {
          return { isAuthenticated: false, error: 'Invalid request signature' };
        }

        return { isAuthenticated: true, user: apiKeyData };
      } catch (error: any) {
        return { isAuthenticated: false, error: error.message };
      }
    }

    return { isAuthenticated: false, error: 'No authentication provided' };
  } catch (error) {
    return { isAuthenticated: false, error: 'Authentication error' };
  }
}

// Rate limiting middleware
export function rateLimit(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
  const auth = AuthenticationService.getInstance();
  const now = Date.now();
  const key = `rate_limit_${identifier}`;
  
  const current = auth['rateLimits'].get(key);
  
  if (!current || now > current.resetTime) {
    auth['rateLimits'].set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

// Permission check middleware
export function requirePermission(permission: string) {
  return (user: UserSession | ApiKeyData) => {
    const auth = AuthenticationService.getInstance();
    return auth.hasPermission(user, permission);
  };
}

// Export singleton instance
export const authService = AuthenticationService.getInstance();

// Auto-cleanup expired sessions every hour
setInterval(() => {
  authService.cleanupExpiredSessions();
}, 60 * 60 * 1000);