/**
 * Comprehensive Error Handling System
 * Centralized error management with categorization and recovery strategies
 */

import { logger } from './logger';
import { NextResponse } from 'next/server';

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  PAYMENT = 'payment',
  GAME = 'game',
  POOL = 'pool',
  NETWORK = 'network',
  DATABASE = 'database',
  SYSTEM = 'system',
  SECURITY = 'security'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface CasinoError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  retryable: boolean;
  metadata?: {
    playerAddress?: string;
    gameType?: string;
    amount?: number;
    transactionId?: string;
    requestId?: string;
  };
  originalError?: Error;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Create a standardized casino error
   */
  createError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    userMessage: string,
    retryable: boolean = false,
    metadata?: CasinoError['metadata'],
    originalError?: Error
  ): CasinoError {
    return {
      code,
      message,
      category,
      severity,
      userMessage,
      retryable,
      metadata,
      originalError
    };
  }

  /**
   * Handle and log an error
   */
  handleError(error: CasinoError | Error, context?: string): CasinoError {
    let casinoError: CasinoError;

    if (this.isCasinoError(error)) {
      casinoError = error;
    } else {
      casinoError = this.categorizeGenericError(error as Error);
    }

    // Log the error
    this.logError(casinoError, context);

    // Track error frequency
    this.trackError(casinoError.code);

    // Update circuit breaker if needed
    this.updateCircuitBreaker(casinoError.category);

    // Execute recovery strategy if possible
    this.executeRecoveryStrategy(casinoError);

    return casinoError;
  }

  /**
   * Check if error is a CasinoError
   */
  private isCasinoError(error: any): error is CasinoError {
    return error && typeof error === 'object' && 'code' in error && 'category' in error;
  }

  /**
   * Categorize a generic error
   */
  private categorizeGenericError(error: Error): CasinoError {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return this.createError(
        'VALIDATION_ERROR',
        error.message,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        'Invalid input provided',
        true,
        undefined,
        error
      );
    }

    if (message.includes('auth') || message.includes('token') || message.includes('permission')) {
      return this.createError(
        'AUTH_ERROR',
        error.message,
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.MEDIUM,
        'Authentication failed',
        true,
        undefined,
        error
      );
    }

    if (message.includes('pool') || message.includes('balance') || message.includes('insufficient')) {
      return this.createError(
        'POOL_ERROR',
        error.message,
        ErrorCategory.POOL,
        ErrorSeverity.HIGH,
        'Pool operation failed',
        true,
        undefined,
        error
      );
    }

    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return this.createError(
        'NETWORK_ERROR',
        error.message,
        ErrorCategory.NETWORK,
        ErrorSeverity.MEDIUM,
        'Network connection issue',
        true,
        undefined,
        error
      );
    }

    // Default to system error
    return this.createError(
      'SYSTEM_ERROR',
      error.message,
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH,
      'An unexpected error occurred',
      false,
      undefined,
      error
    );
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: CasinoError, context?: string): void {
    const logData = {
      code: error.code,
      category: error.category,
      severity: error.severity,
      retryable: error.retryable,
      metadata: error.metadata,
      originalError: error.originalError?.message,
      stack: error.originalError?.stack,
      context
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.critical(error.message, error.category, logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error(error.message, error.category, logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(error.message, error.category, logData);
        break;
      case ErrorSeverity.LOW:
      default:
        logger.info(error.message, error.category, logData);
        break;
    }
  }

  /**
   * Track error frequency for monitoring
   */
  private trackError(errorCode: string): void {
    const count = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, count + 1);

    // Alert if error frequency is high
    if (count > 10) {
      logger.warn(`High error frequency detected: ${errorCode}`, 'monitoring', {
        count,
        errorCode
      });
    }
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(category: ErrorCategory): void {
    const key = category.toString();
    const breaker = this.circuitBreakers.get(key) || { failures: 0, lastFailure: 0, isOpen: false };
    
    breaker.failures++;
    breaker.lastFailure = Date.now();

    // Open circuit breaker if too many failures
    if (breaker.failures >= 5 && !breaker.isOpen) {
      breaker.isOpen = true;
      logger.error(`Circuit breaker opened for category: ${category}`, 'circuit-breaker', {
        category,
        failures: breaker.failures
      });
    }

    this.circuitBreakers.set(key, breaker);
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen(category: ErrorCategory): boolean {
    const breaker = this.circuitBreakers.get(category.toString());
    if (!breaker || !breaker.isOpen) return false;

    // Auto-reset after 5 minutes
    if (Date.now() - breaker.lastFailure > 5 * 60 * 1000) {
      breaker.isOpen = false;
      breaker.failures = 0;
      this.circuitBreakers.set(category.toString(), breaker);
      logger.info(`Circuit breaker reset for category: ${category}`, 'circuit-breaker');
      return false;
    }

    return true;
  }

  /**
   * Execute recovery strategy based on error type
   */
  private executeRecoveryStrategy(error: CasinoError): void {
    switch (error.category) {
      case ErrorCategory.POOL:
        this.handlePoolError(error);
        break;
      case ErrorCategory.PAYMENT:
        this.handlePaymentError(error);
        break;
      case ErrorCategory.GAME:
        this.handleGameError(error);
        break;
      case ErrorCategory.NETWORK:
        this.handleNetworkError(error);
        break;
      default:
        // No specific recovery strategy
        break;
    }
  }

  /**
   * Handle pool-related errors
   */
  private handlePoolError(error: CasinoError): void {
    if (error.message.includes('insufficient')) {
      // Trigger pool refill notification
      logger.warn('Pool balance critical', 'pool', {
        error: error.code,
        message: error.message
      });
    }
  }

  /**
   * Handle payment-related errors
   */
  private handlePaymentError(error: CasinoError): void {
    if (error.metadata?.transactionId) {
      // Mark transaction for retry
      logger.error('Payout error', 'payout', {
        playerAddress: error.metadata.playerAddress || 'unknown',
        amount: error.metadata.amount || 0,
        error: error.code,
        transactionId: error.metadata.transactionId,
        retryable: error.retryable
      });
    }
  }

  /**
   * Handle game-related errors
   */
  private handleGameError(error: CasinoError): void {
    if (error.metadata?.gameType && error.metadata?.playerAddress) {
      logger.error('Game error', 'game', {
        gameType: error.metadata.gameType,
        playerAddress: error.metadata.playerAddress,
        error: error.code,
        message: error.message
      });
    }
  }

  /**
   * Handle network-related errors
   */
  private handleNetworkError(error: CasinoError): void {
    // Network errors are usually retryable
    if (error.retryable) {
      logger.info('Network error marked for retry', 'network', {
        error: error.code,
        message: error.message
      });
    }
  }

  /**
   * Convert error to HTTP response
   */
  toHttpResponse(error: CasinoError): NextResponse {
    const statusCode = this.getHttpStatusCode(error);
    
    const responseBody = {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        retryable: error.retryable,
        category: error.category
      },
      timestamp: Date.now(),
      ...(error.retryable ? { retryAfter: this.getRetryDelay(error) } : {})
    };

    // Don't expose sensitive error details in production
    if (process.env.NODE_ENV !== 'production') {
      responseBody.error = {
        ...responseBody.error,
        message: error.message,
        ...(error.metadata && { metadata: error.metadata })
      };
    }

    return NextResponse.json(responseBody, { status: statusCode });
  }

  /**
   * Get appropriate HTTP status code for error
   */
  private getHttpStatusCode(error: CasinoError): number {
    switch (error.category) {
      case ErrorCategory.VALIDATION:
        return 400; // Bad Request
      case ErrorCategory.AUTHENTICATION:
        return 401; // Unauthorized
      case ErrorCategory.AUTHORIZATION:
        return 403; // Forbidden
      case ErrorCategory.PAYMENT:
      case ErrorCategory.POOL:
        return 503; // Service Unavailable
      case ErrorCategory.NETWORK:
        return 502; // Bad Gateway
      case ErrorCategory.DATABASE:
        return 500; // Internal Server Error
      case ErrorCategory.SYSTEM:
        return 500; // Internal Server Error
      default:
        return 500; // Internal Server Error
    }
  }

  /**
   * Get retry delay based on error type
   */
  private getRetryDelay(error: CasinoError): number {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        return 1000; // 1 second
      case ErrorCategory.POOL:
        return 30000; // 30 seconds
      case ErrorCategory.PAYMENT:
        return 5000; // 5 seconds
      default:
        return 3000; // 3 seconds
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCode: { [code: string]: number };
    circuitBreakers: { [category: string]: { failures: number; isOpen: boolean } };
  } {
    const circuitBreakerStats: { [category: string]: { failures: number; isOpen: boolean } } = {};
    
    for (const [category, breaker] of this.circuitBreakers.entries()) {
      circuitBreakerStats[category] = {
        failures: breaker.failures,
        isOpen: breaker.isOpen
      };
    }

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByCode: Object.fromEntries(this.errorCounts),
      circuitBreakers: circuitBreakerStats
    };
  }

  /**
   * Reset error tracking
   */
  resetErrorStats(): void {
    this.errorCounts.clear();
    this.circuitBreakers.clear();
    logger.info('Error statistics reset', 'system');
  }
}

