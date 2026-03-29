CREATE TABLE IF NOT EXISTS public.catalog_books (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  author text,
  cover_url text,
  description text,
  content text,
  file_url text,
  file_type text DEFAULT 'text',
  total_pages integer DEFAULT 1,
  language text DEFAULT 'tr',
  categories text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  level text,
  is_published boolean DEFAULT true,
  added_by uuid REFERENCES public.admins(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_admin_id uuid REFERENCES public.admins(id) ON DELETE CASCADE NOT NULL,
  to_admin_id uuid REFERENCES public.admins(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_broadcast boolean DEFAULT false,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_catalog_books (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  catalog_book_id uuid REFERENCES public.catalog_books(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, catalog_book_id)
);

ALTER TABLE public.catalog_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_catalog_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Katalog kitaplari herkes gorur" ON public.catalog_books;
CREATE POLICY "Katalog kitaplari herkes gorur" ON public.catalog_books FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Katalog kitaplarini admin yazar" ON public.catalog_books;
CREATE POLICY "Katalog kitaplarini admin yazar" ON public.catalog_books
FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admins))
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admins));

DROP POLICY IF EXISTS "Admin mesajlari adminlere ozel" ON public.admin_messages;
CREATE POLICY "Admin mesajlari adminlere ozel" ON public.admin_messages FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.admins));

DROP POLICY IF EXISTS "Admin mesaji gonder" ON public.admin_messages;
CREATE POLICY "Admin mesaji gonder" ON public.admin_messages FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admins));

DROP POLICY IF EXISTS "Kullanici katalog kitaplarini gorur" ON public.user_catalog_books;
CREATE POLICY "Kullanici katalog kitaplarini gorur" ON public.user_catalog_books FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Kullanici katalog kitap ekler" ON public.user_catalog_books;
CREATE POLICY "Kullanici katalog kitap ekler" ON public.user_catalog_books FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Kullanici katalog kitap siler" ON public.user_catalog_books;
CREATE POLICY "Kullanici katalog kitap siler" ON public.user_catalog_books FOR DELETE USING (auth.uid() = user_id);
