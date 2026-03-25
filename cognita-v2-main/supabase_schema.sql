create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  username text unique,
  avatar_url text,
  bio text,
  reading_speed_wpm integer default 200,
  streak_days integer default 0,
  total_pages_read integer default 0,
  xp integer default 0,
  level integer default 1,
  last_read_at timestamptz,
  created_at timestamptz default now()
);

create table public.books (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  author text,
  cover_url text,
  description text,
  content text,
  file_url text,
  file_type text default 'text',
  total_pages integer default 1,
  language text default 'tr',
  tags text[] default '{}',
  is_public boolean default true,
  avg_rating numeric(3,2) default 0,
  rating_count integer default 0,
  created_at timestamptz default now()
);

create table public.reading_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  current_page integer default 1,
  progress_percent numeric(5,2) default 0,
  session_duration_seconds integer default 0,
  wpm_measured integer,
  updated_at timestamptz default now(),
  unique(user_id, book_id)
);

create table public.highlights (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  text text not null,
  note text,
  page_number integer not null,
  color text default 'amber',
  is_public boolean default false,
  likes_count integer default 0,
  created_at timestamptz default now()
);

create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  content text not null,
  page_number integer,
  parent_id uuid references public.comments(id),
  likes_count integer default 0,
  created_at timestamptz default now()
);

create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key(follower_id, following_id)
);

create table public.likes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_id uuid not null,
  target_type text not null,
  created_at timestamptz default now(),
  unique(user_id, target_id, target_type)
);

create table public.stories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  cover_url text,
  genre text,
  tags text[] default '{}',
  is_published boolean default false,
  likes_count integer default 0,
  views_count integer default 0,
  created_at timestamptz default now()
);

create table public.story_chapters (
  id uuid default uuid_generate_v4() primary key,
  story_id uuid references public.stories(id) on delete cascade not null,
  title text not null,
  content text not null,
  chapter_number integer not null,
  is_published boolean default false,
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  from_user_id uuid references public.profiles(id),
  type text not null,
  target_id uuid,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.highlights enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.stories enable row level security;
alter table public.story_chapters enable row level security;
alter table public.notifications enable row level security;

-- Policies
create policy "Profil herkese açık" on public.profiles for select using (true);
create policy "Kendi profilini güncelle" on public.profiles for update using (auth.uid() = id);
create policy "Public kitaplar görünür" on public.books for select using (is_public = true or auth.uid() = user_id);
create policy "Kitap ekle" on public.books for insert with check (auth.uid() = user_id);
create policy "Kitap güncelle" on public.books for update using (auth.uid() = user_id);
create policy "Kitap sil" on public.books for delete using (auth.uid() = user_id);
create policy "Seans yönet" on public.reading_sessions for all using (auth.uid() = user_id);
create policy "Highlight yönet" on public.highlights for all using (auth.uid() = user_id);
create policy "Yorum görüntüle" on public.comments for select using (true);
create policy "Yorum ekle" on public.comments for insert with check (auth.uid() = user_id);
create policy "Yorum sil" on public.comments for delete using (auth.uid() = user_id);
create policy "Takip sayısı görüntüle" on public.follows for select using (true);
create policy "Takip yönet" on public.follows for all using (auth.uid() = follower_id);
create policy "Beğeni yönet" on public.likes for all using (auth.uid() = user_id);
create policy "Hikaye görüntüle" on public.stories for select using (is_published = true or auth.uid() = user_id);
create policy "Hikaye yönet" on public.stories for all using (auth.uid() = user_id);
create policy "Bölüm görüntüle" on public.story_chapters for select using (true);
create policy "Bölüm yönet" on public.story_chapters for all using (auth.uid() = (select user_id from public.stories where id = story_id));
create policy "Bildirim görüntüle" on public.notifications for select using (auth.uid() = user_id);
create policy "Bildirim güncelle" on public.notifications for update using (auth.uid() = user_id);

-- Otomatik profil oluştur
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, username)
  values (
    new.id, new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================
-- PROJE MODÜLÜ
-- =====================

create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  color text default '#405DE6',
  emoji text default '📚',
  goal_books integer,
  deadline date,
  is_public boolean default false,
  created_at timestamptz default now()
);

create table public.project_books (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  added_at timestamptz default now(),
  unique(project_id, book_id)
);

