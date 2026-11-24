import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { coursesQuery } from "@/lib/queries";
import type { Confidence, Topic } from "@/lib/syllabus";

/** Saves a topic's revised tick / confidence for the signed-in student, updating the screen right away. */
export function useTopicProgress() {
  const queryClient = useQueryClient();

  return async function update(topicId: string, patch: Partial<Pick<Topic, "revised" | "confidence">>): Promise<boolean> {
    const previous = queryClient.getQueryData(coursesQuery.queryKey);
    let current: Topic | undefined;
    for (const c of previous ?? []) for (const u of c.units) for (const t of u.topics) if (t.id === topicId) current = t;
    const next = { revised: patch.revised ?? current?.revised ?? false, confidence: (patch.confidence ?? current?.confidence ?? 0) as Confidence };

    queryClient.setQueryData(coursesQuery.queryKey, (old) =>
      old?.map((c) => ({
        ...c,
        units: c.units.map((u) => ({ ...u, topics: u.topics.map((t) => (t.id === topicId ? { ...t, ...next } : t)) })),
      })),
    );

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    const { error } = userId
      ? await supabase.from("topic_progress").upsert({ topic_id: topicId, user_id: userId, ...next }, { onConflict: "topic_id,user_id" })
      : { error: new Error("signed out") };
    if (error) {
      toast.error("Couldn't save your progress. Please try again.");
      queryClient.setQueryData(coursesQuery.queryKey, previous);
      return false;
    }
    return true;
  };
}
