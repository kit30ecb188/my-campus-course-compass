import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Course, Profile, Unit } from "@/lib/profile";

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async (): Promise<Profile | null> => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (error) throw error;
    if (data) return data as Profile;
    // Safety net if the sign-up trigger hasn't created the row yet.
    const { data: created, error: insErr } = await supabase
      .from("profiles")
      .insert({ id: user.id })
      .select("*")
      .single();
    if (insErr) throw insErr;
    return created as Profile;
  },
});

export const coursesQuery = queryOptions({
  queryKey: ["courses"],
  queryFn: async (): Promise<Course[]> => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, code, title, department, semester, regulation, university, units")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((c) => ({ ...c, units: (c.units as unknown as Unit[]) ?? [] }));
  },
});
