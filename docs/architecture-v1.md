# Cognita Architecture V1

## Katmanlar
- app: routing, page composition
- features: domain bazli moduller
- shared: tekrar kullanilabilir UI, utility, config

## Hedef Modul Agaci
- src/features/auth
- src/features/home
- src/features/reader
- src/features/catalog
- src/features/social

## Kurallar
- Inline style yok
- Her feature icin `ui`, `services`, `types` klasorleri
- API adapter katmani feature disinda tutulur
- Strict TypeScript zorunlu
