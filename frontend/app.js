let activeCategory = 'konut';
let activeJobPoll = null;

const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

const categoryHints = {
  konut: 'Konut için fiyat, m², oda, bina yaşı ve krediye uygunluk bilgileri önceliklidir.',
  arsa: 'Arsa için m², imar, tapu, ada/parsel ve yola cephe bilgileri puanı ciddi etkiler.',
  isyeri: 'İşyeri/ofis için m², cadde üzeri, kat ve kira potansiyeli önemlidir.',
  arac: 'Araç için marka, model, yıl, kilometre ve hasar kaydı bilgileri önceliklidir.',
};

const categoryLabels = { konut: 'Konut', arsa: 'Arsa', isyeri: 'İşyeri / Ofis', arac: 'Araç' };
const sourceTypeLabels = { json_feed: 'JSON Feed', rss_feed: 'RSS / Açık Feed' };
const jobStatusLabels = { queued: 'Sırada', running: 'Çalışıyor', succeeded: 'Tamamlandı', failed: 'Hata' };

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.hidden = false; setTimeout(() => { toast.hidden = true; }, 2600); }

function syncCategoryFields() {
  $('#categoryHint').textContent = categoryHints[activeCategory] || '';
  $$('[data-categories]').forEach(field => {
    const visible = (field.dataset.categories || '').split(' ').includes(activeCategory);
    field.hidden = !visible;
    field.querySelectorAll('input, textarea, select').forEach(input => { input.disabled = !visible; });
  });
}

function setActiveCategory(category) { activeCategory = category; $$('.subtab').forEach(btn => btn.classList.toggle('active', btn.dataset.category === category)); syncCategoryFields(); }

