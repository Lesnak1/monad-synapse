'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LotteryDetailsPage() {
  const [ticketQuantity, setTicketQuantity] = useState(5);
  const [generationMode, setGenerationMode] = useState<'auto' | 'manual'>('auto');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedJackpot, setSelectedJackpot] = useState<number[]>([]);

  const standardNumbers = Array.from({ length: 38 }, (_, i) => i + 1);
  const jackpotNumbers = Array.from({ length: 10 }, (_, i) => i + 1);

  const lotteryBalls = [1, 4, 9, 22, 7, 25, 33, 6, 75];
  const lotteryBallsRight = [13, 9, 1, 7];

  const toggleStandardNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < 5) {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const toggleJackpotNumber = (num: number) => {
    if (selectedJackpot.includes(num)) {
      setSelectedJackpot(selectedJackpot.filter(n => n !== num));
    } else if (selectedJackpot.length < 1) {
      setSelectedJackpot([num]);
    }
  };

  const ticketPrice = 0.0000346;
  const totalCost = (ticketQuantity * ticketPrice).toFixed(7);

  return (
    <main className="min-h-screen pt-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Lottery Details</h1>
          <nav className="text-white/60 text-sm">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/lottery" className="hover:text-white">Lottery</Link>
          </nav>
        </div>
      </div>

      {/* Lottery Balls Animation */}
      <div className="relative overflow-hidden mb-8">
        <div className="absolute left-0 top-0 flex gap-2">
          {lotteryBalls.map((num, i) => (
            <div 
              key={i}
              className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm lottery-ball"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              {num}
            </div>
          ))}
        </div>
        <div className="absolute right-0 top-0 flex gap-2">
          {lotteryBallsRight.map((num, i) => (
            <div 
              key={i}
              className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-black font-bold text-sm lottery-ball"
              style={{ animationDelay: `${i * 0.3}s` }}
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <section className="py-8 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header with currency selector */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Buy Lottery Tickets</h2>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">🪙</span>
              <div className="text-white/70 text-sm">Currency: MON</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Balance and Cost Info */}
            <div className="space-y-4">
              <div className="casino-card">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Your Balance</span>
                  <span className="text-green-400 font-bold">102.5410 MON</span>
                </div>
              </div>
              
              <div className="casino-card">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">1 Ticket costs</span>
                  <span className="text-purple-400 font-bold">0.1000 MON</span>
                </div>
              </div>
            </div>

            {/* Quantity and Total */}
            <div className="space-y-4">
              <div className="casino-card">
                <label className="block text-white/70 mb-2">Quantity of Tickets</label>
                <input
                  type="number"
                  value={ticketQuantity}
                  onChange={(e) => setTicketQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
                />
              </div>
              
              <div className="casino-card">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Total Cost</span>
                  <span className="text-yellow-400 font-bold">{(ticketQuantity * 0.1).toFixed(4)} MON</span>
                </div>
              </div>
            </div>
          </div>

          {/* Number Selection */}
          <div className="casino-card mt-8">
            <h3 className="text-xl font-bold text-white mb-6">Generated Ticket Numbers</h3>
            
            {/* Generation Mode */}
            <div className="flex items-center gap-4 mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="generation"
                  checked={generationMode === 'auto'}
                  onChange={() => setGenerationMode('auto')}
                  className="text-purple-500"
                />
                <span className="text-white">Auto Generated</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="generation"
                  checked={generationMode === 'manual'}
                  onChange={() => setGenerationMode('manual')}
                  className="text-purple-500"
                />
                <span className="text-white">Manual Select</span>
              </label>
            </div>

            {generationMode === 'manual' && (
              <>
                {/* Standard Numbers */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold">Standard numbers ( Pick 5 balls)</h4>
                    <span className="text-white/60 text-sm">{selectedNumbers.length}/5 selected</span>
                  </div>
                  
                  <div className="grid grid-cols-8 gap-2">
                    {standardNumbers.map((num) => (
                      <button
                        key={num}
                        onClick={() => toggleStandardNumber(num)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          selectedNumbers.includes(num)
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black shadow-lg scale-110'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        disabled={!selectedNumbers.includes(num) && selectedNumbers.length >= 5}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Jackpot Ball */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold">Jackpot Ball ( Pick 1 balls)</h4>
                    <span className="text-white/60 text-sm">{selectedJackpot.length}/1 selected</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {jackpotNumbers.map((num) => (
                      <button
                        key={num}
                        onClick={() => toggleJackpotNumber(num)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          selectedJackpot.includes(num)
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-black shadow-lg scale-110'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Pick */}
                <div className="flex gap-4 mb-6">
                  <div className="flex gap-2">
                    <span className="text-white/70">Quick pick:</span>
                    {[6, 9, 20, 34, 33].map((num, i) => (
                      <div key={i} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs text-white">
                        {num}
                      </div>
                    ))}
                    <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-xs text-black font-bold">
                      6
                    </div>
                    <button className="ml-2 text-white/60 hover:text-white">+</button>
                  </div>
                </div>
              </>
            )}

            {/* Buy Button */}
            <div className="text-center">
              <button className="neon-button text-lg px-8 py-4">
                BUY TICKET
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">A Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {[
              'What is MonCas Lottery?',
              'How does MonCas Lottery work?', 
              'When Lottery start?',
              'How can participate in Lottery?',
              'What is the prize?'
            ].map((question, i) => (
              <div key={i} className="casino-card">
                <div className="flex items-center justify-between p-4">
                  <span className="text-white font-medium">{question}</span>
                  <span className="text-white/60">▼</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Email Signup */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="casino-card bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 text-center p-8">
            <h2 className="text-2xl font-bold text-white mb-4">To Get Exclusive Benefits</h2>
            <div className="flex max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email address"
                className="flex-1 px-4 py-3 rounded-l-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400"
              />
              <button className="neon-button rounded-l-none px-6">→</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}