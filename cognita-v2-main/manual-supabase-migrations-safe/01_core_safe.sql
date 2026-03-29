CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  username text UNIQUE,
  avatar_url text,
  bio text,
  reading_speed_wpm integer DEFAULT 200,
  streak_days integer DEFAULT 0,
  total_pages_read integer DEFAULT 0,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  last_read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.books (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  author text,
  cover_url text,
  description text,
  content text,
  file_url text,
  file_type text DEFAULT 'text',
  total_pages integer DEFAULT 1,
  language text DEFAULT 'tr',
  tags text[] DEFAULT '{}',
  is_public boolean DEFAULT true,
  avg_rating numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  current_page integer DEFAULT 1,
  progress_percent numeric(5,2) DEFAULT 0,
  session_duration_seconds integer DEFAULT 0,
  wpm_measured integer,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.highlights (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  note text,
  page_number integer NOT NULL,
  color text DEFAULT 'amber',
  is_public boolean DEFAULT false,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  page_number integer,
  parent_id uuid REFERENCES public.comments(id),
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.likes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_id uuid NOT NULL,
  target_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_id, target_type)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can edit their own profile" ON public.profiles;
CREATE POLICY "Users can edit their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Books are viewable if public or owned by user" ON public.books;
CREATE POLICY "Books are viewable if public or owned by user" ON public.books FOR SELECT USING (is_public OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create books" ON public.books;
CREATE POLICY "Users can create books" ON public.books FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can edit their own books" ON public.books;
CREATE POLICY "Users can edit their own books" ON public.books FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Reading sessions are private" ON public.reading_sessions;
CREATE POLICY "Reading sessions are private" ON public.reading_sessions FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create reading sessions" ON public.reading_sessions;
CREATE POLICY "Users can create reading sessions" ON public.reading_sessions FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Comments are viewable if book is visible" ON public.comments;
CREATE POLICY "Comments are viewable if book is visible" ON public.comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.books
    WHERE books.id = comments.book_id
      AND (books.is_public OR books.user_id = auth.uid())
  )
);
