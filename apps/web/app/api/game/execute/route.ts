import { NextRequest, NextResponse } from 'next/server';
import { gameEngine } from '@/lib/gameEngine';
import { authenticateRequest, requirePermission } from '@/lib/auth';
import { z } from 'zod';

const executeSchema = z.object({
  sessionId: z.string().min(1),
  gameParams: z.object({
    mines: z.number().int().min(1).max(24).optional(),
    revealTile: z.number().int().min(0).max(24).optional(),
    target: z.number().min(1).max(99).optional(),
    prediction: z.enum(['under', 'over', 'heads', 'tails']).optional(),
    cashOutAt: z.number().min(1.01).max(100).optional(),
  }).optional()
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
    const validation = executeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid execution parameters',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { sessionId, gameParams = {} } = validation.data;

    // Execute game logic on server
    const result = await gameEngine.executeGame(sessionId, gameParams);

    return NextResponse.json({
      success: true,
      gameResult: result.gameResult,
      winAmount: result.winAmount,
      isWin: result.isWin,
      multiplier: result.multiplier,
      proof: result.proof,
      sessionId: result.session.sessionId,
      playerAddress: result.session.playerAddress,
      gameType: result.session.gameType,
      timestamp: Date.now(),
      version: '2.0'
    });

  } catch (error: any) {
    console.error('Game execution error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Game execution failed',
      timestamp: Date.now()
    }, { status: 500 });
  }
}