import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { ExperimentalSettings } from "@/components/account/experimental-settings";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function ExperimentalPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <ExperimentalSettings user={user} />;
}
