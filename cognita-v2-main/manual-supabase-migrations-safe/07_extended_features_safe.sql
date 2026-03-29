CREATE TABLE IF NOT EXISTS public.user_interests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  genre text NOT NULL,
  interest_score integer DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, genre)
);

CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  reason text,
  score numeric(3,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  description text,
  icon text,
  requirement_type text,
  requirement_value integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id uuid REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  period text,
  rank integer,
  pages_read integer DEFAULT 0,
  books_read integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id, period)
);

CREATE TABLE IF NOT EXISTS public.user_stats (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  period_start date,
  period_type text,
  pages_read integer DEFAULT 0,
  books_started integer DEFAULT 0,
  books_finished integer DEFAULT 0,
  reading_days integer DEFAULT 0,
  avg_reading_time_minutes integer DEFAULT 0,
  total_xp_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period_start, period_type)
);

CREATE TABLE IF NOT EXISTS public.social_activities (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  activity_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quick_actions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type text,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
  priority integer DEFAULT 0,
  accessed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banners (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  message text,
  banner_type text,
  icon text,
  cta_text text,
  cta_link text,
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kendi ilgileri gör" ON public.user_interests;
CREATE POLICY "Kendi ilgileri gör" ON public.user_interests FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Kendi tavsiyelerini gör" ON public.recommendations;
CREATE POLICY "Kendi tavsiyelerini gör" ON public.recommendations FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Başarıları herkese göster" ON public.achievements;
CREATE POLICY "Başarıları herkese göster" ON public.achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Kendi başarılarını gör" ON public.user_achievements;
CREATE POLICY "Kendi başarılarını gör" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Liderliği herkese göster" ON public.leaderboard;
CREATE POLICY "Liderliği herkese göster" ON public.leaderboard FOR SELECT USING (true);

DROP POLICY IF EXISTS "Kendi istatistiklerini gör" ON public.user_stats;
CREATE POLICY "Kendi istatistiklerini gör" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sosyal aktiviteleri gör" ON public.social_activities;
CREATE POLICY "Sosyal aktiviteleri gör" ON public.social_activities FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() IN (SELECT following_id FROM public.follows WHERE follower_id = user_id)
);

DROP POLICY IF EXISTS "Kendi hızlı eylemlerini yönet" ON public.quick_actions;
CREATE POLICY "Kendi hızlı eylemlerini yönet" ON public.quick_actions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Bannerları herkese göster" ON public.banners;
CREATE POLICY "Bannerları herkese göster" ON public.banners FOR SELECT USING (is_active = true);

INSERT INTO public.achievements (title, description, icon, requirement_type, requirement_value) VALUES
('Ilk Adim', '5 sayfayi oku', 'book', 'pages', 5),
('Okuma Seviyor', '100 sayfayi oku', 'books', 'pages', 100),
('Kitap Bitirici', '1 kitabi bitir', 'check', 'books', 1),
('Besli Tur', '5 kitap bitir', 'flame', 'books', 5),
('Haftalik Seri', '7 gun ust uste oku', 'zap', 'streak', 7),
('Ay Maratonu', '30 gun ust uste oku', 'trophy', 'streak', 30),
('Derecelendiren', '10 kitap degerlendir', 'star', 'rating', 10)
ON CONFLICT DO NOTHING;
