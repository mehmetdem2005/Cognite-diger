-- Challenges Tabloları
-- Supabase SQL Editor'da çalıştır (2. dosya — 1. dosyadan sonra)

create table if not exists public.challenges (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  goal_pages integer default 100,
  goal_books integer default 0,
  goal_days integer default 30,
  start_date date default current_date,
  end_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.challenge_participants (
  id uuid default uuid_generate_v4() primary key,
  challenge_id uuid references public.challenges(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  pages_read integer default 0,
  books_read integer default 0,
  joined_at timestamptz default now(),
  unique(challenge_id, user_id)
);

alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

create policy "Herkes challenge görür" on public.challenges for select using (true);
create policy "Challenge katılım" on public.challenge_participants for all using (auth.uid() = user_id);

insert into public.challenges (title, description, goal_pages, goal_books, goal_days, end_date) values
('30 Günde 500 Sayfa', 'Bu ay 500 sayfa oku ve rozetini kazan!', 500, 0, 30, current_date + interval '30 days'),
('5 Kitap Challenge', 'Bu ay 5 farklı kitap bitir!', 0, 5, 30, current_date + interval '30 days'),
('Haftalık Okuma', 'Bu hafta her gün en az 20 sayfa oku', 140, 0, 7, current_date + interval '7 days')
on conflict do nothing;
