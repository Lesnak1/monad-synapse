'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LotteryPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 4,
    hours: 20,
    minutes: 23,
    seconds: 45
  });

  const lotteryBalls = [1, 4, 9, 22, 7, 25, 33, 6, 75];
  const lotteryBallsRight = [13, 9, 1, 7];

  const winners = [
    { user: 'Tom Bank', date: '06/04/22', purchased: '14,978', winners: '8,022', tickets: '0' },
    { user: 'Karl Day', date: '06/04/22', purchased: '14,804', winners: '8,031', tickets: '0' },
    { user: 'Jim Arnold', date: '06/04/22', purchased: '28,150', winners: '14,565', tickets: '0' },
    { user: 'Ann Clark', date: '06/04/22', purchased: '14,892', winners: '7,277', tickets: '0' },
    { user: 'Sergio Ray', date: '06/04/22', purchased: '11,737', winners: '6,394', tickets: '0' },
    { user: 'Van Green', date: '06/04/22', purchased: '11,014', winners: '7,032', tickets: '0' },
    { user: 'Tom Berry', date: '06/04/22', purchased: '11,902', winners: '6,250', tickets: '0' },
    { user: 'Bruce Ryan', date: '06/04/22', purchased: '12,659', winners: '6,832', tickets: '0' },
    { user: 'Allen Ray', date: '06/04/22', purchased: '10,848', winners: '4,187', tickets: '0' },
    { user: 'Lenny Ray', date: '06/04/22', purchased: '11,819', winners: '5,760', tickets: '0' }
  ];

  return (
    <main className="min-h-screen pt-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Lottery</h1>
          <nav className="text-white/60 text-sm">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">›</span>
            <span className="text-white">Lottery</span>
          </nav>
        </div>
      </div>

      {/* Lottery Balls Animation */}
      <div className="relative overflow-hidden">
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

      {/* Main Lottery Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="casino-card bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-500/30 text-center p-8 relative overflow-hidden">
            {/* Floating lottery elements */}
            <div className="absolute top-4 right-8 text-4xl floating-orb">🎫</div>
            <div className="absolute bottom-4 left-8 text-3xl floating-orb" style={{animationDelay: '1s'}}>💰</div>
            <div className="absolute top-1/2 left-4 text-2xl floating-orb" style={{animationDelay: '2s'}}>🏆</div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white mb-2">Weekly Lottery</h2>
              <p className="text-green-400 text-sm font-semibold mb-6">Game #219</p>
              
              <div className="mb-8">
                <div className="text-white/70 text-sm mb-2">Prize Pool</div>
                <div className="text-4xl font-bold text-gradient mb-2">18,411.45728 MON</div>
                <div className="text-white/60 text-sm">148579 Tickets in Game</div>
              </div>
              
              <div className="mb-8">
                <div className="text-white/70 text-sm mb-2">Closing Starts In</div>
                <div className="text-2xl font-bold text-white">
                  04D:04H:20M:235
                </div>
              </div>
              
              <p className="text-white/70 text-sm mb-8">
                While you are still thinking, world tickets have already been sold!
              </p>
              
              <button className="neon-button text-lg px-8 py-4">
                BUY TICKET FOR JUST 0.1000 MON 🎫
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Winners Table */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Latest winners</h2>
            <h3 className="text-3xl font-bold text-white">Number of Winning Tickets Per Week</h3>
            <p className="text-white/60 mt-2">
              Crypto to the future Monet deposits with the CRYPTOCURRENCY of your 
              choice and get your lottery tickets!
            </p>
          </div>
          
          <div className="casino-card">
            <div className="grid grid-cols-5 gap-4 text-white/70 text-sm font-semibold border-b border-white/10 pb-4 mb-4">
              <div>USER</div>
              <div>DATE</div>
              <div>PURCHASED</div>
              <div>WINNERS</div>
              <div>MY TICKETS</div>
            </div>
            
            <div className="space-y-3">
              {winners.map((winner, i) => (
                <div key={i} className="grid grid-cols-5 gap-4 items-center py-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👤</span>
                    <span className="text-white font-medium">{winner.user}</span>
                  </div>
                  <div className="text-white/70">{winner.date}</div>
                  <div className="text-white/70">{winner.purchased}</div>
                  <div className="text-green-400">{winner.winners}</div>
                  <div className="text-white font-bold">{winner.tickets}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-2">How it works</h2>
          <h3 className="text-3xl font-bold text-white mb-4">It's Really Easy!</h3>
          <p className="text-white/70 mb-12">It's easier than you think! Follow 3 simple easy steps</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: '🎫', 
                title: 'Buy tickets', 
                desc: 'Buy tickets on the User account screen Numbers are fixed.' 
              },
              { 
                icon: '⏰', 
                title: 'Wait For the Draw', 
                desc: 'Wait for the draw on your select LOTTO and LOTTO and LOTTO area.' 
              },
              { 
                icon: '🏆', 
                title: 'Check for Prizes', 
                desc: 'Check for prizes on your ticket guide and to the page and check your prize.' 
              }
            ].map((step, i) => (
              <div key={i} className="casino-card text-center">
                <div className="text-6xl mb-4">{step.icon}</div>
                <h4 className="text-xl font-bold text-white mb-3">{step.title}</h4>
                <p className="text-white/70">{step.desc}</p>
              </div>
            ))}
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