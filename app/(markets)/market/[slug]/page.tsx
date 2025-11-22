import { MarketDetailView } from "../../_components/MarketDetailView";

interface MarketDetailPageProps {
  params: { slug: string };
}

export default function MarketDetailPage({ params }: MarketDetailPageProps) {
  return <MarketDetailView slug={decodeURIComponent(params.slug)} />;
}

