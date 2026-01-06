import { redirect } from "next/navigation";
import { checkSetupRequired } from "@/lib/actions/setup";

export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if setup is required (no users exist)
  const setupRequired = await checkSetupRequired();
  
  // If setup is already complete, redirect to login
  if (!setupRequired) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted">
      {children}
    </div>
  );
}
