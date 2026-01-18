import { redirect } from "next/navigation";
import { checkSetupRequired } from "@/lib/actions/setup";

// Force dynamic rendering - database check must run on every request
export const dynamic = 'force-dynamic';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if setup is required (no users exist in database)
  const setupRequired = await checkSetupRequired();

  // If setup is required, redirect to setup wizard (first-time admin setup)
  if (setupRequired) {
    redirect("/setup");
  }

  return <>{children}</>;
}
