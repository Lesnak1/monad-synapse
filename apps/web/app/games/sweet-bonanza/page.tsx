import { SweetBonanzaGame } from '@/components/games/sweet-bonanza';

export const metadata = {
  title: 'Sweet Bonanza - Monad Synapse',
  description: 'Play Sweet Bonanza slot with tumbling reels and cascade multipliers on Monad blockchain',
};

export default function SweetBonanzaPage() {
  return (
    <div className="min-h-screen pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SweetBonanzaGame />
      </div>
    </div>
  );
}