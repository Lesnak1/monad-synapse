import { DiamondsGame } from '@/components/games/diamonds';

export const metadata = {
  title: 'Diamonds - Monad Synapse',
  description: 'Play Diamonds gem-matching puzzle game with cascade combos on Monad blockchain',
};

export default function DiamondsPage() {
  return (
    <div className="min-h-screen pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <DiamondsGame />
      </div>
    </div>
  );
}