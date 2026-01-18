import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { checkSetupRequired } from "@/lib/actions/setup";

// Force dynamic rendering - auth check must run on every request
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Check if setup is required first
  const setupRequired = await checkSetupRequired();
  if (setupRequired) {
    redirect("/setup");
  }

  // Check if user is logged in
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  // Not logged in, redirect to login
  redirect("/login");
}
