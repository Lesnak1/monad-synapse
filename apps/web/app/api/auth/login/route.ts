import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid login parameters',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { address, signature, message } = validation.data;

    // Create authenticated session
    const { token, session } = await authService.createSession(address, signature, message);

    return NextResponse.json({
      success: true,
      token,
      session: {
        id: session.id,
        address: session.address,
        permissions: session.permissions,
        expiresAt: session.expiresAt
      },
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Authentication failed',
      timestamp: Date.now()
    }, { status: 401 });
  }
}