'use client';

import { useState, useEffect } from 'react';

interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  lastUpdate: number;
}

export function PriceStream() {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);

  // Real-time prices from Oracle Gateway (no mocks)
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
      // WS kapalıysa sessizce fallback yap
      ws = new WebSocket(`${proto}://${host}:4001/stream`);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type === 'price') {
            const symbol = msg.symbol as 'ETHUSD' | 'BTCUSD';
            const item: CryptoPrice = {
              symbol,
              price: Number(msg.price),
              change24h: 0,
              changePercent: 0,
              volume: 0,
              marketCap: 0,
              lastUpdate: Date.now(),
            } as any;
            setPrices((prev) => {
              const map = new Map(prev.map((p) => [p.symbol, p] as const));
              const current = map.get(symbol);
              map.set(symbol, { ...(current ?? {}), ...item } as CryptoPrice);
              return Array.from(map.values());
            });
          }
        } catch {}
      };
    } catch {}
    return () => { try { ws?.close(); } catch {} };
  }, []);

  const formatPrice = (price: number, symbol: string) => {
    // Oracle feeds are already fiat pairs like ETHUSD; display plain number without $ prefix
    if (price < 1) return price.toFixed(6);
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(2)}M`;
    return `${marketCap.toLocaleString()}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return `${volume.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-4 text-white/70 text-sm font-semibold border-b border-white/10 pb-3">
          <div>ASSET</div>
          <div>PRICE</div>
          <div>24H CHANGE</div>
          <div>24H %</div>
          <div>VOLUME</div>
          <div>MARKET CAP</div>
          <div>STATUS</div>
        </div>
        
        <div className="space-y-3">
          {(prices.length === 0 ? [{ symbol: 'ETHUSD', price: 0, change24h: 0, changePercent: 0, volume: 0, marketCap: 0, lastUpdate: Date.now() } as CryptoPrice] : prices).map((crypto) => (
            <div 
              key={crypto.symbol} 
              className="grid grid-cols-7 gap-4 items-center py-3 border-b border-white/10 hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${crypto.symbol === 'MON' ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 
                    crypto.symbol === 'BTC' ? 'bg-orange-500' :
                    crypto.symbol === 'ETH' ? 'bg-blue-600' :
                    crypto.symbol === 'BNB' ? 'bg-yellow-500' :
                    crypto.symbol === 'SOL' ? 'bg-purple-600' : 'bg-blue-500'
                  } text-white`}
                >
                  {crypto.symbol === 'MON' ? 'M' : crypto.symbol[0]}
                </div>
                <div>
                  <div className="text-white font-medium">{crypto.symbol}</div>
                  <div className="text-white/60 text-xs">
                   {crypto.symbol === 'BTCUSD' ? 'Bitcoin' :
                    crypto.symbol === 'ETHUSD' ? 'Ethereum' : crypto.symbol}
                  </div>
                </div>
              </div>
              
               <div className="text-white font-bold">{formatPrice(crypto.price, crypto.symbol)}</div>
              
              <div className={`font-bold ${crypto.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(6)}
              </div>
              
              <div className={`font-bold ${crypto.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {crypto.changePercent >= 0 ? '+' : ''}{crypto.changePercent.toFixed(2)}%
              </div>
              
              <div className="text-white/70">
                {formatVolume(crypto.volume)}
              </div>
              
              <div className="text-white/70">
                {formatMarketCap(crypto.marketCap)}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs">LIVE</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {(prices.length === 0 ? [{ symbol: 'ETHUSD', price: 0, change24h: 0, changePercent: 0, volume: 0, marketCap: 0, lastUpdate: Date.now() } as CryptoPrice] : prices).map((crypto) => (
          <div key={crypto.symbol} className="casino-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${crypto.symbol === 'MON' ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 
                    crypto.symbol === 'BTC' ? 'bg-orange-500' :
                    crypto.symbol === 'ETH' ? 'bg-blue-600' :
                    crypto.symbol === 'BNB' ? 'bg-yellow-500' :
                    crypto.symbol === 'SOL' ? 'bg-purple-600' : 'bg-blue-500'
                  } text-white`}
                >
                  {crypto.symbol === 'MON' ? 'M' : crypto.symbol[0]}
                </div>
                <div>
                  <div className="text-white font-medium">{crypto.symbol}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-xs">LIVE</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
              <div className="text-white font-bold">
                {formatPrice(crypto.price, crypto.symbol)}
              </div>
                <div className={`text-sm font-bold ${crypto.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {crypto.changePercent >= 0 ? '+' : ''}{crypto.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-white/60">24h Change</div>
                <div className={`font-bold ${crypto.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(6)}
                </div>
              </div>
              <div>
                <div className="text-white/60">Volume</div>
                <div className="text-white">{formatVolume(crypto.volume)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Market Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">📈</div>
          <div className="text-white/70 text-sm">Market Trend</div>
          <div className="text-green-400 font-bold">Bullish</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🔥</div>
          <div className="text-white/70 text-sm">Top Performer</div>
          <div className="text-white font-bold">
            {(prices.length === 0 ? 'ETHUSD' : prices.reduce((max, crypto) => 
              crypto.changePercent > max.changePercent ? crypto : max, prices[0]
            ).symbol)}
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">💸</div>
          <div className="text-white/70 text-sm">Total Volume</div>
          <div className="text-white font-bold">
            {formatVolume((prices.length === 0 ? 0 : prices.reduce((sum, crypto) => sum + crypto.volume, 0)))}
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">⚡</div>
          <div className="text-white/70 text-sm">Last Update</div>
          <div className="text-white font-bold">Live</div>
        </div>
      </div>
    </div>
  );
}