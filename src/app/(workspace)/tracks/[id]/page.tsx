import { TrackDetailView } from "@/features/views/detail-views";

export default async function TrackDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrackDetailView id={id} />;
}
