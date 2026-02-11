import PipelineDetail from "@/views/PipelineDetail";

export default async function PipelineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PipelineDetail id={id} />;
}
