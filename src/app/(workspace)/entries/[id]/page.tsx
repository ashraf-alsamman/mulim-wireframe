import { EntryDetailView } from "@/features/views/entries-view";

export default async function EntryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EntryDetailView id={id} />;
}
