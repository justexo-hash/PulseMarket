
import Comments from "app/_components/Comments";
import { MarketDetailView } from "app/_components/MarketDetailView";

interface MarketDetailPageProps {
  params: { slug: string };
}

export default function MarketDetailPage({ params }: MarketDetailPageProps) {
  const decodedSlug = decodeURIComponent(params.slug);
  return (
 
      <div className="max-w-7xl mx-auto pt-8">
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <MarketDetailView slug={decodedSlug} />
          <Comments slug={decodedSlug} />
        </div>
      </div>
  );
}