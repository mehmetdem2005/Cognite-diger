-- Cognita Linga adaptation core tables

CREATE TABLE IF NOT EXISTS public.reader_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('multiple_choice', 'true_false', 'fill_blank', 'open_ended')),
  question TEXT NOT NULL,
  options JSONB,
  answer_key JSONB,
  difficulty SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  source TEXT DEFAULT 'ai',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, section_key, question)
);

CREATE TABLE IF NOT EXISTS public.reader_exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.reader_exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_answer JSONB,
  is_correct BOOLEAN,
  score NUMERIC(5,2),
  ai_feedback TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reader_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  prediction TEXT,
  character_notes JSONB,
  main_idea TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id, section_key)
);

CREATE TABLE IF NOT EXISTS public.word_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
  ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
  interval_days INTEGER NOT NULL DEFAULT 1,
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_result SMALLINT CHECK (last_result BETWEEN 0 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, vocabulary_id)
);

CREATE TABLE IF NOT EXISTS public.reading_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reading_group_members (
  group_id UUID NOT NULL REFERENCES public.reading_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.reading_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.reading_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  section_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reader_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reader_exercise_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reader_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reader exercises public read" ON public.reader_exercises;
CREATE POLICY "Reader exercises public read" ON public.reader_exercises
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Reader exercises admin write" ON public.reader_exercises;
CREATE POLICY "Reader exercises admin write" ON public.reader_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Exercise attempts owner" ON public.reader_exercise_attempts;
CREATE POLICY "Exercise attempts owner" ON public.reader_exercise_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reader guides owner" ON public.reader_guides;
CREATE POLICY "Reader guides owner" ON public.reader_guides
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Word reviews owner" ON public.word_reviews;
CREATE POLICY "Word reviews owner" ON public.word_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reading groups visible" ON public.reading_groups;
CREATE POLICY "Reading groups visible" ON public.reading_groups
  FOR SELECT USING (is_public = TRUE OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Reading groups owner write" ON public.reading_groups;
CREATE POLICY "Reading groups owner write" ON public.reading_groups
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Group members read" ON public.reading_group_members;
CREATE POLICY "Group members read" ON public.reading_group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reading_group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.reading_groups g
      WHERE g.id = group_id AND g.is_public = TRUE
    )
  );

DROP POLICY IF EXISTS "Group members self join" ON public.reading_group_members;
CREATE POLICY "Group members self join" ON public.reading_group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Group members self leave" ON public.reading_group_members;
CREATE POLICY "Group members self leave" ON public.reading_group_members
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Group messages read" ON public.reading_group_messages;
CREATE POLICY "Group messages read" ON public.reading_group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reading_group_members gm
      WHERE gm.group_id = reading_group_messages.group_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group messages member write" ON public.reading_group_messages;
CREATE POLICY "Group messages member write" ON public.reading_group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.reading_group_members gm
      WHERE gm.group_id = reading_group_messages.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_reader_exercises_book_section ON public.reader_exercises(book_id, section_key);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_user_time ON public.reader_exercise_attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_word_reviews_due_user ON public.word_reviews(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_reading_group_messages_group_time ON public.reading_group_messages(group_id, created_at DESC);
