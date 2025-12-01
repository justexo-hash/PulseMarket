import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Featured | Pulsemarket",
  description:
    "Building the future of memecoin prediction markets.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Featured | Pulsemarket",
    description: "Building the future of memecoin prediction markets.",
    url: "https://pulsemarket.fun",
  },
  twitter: {
    card: "summary_large_image",
    title: "Featured | Pulsemarket",
    description: "Predict memecoin markets, track sentiment and trade probabilities instantly.",
    creator: "@pulsemkt",
    images: ["/og-image.png"],
  },
  keywords: [
    "memecoin",
    "prediction market",
    "crypto predictions",
    "solana",
    "yes/no markets",
    "crypto betting",
    "pulsemarket",
    "web3 trading",
    "onchain markets",
  ],
  authors: [
    { name: "PulseMarket Team", url: "https://pulsemarket.fun" }
  ],
  category: "finance",
  applicationName: "PulseMarket",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  metadataBase: new URL("https://pulsemarket.fun"),
};

type BlogPost = {
  slug: string
  title: string
  excerpt: string
  date: string
  author: string
  tags?: string[]
  cover?: string
}

const posts: BlogPost[] = [
  {
    slug: "what-are-memecoin-prediction-markets",
    title: "What Are Memecoin Prediction Markets?",
    excerpt:
      "A beginner-friendly guide explaining how prediction markets work and why memecoins are the perfect asset class to trade narratives.",
    date: "2025-02-01",
    author: "PulseMarket Research",
    tags: ["education", "memecoins"],
    cover: "/blog/memecoin-intro.png",
  },
  {
    slug: "how-pulsemarket-calculates-probabilities",
    title: "How PulseMarket Calculates Market Probabilities",
    excerpt:
      "A deep dive into the pricing engine behind YES/NO markets, liquidity behavior, and crowd-based probability formation.",
    date: "2025-02-10",
    author: "Analytics Team",
    tags: ["probabilities", "market-engine"],
    cover: "/blog/probabilities.png",
  },
  {
    slug: "narratives-that-move-crypto",
    title: "Narratives That Move Crypto",
    excerpt:
      "From ETF approvals to celebrity memecoins, explore the narratives that consistently shape market sentiment and volatility.",
    date: "2025-02-15",
    author: "PulseMarket Editorial",
    tags: ["trends", "narratives"],
    cover: "/blog/narratives.png",
  },
  {
    slug: "pulsemarket-weekly-roundup",
    title: "PulseMarket Weekly Roundup",
    excerpt:
      "A digest-style summary of the most traded markets, biggest winners, top traders, and emerging meme trends of the week.",
    date: "2025-02-20",
    author: "PulseMarket Team",
    tags: ["roundup", "weekly"],
    cover: "/blog/weekly-roundup.png",
  },
]

export default function Blog() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-6">PulseMarket Blog</h1>
      <p className="text-muted-foreground mb-10">
        Updates, stories, and insights about prediction markets, events, and the
        ecosystem.
      </p>

      <div className="flex flex-col gap-8">
        {posts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No posts yet. Start adding content to <code>/app/blog</code>.
          </p>
        )}

        {posts.map((post) => (
          <Link
            href={`/blog/${post.slug}`}
            key={post.slug}
            className="group border rounded-lg p-5 hover:bg-secondary transition"
          >
            <div className="flex flex-col gap-3">
              {post.cover && (
                <img
                  src={post.cover}
                  alt={post.title}
                  className="w-full h-48 object-cover rounded-md"
                />
              )}

              <h2 className="text-xl font-semibold group-hover:underline">
                {post.title}
              </h2>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {post.excerpt}
              </p>

              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{post.date}</span>
                <span>•</span>
                <span>{post.author}</span>
              </div>

              {post.tags && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}