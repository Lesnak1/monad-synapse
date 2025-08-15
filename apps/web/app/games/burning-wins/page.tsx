import { BurningWinsGame } from '@/components/games/burning-wins';

export const metadata = {
  title: 'Burning Wins - Monad Synapse',
  description: 'Play Burning Wins hot multiplier slot game with burning features on Monad blockchain',
};

export default function BurningWinsPage() {
  return (
    <div className="min-h-screen pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <BurningWinsGame />
      </div>
    </div>
  );
}