// Pre-defined error factories
export const ErrorFactory = {
  validation: (message: string, userMessage: string = 'Invalid input', metadata?: CasinoError['metadata']) =>
    errorHandler.createError('VALIDATION_ERROR', message, ErrorCategory.VALIDATION, ErrorSeverity.LOW, userMessage, true, metadata),

  authentication: (message: string, userMessage: string = 'Authentication failed', metadata?: CasinoError['metadata']) =>
    errorHandler.createError('AUTH_ERROR', message, ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, userMessage, true, metadata),

  authorization: (message: string, userMessage: string = 'Access denied', metadata?: CasinoError['metadata']) =>
    errorHandler.createError('AUTHZ_ERROR', message, ErrorCategory.AUTHORIZATION, ErrorSeverity.MEDIUM, userMessage, false, metadata),

  insufficientPool: (required: number, available: number, metadata?: CasinoError['metadata']) =>
    errorHandler.createError(
      'POOL_INSUFFICIENT',
      `Insufficient pool balance: required ${required}, available ${available}`,
      ErrorCategory.POOL,
      ErrorSeverity.HIGH,
      'Pool is being refilled. Please try again in a few minutes.',
      true,
      { ...metadata, amount: required }
    ),

  gameError: (gameType: string, message: string, metadata?: CasinoError['metadata']) =>
    errorHandler.createError(
      'GAME_ERROR',
      `Game error in ${gameType}: ${message}`,
      ErrorCategory.GAME,
      ErrorSeverity.MEDIUM,
      'Game temporarily unavailable',
      true,
      { ...metadata, gameType }
    ),

  paymentFailed: (amount: number, reason: string, metadata?: CasinoError['metadata']) =>
    errorHandler.createError(
      'PAYMENT_FAILED',
      `Payment failed: ${reason}`,
      ErrorCategory.PAYMENT,
      ErrorSeverity.HIGH,
      'Payment processing failed',
      true,
      { ...metadata, amount }
    ),

  rateLimitExceeded: (limit: number, metadata?: CasinoError['metadata']) =>
    errorHandler.createError(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded: ${limit} requests`,
      ErrorCategory.SECURITY,
      ErrorSeverity.MEDIUM,
      'Too many requests. Please try again later.',
      true,
      metadata
    ),

  networkError: (message: string, metadata?: CasinoError['metadata']) =>
    errorHandler.createError(
      'NETWORK_ERROR',
      message,
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      'Network connection issue',
      true,
      metadata
    )
};

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility function for API routes
export function handleApiError(error: unknown, context?: string): NextResponse {
  let casinoError: CasinoError;

  if (error instanceof Error) {
    casinoError = errorHandler.handleError(error, context);
  } else if (errorHandler['isCasinoError'](error)) {
    casinoError = errorHandler.handleError(error as CasinoError, context);
  } else {
    casinoError = errorHandler.createError(
      'UNKNOWN_ERROR',
      'An unknown error occurred',
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH,
      'An unexpected error occurred',
      false
    );
  }

  return errorHandler.toHttpResponse(casinoError);
}

// Auto-cleanup old error stats every hour
setInterval(() => {
  // Reset stats if they get too large
  const stats = errorHandler.getErrorStats();
  if (stats.totalErrors > 10000) {
    errorHandler.resetErrorStats();
  }
}, 60 * 60 * 1000);