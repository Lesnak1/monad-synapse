'use client';

import { usePoolStatus } from '@/lib/poolMonitoring';

export function PoolStatusIndicator() {
  const { status, balance, message } = usePoolStatus();
  
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'low': return 'text-yellow-400';
      case 'critical': return 'text-orange-400';
      case 'insufficient': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'low': return '🟡';
      case 'critical': return '🟠';
      case 'insufficient': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="casino-card p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <div>
            <div className={`font-semibold text-sm ${getStatusColor()}`}>
              Pool Status: {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
            <div className="text-xs text-white/60">
              {balance.toFixed(4)} MON available
            </div>
          </div>
        </div>
        
        {status !== 'healthy' && (
          <div className="text-xs text-right text-white/70 max-w-xs">
            {status === 'insufficient' ? (
              <span className="text-red-400">
                New bets disabled
              </span>
            ) : status === 'critical' ? (
              <span className="text-orange-400">
                Limited betting
              </span>
            ) : (
              <span className="text-yellow-400">
                Monitor balance
              </span>
            )}
          </div>
        )}
      </div>
      
      {status !== 'healthy' && (
        <div className="mt-2 text-xs text-white/60 bg-white/5 rounded p-2">
          {message}
        </div>
      )}
    </div>
  );
}