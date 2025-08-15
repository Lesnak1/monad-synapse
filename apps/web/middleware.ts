import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './lib/auth';

/**
 * Enhanced Security Middleware
 * Enforces HTTPS, sets comprehensive security headers, rate limiting, and DDoS protection
 * while maintaining Web3 wallet compatibility
 */

function buildCsp(isDev: boolean): string {
  const nonce = generateNonce();
  
  // Relaxed CSP for Next.js compatibility and Web3 wallet support
  const script = `'self' 'unsafe-eval' 'unsafe-inline' 'nonce-${nonce}' chrome-extension: moz-extension: webkit-extension: blob: data:`;
  
  return [
    "default-src 'self' chrome-extension: moz-extension: webkit-extension:",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline' chrome-extension: moz-extension: webkit-extension: https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http: chrome-extension: moz-extension: webkit-extension:",
    "font-src 'self' data: chrome-extension: moz-extension: webkit-extension: https://fonts.gstatic.com",
    // Enhanced connect-src for Web3 wallets and Monad testnet
    "connect-src 'self' https: http: ws: wss: chrome-extension: moz-extension: webkit-extension: blob: data: https://*.walletconnect.com https://*.walletconnect.org https://*.metamask.io https://*.infura.io https://*.alchemy.com https://*.coinbase.com https://*.trustwallet.com https://api.monad.xyz https://rpc.monad.xyz wss://rpc.monad.xyz",
    "worker-src 'self' blob: chrome-extension: moz-extension: webkit-extension:",
    "child-src 'self' chrome-extension: moz-extension: webkit-extension:",
    "frame-src 'self' chrome-extension: moz-extension: webkit-extension: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const isHead = request.method === 'HEAD';
  const isDev = request.headers.get('host')?.includes('localhost') ?? true;
  const url = request.nextUrl.clone();

  // 1. HTTPS Enforcement (production only)
  if (!isDev && request.headers.get('x-forwarded-proto') !== 'https') {
    url.protocol = 'https:';
    return NextResponse.redirect(url);
  }

  // 2. Rate Limiting by IP
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Apply aggressive rate limiting for suspicious patterns
  const isSuspicious = checkSuspiciousActivity(userAgent, request.url);
  const rateLimitRequests = isSuspicious ? 10 : 100;
  const rateLimitWindow = 60000; // 1 minute
  
  if (!rateLimit(`ip_${clientIP}`, rateLimitRequests, rateLimitWindow)) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': rateLimitRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (Date.now() + rateLimitWindow).toString()
      }
    });
  }

  // 3. Handle HEAD requests
  if (isHead) {
    return new NextResponse(null, { status: 200 });
  }

  // 4. CSRF Protection
  const csrfName = 'mc_csrf';
  let csrf = request.cookies.get(csrfName)?.value;
  if (!csrf) {
    const rnd = crypto.getRandomValues(new Uint8Array(16));
    csrf = Array.from(rnd).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const response = NextResponse.next();

  // 5. Set Comprehensive Security Headers
  setSecurityHeaders(response, request, isDev);

  // 6. Set CSRF cookie
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  response.cookies.set(csrfName, csrf, {
    httpOnly: true,
    sameSite: 'lax',
    secure: proto === 'https',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  // 7. API Route Protection
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return handleApiSecurity(request, response);
  }

  // 8. Game Route Protection
  if (request.nextUrl.pathname.startsWith('/games/')) {
    return handleGameSecurity(request, response);
  }

  return response;
}

/**
 * Set comprehensive security headers
 */
function setSecurityHeaders(response: NextResponse, request: NextRequest, isDev: boolean): void {
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  
  // HTTPS Security (production only)
  if (proto === 'https' && !isDev) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Content Security Policy with Web3 wallet support
  response.headers.set('Content-Security-Policy', buildCsp(isDev));
  
  // Cross-Origin Policies (essential for Web3 wallets)
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Additional Security Headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Frame protection (allow extensions in dev)
  if (!isDev) {
    response.headers.set('X-Frame-Options', 'DENY');
  }
  
  // Permissions Policy
  const permissionsPolicy = [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()'
  ].join(', ');
  response.headers.set('Permissions-Policy', permissionsPolicy);
  
  // Cache Control for sensitive pages
  if (request.nextUrl.pathname.includes('/games/') || request.nextUrl.pathname.includes('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  // CORS Headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3002',
      'http://localhost:3000',
      'https://monad-synapse.vercel.app',
      'https://monad-synapse-lesnak1.vercel.app',
      'https://*.vercel.app',
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
    ].filter(Boolean);
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Signature, X-Timestamp');
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Security Information Headers (for monitoring)
  response.headers.set('X-Security-Policy', 'enforced');
  response.headers.set('X-Request-ID', generateRequestId());
  response.headers.set('X-Rate-Limit-Policy', 'active');
}

/**
 * Handle API route security
 */
function handleApiSecurity(request: NextRequest, response: NextResponse): NextResponse {
  // Block requests with no User-Agent (likely bots)
  if (!request.headers.get('user-agent')) {
    return new NextResponse('Forbidden - No User Agent', { status: 403 });
  }
  
  // Block requests with suspicious headers
  const suspiciousHeaders = ['x-real-ip', 'x-cluster-client-ip'];
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header);
    if (value && !isValidIP(value)) {
      return new NextResponse('Forbidden - Invalid Headers', { status: 403 });
    }
  }
  
  // Enhanced rate limiting for sensitive API endpoints
  const sensitiveEndpoints = ['/api/payout', '/api/game/result', '/api/auth'];
  const isSensitive = sensitiveEndpoints.some(endpoint => request.nextUrl.pathname.startsWith(endpoint));
  
  if (isSensitive) {
    const clientIP = getClientIP(request);
    if (!rateLimit(`sensitive_${clientIP}`, 20, 60000)) { // 20 requests per minute
      return new NextResponse('Rate limit exceeded for sensitive endpoint', { 
        status: 429,
        headers: { 
          'Retry-After': '60',
          'X-RateLimit-Endpoint': 'sensitive'
        }
      });
    }
  }
  
  // Add API-specific security headers
  response.headers.set('X-API-Security', 'enabled');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}

