-- Extended Features Schema
-- Kişiselleştirilmiş Tavsiyeler, Gamification, Sosyal Elementler

-- 1. Kullanıcı İlgileri Tablosu
create table if not exists public.user_interests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  genre text not null,
  interest_score integer default 1,
  updated_at timestamptz default now(),
  unique(user_id, genre)
);

-- 2. Kişiselleştirilmiş Tavsiyeler Tablosu
create table if not exists public.recommendations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  reason text,
  score numeric(3,2) default 0,
  created_at timestamptz default now(),
  unique(user_id, book_id)
);

-- 3. Başarılar/Rozetler Tablosu
create table if not exists public.achievements (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  icon text,
  requirement_type text, -- 'pages', 'books', 'streak', 'rating'
  requirement_value integer,
  created_at timestamptz default now()
);

-- 4. Kullanıcı Başarıları
create table if not exists public.user_achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id uuid references public.achievements(id) on delete cascade not null,
  unlocked_at timestamptz default now(),
  unique(user_id, achievement_id)
);

-- 5. Liderlik Tablosu (Haftalık/Aylık)
create table if not exists public.leaderboard (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  period text, -- 'weekly', 'monthly', 'all_time'
  rank integer,
  pages_read integer default 0,
  books_read integer default 0,
  xp_earned integer default 0,
  last_updated timestamptz default now(),
  unique(user_id, period)
);

-- 6. Haftalık/Aylık İstatistikler
create table if not exists public.user_stats (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  period_start date,
  period_type text, -- 'weekly', 'monthly'
  pages_read integer default 0,
  books_started integer default 0,
  books_finished integer default 0,
  reading_days integer default 0,
  avg_reading_time_minutes integer default 0,
  total_xp_earned integer default 0,
  created_at timestamptz default now(),
  unique(user_id, period_start, period_type)
);

-- 7. Sosyal Aktiviteler
create table if not exists public.social_activities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  activity_type text not null, -- 'started_book', 'finished_book', 'highlighted', 'leveled_up'
  activity_data jsonb,
  created_at timestamptz default now()
);

-- 8. Hızlı Favoriler (Yeni Kitap Başla vb)
create table if not exists public.quick_actions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action_type text, -- 'recently_viewed', 'wishlist', 'favorites'
  book_id uuid references public.books(id) on delete cascade,
  priority integer default 0,
  accessed_at timestamptz default now()
);

-- 9. Dinamik Bannerlar
create table if not exists public.banners (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  message text,
  banner_type text, -- 'streak_warning', 'congratulations', 'seasonal', 'promotion'
  icon text,
  cta_text text,
  cta_link text,
  is_active boolean default true,
  start_date timestamptz default now(),
  end_date timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.user_interests enable row level security;
alter table public.recommendations enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.leaderboard enable row level security;
alter table public.user_stats enable row level security;
alter table public.social_activities enable row level security;
alter table public.quick_actions enable row level security;
alter table public.banners enable row level security;

-- RLS Policies
create policy "Kendi ilgileri gör" on public.user_interests for all using (auth.uid() = user_id);
create policy "Kendi tavsiyelerini gör" on public.recommendations for all using (auth.uid() = user_id);
create policy "Başarıları herkese göster" on public.achievements for select using (true);
create policy "Kendi başarılarını gör" on public.user_achievements for select using (auth.uid() = user_id);
create policy "Liderliği herkese göster" on public.leaderboard for select using (true);
create policy "Kendi istatistiklerini gör" on public.user_stats for select using (auth.uid() = user_id);
create policy "Sosyal aktiviteleri gör" on public.social_activities for select using (auth.uid() = user_id or auth.uid() in (select following_id from public.follows where follower_id = user_id));
create policy "Kendi hızlı eylemlerini yönet" on public.quick_actions for all using (auth.uid() = user_id);
create policy "Bannerları herkese göster" on public.banners for select using (is_active = true);

-- Sample Achievements
insert into public.achievements (title, description, icon, requirement_type, requirement_value) values
('İlk Adım', '5 sayfayı oku', '📖', 'pages', 5),
('Okuma Seviyor', '100 sayfayı oku', '📚', 'pages', 100),
('Kitap Bitirici', '1 kitabı bitir', '✅', 'books', 1),
('Beşli Turluş', '5 kitabı bitir', '🔥', 'books', 5),
('Haftalık Spor', '7 gün üst üste oku', '⚡', 'streak', 7),
('Ay Maratonu', '30 gün üst üste oku', '🏆', 'streak', 30),
('Derecelendirenin', '10 kitaap değerlendir', '⭐', 'rating', 10)
on conflict do nothing;
