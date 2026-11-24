import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Course, Profile } from "@/lib/profile";
import { COURSE_SELECT, mapCourses } from "@/lib/course-data";

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
    const { data, error } = await supabase.from("courses").select(COURSE_SELECT).order("created_at", { ascending: true });
    if (error) throw error;
    return mapCourses(data ?? []);
  },
});

export type SavedAnswer = {
  id: string;
  course_id: string | null;
  unit_id: string | null;
  topic_id: string | null;
  question: string;
  answer: string;
  marks: number | null;
  language: string | null;
  created_at: string;
};

export const savedAnswersQuery = queryOptions({
  queryKey: ["saved_answers"],
  queryFn: async (): Promise<SavedAnswer[]> => {
    const { data, error } = await supabase
      .from("saved_answers")
      .select("id, course_id, unit_id, topic_id, question, answer, marks, language, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export type BankQuestion = {
  id: string;
  course_id: string;
  unit_id: string | null;
  topic_id: string | null;
  text: string;
  marks: number;
  session: string | null;
  college: string | null;
  created_at: string;
};

export const questionsQuery = queryOptions({
  queryKey: ["questions"],
  queryFn: async (): Promise<BankQuestion[]> => {
    const { data, error } = await supabase
      .from("questions")
      .select("id, course_id, unit_id, topic_id, text, marks, session, college, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export type VivaSessionRow = {
  id: string;
  course_id: string;
  unit_id: string | null;
  question_count: number;
  status: string;
  score: number | null;
  summary: unknown;
  created_at: string;
};

export const vivaSessionsQuery = queryOptions({
  queryKey: ["viva_sessions"],
  queryFn: async (): Promise<VivaSessionRow[]> => {
    const { data, error } = await supabase
      .from("viva_sessions")
      .select("id, course_id, unit_id, question_count, status, score, summary, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  },
});
