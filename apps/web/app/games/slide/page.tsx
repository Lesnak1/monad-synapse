import { SlideGame } from '@/components/games/slide';

export const metadata = {
  title: 'Slide - Monad Synapse',
  description: 'Play Slide precision timing game with multiplying rewards on Monad blockchain',
};

export default function SlidePage() {
  return (
    <div className="min-h-screen pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SlideGame />
      </div>
    </div>
  );
}