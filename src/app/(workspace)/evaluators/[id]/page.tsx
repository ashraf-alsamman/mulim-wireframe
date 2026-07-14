import { EvaluatorDetailView } from "@/features/views/detail-views";

export default async function EvaluatorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EvaluatorDetailView id={id} />;
}
