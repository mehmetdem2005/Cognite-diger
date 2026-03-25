-- RLS Politikaları
-- Supabase SQL Editor'da çalıştır (1. dosya)

alter table public.admins enable row level security;
alter table public.catalog_books enable row level security;
alter table public.admin_messages enable row level security;
alter table public.user_catalog_books enable row level security;

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

create policy "Mesaj görüntüle" on public.admin_messages for select using (
  auth.uid() in (select user_id from public.admins where id = from_admin_id or id = to_admin_id)
  or is_broadcast = true
);
create policy "Mesaj gönder" on public.admin_messages for insert with check (
  auth.uid() in (select user_id from public.admins where id = from_admin_id)
);
create policy "Mesaj okundu işaretle" on public.admin_messages for update using (
  auth.uid() in (select user_id from public.admins where id = to_admin_id)
);

create policy "Kullanıcı katalog görüntüle" on public.user_catalog_books for select using (auth.uid() = user_id);
create policy "Kullanıcı katalog ekle" on public.user_catalog_books for insert with check (auth.uid() = user_id);
create policy "Kullanıcı katalog sil" on public.user_catalog_books for delete using (auth.uid() = user_id);
