import { MarketListView } from "app/(markets)/_components/MarketList";

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = decodeURIComponent(params.category);

  return (
      <MarketListView categoryFilter={category} />
  );
}
