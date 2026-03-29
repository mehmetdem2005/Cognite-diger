CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  description text,
  goal_pages integer DEFAULT 100,
  goal_books integer DEFAULT 0,
  goal_days integer DEFAULT 30,
  start_date date DEFAULT current_date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pages_read integer DEFAULT 0,
  books_read integer DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes challenge görür" ON public.challenges;
CREATE POLICY "Herkes challenge görür" ON public.challenges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Challenge katılım" ON public.challenge_participants;
CREATE POLICY "Challenge katılım" ON public.challenge_participants FOR ALL USING (auth.uid() = user_id);

INSERT INTO public.challenges (title, description, goal_pages, goal_books, goal_days, end_date) VALUES
('30 Günde 500 Sayfa', 'Bu ay 500 sayfa oku ve rozetini kazan!', 500, 0, 30, current_date + interval '30 days'),
('5 Kitap Challenge', 'Bu ay 5 farkli kitap bitir!', 0, 5, 30, current_date + interval '30 days'),
('Haftalik Okuma', 'Bu hafta her gun en az 20 sayfa oku', 140, 0, 7, current_date + interval '7 days')
ON CONFLICT DO NOTHING;