alter table public.projects enable row level security;
alter table public.project_books enable row level security;

create policy "Proje görüntüle" on public.projects for select using (auth.uid() = user_id or is_public = true);
create policy "Proje ekle" on public.projects for insert with check (auth.uid() = user_id);
create policy "Proje güncelle" on public.projects for update using (auth.uid() = user_id);
create policy "Proje sil" on public.projects for delete using (auth.uid() = user_id);

create policy "Proje kitap görüntüle" on public.project_books for select using (
  auth.uid() = (select user_id from public.projects where id = project_id)
);
create policy "Proje kitap ekle" on public.project_books for insert with check (
  auth.uid() = (select user_id from public.projects where id = project_id)
);
create policy "Proje kitap sil" on public.project_books for delete using (
  auth.uid() = (select user_id from public.projects where id = project_id)
);

-- =====================
-- KATALOG MODÜLÜ
-- =====================

create table public.admins (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  role text not null default 'moderator' check (role in ('super_admin', 'admin', 'moderator')),
  invited_by uuid references public.admins(id),
  created_at timestamptz default now()
);

create table public.catalog_books (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  author text,
  cover_url text,
  description text,
  content text,
  file_url text,
  file_type text default 'text',
  total_pages integer default 1,
  language text default 'tr',
  categories text[] default '{}',
  tags text[] default '{}',
  level text,
  is_published boolean default true,
  added_by uuid references public.admins(id),
  created_at timestamptz default now()
);

create table public.admin_messages (
  id uuid default uuid_generate_v4() primary key,
  from_admin_id uuid references public.admins(id) on delete cascade not null,
  to_admin_id uuid references public.admins(id) on delete cascade,
  content text not null,
  is_broadcast boolean default false,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Kullanıcı kütüphanesine katalog kitabı eklemek için
create table public.user_catalog_books (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  catalog_book_id uuid references public.catalog_books(id) on delete cascade not null,
  added_at timestamptz default now(),
  unique(user_id, catalog_book_id)
);

alter table public.admins enable row level security;
alter table public.catalog_books enable row level security;
alter table public.admin_messages enable row level security;
alter table public.user_catalog_books enable row level security;

-- Admin policies
create policy "Admin görüntüle" on public.admins for select using (true);
create policy "Admin ekle" on public.admins for insert with check (
  auth.uid() in (select user_id from public.admins where role = 'super_admin')
);
create policy "Admin sil" on public.admins for delete using (
  auth.uid() in (select user_id from public.admins where role = 'super_admin')
);
create policy "Admin güncelle" on public.admins for update using (
  auth.uid() in (select user_id from public.admins where role = 'super_admin')
);

-- Catalog policies
create policy "Katalog herkese açık" on public.catalog_books for select using (is_published = true);
create policy "Katalog ekle" on public.catalog_books for insert with check (
  auth.uid() in (select user_id from public.admins where role in ('super_admin', 'admin'))
);
create policy "Katalog güncelle" on public.catalog_books for update using (
  auth.uid() in (select user_id from public.admins where role in ('super_admin', 'admin'))
);
create policy "Katalog sil" on public.catalog_books for delete using (
  auth.uid() in (select user_id from public.admins where role in ('super_admin', 'admin'))
);

-- Admin messages policies
create policy "Mesaj görüntüle" on public.admin_messages for select using (
  auth.uid() in (select user_id from public.admins where id = from_admin_id or id = to_admin_id)
  or (is_broadcast = true and auth.uid() in (select user_id from public.admins))
);
create policy "Mesaj gönder" on public.admin_messages for insert with check (
  auth.uid() in (select user_id from public.admins where id = from_admin_id)
);
create policy "Mesaj okundu işaretle" on public.admin_messages for update using (
  auth.uid() in (select user_id from public.admins where id = to_admin_id)
  or (is_broadcast = true and auth.uid() in (select user_id from public.admins))
);
create policy "Mesaj sil" on public.admin_messages for delete using (
  auth.uid() in (select user_id from public.admins where id = from_admin_id)
  or auth.uid() in (select user_id from public.admins where role = 'super_admin')
);

-- User catalog books policies
create policy "Kullanıcı katalog görüntüle" on public.user_catalog_books for select using (auth.uid() = user_id);
create policy "Kullanıcı katalog ekle" on public.user_catalog_books for insert with check (auth.uid() = user_id);
create policy "Kullanıcı katalog sil" on public.user_catalog_books for delete using (auth.uid() = user_id);

-- ============================================================
-- App Settings Table (admin configurable settings)
-- ============================================================
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz default now()
);

