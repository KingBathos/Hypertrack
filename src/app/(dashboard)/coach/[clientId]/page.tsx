import { redirect } from "next/navigation";

export default async function CoachClientRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const resolvedParams = await params;
  redirect(`/coach/assign-program/${resolvedParams.clientId}`);
}
