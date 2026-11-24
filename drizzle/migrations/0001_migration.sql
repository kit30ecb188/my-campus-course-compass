ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS regulation text;

CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  marks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX units_course_idx ON public.units(course_id);
CREATE INDEX units_user_idx ON public.units(user_id);

CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX topics_unit_idx ON public.topics(unit_id);
CREATE INDEX topics_course_idx ON public.topics(course_id);
CREATE INDEX topics_user_idx ON public.topics(user_id);

CREATE TABLE public.topic_progress (
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  revised boolean NOT NULL DEFAULT false,
  confidence smallint NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 3),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_id, user_id)
);
CREATE INDEX topic_progress_user_idx ON public.topic_progress(user_id);
CREATE TRIGGER topic_progress_updated_at BEFORE UPDATE ON public.topic_progress
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  text text NOT NULL CHECK (char_length(text) BETWEEN 3 AND 2000),
  marks smallint NOT NULL CHECK (marks IN (2, 5, 8, 10, 13, 15, 16)),
  session text,
  college text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_user_idx ON public.questions(user_id);
CREATE INDEX questions_course_idx ON public.questions(course_id);

CREATE TABLE public.viva_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  question_count smallint NOT NULL CHECK (question_count IN (5, 10)),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  score numeric(4,1),
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX viva_sessions_user_idx ON public.viva_sessions(user_id);

CREATE TABLE public.viva_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  session_id uuid NOT NULL REFERENCES public.viva_sessions(id) ON DELETE CASCADE,
  position smallint NOT NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  topic_title text NOT NULL,
  question text NOT NULL,
  answer text,
  score smallint CHECK (score BETWEEN 0 AND 10),
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX viva_answers_session_idx ON public.viva_answers(session_id);
CREATE INDEX viva_answers_user_idx ON public.viva_answers(user_id);

CREATE TABLE public.saved_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text NOT NULL,
  marks smallint,
  language text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_answers_user_idx ON public.saved_answers(user_id);

