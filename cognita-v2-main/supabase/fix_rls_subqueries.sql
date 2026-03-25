-- RLS Subquery Güvenlik Düzeltmesi
-- IN (subquery) yerine EXISTS kullan — NULL ile güvenli, daha performanslı
-- Supabase SQL Editor'da çalıştır

-- ─── admins tablosu ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admin ekle" ON public.admins;
DROP POLICY IF EXISTS "Admin sil" ON public.admins;
DROP POLICY IF EXISTS "Admin güncelle" ON public.admins;

CREATE POLICY "Admin ekle" ON public.admins FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Admin sil" ON public.admins FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Admin güncelle" ON public.admins FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- ─── catalog_books tablosu ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Katalog ekle" ON public.catalog_books;
DROP POLICY IF EXISTS "Katalog güncelle" ON public.catalog_books;
DROP POLICY IF EXISTS "Katalog sil" ON public.catalog_books;

CREATE POLICY "Katalog ekle" ON public.catalog_books FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Katalog güncelle" ON public.catalog_books FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Katalog sil" ON public.catalog_books FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- ─── admin_messages tablosu ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Mesaj görüntüle" ON public.admin_messages;
DROP POLICY IF EXISTS "Mesaj gönder" ON public.admin_messages;
DROP POLICY IF EXISTS "Mesaj okundu işaretle" ON public.admin_messages;

CREATE POLICY "Mesaj görüntüle" ON public.admin_messages FOR SELECT USING (
  is_broadcast = true
  OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND (id = from_admin_id OR id = to_admin_id))
);
CREATE POLICY "Mesaj gönder" ON public.admin_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND id = from_admin_id)
);
CREATE POLICY "Mesaj okundu işaretle" ON public.admin_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND id = to_admin_id)
);

-- ─── ai_provider_config tablosu ────────────────────────────────────────────

DROP POLICY IF EXISTS "AI provider config sadece super_admin yazabilir" ON public.ai_provider_config;
DROP POLICY IF EXISTS "AI provider config sadece super_admin guncelleyebilir" ON public.ai_provider_config;
DROP POLICY IF EXISTS "AI provider config sadece super_admin silebilir" ON public.ai_provider_config;

CREATE POLICY "AI provider config sadece super_admin yazabilir"
  ON public.ai_provider_config FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "AI provider config sadece super_admin guncelleyebilir"
  ON public.ai_provider_config FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "AI provider config sadece super_admin silebilir"
  ON public.ai_provider_config FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));
