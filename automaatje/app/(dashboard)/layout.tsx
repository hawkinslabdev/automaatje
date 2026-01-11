import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./_components/dashboard-layout-client";
import packageJson from "../../package.json";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";

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

  // Get experimental settings
  const metadata = (user.metadata as any) || {};
  const experimental = metadata.preferences?.experimental || {};
  const showLiveOnDesktop = experimental.showLiveOnDesktop ?? false; // Default: disabled (opt-in)

  // Check for active live tracking
  const activeTrip = await db.query.liveTrips.findFirst({
    where: and(
      eq(schema.liveTrips.userId, user.id),
      eq(schema.liveTrips.status, "RECORDING")
    ),
  });

  return (
    <DashboardLayoutClient
      user={{ name: userName, email: user.email, role: user.role, avatarSeed }}
      version={packageJson.version}
      userIsAdmin={userIsAdmin}
      isLiveTrackingActive={!!activeTrip}
      showLiveOnDesktop={showLiveOnDesktop}
    >
      {children}
    </DashboardLayoutClient>
  );
}
