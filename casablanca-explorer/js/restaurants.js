// ── State ─────────────────────────────────────────────────────────────────────
let _restaurants   = [];
let _restMarkers   = [];
let _restFetched   = false;

// ── Fetch from Overpass (with fallback) ───────────────────────────────────────
async function fetchRestaurants(lat, lng, radiusM) {
  _setRestLoading();

  const query = `[out:json][timeout:20];
(
  node["amenity"="restaurant"](around:${radiusM},${lat},${lng});
  way["amenity"="restaurant"](around:${radiusM},${lat},${lng});
);
out body;`;

  try {
    const res  = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    _restaurants = data.elements
      .filter(el => el.lat && el.lon && el.tags?.name)
      .map(el => ({
        id:           'osm_' + el.id,
        name:         el.tags.name,
        cuisine:      (el.tags.cuisine || 'Various').replace(/_/g, ', '),
        phone:        el.tags.phone || null,
        openingHours: el.tags.opening_hours || null,
        lat:          el.lat,
        lng:          el.lon,
        dist:         haversineDistance(lat, lng, el.lat, el.lon),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 25);

    if (_restaurants.length === 0) throw new Error('empty');
    _restFetched = true;
  } catch (_) {
    // Fallback to curated list
    _restaurants = FALLBACK_RESTAURANTS
      .map(r => ({ ...r, dist: haversineDistance(lat, lng, r.lat, r.lng) }))
      .filter(r => r.dist <= radiusM)
      .sort((a, b) => a.dist - b.dist);
    _restFetched = false;
  }

  _renderRestaurantList();
  _renderRestaurantMarkers();
}

// ── Loading state ─────────────────────────────────────────────────────────────
function _setRestLoading() {
  document.getElementById('panel-restaurants').innerHTML = `
    <div class="text-center py-10 text-gray-400">
      <div class="loader mx-auto mb-3"></div>
      <p class="text-sm">Fetching restaurants…</p>
    </div>`;
}

// ── Render list ───────────────────────────────────────────────────────────────
function _renderRestaurantList() {
  const panel = document.getElementById('panel-restaurants');

  if (_restaurants.length === 0) {
    panel.innerHTML = `
      <div class="text-center py-10 text-gray-400">
        <div class="text-3xl mb-2">🍽️</div>
        <p class="text-sm font-medium text-gray-600">No restaurants found here.</p>
        <p class="text-xs mt-1">Try increasing the radius.</p>
      </div>`;
    return;
  }

  const badge = _restFetched
    ? ''
    : '<span class="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 ml-1">curated</span>';

  panel.innerHTML = `
    <p class="text-xs text-gray-400 mb-3 px-1 flex items-center">
      ${_restaurants.length} restaurants found ${badge}
    </p>
    ${_restaurants.map(r => `
      <div class="restaurant-card" onclick="selectRestaurant('${r.id}')" data-rest-id="${r.id}">
        <div class="flex items-start gap-2.5">
          <span class="text-xl flex-shrink-0 mt-0.5">${cuisineEmoji(r.cuisine)}</span>
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-gray-900 text-sm leading-tight truncate">${r.name}</h4>
            <p class="text-xs text-gray-500 capitalize mt-0.5">${r.cuisine}</p>
            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
              <span class="text-xs text-amber-600 font-medium">📍 ${formatDistance(r.dist)}</span>
              ${r.openingHours ? `<span class="text-xs text-gray-400">🕐 ${r.openingHours}</span>` : ''}
              ${r.phone ? `<span class="text-xs text-gray-400">📞 ${r.phone}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('')}`;
}

// ── Render map markers ────────────────────────────────────────────────────────
function _renderRestaurantMarkers() {
  _restMarkers.forEach(m => window._map && window._map.removeLayer(m));
  _restMarkers = [];
  if (!window._map) return;

  _restaurants.forEach(r => {
    const marker = L.marker([r.lat, r.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="
          background:white;border:2px solid #f59e0b;border-radius:50%;
          width:30px;height:30px;display:flex;align-items:center;justify-content:center;
          font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.18);cursor:pointer;">
          🍽️</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      }),
    }).addTo(window._map);

    marker.bindPopup(`
      <div style="font-family:system-ui;padding:10px 12px;min-width:150px">
        <p style="font-weight:700;font-size:13px;margin:0 0 4px">${r.name}</p>
        <p style="font-size:12px;color:#6b7280;margin:0 0 4px;text-transform:capitalize">${r.cuisine}</p>
        <p style="font-size:11px;color:#d97706;margin:0">${formatDistance(r.dist)} away</p>
      </div>`, { maxWidth: 220 });

    marker.on('click', () => selectRestaurant(r.id));
    _restMarkers.push(marker);
  });
}

// ── Select a restaurant ───────────────────────────────────────────────────────
function selectRestaurant(id) {
  const r = _restaurants.find(x => x.id == id);
  if (!r) return;

  document.querySelectorAll('.restaurant-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`[data-rest-id="${id}"]`);
  if (card) { card.classList.add('selected'); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }

  showTransport(r.lat, r.lng, r.name);
  window._map && window._map.flyTo([r.lat, r.lng], 17, { duration: 1 });
  showToast(r.name, '🍽️');
}
