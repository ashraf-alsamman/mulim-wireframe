import { CommitteeDetailView } from "@/features/views/detail-views";

export default async function CommitteeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommitteeDetailView id={id} />;
}
