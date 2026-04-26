let activeCategory = 'konut';

const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

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
  const data = Object.fromEntries(new FormData(form).entries());
  return data;
}

async function loadListings() {
  const sort = $('#sortMode').value;
  const items = await api(`/api/listings?category=${activeCategory}&sort=${sort}`);
  $('#listingCount').textContent = `${items.length} kayıt`;
  $('#listings').innerHTML = items.map(item => `
    <article class="listing">
      ${item.image_url ? `<img src="${item.image_url}" alt="">` : `<img alt="Görsel yok">`}
      <div class="listing-body">
        <h3>${item.title}</h3>
        <div class="price">${Number(item.price).toLocaleString('tr-TR')} ${item.currency}</div>
        <p>${[item.city, item.district, item.neighborhood].filter(Boolean).join(' / ') || 'Konum yok'}</p>
        <span class="score">${item.score} · ${item.risk_level}</span>
        ${item.listing_url ? `<p><a href="${item.listing_url}" target="_blank" rel="noopener">İlanı aç</a></p>` : ''}
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
        yil: raw.yil || null,
        km: raw.km || null,
      },
      contact: {},
    };
    await api('/api/listings', { method: 'POST', body: JSON.stringify(payload) });
    e.currentTarget.reset();
    await loadListings();
  });

  $('#sortMode').addEventListener('change', loadListings);

  $('#makeLinksBtn').addEventListener('click', async () => {
    const city = $('#listingForm [name="city"]').value || '';
    const district = $('#listingForm [name="district"]').value || '';
    const neighborhood = $('#listingForm [name="neighborhood"]').value || '';
    const links = await api('/api/search-links', {
      method: 'POST',
      body: JSON.stringify({ category: activeCategory, city, district, neighborhood, keywords: '' }),
    });
    $('#searchLinks').innerHTML = links.map(x => `<a href="${x.url}" target="_blank" rel="noopener">${x.source}: ${x.url}<br><small>${x.note}</small></a>`).join('');
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