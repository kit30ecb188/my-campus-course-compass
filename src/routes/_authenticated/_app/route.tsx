import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { profileQuery } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated/_app")({
  beforeLoad: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(profileQuery);
    if (!profile?.onboarded) throw redirect({ to: "/onboarding" });
  },
  component: AppLayout,
});

function AppLayout() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  if (!profile) return null;
  return (
    <div className="min-h-screen">
      <AppHeader profile={profile} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