function bindTabs() {
  $$('.tab').forEach(btn => btn.addEventListener('click', () => {
    $$('.tab').forEach(b => b.classList.remove('active'));
    $$('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('#' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'sources') loadSources();
    if (btn.dataset.tab === 'jobs') loadJobs();
  }));
  $$('.subtab').forEach(btn => btn.addEventListener('click', () => { setActiveCategory(btn.dataset.category); loadListings(); loadSavedSearches(); }));
}

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function formDataToObject(form) { return Object.fromEntries(new FormData(form).entries()); }
function cleanValue(value) { if (value === undefined || value === null) return null; if (typeof value === 'string' && value.trim() === '') return null; return value; }

function buildCategoryProperties(raw) {
  const common = { m2: cleanValue(raw.m2) };
  if (activeCategory === 'konut') return { ...common, oda: cleanValue(raw.oda), bina_yasi: cleanValue(raw.bina_yasi), kat: cleanValue(raw.kat), isitma: cleanValue(raw.isitma), krediye_uygun: raw.krediye_uygun === 'on' };
  if (activeCategory === 'arsa') return { ...common, imar: cleanValue(raw.imar), tapu: cleanValue(raw.tapu), ada: cleanValue(raw.ada), parsel: cleanValue(raw.parsel), yol_cephe: raw.yol_cephe === 'on' };
  if (activeCategory === 'isyeri') return { ...common, isyeri_tipi: cleanValue(raw.isyeri_tipi), bina_yasi: cleanValue(raw.bina_yasi), kat: cleanValue(raw.kat), cadde_uzeri: raw.cadde_uzeri === 'on', kira_potansiyeli: cleanValue(raw.kira_potansiyeli) };
  if (activeCategory === 'arac') return { marka: cleanValue(raw.marka), model: cleanValue(raw.model), yil: cleanValue(raw.yil), km: cleanValue(raw.km), yakit: cleanValue(raw.yakit), vites: cleanValue(raw.vites), hasar_kaydi: cleanValue(raw.hasar_kaydi) };
  return common;
}

function renderProperties(item) {
  const p = item.properties || {};
  if (item.category === 'arac') return [p.marka, p.model, p.yil ? `${p.yil} model` : '', p.km ? `${Number(p.km).toLocaleString('tr-TR')} km` : ''].filter(Boolean).join(' · ');
  if (item.category === 'arsa') return [p.m2 ? `${p.m2} m²` : '', p.imar, p.tapu, p.yol_cephe ? 'yola cephe' : ''].filter(Boolean).join(' · ');
  if (item.category === 'isyeri') return [p.m2 ? `${p.m2} m²` : '', p.isyeri_tipi, p.cadde_uzeri ? 'cadde üzeri' : '', p.kat].filter(Boolean).join(' · ');
  return [p.m2 ? `${p.m2} m²` : '', p.oda, p.bina_yasi ? `${p.bina_yasi} yaş` : '', p.krediye_uygun ? 'krediye uygun' : ''].filter(Boolean).join(' · ');
}

function currentFilters() { return { q: $('#filterQ').value.trim(), city: $('#filterCity').value.trim(), district: $('#filterDistrict').value.trim(), min_price: $('#filterMinPrice').value.trim(), max_price: $('#filterMaxPrice').value.trim(), favorites: $('#filterFavorites').checked }; }
function applyFilters(filters = {}, sortMode = 'newest') { $('#filterQ').value = filters.q || ''; $('#filterCity').value = filters.city || ''; $('#filterDistrict').value = filters.district || ''; $('#filterMinPrice').value = filters.min_price || ''; $('#filterMaxPrice').value = filters.max_price || ''; $('#filterFavorites').checked = Boolean(filters.favorites); $('#sortMode').value = sortMode || 'newest'; }
function buildQueryParams() { const params = new URLSearchParams(); const filters = currentFilters(); params.set('category', activeCategory); params.set('sort', $('#sortMode').value); if (filters.q) params.set('q', filters.q); if (filters.city) params.set('city', filters.city); if (filters.district) params.set('district', filters.district); if (filters.min_price) params.set('min_price', filters.min_price); if (filters.max_price) params.set('max_price', filters.max_price); if (filters.favorites) params.set('favorites', 'true'); return params.toString(); }
function renderReasons(reasons = []) { if (!reasons.length) return '<p class="muted">Puan açıklaması yok.</p>'; return `<ul class="reasons">${reasons.map(reason => `<li>${reason}</li>`).join('')}</ul>`; }

async function updateCounts() { const all = await api('/api/listings'); const favs = await api('/api/listings?favorites=true'); $('#listingCount').textContent = `${all.length} kayıt`; $('#favoriteCount').textContent = `${favs.length} kayıt`; }

async function loadListings() {
  const items = await api(`/api/listings?${buildQueryParams()}`); await updateCounts();
  if (!items.length) { $('#listings').innerHTML = `<div class="empty-state"><b>Bu kategoride ilan bulunamadı.</b><p>İlk ilanı ekleyebilir, filtreleri temizleyebilir veya resmî arama linki oluşturabilirsin.</p></div>`; return; }
  $('#listings').innerHTML = items.map(item => `<article class="listing">${item.image_url ? `<img src="${item.image_url}" alt="${item.title}">` : `<div class="image-placeholder">Görsel yok</div>`}<div class="listing-body"><div class="listing-head"><h3>${item.title}</h3><button class="icon-btn" data-action="favorite" data-id="${item.id}" data-current="${item.is_favorite}">${item.is_favorite ? '★' : '☆'}</button></div><div class="price">${Number(item.price).toLocaleString('tr-TR')} ${item.currency}</div><p>${[item.city, item.district, item.neighborhood].filter(Boolean).join(' / ') || 'Konum yok'}</p><p class="property-line">${renderProperties(item) || 'Kategori özelliği yok'}</p><span class="score">${item.score} · ${item.risk_level}</span><details class="score-details"><summary>Puan nedenleri</summary>${renderReasons(item.score_reasons)}</details><div class="listing-actions">${item.listing_url ? `<a href="${item.listing_url}" target="_blank" rel="noopener">İlanı aç</a>` : ''}<button class="danger-link" data-action="delete" data-id="${item.id}">Sil</button></div></div></article>`).join('');
}

async function loadSavedSearches() { const items = await api(`/api/saved-searches?category=${activeCategory}`); if (!items.length) { $('#savedSearches').innerHTML = '<div class="empty-mini">Bu kategori için kayıtlı arama yok.</div>'; return; } $('#savedSearches').innerHTML = items.map(item => `<div class="saved-search-card"><div><b>${item.name}</b><span>${categoryLabels[item.category] || item.category} · ${item.sort_mode}</span></div><div class="saved-actions"><button data-search-action="load" data-id="${item.id}">Yükle</button><button data-search-action="delete" data-id="${item.id}" class="danger-small">Sil</button></div></div>`).join(''); }
async function saveCurrentSearch() { const name = prompt('Bu aramaya isim ver:', `${categoryLabels[activeCategory]} aramam`); if (!name || !name.trim()) return; await api('/api/saved-searches', { method: 'POST', body: JSON.stringify({ name: name.trim(), category: activeCategory, filters: currentFilters(), sort_mode: $('#sortMode').value, notification_enabled: false }) }); showToast('Arama kaydedildi.'); await loadSavedSearches(); }
function bindSavedSearches() { $('#saveSearchBtn').addEventListener('click', saveCurrentSearch); $('#savedSearches').addEventListener('click', async (e) => { const target = e.target.closest('[data-search-action]'); if (!target) return; const id = target.dataset.id; if (target.dataset.searchAction === 'load') { const saved = await api(`/api/saved-searches/${id}`); setActiveCategory(saved.category); applyFilters(saved.filters, saved.sort_mode); await loadListings(); await loadSavedSearches(); showToast('Kayıtlı arama yüklendi.'); } if (target.dataset.searchAction === 'delete') { if (!confirm('Kayıtlı arama silinsin mi?')) return; await api(`/api/saved-searches/${id}`, { method: 'DELETE' }); showToast('Kayıtlı arama silindi.'); await loadSavedSearches(); } }); }

async function importListingsFromJsonFile() { const file = $('#importJsonInput').files?.[0]; if (!file) { showToast('Önce bir JSON dosyası seç.'); return; } const text = await file.text(); let parsed; try { parsed = JSON.parse(text); } catch { showToast('JSON dosyası okunamadı.'); return; } const listings = Array.isArray(parsed) ? parsed : parsed.listings; if (!Array.isArray(listings)) { showToast('Yedek dosyasında listings listesi yok.'); return; } const normalized = listings.map(item => ({ source: item.source || 'manual', category: item.category, title: item.title, price: Number(item.price || 0), currency: item.currency || 'TRY', city: item.city || '', district: item.district || '', neighborhood: item.neighborhood || '', listing_url: item.listing_url || null, image_url: item.image_url || null, properties: item.properties || {}, contact: item.contact || {}, notes: item.notes || '', is_favorite: Boolean(item.is_favorite) })); const result = await api('/api/import/listings', { method: 'POST', body: JSON.stringify({ listings: normalized }) }); showToast(`${result.imported_count} ilan içe aktarıldı.`); $('#importJsonInput').value = ''; await loadListings(); }
function bindBackupControls() { $('#importJsonBtn').addEventListener('click', importListingsFromJsonFile); }

function bindListingForm() {
  $('#listingForm').addEventListener('submit', async (e) => { e.preventDefault(); const raw = formDataToObject(e.currentTarget); const payload = { source: 'manual', category: activeCategory, title: raw.title, price: Number(raw.price || 0), city: raw.city || '', district: raw.district || '', neighborhood: raw.neighborhood || '', listing_url: raw.listing_url || null, image_url: raw.image_url || null, notes: raw.notes || '', properties: buildCategoryProperties(raw), contact: {} }; await api('/api/listings', { method: 'POST', body: JSON.stringify(payload) }); e.currentTarget.reset(); syncCategoryFields(); showToast('İlan havuza eklendi.'); await loadListings(); });
  $('#sortMode').addEventListener('change', loadListings); $('#applyFiltersBtn').addEventListener('click', loadListings); $('#filterFavorites').addEventListener('change', loadListings); $('#clearFiltersBtn').addEventListener('click', async () => { applyFilters({}, 'newest'); await loadListings(); });
  $('#makeLinksBtn').addEventListener('click', async () => { const city = $('#filterCity').value || $('#listingForm [name="city"]').value || ''; const district = $('#filterDistrict').value || $('#listingForm [name="district"]').value || ''; const neighborhood = $('#listingForm [name="neighborhood"]').value || ''; const links = await api('/api/search-links', { method: 'POST', body: JSON.stringify({ category: activeCategory, city, district, neighborhood, keywords: $('#filterQ').value || '' }) }); $('#searchLinks').innerHTML = links.map(x => `<a href="${x.url}" target="_blank" rel="noopener">${x.source}: ${x.url}<br><small>${x.note}</small></a>`).join(''); });
  $('#listings').addEventListener('click', async (e) => { const target = e.target.closest('[data-action]'); if (!target) return; const id = target.dataset.id; if (target.dataset.action === 'favorite') { const current = target.dataset.current === 'true'; await api(`/api/listings/${id}/favorite`, { method: 'PATCH', body: JSON.stringify({ is_favorite: !current }) }); showToast(!current ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.'); await loadListings(); } if (target.dataset.action === 'delete') { if (!confirm('Bu ilan silinsin mi?')) return; await api(`/api/listings/${id}`, { method: 'DELETE' }); showToast('İlan silindi.'); await loadListings(); } });
}

function sourceStatusText(source) {
  const status = source.last_status || 'never_run';
  if (status === 'ok') return `Son durum: başarılı${source.last_synced_at ? ' · ' + source.last_synced_at : ''}`;
  if (status === 'error') return `Son durum: hata · ${source.last_error || 'bilinmeyen hata'}`;
  return 'Henüz senkronize edilmedi.';
}

async function loadSources() {
  const items = await api('/api/data-sources');
  if (!items.length) {
    $('#sourceList').innerHTML = '<div class="empty-state"><b>Henüz veri kaynağı yok.</b><p>İzinli JSON/RSS feed ekleyerek otomatik ilan akışını başlat.</p></div>';
    return;
  }
  $('#sourceList').innerHTML = items.map(source => `<article class="source-card"><div><h3>${source.name}</h3><p>${sourceTypeLabels[source.source_type] || source.source_type} · ${categoryLabels[source.category] || source.category}</p><small>${source.url}</small><span class="source-status ${source.last_status === 'error' ? 'bad' : ''}">${sourceStatusText(source)}</span></div><div class="source-actions"><button data-source-action="sync" data-id="${source.id}">Senkronize Et</button><button data-source-action="delete" data-id="${source.id}" class="danger-small">Sil</button></div></article>`).join('');
}

async function syncAllSourcesNow(button) {
  button.disabled = true;
  button.textContent = 'İş oluşturuluyor...';
  try {
    const result = await api('/api/jobs/source-sync-all', { method: 'POST' });
    showToast(`Arka plan işi oluşturuldu: #${result.job_id}`);
    await loadJobs();
    showJobDetail(result.job_id);
  } catch (err) {
    showToast('Arka plan işi oluşturulamadı.');
  } finally {
    button.disabled = false;
    button.textContent = 'Tüm Kaynakları Arka Planda Senkronize Et';
  }
}

function bindSources() {
  $('#syncAllSourcesBtn').addEventListener('click', (e) => syncAllSourcesNow(e.currentTarget));
  $('#sourceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = formDataToObject(e.currentTarget);
    await api('/api/data-sources', { method: 'POST', body: JSON.stringify({ name: raw.name, source_type: raw.source_type, url: raw.url, category: raw.category, enabled: true, config: {} }) });
    e.currentTarget.reset();
    showToast('Veri kaynağı eklendi.');
    await loadSources();
  });
  $('#sourceList').addEventListener('click', async (e) => {
    const target = e.target.closest('[data-source-action]');
    if (!target) return;
    const id = target.dataset.id;
    if (target.dataset.sourceAction === 'sync') {
      target.disabled = true;
      target.textContent = 'Senkronize ediliyor...';
      try {
        const result = await api(`/api/data-sources/${id}/sync`, { method: 'POST' });
        showToast(`${result.imported_count} yeni ilan eklendi, ${result.skipped_count} tekrar atlandı.`);
        await loadSources();
        await loadListings();
      } catch (err) {
        showToast('Senkronizasyon başarısız. Kaynak durumunu kontrol et.');
        await loadSources();
      }
    }
    if (target.dataset.sourceAction === 'delete') {
      if (!confirm('Veri kaynağı silinsin mi? Daha önce gelen ilanlar silinmez.')) return;
      await api(`/api/data-sources/${id}`, { method: 'DELETE' });
      showToast('Veri kaynağı silindi.');
      await loadSources();
    }
  });
}

function progressText(job) {
  const total = Number(job.progress_total || 0);
  const current = Number(job.progress_current || 0);
  return total > 0 ? `${current}/${total}` : jobStatusLabels[job.status] || job.status;
}

function progressPercent(job) {
  const total = Number(job.progress_total || 0);
  if (total <= 0) return job.status === 'succeeded' ? 100 : 0;
  return Math.min(100, Math.round((Number(job.progress_current || 0) / total) * 100));
}

async function loadJobs() {
  const jobs = await api('/api/jobs?limit=30');
  if (!jobs.length) {
    $('#jobList').innerHTML = '<div class="empty-state"><b>Henüz iş yok.</b><p>Veri Kaynakları sekmesinden toplu senkronizasyon başlatabilirsin.</p></div>';
    return;
  }
  $('#jobList').innerHTML = jobs.map(job => `<article class="job-card ${job.status}"><div><b>#${job.id} · ${job.title}</b><span>${jobStatusLabels[job.status] || job.status} · ${progressText(job)}</span><div class="progress"><i style="width:${progressPercent(job)}%"></i></div></div><button data-job-id="${job.id}">Detay</button></article>`).join('');
}

async function showJobDetail(jobId) {
  const [job, events] = await Promise.all([api(`/api/jobs/${jobId}`), api(`/api/jobs/${jobId}/events`)]);
  $('#jobDetail').innerHTML = `<div class="job-detail-card"><h3>İş #${job.id}</h3><p><b>Durum:</b> ${jobStatusLabels[job.status] || job.status}</p><p><b>İlerleme:</b> ${progressText(job)}</p>${job.error ? `<p class="danger-text"><b>Hata:</b> ${job.error}</p>` : ''}<div class="progress"><i style="width:${progressPercent(job)}%"></i></div><h4>Olaylar</h4>${events.length ? events.map(ev => `<div class="job-event ${ev.level}"><b>${ev.created_at || ''}</b><span>${ev.message}</span></div>`).join('') : '<p class="muted">Henüz olay yok.</p>'}</div>`;
  if (activeJobPoll) clearInterval(activeJobPoll);
  if (['queued', 'running'].includes(job.status)) {
    activeJobPoll = setInterval(async () => {
      await loadJobs();
      await showJobDetail(jobId);
      const fresh = await api(`/api/jobs/${jobId}`);
      if (!['queued', 'running'].includes(fresh.status)) {
        clearInterval(activeJobPoll);
        activeJobPoll = null;
        await loadSources();
        await loadListings();
      }
    }, 2500);
  }
}

function bindJobs() {
  $('#refreshJobsBtn').addEventListener('click', loadJobs);
  $('#jobList').addEventListener('click', (e) => {
    const target = e.target.closest('[data-job-id]');
    if (target) showJobDetail(target.dataset.jobId);
  });
}

function parseKeywords(value) { return (value || '').split(',').map(x => x.trim()).filter(Boolean); }
function renderMeclisResult(result) { $('#meclisSummary').hidden = false; $('#meclisSummary').innerHTML = `<b>${result.matched_keywords} anahtar kelime eşleşti</b><span>${result.total_hits} toplam eşleşme · ${result.text_length} karakter</span>${result.pdf ? `<span>PDF: ${result.pdf.filename} · ${result.pdf.page_count} sayfa${result.pdf.needs_ocr ? ' · OCR gerekebilir' : ''}</span>` : ''}`; const rows = result.keywords || []; if (!rows.length) { $('#meclisResults').innerHTML = '<div class="empty-state"><b>Anahtar kelime yok.</b></div>'; return; } $('#meclisResults').innerHTML = rows.map(row => `<article class="meclis-card ${row.found ? 'hit' : 'miss'}"><div class="meclis-card-head"><b>${row.keyword}</b><span>${row.count} eşleşme</span></div>${row.contexts?.length ? row.contexts.map(ctx => `<p>${ctx}</p>`).join('') : '<p class="muted">Bu kelime bulunamadı.</p>'}</article>`).join(''); }
async function scanMeclisText(e) { e.preventDefault(); const raw = formDataToObject(e.currentTarget); const keywords = parseKeywords(raw.keywords); if (!raw.text?.trim()) { showToast('Metin alanı boş. PDF taramak için PDF butonunu kullan.'); return; } const result = await api('/api/meclis/scan', { method: 'POST', body: JSON.stringify({ municipality_name: raw.municipality_name || '', keywords, text: raw.text }) }); renderMeclisResult(result); showToast('Metin tarandı.'); }
async function scanMeclisPdf() { const form = $('#meclisForm'); const raw = formDataToObject(form); const file = $('#meclisPdfInput').files?.[0]; const keywords = parseKeywords(raw.keywords); if (!file) { showToast('Önce PDF seç.'); return; } if (!keywords.length) { showToast('En az bir anahtar kelime gir.'); return; } const data = new FormData(); data.append('file', file); data.append('keywords_json', JSON.stringify(keywords)); data.append('municipality_name', raw.municipality_name || ''); const res = await fetch('/api/meclis/scan-pdf', { method: 'POST', body: data }); if (!res.ok) { showToast(await res.text()); return; } const result = await res.json(); renderMeclisResult(result); showToast('PDF tarandı.'); }
function bindMeclis() { $('#meclisForm').addEventListener('submit', scanMeclisText); $('#scanPdfBtn').addEventListener('click', scanMeclisPdf); }
function bindPolicy() { $('#policyBtn').addEventListener('click', async () => { const policy = await api('/api/policy'); alert(policy.scraping + '\n\nİzinli yollar:\n- ' + policy.allowed_sources.join('\n- ')); }); }

bindTabs(); bindListingForm(); bindSavedSearches(); bindBackupControls(); bindSources(); bindJobs(); bindMeclis(); bindPolicy(); syncCategoryFields(); loadListings(); loadSavedSearches(); loadSources(); loadJobs();