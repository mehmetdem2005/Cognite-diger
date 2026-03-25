-- catalog_books tablosu için RLS politikaları
-- Supabase Dashboard > SQL Editor'da çalıştırın

-- RLS aktif değilse aktif edin
ALTER TABLE catalog_books ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "Anyone can read published catalog books" ON catalog_books;
DROP POLICY IF EXISTS "Admins can insert catalog books" ON catalog_books;
DROP POLICY IF EXISTS "Admins can update catalog books" ON catalog_books;
DROP POLICY IF EXISTS "Admins can delete catalog books" ON catalog_books;

-- Herkese (giriş yapmış kullanıcılar) yayınlanmış kitapları okuma izni
CREATE POLICY "Anyone can read published catalog books"
ON catalog_books FOR SELECT
TO authenticated
USING (is_published = true);

-- Admin ve super_admin'e INSERT izni
CREATE POLICY "Admins can insert catalog books"
ON catalog_books FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

-- Admin ve super_admin'e UPDATE izni
CREATE POLICY "Admins can update catalog books"
ON catalog_books FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

-- Admin ve super_admin'e DELETE izni
CREATE POLICY "Admins can delete catalog books"
ON catalog_books FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

-- Admin'in kendi eklediği yayınlanmamış kitapları da görmesine izin ver
CREATE POLICY "Admins can read all catalog books"
ON catalog_books FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);
