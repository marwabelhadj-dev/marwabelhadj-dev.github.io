// ── Distance ──────────────────────────────────────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ── Price ─────────────────────────────────────────────────────────────────────
function formatPrice(price) {
  if (price === 0) return 'Free';
  return `${price} MAD`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(message, icon = '📍', duration = 3000) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-message').textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
}

// ── Cuisine emoji map ─────────────────────────────────────────────────────────
function cuisineEmoji(cuisine = '') {
  const c = cuisine.toLowerCase();
  if (c.includes('moroccan'))   return '🇲🇦';
  if (c.includes('italian'))    return '🍝';
  if (c.includes('french'))     return '🥐';
  if (c.includes('pizza'))      return '🍕';
  if (c.includes('burger') || c.includes('fast')) return '🍔';
  if (c.includes('seafood') || c.includes('fish')) return '🦞';
  if (c.includes('japanese') || c.includes('sushi')) return '🍱';
  if (c.includes('chinese'))    return '🥢';
  if (c.includes('lebanese') || c.includes('arab')) return '🥙';
  if (c.includes('indian'))     return '🍛';
  if (c.includes('spanish'))    return '🥘';
  if (c.includes('american'))   return '🍖';
  if (c.includes('bakery') || c.includes('café') || c.includes('cafe')) return '☕';
  return '🍽️';
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function ratingStars(rating) {
  const full  = Math.floor(rating);
  const half  = (rating % 1) >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}
