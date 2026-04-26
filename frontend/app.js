let activeCategory = 'konut';

const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 2600);
}

function bindTabs() {
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach(b => b.classList.remove('active'));
      $$('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $('#' + btn.dataset.tab).classList.add('active');
    });
  });

  $$('.subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.subtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      loadListings();
    });
  });
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function formDataToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function buildQueryParams() {
  const params = new URLSearchParams();
  params.set('category', activeCategory);
  params.set('sort', $('#sortMode').value);

  const q = $('#filterQ').value.trim();
  const city = $('#filterCity').value.trim();
  const district = $('#filterDistrict').value.trim();
  const minPrice = $('#filterMinPrice').value.trim();
  const maxPrice = $('#filterMaxPrice').value.trim();
  const favorites = $('#filterFavorites').checked;

  if (q) params.set('q', q);
  if (city) params.set('city', city);
  if (district) params.set('district', district);
  if (minPrice) params.set('min_price', minPrice);
  if (maxPrice) params.set('max_price', maxPrice);
  if (favorites) params.set('favorites', 'true');

  return params.toString();
}

function renderReasons(reasons = []) {
  if (!reasons.length) return '<p class="muted">Puan açıklaması yok.</p>';
  return `<ul class="reasons">${reasons.map(reason => `<li>${reason}</li>`).join('')}</ul>`;
}

async function updateCounts() {
  const all = await api('/api/listings');
  const favs = await api('/api/listings?favorites=true');
  $('#listingCount').textContent = `${all.length} kayıt`;
  $('#favoriteCount').textContent = `${favs.length} kayıt`;
}

async function loadListings() {
  const items = await api(`/api/listings?${buildQueryParams()}`);
  await updateCounts();

  if (!items.length) {
    $('#listings').innerHTML = `
      <div class="empty-state">
        <b>Bu kategoride ilan bulunamadı.</b>
        <p>İlk ilanı ekleyebilir, filtreleri temizleyebilir veya resmî arama linki oluşturabilirsin.</p>
      </div>`;
    return;
  }

  $('#listings').innerHTML = items.map(item => `
    <article class="listing">
      ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}">` : `<div class="image-placeholder">Görsel yok</div>`}
      <div class="listing-body">
        <div class="listing-head">
          <h3>${item.title}</h3>
          <button class="icon-btn" data-action="favorite" data-id="${item.id}" data-current="${item.is_favorite}">${item.is_favorite ? '★' : '☆'}</button>
        </div>
        <div class="price">${Number(item.price).toLocaleString('tr-TR')} ${item.currency}</div>
        <p>${[item.city, item.district, item.neighborhood].filter(Boolean).join(' / ') || 'Konum yok'}</p>
        <span class="score">${item.score} · ${item.risk_level}</span>
        <details class="score-details">
          <summary>Puan nedenleri</summary>
          ${renderReasons(item.score_reasons)}
        </details>
        <div class="listing-actions">
          ${item.listing_url ? `<a href="${item.listing_url}" target="_blank" rel="noopener">İlanı aç</a>` : ''}
          <button class="danger-link" data-action="delete" data-id="${item.id}">Sil</button>
        </div>
      </div>
    </article>
  `).join('');
}

function bindListingForm() {
  $('#listingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = formDataToObject(e.currentTarget);
    const payload = {
      source: 'manual',
      category: activeCategory,
      title: raw.title,
      price: Number(raw.price || 0),
      city: raw.city || '',
      district: raw.district || '',
      neighborhood: raw.neighborhood || '',
      listing_url: raw.listing_url || null,
      image_url: raw.image_url || null,
      notes: raw.notes || '',
      properties: {
        m2: raw.m2 || null,
        bina_yasi: raw.bina_yasi || null,
        imar: raw.imar || null,
        tapu: raw.tapu || null,
        yil: raw.yil || null,
        km: raw.km || null,
        hasar_kaydi: raw.hasar_kaydi || null,
      },
      contact: {},
    };
    await api('/api/listings', { method: 'POST', body: JSON.stringify(payload) });
    e.currentTarget.reset();
    showToast('İlan havuza eklendi.');
    await loadListings();
  });

  $('#sortMode').addEventListener('change', loadListings);
  $('#applyFiltersBtn').addEventListener('click', loadListings);
  $('#filterFavorites').addEventListener('change', loadListings);

  $('#clearFiltersBtn').addEventListener('click', async () => {
    ['#filterQ', '#filterCity', '#filterDistrict', '#filterMinPrice', '#filterMaxPrice'].forEach(id => { $(id).value = ''; });
    $('#filterFavorites').checked = false;
    await loadListings();
  });

  $('#makeLinksBtn').addEventListener('click', async () => {
    const city = $('#filterCity').value || $('#listingForm [name="city"]').value || '';
    const district = $('#filterDistrict').value || $('#listingForm [name="district"]').value || '';
    const neighborhood = $('#listingForm [name="neighborhood"]').value || '';
    const links = await api('/api/search-links', {
      method: 'POST',
      body: JSON.stringify({ category: activeCategory, city, district, neighborhood, keywords: $('#filterQ').value || '' }),
    });
    $('#searchLinks').innerHTML = links.map(x => `<a href="${x.url}" target="_blank" rel="noopener">${x.source}: ${x.url}<br><small>${x.note}</small></a>`).join('');
  });

  $('#listings').addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const id = target.dataset.id;

    if (target.dataset.action === 'favorite') {
      const current = target.dataset.current === 'true';
      await api(`/api/listings/${id}/favorite`, {
        method: 'PATCH',
        body: JSON.stringify({ is_favorite: !current }),
      });
      showToast(!current ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.');
      await loadListings();
    }

    if (target.dataset.action === 'delete') {
      const ok = confirm('Bu ilan silinsin mi?');
      if (!ok) return;
      await api(`/api/listings/${id}`, { method: 'DELETE' });
      showToast('İlan silindi.');
      await loadListings();
    }
  });
}

function bindMeclis() {
  $('#meclisForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = formDataToObject(e.currentTarget);
    const keywords = (raw.keywords || '').split(',').map(x => x.trim()).filter(Boolean);
    const result = await api('/api/meclis/scan', {
      method: 'POST',
      body: JSON.stringify({ municipality_name: raw.municipality_name, municipality_url: raw.municipality_url || null, keywords }),
    });
    $('#meclisResult').textContent = JSON.stringify(result, null, 2);
  });
}

function bindPolicy() {
  $('#policyBtn').addEventListener('click', async () => {
    const policy = await api('/api/policy');
    alert(policy.scraping + '\n\nİzinli yollar:\n- ' + policy.allowed_sources.join('\n- '));
  });
}

bindTabs();
bindListingForm();
bindMeclis();
bindPolicy();
loadListings();