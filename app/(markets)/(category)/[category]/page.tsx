import { MarketListView } from "../../_components/MarketList";
import MarketSearchProviderClient from "../../_components/MarketSearchProviderClient";
import { GradientText } from "@/components/ui/shadcn-io/gradient-text";

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = decodeURIComponent(params.category);

  return (
    <MarketSearchProviderClient>
      <div className="container mx-auto px-4 lg:px-0 py-6">
        <h1 className="text-3xl font-medium mb-6 text-primary ">
          Trade anything related with {category}
        </h1>
        <MarketListView categoryFilter={category} />
      </div>
    </MarketSearchProviderClient>
  );
}
