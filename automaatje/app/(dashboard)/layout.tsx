import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./_components/dashboard-layout-client";
import packageJson from "../../package.json";

// Force dynamic rendering - prevents database access during build
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    // Redirect to clear-session route which will destroy the invalid session and then redirect to login
    redirect("/api/auth/clear-session");
  }

  const profile = user.profile && typeof user.profile === 'object' ? user.profile : {};
  const userName = 'name' in profile ? String(profile.name) : '';
  const avatarSeed = 'avatarSeed' in profile ? String(profile.avatarSeed) : undefined;
  const userIsAdmin = user.role === "ADMIN";

  return (
    <DashboardLayoutClient
      user={{ name: userName, email: user.email, role: user.role, avatarSeed }}
      version={packageJson.version}
      userIsAdmin={userIsAdmin}
    >
      {children}
    </DashboardLayoutClient>
  );
}
