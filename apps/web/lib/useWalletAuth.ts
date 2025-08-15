'use client';

import { useAccount, useSignMessage } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing auth token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedAddress = localStorage.getItem('authAddress');
    
    if (storedToken && storedAddress === address && isConnected) {
      setAuthToken(storedToken);
      setIsAuthenticated(true);
      console.log('🔓 Using existing auth token for:', address);
    }
  }, [address, isConnected]);

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (isConnected && address && !isAuthenticated && !isAuthenticating) {
      authenticate();
    }
  }, [isConnected, address, isAuthenticated, isAuthenticating]); // Remove authenticate to avoid hoisting

  const authenticate = useCallback(async () => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    if (isAuthenticating) return false;

    try {
      setIsAuthenticating(true);
      console.log('🔐 Starting authentication for:', address);

      // Create message to sign
      const message = `Welcome to Monad Synapse Casino!\n\nSign this message to authenticate your wallet for secure gameplay.\n\nWallet: ${address}\nTimestamp: ${Date.now()}\nNonce: ${Math.random().toString(36).substr(2, 9)}`;

      console.log('📝 Requesting signature...');
      toast.loading('Please sign the message in your wallet...', { id: 'auth-signing' });

      // Request signature
      const signature = await signMessageAsync({ message });
      
      console.log('✅ Signature received, authenticating...');
      toast.loading('Authenticating...', { id: 'auth-signing' });

      // Send to auth API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          signature,
          message,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const authData = await response.json();
      
      if (!authData.success) {
        throw new Error(authData.error || 'Authentication failed');
      }

      // Store auth token
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('authAddress', address);
      localStorage.setItem('authExpiry', authData.session.expiresAt.toString());
      
      setAuthToken(authData.token);
      setIsAuthenticated(true);
      
      console.log('🎉 Authentication successful!');
      toast.success('Authentication successful! You can now play games.', { id: 'auth-signing' });
      
      return true;

    } catch (error: any) {
      console.error('❌ Authentication failed:', error);
      toast.error(error.message || 'Authentication failed', { id: 'auth-signing' });
      
      // Clear any stored auth data on failure
      localStorage.removeItem('authToken');
      localStorage.removeItem('authAddress');
      localStorage.removeItem('authExpiry');
      
      setAuthToken(null);
      setIsAuthenticated(false);
      
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, isConnected, signMessageAsync, isAuthenticating]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authAddress');
    localStorage.removeItem('authExpiry');
    setAuthToken(null);
    setIsAuthenticated(false);
    console.log('🔒 Logged out');
    toast.success('Logged out successfully');
  }, []);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      logout();
    }
  }, [isConnected, logout]);

  return {
    address,
    isConnected,
    authToken,
    isAuthenticated,
    isAuthenticating,
    authenticate,
    logout
  };
}