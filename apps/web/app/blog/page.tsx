import Link from 'next/link';

export const metadata = {
  title: 'Blog - Monad Synapse',
  description: 'Latest news, insights and updates from the Monad Synapse gaming platform.',
};

export const viewport = {
  themeColor: '#8b5cf6',
  colorScheme: 'dark',
};

export default function BlogPage() {
  const blogPosts = [
    {
      id: 1,
      title: "Welcome to Monad Synapse - The Future of Decentralized Gaming",
      excerpt: "Introducing the first casino gaming platform built on Monad blockchain, offering lightning-fast transactions and provably fair gameplay.",
      date: "2024-12-20",
      category: "Launch",
      readTime: "3 min read",
      featured: true
    },
    {
      id: 2,
      title: "Understanding Provably Fair Gaming on Blockchain",
      excerpt: "Learn how blockchain technology ensures complete transparency and fairness in every game outcome on Monad Synapse.",
      date: "2024-12-18",
      category: "Technology",
      readTime: "5 min read"
    },
    {
      id: 3,
      title: "Why We Chose Monad: Speed Meets Innovation",
      excerpt: "Discover why Monad blockchain is the perfect foundation for next-generation casino gaming with parallel execution and ultra-low fees.",
      date: "2024-12-15",
      category: "Technology",
      readTime: "4 min read"
    },
    {
      id: 4,
      title: "MON Token Economics: Gaming's New Digital Currency",
      excerpt: "Explore how MON tokens power the Monad Synapse ecosystem and provide seamless gaming experiences.",
      date: "2024-12-12",
      category: "Economics",
      readTime: "6 min read"
    }
  ];

  return (
    <main className="min-h-screen pt-8">
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-6xl mb-6 floating-orb">📚</div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            <span className="text-gradient">Monad Synapse</span> Blog
          </h1>
          <p className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto">
            Stay updated with the latest insights, developments, and innovations 
            in decentralized gaming on the Monad blockchain.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Featured Post</h2>
          </div>
          
          {blogPosts.filter(post => post.featured).map((post) => (
            <div key={post.id} className="casino-card bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-purple-500/30 mb-12">
              <div className="grid md:grid-cols-3 gap-8 items-center">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {post.category}
                    </span>
                    <span className="text-white/60 text-sm">{post.readTime}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                    {post.title}
                  </h3>
                  <p className="text-white/70 text-lg leading-relaxed mb-6">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{new Date(post.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-8xl floating-orb">🚀</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Latest Posts</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.filter(post => !post.featured).map((post) => (
              <article key={post.id} className="casino-card">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    post.category === 'Technology' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                    post.category === 'Economics' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                    'bg-pink-500/20 text-pink-300 border-pink-500/30'
                  }`}>
                    {post.category}
                  </span>
                  <span className="text-white/60 text-sm">{post.readTime}</span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3">
                  {post.title}
                </h3>
                
                <p className="text-white/70 mb-4">
                  {post.excerpt}
                </p>
                
                <div className="pt-4 border-t border-white/10">
                  <span className="text-white/60 text-sm">
                    {new Date(post.date).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="casino-card bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 p-8">
            <div className="text-6xl mb-6 floating-orb">🎮</div>
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Experience Monad Gaming?</h2>
            <p className="text-white/70 mb-8 text-lg">
              Join the revolution in decentralized gaming. Play fair, win big, own your experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/games" className="neon-button text-lg px-8 py-4">
                Play Games
              </Link>
              <Link href="/about" className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl border border-white/20 transition-colors">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


