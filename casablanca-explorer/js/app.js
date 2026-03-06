// ── State ─────────────────────────────────────────────────────────────────────
let _map;
let _radiusCircle;
let _userMarker;
let _activityMarkers = [];
let _activeType      = 'all';

// ── Init ──────────────────────────────────────────────────────────────────────
function _boot() {
  try { _initMap(); } catch (e) { /* already initialised on hot-reload */ }
  _initFilters();
  _initTabs();
  _initQuizBtn();

  // Start from city centre; try to get real location
  window.userLat = CASABLANCA_CENTER.lat;
  window.userLng = CASABLANCA_CENTER.lng;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      // Accept only if within ~60 km of Casablanca
      if (haversineDistance(lat, lng, CASABLANCA_CENTER.lat, CASABLANCA_CENTER.lng) < 60000) {
        window.userLat = lat;
        window.userLng = lng;
        _updateUserMarker();
      }
      _updateRadiusCircle();
      _renderActivityMarkers();
    }, () => {});
  }

  // Initial render
  _updateRadiusCircle();
  _renderActivityMarkers();
  fetchRestaurants(CASABLANCA_CENTER.lat, CASABLANCA_CENTER.lng, _radius());
}

// ── Map ───────────────────────────────────────────────────────────────────────
function _initMap() {
  _map = L.map('map', { center: [CASABLANCA_CENTER.lat, CASABLANCA_CENTER.lng], zoom: 13 });
  window._map = _map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(_map);

  _updateUserMarker();
}

function _updateUserMarker() {
  if (_userMarker) _map.removeLayer(_userMarker);
  _userMarker = L.marker([window.userLat, window.userLng], {
    icon: L.divIcon({
      className: '',
      html: `<div style="
        background:#059669;border:3px solid white;border-radius:50%;
        width:14px;height:14px;box-shadow:0 0 0 3px rgba(5,150,105,0.3);">
      </div>`,
      iconSize: [14, 14], iconAnchor: [7, 7],
    }),
    zIndexOffset: 1000,
  }).addTo(_map).bindTooltip('Your location', { permanent: false });
}

function _updateRadiusCircle() {
  if (_radiusCircle) _map.removeLayer(_radiusCircle);
  _radiusCircle = L.circle([window.userLat, window.userLng], {
    radius: _radius(),
    color: '#059669', fillColor: '#059669',
    fillOpacity: 0.04, weight: 1.5, dashArray: '6 5',
  }).addTo(_map);
}

// ── Activity markers ──────────────────────────────────────────────────────────
function _renderActivityMarkers() {
  _activityMarkers.forEach(m => _map.removeLayer(m));
  _activityMarkers = [];

  const visible = _filteredActivities();
  renderActivityList(visible);

  visible.forEach(activity => {
    const marker = L.marker([activity.lat, activity.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="act-marker" data-id="${activity.id}" style="
          background:white;border:2.5px solid #059669;border-radius:50%;
          width:36px;height:36px;display:flex;align-items:center;justify-content:center;
          font-size:17px;box-shadow:0 3px 10px rgba(0,0,0,0.18);cursor:pointer;
          transition:transform 0.15s;">
          ${activity.emoji}
        </div>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      }),
    }).addTo(_map);

    marker.bindPopup(_activityPopupHTML(activity), { maxWidth: 260 });
    marker.on('click', () => selectActivity(activity));
    _activityMarkers.push(marker);
  });
}

function _activityPopupHTML(a) {
  return `
    <div style="font-family:system-ui;padding:12px 14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:22px">${a.emoji}</span>
        <div>
          <p style="font-weight:700;font-size:13px;margin:0;line-height:1.3">${a.name}</p>
          <p style="font-size:11px;color:#6b7280;margin:2px 0 0">${a.venue}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;
                  border-top:1px solid #f3f4f6;padding-top:10px;margin-bottom:10px">
        <span style="color:#6b7280">📅 ${a.date}</span>
        <span style="color:#6b7280">🕐 ${a.time}</span>
        <span style="color:#6b7280">⭐ ${a.rating}</span>
        <span style="color:${a.price === 0 ? '#16a34a' : '#374151'};font-weight:600">
          ${a.price === 0 ? 'Free' : a.price + ' MAD'}
        </span>
      </div>
      <button onclick="selectActivity(ACTIVITIES.find(x=>x.id===${a.id}))"
        style="width:100%;background:#059669;color:white;border:none;border-radius:10px;
               padding:8px;font-size:12px;font-weight:600;cursor:pointer;">
        Get Directions →
      </button>
    </div>`;
}

