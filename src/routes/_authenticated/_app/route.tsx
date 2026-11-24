import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { profileQuery } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated/_app")({
  beforeLoad: async ({ context }) => {
    let profile = await context.queryClient.ensureQueryData(profileQuery);
    // Never trust a cached profile that belongs to someone else (e.g. after switching accounts).
    if (!profile || profile.id !== context.user.id) {
      profile = await context.queryClient.fetchQuery({ ...profileQuery, staleTime: 0 });
    }
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