alter table public.app_settings enable row level security;

create policy "app_settings herkese okunur" on public.app_settings for select using (true);
create policy "app_settings sadece super_admin yazabilir" on public.app_settings for insert
  with check (auth.uid() in (select user_id from public.admins where role = 'super_admin'));
create policy "app_settings sadece super_admin guncelleyebilir" on public.app_settings for update
  using (auth.uid() in (select user_id from public.admins where role = 'super_admin'));

insert into public.app_settings (key, value, description) values
  ('daily_ai_requests_per_user', '10', 'Kullanıcı başına günlük AI analizi limiti'),
  ('max_books_per_user', '50', 'Kullanıcı başına maksimum kitap sayısı')
on conflict (key) do nothing;

-- Per-user daily AI usage columns on profiles
alter table public.profiles
  add column if not exists ai_requests_today int default 0,
  add column if not exists ai_requests_reset_date date;

-- ============================================================
-- AI Provider Config Table
-- ============================================================
create table if not exists public.ai_provider_config (
  id uuid default uuid_generate_v4() primary key,
  provider_name text unique not null,
  display_name text not null,
  is_enabled boolean default false,
  provider_category text not null check (provider_category in ('paid', 'free', 'free_limited')),
  daily_limit integer,
  requests_used_today integer default 0,
  last_reset_date date default current_date,
  tokens_remaining bigint,
  tokens_used_today bigint default 0,
  token_daily_limit bigint default null,
  total_tokens_used bigint default 0,
  fallback_threshold integer default 0,
  fallback_to text,
  priority integer default 999,
  model_name text,
  total_requests_made bigint default 0,
  updated_at timestamptz default now()
);

alter table public.ai_provider_config enable row level security;

create policy "AI provider config herkese okunur" on public.ai_provider_config for select using (true);
create policy "AI provider config sadece super_admin yazabilir" on public.ai_provider_config for insert
  with check (auth.uid() in (select user_id from public.admins where role = 'super_admin'));
create policy "AI provider config sadece super_admin guncelleyebilir" on public.ai_provider_config for update
  using (auth.uid() in (select user_id from public.admins where role = 'super_admin'));
create policy "AI provider config sadece super_admin silebilir" on public.ai_provider_config for delete
  using (auth.uid() in (select user_id from public.admins where role = 'super_admin'));

insert into public.ai_provider_config
  (provider_name, display_name, is_enabled, provider_category, priority, model_name, fallback_threshold, fallback_to, token_daily_limit)
values
  ('openai',      'ChatGPT (GPT-4o mini)',                      false, 'paid',         1, 'gpt-4o-mini',          0,   null, null),
  ('deepseek',    'DeepSeek V3',                                false, 'paid',         3, 'deepseek-chat',         0,   null, null),
  ('gemini_paid', 'Gemini 2.0 Flash (Ücretli)',                 false, 'paid',         2, 'gemini-2.0-flash',      0,   null, 1000000),
  ('gemini_free', 'Gemini 2.0 Flash (Ücretsiz, 1500/gün)',     true,  'free_limited', 4, 'gemini-2.0-flash',      100, 'groq', 1000000),
  ('groq',        'Groq LLaMA (Ücretsiz)',                      true,  'free',         5, 'llama-3.1-8b-instant',  80,  null, 500000)
on conflict (provider_name) do nothing;

-- ============================================================
-- Atomic increment function for AI provider usage tracking
-- ============================================================
create or replace function public.increment_provider_usage(
  p_provider_name text,
  p_today date,
  p_tokens_used bigint default 0
)
returns void as $$
begin
  update public.ai_provider_config
  set
    requests_used_today = case
      when last_reset_date = p_today then requests_used_today + 1
      else 1
    end,
    tokens_used_today = case
      when last_reset_date = p_today then tokens_used_today + p_tokens_used
      else p_tokens_used
    end,
    last_reset_date = p_today,
    total_requests_made = total_requests_made + 1,
    total_tokens_used = total_tokens_used + p_tokens_used,
    updated_at = now()
  where provider_name = p_provider_name;
end;
$$ language plpgsql security definer;
