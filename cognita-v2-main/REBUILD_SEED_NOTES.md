# Rebuild Seed Notes

Tarih: 2026-03-29
Amac: Kalan kok dosyalardan gerekli kisimlari notlamak ve sifirdan yazimda referans birakmak.

## 1) package.json - Gerekli Cekirdek
### Koru
- Paket adi/versiyon:
  - name: cognita
  - version: 5.0.0
- Cekirdek scriptler:
  - dev
  - build
  - start
  - lint
  - type-check
- Cekirdek bagimliliklar:
  - next 16.x
  - react/react-dom 19.x
  - tailwindcss 4.x
  - typescript 5.x
  - eslint + eslint-config-next

### Sifirdan Yaz
- Silinen klasorlere referans veren scriptler:
  - db:migrate:localization
  - db:verify:localization
  - db:migrate:linga
  - db:verify:linga
- Kullanilmayacak AI/DB paketleri yeni mimariye gore yeniden secilecek.

## 2) next.config.ts - Gerekli Cekirdek
### Koru
- guvenlik headerlari
- images.remotePatterns mantigi (supabase/gutenberg alanlari)
- output: standalone
- compress: true

### Sifirdan Yaz
- typescript.ignoreBuildErrors: true (kaldirilacak)
- experimental optimizePackageImports listesi yeni bagimliliklara gore yeniden yazilacak
- reactCompiler/turbopack ayarlari yeni baseline ile tekrar karar verilecek

## 3) tsconfig.json - Gerekli Cekirdek
### Koru
- moduleResolution: bundler
- jsx: react-jsx
- baseUrl + @/* path alias mantigi
- noEmit + resolveJsonModule + isolatedModules

### Sifirdan Yaz
- strict: false yerine strict: true
- allowJs: true yerine tercihen false
- include/desenleri yeni klasor yapisina gore sadeleştir

## 4) tailwind.config.ts - Gerekli Cekirdek
### Koru
- content alanlari (app + src)
- color/spacing/radius token yaklasimi
- xs ve 3xl ekran tanimlari

### Sifirdan Yaz
- kullanilmayan extend kisimlari temizlenecek
- sadece yeni design-system tokenlari birakilacak
- animation ve shadow seti sadeleştirilecek

## 5) postcss.config.mjs - Gerekli Cekirdek
### Koru
- @tailwindcss/postcss plugin

### Sifirdan Yaz
- ekstra plugin gerekirse yeni mimaride eklenecek

## 6) .env.example - Gerekli Cekirdek
### Koru (isimler)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_API_URL
- GROQ_API_KEY
- NEXT_PUBLIC_AI_PROVIDER
- NEXT_PUBLIC_ENV

### Sifirdan Yaz
- Kullanilmayan keyler kaldirilacak
- provider keyleri yeni AI stratejisine gore sadeleşecek

## 7) SETUP.md - Gerekli Cekirdek
### Koru
- env setup akisi
- local dev komut mantigi

### Sifirdan Yaz
- Silinen backend/supabase/scripts referanslari kaldirilacak
- yeni rebuild klasor yapisina uygun setup dokumani yazilacak

## 8) CSS_SYSTEM.md - Gerekli Cekirdek
### Koru
- tema token felsefesi (light/dark)
- spacing/radius/shadow semantik yaklasimi
- inline style'dan kacınma prensibi

### Sifirdan Yaz
- dosyadaki uygulama-ozel eski class ornekleri sadeleştirilecek
- sadece yeni core component setine uygun dokuman kalacak

## 9) Kalmasi Uygun Kalan Dosyalar
- package.json
- next.config.ts
- tsconfig.json
- tailwind.config.ts
- postcss.config.mjs
- .env.example
- .gitignore
- LICENSE
- README.md (sonra yeniden yaz)

## 10) Sonraki Aksiyon
1. package.json minimalize et (silinen scriptleri cikar).
2. strict TypeScript baseline kur.
3. app, src, public klasorlerini sifirdan olustur.
4. yeni README + SETUP yaz.
