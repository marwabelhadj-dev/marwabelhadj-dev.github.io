// ── Quiz state ────────────────────────────────────────────────────────────────
let _quizAnswerTags = [];
let _quizStep       = 0;

// ── Entry points ──────────────────────────────────────────────────────────────
function startQuiz() {
  _quizAnswerTags = [];
  _quizStep = 0;
  document.getElementById('quiz-modal').classList.remove('hidden');
  _renderStep();
}

function closeQuiz() {
  document.getElementById('quiz-modal').classList.add('hidden');
}

// ── Render a question ─────────────────────────────────────────────────────────
function _renderStep() {
  const q = QUIZ_QUESTIONS[_quizStep];
  const pct = Math.round((_quizStep / QUIZ_QUESTIONS.length) * 100);

  document.getElementById('quiz-content').innerHTML = `
    <div class="mb-5">
      <div class="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>Question ${_quizStep + 1} of ${QUIZ_QUESTIONS.length}</span>
        <span>${pct}%</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-1.5">
        <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
             style="width:${pct}%"></div>
      </div>
    </div>

    <div class="text-center mb-5">
      <div class="text-4xl mb-2">${q.emoji}</div>
      <h3 class="text-lg font-bold text-gray-900">${q.question}</h3>
    </div>

    <div class="space-y-2">
      ${q.options.map((opt, i) => `
        <button class="quiz-option" onclick="_quizSelect(${i})">
          <span class="text-lg">${opt.emoji}</span>
          <span>${opt.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

// ── Handle option selection ───────────────────────────────────────────────────
function _quizSelect(optionIdx) {
  const q = QUIZ_QUESTIONS[_quizStep];
  _quizAnswerTags.push(...q.options[optionIdx].tags);

  // Brief visual feedback
  document.querySelectorAll('.quiz-option').forEach((btn, i) => {
    btn.classList.toggle('selected', i === optionIdx);
    btn.disabled = true;
  });

  setTimeout(() => {
    _quizStep++;
    if (_quizStep < QUIZ_QUESTIONS.length) {
      _renderStep();
    } else {
      _renderResult();
    }
  }, 380);
}

// ── Show result ───────────────────────────────────────────────────────────────
function _renderResult() {
  const radius  = parseInt(document.getElementById('radius-slider').value);
  const userLat = window.userLat || CASABLANCA_CENTER.lat;
  const userLng = window.userLng || CASABLANCA_CENTER.lng;

  // Score every activity within radius
  const scored = ACTIVITIES
    .map(a => {
      const dist = haversineDistance(userLat, userLng, a.lat, a.lng);
      if (dist > radius) return null;
      const score = _quizAnswerTags.reduce((s, tag) => s + (a.tags.includes(tag) ? 1 : 0), 0);
      return { a, score, dist };
    })
    .filter(Boolean)
    .sort((x, y) => y.score - x.score || x.dist - y.dist);

  const best = scored[0];

  if (!best) {
    document.getElementById('quiz-content').innerHTML = `
      <div class="text-center py-6">
        <div class="text-5xl mb-3">😔</div>
        <h3 class="font-bold text-gray-900 mb-2">No activities found nearby</h3>
        <p class="text-sm text-gray-500 mb-4">Try increasing the radius and retaking the quiz.</p>
        <button onclick="closeQuiz()"
          class="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
          Close
        </button>
      </div>
    `;
    return;
  }

  const { a, dist } = best;

  document.getElementById('quiz-content').innerHTML = `
    <div class="text-center mb-5">
      <div class="text-5xl mb-3">${a.emoji}</div>
      <p class="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Perfect match ✓</p>
      <h2 class="text-xl font-bold text-gray-900 mb-1 leading-tight">${a.name}</h2>
      <p class="text-sm text-gray-500">${a.venue}</p>
    </div>

    <div class="bg-gray-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-y-2 text-sm">
      <span class="text-gray-400">📍 Distance</span>
      <span class="font-semibold text-right">${formatDistance(dist)}</span>
      <span class="text-gray-400">📅 Date</span>
      <span class="font-semibold text-right">${a.date}</span>
      <span class="text-gray-400">🕐 Time</span>
      <span class="font-semibold text-right">${a.time}</span>
      <span class="text-gray-400">💰 Price</span>
      <span class="font-semibold text-right ${a.price === 0 ? 'text-green-600' : ''}">${formatPrice(a.price)}</span>
    </div>

    <p class="text-sm text-gray-600 leading-relaxed mb-5">${a.description}</p>

    <div class="flex gap-2">
      <button onclick="_quizGoToActivity(${a.id})"
        class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
        Show on Map
      </button>
      <button onclick="closeQuiz()"
        class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold transition-colors">
        Close
      </button>
    </div>
  `;
}

// ── Fly to activity from quiz ─────────────────────────────────────────────────
function _quizGoToActivity(id) {
  closeQuiz();
  const activity = ACTIVITIES.find(a => a.id === id);
  if (activity) {
    switchTab('activities');
    selectActivity(activity);
  }
}
