import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: authResult.error || 'Authentication failed'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: 'id' in authResult.user! ? authResult.user.id : authResult.user!.keyId,
        address: 'address' in authResult.user! ? authResult.user.address : 'api-key',
        permissions: authResult.user!.permissions,
        type: 'address' in authResult.user! ? 'user' : 'api-key'
      },
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Verification failed'
    }, { status: 500 });
  }
}