// ── Activity list (sidebar) ───────────────────────────────────────────────────
function renderActivityList(activities) {
  const panel = document.getElementById('panel-activities');

  if (activities.length === 0) {
    panel.innerHTML = `
      <div class="text-center py-10 text-gray-400">
        <div class="text-3xl mb-2">🔍</div>
        <p class="text-sm font-medium text-gray-600">No activities found</p>
        <p class="text-xs mt-1">Try a wider radius or different filter.</p>
      </div>`;
    return;
  }

  const sorted = [...activities].sort((a, b) =>
    haversineDistance(window.userLat, window.userLng, a.lat, a.lng) -
    haversineDistance(window.userLat, window.userLng, b.lat, b.lng)
  );

  panel.innerHTML = `
    <p class="text-xs text-gray-400 mb-2 px-1">${sorted.length} activities found</p>
    ${sorted.map(a => {
      const dist = haversineDistance(window.userLat, window.userLng, a.lat, a.lng);
      return `
        <div class="activity-card" onclick="selectActivity(ACTIVITIES.find(x=>x.id===${a.id}))"
             data-activity-id="${a.id}">
          <div class="flex items-start gap-2.5">
            <span class="text-xl flex-shrink-0 mt-0.5">${a.emoji}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-1">
                <h4 class="font-semibold text-gray-900 text-sm leading-tight">${a.name}</h4>
                <span class="text-xs text-yellow-500 flex-shrink-0 mt-0.5">★${a.rating}</span>
              </div>
              <p class="text-xs text-gray-500 truncate mt-0.5">${a.venue}</p>
              <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                <span class="text-xs text-emerald-600 font-semibold">${formatDistance(dist)}</span>
                <span class="text-xs text-gray-400">${a.date}</span>
                <span class="text-xs font-semibold ${a.price === 0 ? 'text-green-600' : 'text-gray-700'}">
                  ${a.price === 0 ? 'Free' : a.price + ' MAD'}
                </span>
              </div>
            </div>
          </div>
        </div>`;
    }).join('')}`;
}

// ── Select an activity ────────────────────────────────────────────────────────
function selectActivity(activity) {
  if (!activity) return;

  // Highlight card
  document.querySelectorAll('.activity-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`[data-activity-id="${activity.id}"]`);
  if (card) { card.classList.add('selected'); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }

  // Transport
  showTransport(activity.lat, activity.lng, activity.name);

  // Fly map
  _map.flyTo([activity.lat, activity.lng], 16, { duration: 1 });

  showToast(activity.name, activity.emoji);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(panel =>
    panel.classList.toggle('hidden', !panel.id.endsWith(name)));
}

function _initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
}

// ── Filters ───────────────────────────────────────────────────────────────────
function _initFilters() {
  // Type pills
  const container = document.getElementById('type-filters');
  ACTIVITY_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.className = `type-pill${type.id === 'all' ? ' active' : ''}`;
    btn.dataset.type = type.id;
    btn.textContent = `${type.emoji} ${type.label}`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      _activeType = type.id;
      _renderActivityMarkers();
    });
    container.appendChild(btn);
  });

  // Radius slider
  const slider = document.getElementById('radius-slider');
  const label  = document.getElementById('radius-label');
  slider.addEventListener('input', () => {
    const v = parseInt(slider.value);
    label.textContent = v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)} km` : `${v} m`;
    _updateRadiusCircle();
    _renderActivityMarkers();
    clearTimeout(slider._t);
    slider._t = setTimeout(() => {
      fetchRestaurants(window.userLat, window.userLng, v);
    }, 700);
  });
}

// ── Quiz button ───────────────────────────────────────────────────────────────
function _initQuizBtn() {
  document.getElementById('quiz-btn').addEventListener('click', startQuiz);
  document.getElementById('quiz-close').addEventListener('click', closeQuiz);
  document.getElementById('quiz-modal').addEventListener('click', e => {
    if (e.target.id === 'quiz-modal') closeQuiz();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _radius() {
  return parseInt(document.getElementById('radius-slider').value);
}

function _filteredActivities() {
  const r = _radius();
  return ACTIVITIES.filter(a => {
    const dist = haversineDistance(window.userLat, window.userLng, a.lat, a.lng);
    return dist <= r && (_activeType === 'all' || a.type === _activeType);
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// setTimeout(0) lets the browser finish painting the layout (including map div
// dimensions) before Leaflet tries to measure the container.
setTimeout(_boot, 0);
