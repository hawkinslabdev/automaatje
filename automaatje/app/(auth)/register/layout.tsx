import { redirect } from "next/navigation";
import { isRegistrationEnabled } from "@/lib/actions/setup";

// Force dynamic rendering - database check must run on every request
export const dynamic = 'force-dynamic';

export default async function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if registrations are enabled
  const registrationEnabled = await isRegistrationEnabled();

  if (!registrationEnabled) {
    redirect("/login?error=registration_disabled");
  }

  return <>{children}</>;
}