-- Ownership helpers (security definer so policies don't recurse through RLS)
CREATE OR REPLACE FUNCTION public.owns_course(_course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = _course AND user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.owns_unit(_unit uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.units WHERE id = _unit AND user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.owns_topic(_topic uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.topics WHERE id = _topic AND user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.owns_viva(_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.viva_sessions WHERE id = _session AND user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.owns_course(uuid), public.owns_unit(uuid), public.owns_topic(uuid), public.owns_viva(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_course(uuid), public.owns_unit(uuid), public.owns_topic(uuid), public.owns_viva(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.units, public.topics, public.topic_progress, public.questions, public.viva_sessions, public.viva_answers, public.saved_answers TO authenticated;
GRANT ALL ON public.units, public.topics, public.topic_progress, public.questions, public.viva_sessions, public.viva_answers, public.saved_answers TO service_role;

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own units select" ON public.units FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own units insert" ON public.units FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.owns_course(course_id));
CREATE POLICY "Own units update" ON public.units FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.owns_course(course_id));
CREATE POLICY "Own units delete" ON public.units FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Own topics select" ON public.topics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own topics insert" ON public.topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.owns_course(course_id) AND public.owns_unit(unit_id));
CREATE POLICY "Own topics update" ON public.topics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.owns_course(course_id) AND public.owns_unit(unit_id));
CREATE POLICY "Own topics delete" ON public.topics FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Own progress select" ON public.topic_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own progress insert" ON public.topic_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.owns_topic(topic_id));
CREATE POLICY "Own progress update" ON public.topic_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.owns_topic(topic_id));
CREATE POLICY "Own progress delete" ON public.topic_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Own questions select" ON public.questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own questions insert" ON public.questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.owns_course(course_id) AND (unit_id IS NULL OR public.owns_unit(unit_id)) AND (topic_id IS NULL OR public.owns_topic(topic_id)));
CREATE POLICY "Own questions update" ON public.questions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.owns_course(course_id) AND (unit_id IS NULL OR public.owns_unit(unit_id)) AND (topic_id IS NULL OR public.owns_topic(topic_id)));
CREATE POLICY "Own questions delete" ON public.questions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Own viva select" ON public.viva_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own viva insert" ON public.viva_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.owns_course(course_id) AND (unit_id IS NULL OR public.owns_unit(unit_id)));
CREATE POLICY "Own viva update" ON public.viva_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own viva delete" ON public.viva_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Own viva answers select" ON public.viva_answers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own viva answers insert" ON public.viva_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.owns_viva(session_id) AND (topic_id IS NULL OR public.owns_topic(topic_id)));
CREATE POLICY "Own viva answers update" ON public.viva_answers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.owns_viva(session_id));
CREATE POLICY "Own viva answers delete" ON public.viva_answers FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Own saved answers select" ON public.saved_answers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own saved answers insert" ON public.saved_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (course_id IS NULL OR public.owns_course(course_id)) AND (unit_id IS NULL OR public.owns_unit(unit_id)) AND (topic_id IS NULL OR public.owns_topic(topic_id)));
CREATE POLICY "Own saved answers delete" ON public.saved_answers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Save a course with its units and topics in one step; existing ids keep their progress.
CREATE OR REPLACE FUNCTION public.save_course(p_course_id uuid, p_course jsonb, p_units jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_course uuid := p_course_id;
  u jsonb;
  t jsonb;
  v_unit uuid;
  v_topic uuid;
  upos integer := 0;
  tpos integer;
  keep_units uuid[] := '{}';
  keep_topics uuid[] := '{}';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF jsonb_typeof(p_units) <> 'array' OR jsonb_array_length(p_units) > 40 THEN
    RAISE EXCEPTION 'A course can have up to 40 units';
  END IF;

  IF v_course IS NULL THEN
    INSERT INTO public.courses (user_id, code, title, department, semester, regulation, university)
    VALUES (v_uid, upper(trim(p_course->>'code')), trim(p_course->>'title'), p_course->>'department',
            (p_course->>'semester')::smallint, nullif(trim(p_course->>'regulation'), ''), nullif(trim(p_course->>'university'), ''))
    RETURNING id INTO v_course;
  ELSE
    UPDATE public.courses SET
      code = upper(trim(p_course->>'code')),
      title = trim(p_course->>'title'),
      department = p_course->>'department',
      semester = (p_course->>'semester')::smallint,
      regulation = nullif(trim(p_course->>'regulation'), ''),
      university = nullif(trim(p_course->>'university'), '')
    WHERE id = v_course AND user_id = v_uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Course not found'; END IF;
  END IF;

  FOR u IN SELECT value FROM jsonb_array_elements(p_units) LOOP
    upos := upos + 1;
    v_unit := NULL;
    IF nullif(u->>'id', '') IS NOT NULL THEN
      UPDATE public.units SET title = trim(u->>'title'), marks = nullif(trim(u->>'marks'), ''), position = upos
      WHERE id = (u->>'id')::uuid AND course_id = v_course AND user_id = v_uid
      RETURNING id INTO v_unit;
    END IF;
    IF v_unit IS NULL THEN
      INSERT INTO public.units (user_id, course_id, position, title, marks)
      VALUES (v_uid, v_course, upos, trim(u->>'title'), nullif(trim(u->>'marks'), ''))
      RETURNING id INTO v_unit;
    END IF;
    keep_units := keep_units || v_unit;

    IF jsonb_array_length(coalesce(u->'topics', '[]'::jsonb)) > 80 THEN
      RAISE EXCEPTION 'A unit can have up to 80 topics';
    END IF;
    tpos := 0;
    FOR t IN SELECT value FROM jsonb_array_elements(coalesce(u->'topics', '[]'::jsonb)) LOOP
      tpos := tpos + 1;
      v_topic := NULL;
      IF nullif(t->>'id', '') IS NOT NULL THEN
        UPDATE public.topics SET title = trim(t->>'title'), position = tpos, unit_id = v_unit
        WHERE id = (t->>'id')::uuid AND course_id = v_course AND user_id = v_uid
        RETURNING id INTO v_topic;
      END IF;
      IF v_topic IS NULL THEN
        INSERT INTO public.topics (user_id, course_id, unit_id, position, title)
        VALUES (v_uid, v_course, v_unit, tpos, trim(t->>'title'))
        RETURNING id INTO v_topic;
      END IF;
      keep_topics := keep_topics || v_topic;
    END LOOP;
  END LOOP;

  DELETE FROM public.topics WHERE course_id = v_course AND user_id = v_uid AND NOT (id = ANY (keep_topics));
  DELETE FROM public.units WHERE course_id = v_course AND user_id = v_uid AND NOT (id = ANY (keep_units));
  RETURN v_course;
END; $$;
REVOKE EXECUTE ON FUNCTION public.save_course(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_course(uuid, jsonb, jsonb) TO authenticated;

-- Backfill: every old JSON unit becomes a unit with one topic of the same name; revised ticks are kept.
WITH src AS (
  SELECT c.id AS course_id, c.user_id, e.value AS item, e.ord
  FROM public.courses c, jsonb_array_elements(c.units) WITH ORDINALITY AS e(value, ord)
  WHERE jsonb_typeof(c.units) = 'array' AND coalesce(trim(e.value->>'title'), '') <> ''
), new_units AS (
  INSERT INTO public.units (user_id, course_id, position, title, marks)
  SELECT user_id, course_id, ord, left(trim(item->>'title'), 200), nullif(trim(item->>'marks'), '')
  FROM src
  RETURNING id, course_id, position, title, user_id
), new_topics AS (
  INSERT INTO public.topics (user_id, course_id, unit_id, position, title)
  SELECT user_id, course_id, id, 1, title FROM new_units
  RETURNING id, unit_id, user_id
)
INSERT INTO public.topic_progress (topic_id, user_id, revised)
SELECT nt.id, nt.user_id, true
FROM new_topics nt
JOIN new_units nu ON nu.id = nt.unit_id
JOIN src s ON s.course_id = nu.course_id AND s.ord = nu.position
WHERE coalesce((s.item->>'revised')::boolean, false);

COMMENT ON COLUMN public.courses.units IS 'DEPRECATED: replaced by public.units and public.topics';