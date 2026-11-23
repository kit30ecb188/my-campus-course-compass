import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Syllabex" },
      { name: "description", content: "Choose a new password for your Syllabex account." },
      { property: "og:title", content: "Reset your password — Syllabex" },
      { property: "og:description", content: "Choose a new password for your Syllabex account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return void toast.error("Password needs at least 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <Brand subtitle={false} />
      <form onSubmit={onSubmit} className="surface mt-10 grid gap-4 p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <div className="grid gap-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="xl" disabled={busy}>
          {busy ? "Saving…" : "Save password"}
        </Button>
      </form>
    </main>
  );
}
