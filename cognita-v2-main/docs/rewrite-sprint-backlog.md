# Rebuild Sprint Backlog (Kickoff)

## Sprint 0 - Discovery and Freeze (1 hafta)
- [ ] Current-state architecture map
- [ ] Critical user flow list (login, home, reader, progress)
- [ ] UI inventory: ekran/component/style envanteri
- [ ] DB inventory: tablo, RLS, trigger, function listesi
- [ ] API inventory: endpoint + auth + response format
- [ ] Legacy freeze kurali: sadece blocker bug fix
- [ ] UI parity screenshot baseline (mobile/tablet/desktop)
- [ ] Critical flow video baseline
- [ ] Env key inventory (isimler)
- [ ] Route parity listesi (eski -> yeni)
- [ ] Component parity listesi (eski -> yeni)

## Sprint 1 - Foundation (1-2 hafta)
- [ ] `src/features` klasor yapisi
- [ ] Design token altyapisi
- [ ] Core UI kit (Button, Card, Modal, Input, Tabs, Badge)
- [ ] API handler standard middleware
- [ ] Error model standardizasyonu
- [ ] CI gates: lint + typecheck + test
- [ ] ESLint rule: inline style uyarisi/engeli
- [ ] Shared fetch client + typed response model
- [ ] Perf baseline olcum scriptleri

## Sprint 2 - Auth + Shell (1-2 hafta)
- [ ] Auth/login/register/settings yeniden yazim
- [ ] Profile temel ekrani
- [ ] App shell (header/sidebar/bottom nav)
- [ ] Theme + i18n state tutarliligi
- [ ] E2E: auth + shell navigation

## Sprint 3 - Home + Reader Core (2 hafta)
- [ ] Home feed kartlari rebuild
- [ ] Quick actions rebuild (inline style yok)
- [ ] Reader core data flow rebuild
- [ ] Progress tracking v2
- [ ] E2E: home -> reader -> progress
- [ ] Reader p95 latency ve render metrikleri

## Sprint 4 - Catalog/Explore/Social (2 hafta)
- [ ] Catalog + filters + search
- [ ] Explore category experiences
- [ ] Notifications/leaderboard basics
- [ ] Clubs v1
- [ ] Perf budgets (LCP, TTI, bundle)

## Sprint 5 - Challenges/Admin/Hardening (2 hafta)
- [ ] Challenges + achievements
- [ ] Admin critical flows
- [ ] Data migration cutover
- [ ] Visual regression final pass
- [ ] Bug bash + release checklist
- [ ] Legacy removal checklist tamamla
- [ ] Rollback runbook dry-run

## Ready Definition
- Requirement net
- API contract hazir
- Tasarim token map tamam
- Test senaryolari yazilmis

## Done Definition
- Kod review tamam
- Testler yesil
- Telemetry eventleri eklendi
- Dokumantasyon guncel
- Feature flag rollout hazir
- UI parity diff yok (onayli)
- Perf target sapmasi kabul limitinde

## Immediate Next 72 Hours
- [ ] Rewrite war-room board ac
- [ ] 10 kritik flow icin owner ata
- [ ] Sprint 0 inventory dokumanlarini doldur
- [ ] CI gate eksiklerini kapat
- [ ] UI token naming sozlugunu netlestir
- [ ] `rewrite-key-and-parity-notes.md` dokumanini doldur
