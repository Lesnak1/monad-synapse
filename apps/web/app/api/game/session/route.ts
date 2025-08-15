import { NextRequest, NextResponse } from 'next/server';
import { gameEngine } from '@/lib/gameEngine';
import { authenticateRequest, requirePermission } from '@/lib/auth';
import { z } from 'zod';

const sessionSchema = z.object({
  gameType: z.enum(['mines', 'dice', 'crash', 'slots', 'plinko', 'slide', 'diamonds', 'burning-wins', 'sweet-bonanza', 'coin-flip']),
  betAmount: z.number().min(0.001).max(1000),
  clientSeed: z.string().min(8).max(64).regex(/^[a-zA-Z0-9]+$/),
  nonce: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        details: authResult.error
      }, { status: 401 });
    }

    // Check permissions
    if (!requirePermission('game:play')(authResult.user!)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validation = sessionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid session parameters',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { gameType, betAmount, clientSeed, nonce } = validation.data;

    // Get player address from authenticated user
    const playerAddress = 'address' in authResult.user! ? authResult.user.address : 'api-user';

    // Create game session
    const session = gameEngine.createGameSession(
      playerAddress,
      gameType,
      betAmount,
      clientSeed,
      nonce
    );

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        gameType: session.gameType,
        betAmount: session.betAmount,
        expiresAt: session.expiresAt,
        isActive: session.isActive
      },
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('Game session creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create game session',
      timestamp: Date.now()
    }, { status: 500 });
  }
}