/**
 * Handle game route security
 */
function handleGameSecurity(request: NextRequest, response: NextResponse): NextResponse {
  // Add game-specific security headers
  response.headers.set('X-Game-Security', 'enabled');
  response.headers.set('X-Anti-Cheat', 'active');
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Extra rate limiting for game pages
  const clientIP = getClientIP(request);
  if (!rateLimit(`game_${clientIP}`, 200, 60000)) { // 200 game requests per minute
    return new NextResponse('Rate limit exceeded for games', { 
      status: 429,
      headers: { 'Retry-After': '60' }
    });
  }
  
  return response;
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  // Try multiple headers to get real IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip'
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Handle comma-separated IPs (x-forwarded-for)
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }
  
  // Fallback to connection IP or unknown
  return (request as any).ip || 'unknown';
}

/**
 * Check if string is a valid IP address
 */
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Check for suspicious activity patterns
 */
function checkSuspiciousActivity(userAgent: string, url: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /node-fetch/i,
    /phantom/i,
    /selenium/i,
    /headless/i
  ];
  
  // Check user agent
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  // Check for suspicious URL patterns
  const suspiciousUrls = [
    '/.env',
    '/admin',
    '/wp-admin',
    '/api/admin',
    '/config',
    '/backup',
    '/.git',
    '/phpmyadmin',
    '/sql',
    '/database'
  ];
  
  return suspiciousUrls.some(pattern => url.includes(pattern));
}

/**
 * Generate cryptographic nonce for CSP
 */
function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default middleware;

// Configure middleware matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};