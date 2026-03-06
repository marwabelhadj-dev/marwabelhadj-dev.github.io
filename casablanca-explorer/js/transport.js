// ── Casablanca Tram stops (T1 + T2 key stops) ────────────────────────────────
const TRAM_STOPS = [
  { name: 'Sidi Moumen',         lat: 33.5628, lng: -7.5285 },
  { name: 'Lissasfa',            lat: 33.5551, lng: -7.6736 },
  { name: 'Ain Chock',           lat: 33.5619, lng: -7.6109 },
  { name: 'Mâarif',              lat: 33.5706, lng: -7.6479 },
  { name: 'Place de la Victoire',lat: 33.5884, lng: -7.6165 },
  { name: 'Hassan II Mosque',    lat: 33.6068, lng: -7.6312 },
  { name: 'Mohammed V',          lat: 33.5942, lng: -7.6195 },
  { name: 'Ain Diab',            lat: 33.5921, lng: -7.6712 },
  { name: 'Centre Ville',        lat: 33.5936, lng: -7.6219 },
  { name: 'Facultés',            lat: 33.5775, lng: -7.6431 },
  { name: 'Hay Hassani',         lat: 33.5614, lng: -7.6551 },
  { name: 'Derb Ghallef',        lat: 33.5800, lng: -7.6248 },
  { name: 'Sidi Bernoussi',      lat: 33.5883, lng: -7.5312 },
  { name: 'Aïn Borja',           lat: 33.5493, lng: -7.5901 },
  { name: 'Hay Mohammadi',       lat: 33.5751, lng: -7.5821 },
];

function _nearestStop(lat, lng) {
  let best = null, minD = Infinity;
  TRAM_STOPS.forEach(s => {
    const d = haversineDistance(lat, lng, s.lat, s.lng);
    if (d < minD) { minD = d; best = s; }
  });
  return { stop: best, dist: minD };
}

// ── Estimate all modes ────────────────────────────────────────────────────────
function estimateTransport(fromLat, fromLng, toLat, toLng) {
  const distM  = haversineDistance(fromLat, fromLng, toLat, toLng);
  const distKm = distM / 1000;

  // Tram
  const fromTram = _nearestStop(fromLat, fromLng);
  const toTram   = _nearestStop(toLat, toLng);
  const tramOk   = fromTram.dist < 900 && toTram.dist < 900;
  const walkToMin   = Math.round((fromTram.dist / 1000) / 5 * 60);
  const walkFromMin = Math.round((toTram.dist  / 1000) / 5 * 60);
  const tramRideKm  = haversineDistance(fromTram.stop.lat, fromTram.stop.lng,
                                        toTram.stop.lat,  toTram.stop.lng) / 1000;
  const tramTotalMin = walkToMin + Math.round(tramRideKm / 20 * 60) + walkFromMin + 3; // +3 wait

  // Bus (RATC) – 4 MAD, ~15 km/h + avg 8 min wait
  const busMin = Math.round(distKm / 15 * 60) + 8;

  // Ride-hail – 35 km/h avg with city traffic
  const carMin = Math.max(5, Math.round(distKm / 35 * 60) + 3);

  return {
    tram: tramOk
      ? {
          available: true,
          time: tramTotalMin,
          price: 6,
          note: `Walk ${walkToMin} min → Tram from ${fromTram.stop.name}`,
          detail: `Alight at ${toTram.stop.name}, walk ${walkFromMin} min`,
        }
      : {
          available: false,
          note: `Nearest stop: ${fromTram.stop.name} (${Math.round(fromTram.dist)} m — too far)`,
        },

    bus: {
      available: true,
      time: busMin,
      price: 4,
      note: 'RATC city bus — frequent daytime service',
    },

    uber: {
      available: true,
      time: carMin,
      price: Math.round(15 + distKm * 6),
      note: 'Estimated pick-up in ~4 min',
    },

    careem: {
      available: true,
      time: carMin + 1,
      price: Math.round(12 + distKm * 5.5),
      note: 'Careem GO — estimated pick-up in ~5 min',
    },
  };
}

// ── Render transport panel ────────────────────────────────────────────────────
function showTransport(toLat, toLng, toName) {
  const fromLat = window.userLat || CASABLANCA_CENTER.lat;
  const fromLng = window.userLng || CASABLANCA_CENTER.lng;
  const distKm  = (haversineDistance(fromLat, fromLng, toLat, toLng) / 1000).toFixed(1);

  const r = estimateTransport(fromLat, fromLng, toLat, toLng);

  const card = (icon, label, color, data) => {
    if (!data.available) {
      return `
        <div class="transport-card unavailable">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${icon}</span>
            <div>
              <p class="font-semibold text-gray-400 text-sm">${label}</p>
              <p class="text-xs text-gray-400 mt-0.5">${data.note}</p>
            </div>
            <span class="ml-auto text-xs text-gray-400 font-medium">N/A</span>
          </div>
        </div>`;
    }
    return `
      <div class="transport-card">
        <div class="flex items-center gap-3">
          <span class="text-2xl">${icon}</span>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-gray-900 text-sm">${label}</p>
            <p class="text-xs text-gray-500 mt-0.5 truncate">${data.note}</p>
            ${data.detail ? `<p class="text-xs text-gray-400">${data.detail}</p>` : ''}
          </div>
          <div class="text-right flex-shrink-0">
            <p class="font-bold text-gray-900 text-base">${data.price} <span class="text-xs font-normal text-gray-400">MAD</span></p>
            <p class="text-xs text-gray-500">~${data.time} min</p>
          </div>
        </div>
      </div>`;
  };

  document.getElementById('transport-placeholder').classList.add('hidden');
  const content = document.getElementById('transport-content');
  content.classList.remove('hidden');
  content.innerHTML = `
    <div class="p-4">
      <div class="mb-4 pb-3 border-b border-gray-100">
        <p class="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Destination</p>
        <p class="font-bold text-gray-900 text-sm leading-tight">${toName}</p>
        <p class="text-xs text-emerald-600 mt-0.5">📍 ${distKm} km from your location</p>
      </div>
      <div class="space-y-2">
        ${card('🚊', 'Casablanca Tram', 'emerald', r.tram)}
        ${card('🚌', 'RATC Bus',        'blue',    r.bus)}
        ${card('🚗', 'Uber',            'gray',    r.uber)}
        ${card('🚖', 'Careem',          'orange',  r.careem)}
      </div>
      <p class="text-xs text-gray-400 mt-3 text-center">* Prices are estimates in Moroccan Dirhams (MAD)</p>
    </div>
  `;

  switchTab('transport');
}
