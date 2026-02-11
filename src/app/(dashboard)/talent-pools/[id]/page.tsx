import TalentPoolDetail from "@/views/TalentPoolDetail";

export default async function TalentPoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TalentPoolDetail id={id} />;
}
