'use strict';

let EXERCISES = [];
let exByCode = {};
let activeWorkoutRunner = null;
let activeWorkoutDay = null;

Music.onTrackChange(() => {
  if (activeWorkoutRunner) renderWorkoutBody(activeWorkoutRunner);
});

// Not supported on iOS Safari at all — always guarded, silently no-ops there.
function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch {}
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---------- Routing ----------
function currentRoute() {
  const hash = location.hash.replace(/^#/, '') || '/today';
  const parts = hash.split('/').filter(Boolean);
  return { name: parts[0] || 'today', arg: parts[1] };
}

function navigate(route) { location.hash = route; }

window.addEventListener('hashchange', render);

// ---------- Instalacja PWA ----------
let deferredInstallPrompt = null;
const K_INSTALL_DISMISSED = 'forma60.installDismissed';

function isRunningStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!isRunningStandalone() && !localStorage.getItem(K_INSTALL_DISMISSED)) {
    showInstallBanner();
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  document.getElementById('install-banner')?.remove();
  localStorage.setItem(K_INSTALL_DISMISSED, '1');
});

function showInstallBanner() {
  if (document.getElementById('install-banner') || isRunningStandalone()) return;
  const el = document.createElement('div');
  el.id = 'install-banner';
  el.className = 'install-banner';
  el.innerHTML = `
    <span>📲 Zainstaluj Nowa Ja na ekranie głównym</span>
    <span class="install-banner-actions">
      <button type="button" class="btn small primary" data-action="install-accept">Zainstaluj</button>
      <button type="button" class="icon-btn" data-action="install-dismiss" aria-label="Zamknij">✕</button>
    </span>`;
  document.body.appendChild(el);
}

// ---------- Boot ----------
async function boot() {
  applyTheme(Store.getTheme());
  try {
    const res = await fetch('data/exercises.json');
    EXERCISES = await res.json();
    exByCode = Object.fromEntries(EXERCISES.map(e => [e.code, e]));
  } catch (err) {
    document.getElementById('app').innerHTML = `<div class="empty-state"><p>Nie udało się wczytać danych ćwiczeń.</p><p class="muted">Uruchom aplikację przez serwer HTTP (nie plik://).</p></div>`;
    return;
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  checkReminder();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReminder(); });
  render();
}

// Przeglądarka nie może "obudzić" zamkniętej appki jak natywny alarm — to najlepszy
// możliwy odpowiednik dla PWA: sprawdzamy przy każdym otwarciu/powrocie do apki.
function checkReminder() {
  const profile = Store.getActiveProfile();
  if (!profile) return;
  const r = Store.getReminderSettings();
  if (!r.enabled) return;

  const today = new Date().toISOString().slice(0, 10);
  if (r.lastNotifiedDate === today) return;

  const now = new Date();
  const targetMinutes = r.hour * 60 + r.minute;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < targetMinutes) return;

  const day = Store.currentDayNumber(profile);
  if (profile.progress.completedDays.includes(day)) return;

  const info = getDayInfo(day);
  const text = info.rest ? 'Jutro/dziś dzień odpoczynku — pamiętaj o regeneracji.' : `Dzisiaj masz dzień ${day}: ${info.typeName}.`;

  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Nowa Ja', { body: text, icon: 'icons/icon-192.png' }); } catch {}
  } else {
    showReminderBanner(text);
  }
  Store.setReminderSettings({ ...r, lastNotifiedDate: today });
}

function showBadgeToast(badges) {
  vibrate([40, 30, 80]);
  const el = document.createElement('div');
  el.className = 'badge-toast';
  el.innerHTML = badges.map(b => `
    <div class="badge-toast-row">
      <span class="badge-toast-icon">${b.icon}</span>
      <span><strong>Nowa odznaka!</strong><br>${esc(b.name)}</span>
    </div>`).join('');
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 20);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 5000);
}

// ---------- Shareable achievement images (canvas, fully client-side) ----------
function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy;
}

async function renderShareCanvas({ title, stat, subtitle }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#141B24');
  grad.addColorStop(1, '#0A0F17');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  try {
    const logo = await loadImageEl('icons/icon-192.png');
    ctx.drawImage(logo, 460, 110, 160, 160);
  } catch {}

  ctx.textAlign = 'center';
  ctx.fillStyle = '#EAF1F8';
  ctx.font = 'bold 56px -apple-system, "Segoe UI", Roboto, sans-serif';
  wrapCanvasText(ctx, title, 540, 400, 880, 66);

  if (stat) {
    ctx.fillStyle = '#E8636E';
    ctx.font = 'bold 200px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(stat, 540, 680);
  }

  if (subtitle) {
    ctx.fillStyle = '#9DB1C2';
    ctx.font = '38px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(subtitle, 540, 760);
  }

  ctx.fillStyle = '#9AC94A';
  ctx.font = 'bold 42px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Nowa Ja', 540, 970);

  return canvas;
}

function canvasToPngBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

async function shareAchievementImage(opts, filename) {
  const canvas = await renderShareCanvas(opts);
  const blob = await canvasToPngBlob(canvas);
  if (!blob) return;
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: opts.title, text: opts.subtitle || '' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function showReminderBanner(text) {
  if (document.getElementById('reminder-banner')) return;
  const el = document.createElement('div');
  el.id = 'reminder-banner';
  el.className = 'reminder-banner';
  el.innerHTML = `<span>⏰ ${esc(text)}</span><button type="button" aria-label="Zamknij">✕</button>`;
  el.querySelector('button').addEventListener('click', () => el.remove());
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 12000);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

// ---------- Render root ----------
function render() {
  const profile = Store.getActiveProfile();
  const root = document.getElementById('app');
  const { name, arg } = currentRoute();

  // Stop any running workout timer when navigating away from the workout screen —
  // otherwise its interval keeps ticking in the background pointlessly.
  if (activeWorkoutRunner && !(name === 'workout' && Number(arg) === activeWorkoutDay)) {
    Voice.stop();
    releaseWakeLock();
    activeWorkoutRunner.stop();
    activeWorkoutRunner = null;
    activeWorkoutDay = null;
  }

  // Wyłącz kamerę/analizę formy, gdy użytkownik nawiguje gdzie indziej — inaczej kamera
  // zostałaby włączona w tle bez sensu (i drenowałaby baterię).
  if (name !== 'form-check' && typeof PoseCheck !== 'undefined' && PoseCheck.isRunning()) {
    Voice.stop();
    PoseCheck.stop();
  }

  if (!profile && name !== 'onboarding') {
    root.innerHTML = viewOnboarding();
    document.getElementById('nav').hidden = true;
    updateHeader(null);
    bindOnboarding();
    return;
  }
  if (profile && !profile.safetyConsentAcceptedAt && name !== 'onboarding' && name !== 'safety') {
    root.innerHTML = viewSafety();
    document.getElementById('nav').hidden = true;
    updateHeader(profile);
    bindSafety();
    return;
  }

  const fullScreenRoute = name === 'workout' || name === 'safety' || name === 'onboarding' || name === 'form-check';
  document.getElementById('nav').hidden = fullScreenRoute;
  updateHeader(profile);

  let html = '';
  switch (name) {
    case 'today': html = viewToday(profile); break;
    case 'day': html = viewDay(profile, parseInt(arg, 10)); break;
    case 'workout': html = viewWorkoutShell(); break;
    case 'form-check': html = viewFormCheck(arg); break;
    case 'exercise': html = viewExercise(profile, arg); break;
    case 'schedule': html = viewSchedule(profile); break;
    case 'library': html = viewLibrary(); break;
    case 'progress': html = viewProgress(profile); break;
    case 'info': html = viewInfo(); break;
    case 'more': html = viewMore(profile); break;
    case 'settings': html = viewSettings(profile); break;
    case 'onboarding': html = viewOnboarding(); break;
    case 'safety': html = viewSafety(); break;
    default: html = viewToday(profile);
  }
  root.innerHTML = html;
  root.scrollTop = 0;
  window.scrollTo(0, 0);
  highlightNav(name);
  bindDynamic(name, profile, arg);
}

function updateHeader(profile) {
  const el = document.getElementById('active-profile-name');
  if (el) { el.textContent = profile ? profile.name : ''; el.hidden = !profile; }

  const nameEl = document.getElementById('sidebar-name');
  const dayEl = document.getElementById('sidebar-day');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl) nameEl.textContent = profile ? profile.name : '';
  if (dayEl) dayEl.textContent = profile ? `Dzień ${Math.min(Store.currentDayNumber(profile), 60)} / 60` : '';
  if (avatarEl) avatarEl.textContent = profile && profile.name ? profile.name[0].toUpperCase() : '?';
}

function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar')?.removeAttribute('inert');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) { overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add('show')); }
  document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar')?.setAttribute('inert', '');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) { overlay.classList.remove('show'); setTimeout(() => { overlay.hidden = true; }, 250); }
  document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

function highlightNav(name) {
  document.querySelectorAll('#nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === name);
  });
}

// ---------- Onboarding ----------
const ONBOARD_STEPS = 8;
const EQUIPMENT_OPTIONS = ['Mata', 'Krzesło', 'Butelki wody / hantle', 'Taśma oporowa', 'Stopień / schody', 'Ściana', 'Opona', 'Plecak obciążony', 'Skakanka'];
const FOCUS_OPTIONS = ['Brzuch', 'Uda', 'Biodra', 'Klatka piersiowa', 'Ramiona', 'Pośladki'];
const LIMITATION_OPTIONS = ['Kolana', 'Biodra', 'Kręgosłup / plecy', 'Barki', 'Nadgarstki', 'Brak ograniczeń'];
const EXPERIENCE_LABELS = { beginner: 'Początkujący', intermediate: 'Średniozaawansowany', advanced: 'Zaawansowany' };
const GOAL_LABELS = { weight_loss: 'Redukcja wagi', muscle_tone: 'Ujędrnienie', mobility: 'Mobilność', general_health: 'Ogólna kondycja', endurance: 'Wytrzymałość' };
const DIFFICULTY_LABELS = { easier: 'Łatwiej', standard: 'Standardowo', harder: 'Trudniej' };

function chipRadio(name, value, label, checked) {
  const id = `f-${name}-${value}`.replace(/[^a-zA-Z0-9_-]/g, '');
  return `<span class="chip-choice"><input type="radio" id="${id}" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><label for="${id}">${esc(label)}</label></span>`;
}

function chipCheckbox(name, value, checked) {
  const id = `f-${name}-${value}`.replace(/[^a-zA-Z0-9_-]/g, '');
  return `<span class="chip-choice"><input type="checkbox" id="${id}" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><label for="${id}">${esc(value)}</label></span>`;
}

function viewOnboarding() {
  return `
  <div class="onboard">
    <div class="onboard-brand"><img src="icons/icon-192.png" alt=""><h1>Nowa Ja</h1></div>
    <p class="tagline">Twój 60-dniowy plan treningowy w domu — dopasowany do Ciebie.</p>
    <button type="button" class="onboard-quickstart" data-action="onboard-quickstart">Zacznij od razu, dostosuję później →</button>
    <div class="onboard-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${ONBOARD_STEPS}" aria-valuenow="1">
      ${Array.from({ length: ONBOARD_STEPS }, (_, i) => `<span class="onboard-progress-seg${i === 0 ? ' active' : ''}" data-seg="${i}"></span>`).join('')}
    </div>
    <form id="form-onboard" class="card form" data-step="0" novalidate>
      <div class="onboard-step-label">Krok <span id="onboard-step-num">1</span> z ${ONBOARD_STEPS}</div>

      <div class="onboard-step" data-step="0">
        <span class="onboard-step-icon" aria-hidden="true">👋</span>
        <h2 class="onboard-step-title">Jak się do Ciebie zwracać?</h2>
        <label>Imię<input type="text" name="name" placeholder="np. Ania" autocomplete="off"></label>
        <label>Wiek<input type="number" name="ageYears" min="10" max="100" placeholder="np. 34"></label>
      </div>

      <div class="onboard-step" data-step="1" hidden>
        <span class="onboard-step-icon" aria-hidden="true">📏</span>
        <h2 class="onboard-step-title">Kilka podstawowych parametrów</h2>
        <p class="muted small">Program zostanie opisany w kontekście Twoich parametrów. To dane ogólne, nie medyczne.</p>
        <label>Wzrost (cm)<input type="number" name="heightCm" min="100" max="230" placeholder="np. 165"></label>
        <label>Waga (kg)<input type="number" name="weightKg" min="30" max="300" placeholder="np. 80"></label>
      </div>

      <div class="onboard-step" data-step="2" hidden>
        <span class="onboard-step-icon" aria-hidden="true">🎯</span>
        <h2 class="onboard-step-title">Skąd startujesz i dokąd zmierzasz?</h2>
        <span class="onboard-field-label">Doświadczenie treningowe</span>
        <div class="chip-group">${Object.entries(EXPERIENCE_LABELS).map(([v, l]) => chipRadio('experience', v, l, v === 'beginner')).join('')}</div>
        <span class="onboard-field-label">Główny cel</span>
        <div class="chip-group">${Object.entries(GOAL_LABELS).map(([v, l]) => chipRadio('goal', v, l, v === 'general_health')).join('')}</div>
      </div>

      <div class="onboard-step" data-step="3" hidden>
        <span class="onboard-step-icon" aria-hidden="true">📅</span>
        <h2 class="onboard-step-title">Ile czasu możesz na to poświęcić?</h2>
        <span class="onboard-field-label">Treningi tygodniowo</span>
        <div class="chip-group">${[3, 4, 5, 6, 7].map(n => chipRadio('sessionsPerWeek', n, String(n), n === 6)).join('')}</div>
        <span class="onboard-field-label">Długość treningu</span>
        <div class="chip-group">${[20, 30, 35, 45, 60].map(n => chipRadio('sessionDurationMinutes', n, n + ' min', n === 35)).join('')}</div>
      </div>

      <div class="onboard-step" data-step="4" hidden>
        <span class="onboard-step-icon" aria-hidden="true">🏋️</span>
        <h2 class="onboard-step-title">Co masz pod ręką w domu?</h2>
        <span class="onboard-field-label">Dostępny sprzęt</span>
        <div class="chip-group">${EQUIPMENT_OPTIONS.map(o => chipCheckbox('equipment', o, false)).join('')}</div>
      </div>

      <div class="onboard-step" data-step="5" hidden>
        <span class="onboard-step-icon" aria-hidden="true">💪</span>
        <h2 class="onboard-step-title">Na czym Ci najbardziej zależy?</h2>
        <span class="onboard-field-label">Poziom trudności</span>
        <div class="chip-group">${Object.entries(DIFFICULTY_LABELS).map(([v, l]) => chipRadio('difficultyPreference', v, l, v === 'standard')).join('')}</div>
        <span class="onboard-field-label">Priorytetowe partie ciała</span>
        <div class="chip-group">${FOCUS_OPTIONS.map(o => chipCheckbox('focusAreas', o, false)).join('')}</div>
      </div>

      <div class="onboard-step" data-step="6" hidden>
        <span class="onboard-step-icon" aria-hidden="true">🛡️</span>
        <h2 class="onboard-step-title">Coś, o czym powinniśmy wiedzieć?</h2>
        <span class="onboard-field-label">Ograniczenia ruchowe</span>
        <div class="chip-group">${LIMITATION_OPTIONS.map(o => chipCheckbox('limitations', o, false)).join('')}</div>
        <label>Inne przeciwwskazania (opcjonalnie)<input type="text" name="contraindicationsNote" placeholder="opcjonalnie"></label>
      </div>

      <div class="onboard-step" data-step="7" hidden>
        <span class="onboard-step-icon" aria-hidden="true">🚀</span>
        <h2 class="onboard-step-title">Ostatnia rzecz — kiedy zaczynamy?</h2>
        <span class="onboard-field-label">Data startu programu</span>
        <input type="date" name="startDate" value="${new Date().toISOString().slice(0, 10)}">
        <p class="muted small" style="margin-top:14px">Ten program ma charakter ogólny i edukacyjny — nie zastępuje porady medycznej. Przed pierwszym treningiem poprosimy Cię o potwierdzenie bezpieczeństwa.</p>
      </div>

      <div class="onboard-nav">
        <button type="button" class="btn ghost" data-action="onboard-back" id="onboard-back-btn" hidden>Wstecz</button>
        <button type="button" class="btn primary" data-action="onboard-next" id="onboard-next-btn">Dalej</button>
        <button type="submit" class="btn primary" id="onboard-submit-btn" hidden>Rozpocznij</button>
      </div>
      <p class="muted small" style="margin-top:10px">Twoje dane zostają wyłącznie na tym urządzeniu.</p>
    </form>
  </div>`;
}

function showOnboardStep(form, index) {
  const clamped = Math.max(0, Math.min(ONBOARD_STEPS - 1, index));
  form.dataset.step = String(clamped);
  form.querySelectorAll('.onboard-step').forEach(el => { el.hidden = Number(el.dataset.step) !== clamped; });
  const numEl = document.getElementById('onboard-step-num');
  if (numEl) numEl.textContent = String(clamped + 1);
  document.querySelectorAll('.onboard-progress-seg').forEach(seg => {
    seg.classList.toggle('active', Number(seg.dataset.seg) <= clamped);
  });
  document.querySelector('.onboard-progress')?.setAttribute('aria-valuenow', String(clamped + 1));
  const backBtn = document.getElementById('onboard-back-btn');
  const nextBtn = document.getElementById('onboard-next-btn');
  const submitBtn = document.getElementById('onboard-submit-btn');
  if (backBtn) backBtn.hidden = clamped === 0;
  const isLast = clamped === ONBOARD_STEPS - 1;
  if (nextBtn) nextBtn.hidden = isLast;
  if (submitBtn) submitBtn.hidden = !isLast;
}

function bindOnboarding() {
  const form = document.getElementById('form-onboard');
  if (!form) return;
  showOnboardStep(form, 0);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const profile = Store.createProfile({
      name: fd.get('name')?.trim(),
      ageYears: fd.get('ageYears') ? Number(fd.get('ageYears')) : null,
      heightCm: fd.get('heightCm') ? Number(fd.get('heightCm')) : null,
      weightKg: fd.get('weightKg') ? Number(fd.get('weightKg')) : null,
      experience: fd.get('experience') || 'beginner',
      goal: fd.get('goal') || 'general_health',
      sessionsPerWeek: fd.get('sessionsPerWeek') ? Number(fd.get('sessionsPerWeek')) : 6,
      sessionDurationMinutes: fd.get('sessionDurationMinutes') ? Number(fd.get('sessionDurationMinutes')) : 35,
      equipment: fd.getAll('equipment'),
      difficultyPreference: fd.get('difficultyPreference') || 'standard',
      focusAreas: fd.getAll('focusAreas'),
      limitations: fd.getAll('limitations'),
      contraindicationsNote: fd.get('contraindicationsNote')?.trim() || '',
      startDate: fd.get('startDate')
    });
    navigate('/safety');
    render();
  });
}

// ---------- Safety consent ----------
function viewSafety() {
  return `
  <div class="onboard">
    <div class="onboard-brand"><img src="icons/icon-192.png" alt=""><h1>Zanim zaczniesz</h1></div>
    <div class="card">
      <p>${esc(PROGRAM_INTRO)}</p>
      <div class="consent-box">
        <p>${esc(SAFETY_NOTE)}</p>
      </div>
      <label style="display:flex;align-items:center;gap:10px;font-weight:600;">
        <input type="checkbox" id="safety-checkbox" style="width:20px;height:20px;">
        Przeczytałam/em i rozumiem powyższe informacje
      </label>
      <button class="btn primary big" id="safety-accept-btn" disabled>Potwierdzam i przechodzę do programu</button>
    </div>
  </div>`;
}

function bindSafety() {
  const checkbox = document.getElementById('safety-checkbox');
  const btn = document.getElementById('safety-accept-btn');
  if (!checkbox || !btn) return;
  checkbox.addEventListener('change', () => { btn.disabled = !checkbox.checked; });
  btn.addEventListener('click', () => {
    const profile = Store.getActiveProfile();
    Store.acceptSafetyConsent(profile.id);
    const newBadges = Store.checkNewBadges(profile.id);
    navigate('/today');
    render();
    if (newBadges.length) showBadgeToast(newBadges);
  });
}

// ---------- Today ----------
// Jeśli profil ma aktywne przyspieszenie fazy (patrz computePhaseTrend), stosujemy je do
// dnia dzisiejszego i przyszłych — nie do dni już ukończonych, tych nie przepisujemy wstecz.
function effectiveDayInfo(profile, day) {
  const info = getDayInfo(day);
  if (info.rest) return info;
  const override = Store.getPhaseOverride(profile);
  if (override && override > info.phase && day >= Store.currentDayNumber(profile)) {
    const phaseName = (PHASES.find(p => p.id === override) || {}).name || info.phaseName;
    return { ...info, phase: override, phaseName };
  }
  return info;
}

function viewToday(profile) {
  const day = Store.currentDayNumber(profile);
  const info = effectiveDayInfo(profile, day);
  const done = profile.progress.completedDays.includes(day);
  const completedCount = profile.progress.completedDays.length;
  const pct = Math.round((completedCount / 60) * 100);
  const streak = Store.currentStreak(profile);
  const lastSession = Store.getLastSession(profile);

  return `
  <section class="hero card">
    <div class="hero-top">
      <span class="pill">${esc(info.phaseName)}</span>
      <span class="pill pill-outline">Dzień ${day} / 60</span>
    </div>
    <p class="muted" style="margin:0 0 2px">Cześć, ${esc(profile.name)} 👋</p>
    <h2>${esc(dayTypeLabel(info))}</h2>
    <p class="muted">${esc(info.muscles)}</p>
    ${done ? '<p class="done-badge">✓ Ukończono dzisiejszy trening</p>' : ''}
    <a class="btn primary big" href="#/${done ? 'day' : 'workout'}/${day}">${done ? 'Zobacz trening' : (info.rest ? 'Zobacz dzień odpoczynku' : 'Rozpocznij trening')}</a>
    ${!done && !info.rest ? `<a class="btn ghost big" href="#/workout/${day}-express">⚡ Nie mam siły na cały trening — 10 minut wystarczy</a>` : ''}
  </section>

  <section class="card progress-mini">
    <div class="progress-mini-row">
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <span>${completedCount}/60 dni · ${pct}%</span>
    </div>
    <p class="muted small" style="margin:6px 0 0">Seria: ${streak} dni · Faza ${info.phase}</p>
    <a href="#/progress" class="link">Zobacz postępy →</a>
  </section>

  ${viewReadinessCard(profile)}
  ${viewDailyLogCard(profile)}
  ${viewDifficultySuggestion(profile)}
  ${viewPhaseTrendSuggestion(profile)}

  <section class="card">
    <h3 style="margin-top:0">🤖 AI Coach</h3>
    <p class="muted" style="margin-bottom:0">${esc(coachTip(info, streak))}</p>
  </section>

  ${lastSession ? `<section class="card">
    <h3 style="margin-top:0">Ostatni trening</h3>
    <p class="muted" style="margin-bottom:0">Dzień ${lastSession.day} · ${fmtSeconds(lastSession.durationSeconds || 0)} · trudność ${lastSession.difficulty}/5 · samopoczucie ${lastSession.feeling}/5${lastSession.pain && lastSession.pain !== 'none' ? ' · zgłoszono: ' + painLabel(lastSession.pain) : ''}</p>
  </section>` : ''}

  <section class="quick-links">
    <a class="quick-link" href="#/schedule"><span class="qi">📅</span>Harmonogram</a>
    <a class="quick-link" href="#/library"><span class="qi">📚</span>Biblioteka ćwiczeń</a>
    <a class="quick-link" href="#/info"><span class="qi">🛡️</span>Bezpieczeństwo</a>
    ${(profile.equipment || []).some(e => ['Opona', 'Plecak obciążony', 'Skakanka'].includes(e)) ? `<a class="quick-link" href="#/library"><span class="qi">🎒</span>Ćwiczenia bonus</a>` : ''}
  </section>`;
}

function viewReadinessCard(profile) {
  const score = Store.computeReadiness(profile);
  const manual = Store.getReadinessInput(profile);
  const color = score >= 70 ? 'var(--success)' : score >= 45 ? 'var(--gold)' : 'var(--danger)';
  return `
  <section class="card">
    <div class="progress-mini-row">
      <h3 style="margin:0">Gotowość do treningu</h3>
      <span style="font-weight:800;font-size:1.4rem;color:${color}">${score}</span>
    </div>
    <p class="muted small" style="margin:4px 0 10px">Orientacyjny wskaźnik na podstawie ostatnich treningów i Twojego dzisiejszego samopoczucia — to nie diagnoza medyczna.</p>
    <p class="muted small" style="margin-bottom:2px">Jak spałaś/eś?</p>
    <div class="chip-row">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="chip" data-action="set-readiness-sleep" data-value="${n}" style="${manual && manual.sleep === n ? 'background:var(--navy);color:#fff' : ''}">${n}</button>`).join('')}</div>
    <p class="muted small" style="margin:8px 0 2px">Poziom zakwasów / zmęczenia?</p>
    <div class="chip-row">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="chip" data-action="set-readiness-soreness" data-value="${n}" style="${manual && manual.soreness === n ? 'background:var(--navy);color:#fff' : ''}">${n}</button>`).join('')}</div>
  </section>`;
}

function viewDifficultySuggestion(profile) {
  const s = Store.computeDifficultySuggestion(profile);
  if (!s) return '';
  const label = s.direction === 'easier' ? 'Łatwiej' : 'Trudniej';
  return `
  <section class="card" style="border-left:4px solid var(--gold)">
    <h3 style="margin-top:0">💡 Sugestia dostosowania</h3>
    <p class="muted" style="margin-bottom:10px">${esc(s.reason)}</p>
    <button type="button" class="btn small primary" data-action="apply-difficulty-suggestion" data-direction="${s.direction}">Ustaw poziom: ${label}</button>
  </section>`;
}

const EATING_LABELS = { light: 'Lekko', normal: 'Normalnie', heavy: 'Ciężko' };

function viewDailyLogCard(profile) {
  const log = Store.getDailyLog(profile);
  return `
  <section class="card">
    <h3 style="margin-top:0">🍽️ Dzień w pigułce</h3>
    <p class="muted small" style="margin-bottom:2px">Jak dziś jadłaś/eś?</p>
    <div class="chip-row">${Object.entries(EATING_LABELS).map(([v, l]) => `<button type="button" class="chip ${log.eating === v ? 'active' : ''}" data-action="set-eating" data-value="${v}">${l}</button>`).join('')}</div>
    <p class="muted small" style="margin:10px 0 4px">Nawodnienie: ${log.water || 0} ${log.water === 1 ? 'szklanka' : 'szklanek'}</p>
    <div class="chip-row">
      <button type="button" class="btn small ghost" data-action="water-remove">− szklanka</button>
      <button type="button" class="btn small primary" data-action="water-add">+ 💧 szklanka</button>
    </div>
  </section>`;
}

function viewPhaseTrendSuggestion(profile) {
  const t = Store.computePhaseTrend(profile);
  if (!t) return '';
  return `
  <section class="card" style="border-left:4px solid var(--gold)">
    <h3 style="margin-top:0">📈 Stały postęp — czas na wyższą fazę?</h3>
    <p class="muted" style="margin-bottom:10px">${esc(t.reason)}</p>
    <div class="btn-row">
      <button type="button" class="btn small primary" data-action="apply-phase-trend" data-phase="${t.suggestedPhase}">Przejdź na „${esc(t.phaseName)}"</button>
      <button type="button" class="btn small ghost" data-action="dismiss-phase-trend" data-phase="${t.suggestedPhase}">Nie teraz</button>
    </div>
  </section>`;
}

function coachTip(info, streak) {
  if (info.rest) return 'Dziś dzień odpoczynku — regeneracja jest równie ważna jak trening.';
  if (streak >= 3) return `Świetna passa: ${streak} dni z rzędu! Tak trzymaj, ale pamiętaj o dniach R.`;
  if (info.circuit) return 'Dziś obwód stacyjny — pilnuj przerw między stacjami, to część planu, nie strata czasu.';
  return 'Skup się dziś na technice, nie na tempie — to ona chroni Twoje stawy.';
}

function painLabel(p) {
  return { none: 'brak', mild: 'lekki dyskomfort', pain: 'ból' }[p] || p;
}

function dayTypeLabel(info) {
  if (info.rest) return 'R — Odpoczynek';
  return `${info.type} — ${info.typeName}`;
}

function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function generateIcsCalendar(profile) {
  const start = new Date(profile.startDate + 'T00:00:00');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nowa Ja//nowa-ja.vercel.app//PL', 'CALSCALE:GREGORIAN'];
  for (let day = 1; day <= 60; day++) {
    const info = getDayInfo(day);
    const d = new Date(start);
    d.setDate(d.getDate() + (day - 1));
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const summary = `Nowa Ja — dzień ${day}/60: ${dayTypeLabel(info)}`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:nowaja-${profile.id}-day${day}@nowa-ja.vercel.app`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`SUMMARY:${icsEscape(summary)}`);
    if (!info.rest) lines.push(`DESCRIPTION:${icsEscape('Partie: ' + info.muscles)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ---------- Day detail ----------
// ---------- "Dostosuj dzisiejszy trening" (szybkie ograniczenia + wolny tekst) ----------
let workoutConstraints = [];

function hasConstraint(type, part) {
  return workoutConstraints.some(c => c.type === type && (!part || c.part === part));
}

function toggleConstraint(type, part) {
  const idx = workoutConstraints.findIndex(c => c.type === type && (!part || c.part === part));
  if (idx >= 0) workoutConstraints.splice(idx, 1);
  else workoutConstraints.push(part ? { type, part } : { type });
}

const PAIN_PARTS = ['Kolana', 'Biodra', 'Kręgosłup / plecy', 'Barki', 'Nadgarstki'];

function viewConstraintPanel() {
  return `
  <details class="card constraint-panel" ${workoutConstraints.length ? 'open' : ''}>
    <summary>Dostosuj dzisiejszy trening${workoutConstraints.length ? ` <span class="pill">${workoutConstraints.length}</span>` : ''}</summary>
    <p class="muted small">Zaznacz, jeśli coś dziś inaczej — trening dopasuje się automatycznie.</p>
    <div class="chip-row">
      <button type="button" class="chip ${hasConstraint('time') ? 'active' : ''}" data-action="toggle-constraint" data-type="time">⏱️ Mało czasu</button>
      <button type="button" class="chip ${hasConstraint('equipment') ? 'active' : ''}" data-action="toggle-constraint" data-type="equipment">🚫 Brak sprzętu</button>
    </div>
    <p class="muted small" style="margin-top:10px">Boli Cię coś konkretnego?</p>
    <div class="chip-row">
      ${PAIN_PARTS.map(p => `<button type="button" class="chip ${hasConstraint('pain', p) ? 'active' : ''}" data-action="toggle-constraint" data-type="pain" data-part="${esc(p)}">${esc(p)}</button>`).join('')}
    </div>
    <p class="muted small" style="margin-top:10px">Albo po prostu napisz, co się dzieje:</p>
    <div class="form-inline" style="align-items:flex-start">
      <input type="text" id="constraint-text-input" placeholder="np. mam dziś tylko 20 minut">
      <button type="button" class="btn small primary" data-action="apply-constraint-text">Zastosuj</button>
    </div>
    <p class="muted small" style="margin-top:2px">Rozpoznaję kilka typowych sytuacji po polsku — to reguły, nie prawdziwa rozmowa z AI.</p>
    ${workoutConstraints.length ? `<button type="button" class="btn tiny ghost" data-action="clear-constraints" style="margin-top:6px">Wyczyść wszystko</button>` : ''}
  </details>`;
}

function viewDay(profile, day) {
  if (!day || day < 1 || day > 60) return `<div class="empty-state"><p>Nieprawidłowy dzień.</p><a class="link" href="#/schedule">Wróć do harmonogramu</a></div>`;
  const info = effectiveDayInfo(profile, day);
  const done = profile.progress.completedDays.includes(day);
  const checked = new Set(Store.getExerciseChecks(profile, day));

  let body = '';
  if (info.rest) {
    body = `
    <div class="card rest-card">
      <p>Dzień odpoczynku jest częścią programu — regeneracja mięśni i stawów. Możesz wykonać lekki spacer lub rozciąganie, jeśli masz na to ochotę.</p>
    </div>`;
  } else if (info.circuit) {
    body = `
    <div class="card">
      <p>${esc(CIRCUIT_INFO)}</p>
      <p><strong>Liczba rund w tej fazie: ${esc(info.rounds)}</strong></p>
      <div class="timer-row">
        <button class="chip" data-action="start-timer" data-seconds="25" data-label="Przerwa między stacjami">⏱ 25s (stacje)</button>
        <button class="chip" data-action="start-timer" data-seconds="75" data-label="Przerwa między rundami">⏱ 75s (rundy)</button>
      </div>
    </div>
    <ol class="exercise-list">
      ${info.stations.map((code, idx) => exerciseRow(code, day, checked, idx + 1)).join('')}
    </ol>`;
  } else {
    body = `<ol class="exercise-list">
      ${info.exercises.map((code, idx) => exerciseRow(code, day, checked, idx + 1)).join('')}
    </ol>`;
  }

  return `
  <a class="link back" href="#/schedule">← Harmonogram</a>
  <section class="card">
    <div class="hero-top">
      <span class="pill">${esc(info.phaseName)}</span>
      <span class="pill pill-outline">Dzień ${day} / 60</span>
    </div>
    <h2>${esc(dayTypeLabel(info))}</h2>
    <p class="muted">${esc(info.muscles)}</p>
    ${!info.rest ? `<a class="btn primary big" href="#/workout/${day}">${done ? 'Powtórz w trybie treningu' : 'Rozpocznij trening (tryb prowadzony)'}</a>` : ''}
  </section>

  ${!info.rest ? viewConstraintPanel() : ''}

  ${!info.rest ? `<details class="card details-warmup">
    <summary>Rozgrzewka i schłodzenie (przypomnienie)</summary>
    <p class="muted small">Przed treningiem (5-8 min):</p>
    <ul class="tight">${WARMUP.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
    <p class="muted small">Po treningu: ${esc(COOLDOWN)}</p>
  </details>` : ''}

  ${body}

  <button class="btn ${done ? 'secondary' : 'primary'} big sticky-bottom" data-action="toggle-day" data-day="${day}">
    ${done ? '✓ Dzień ukończony — cofnij' : 'Oznacz dzień jako ukończony'}
  </button>`;
}

function exerciseRow(code, day, checkedSet, idx) {
  const ex = exByCode[code];
  if (!ex) return '';
  const isChecked = checkedSet.has(code);
  const reps = ex.reps ? currentPhaseReps(ex, phaseForDay(day).id) : '';
  return `
  <li class="exercise-row ${isChecked ? 'checked' : ''}">
    <label class="check">
      <input type="checkbox" data-action="toggle-ex" data-day="${day}" data-code="${code}" ${isChecked ? 'checked' : ''}>
      <span class="checkmark"></span>
    </label>
    <a class="exercise-row-body" href="#/exercise/${code}">
      <span class="ex-num">${idx}</span>
      <span class="ex-info">
        <span class="ex-name">${esc(code)} — ${esc(ex.name)}</span>
        <span class="ex-reps muted">${esc(reps)}</span>
      </span>
      <span class="chev">›</span>
    </a>
  </li>`;
}

function currentPhaseReps(ex, phaseId) {
  return ex.reps['faza' + phaseId] || '';
}

// ---------- Workout ("Trening teraz") ----------
function viewWorkoutShell() {
  return `<div class="workout-root"><div id="workout-body"><p class="muted">Ładowanie…</p></div></div>`;
}

// Nie pozwala ekranowi zgasnąć w trakcie treningu (inaczej wizualny timer/animacja by się zatrzymały).
let wakeLockSentinel = null;
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
  } catch {}
}
function releaseWakeLock() {
  wakeLockSentinel?.release().catch(() => {});
  wakeLockSentinel = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && activeWorkoutRunner && !wakeLockSentinel) {
    requestWakeLock();
  }
});

// Tryb ekspresowy: prawdziwy osobny ~10-minutowy wariant dnia (mniej ćwiczeń, 1 seria każde),
// nie tylko redukcja serii przy "mało czasu" — dla dni zerowej motywacji łatwiej zacząć
// dedykowany krótki plan niż "skrócony" pełny trening.
const EXPRESS_MAX_EXERCISES = 4;

function initWorkout(profile, day, opts = {}) {
  const isExpress = !!opts.express;
  if (activeWorkoutRunner && activeWorkoutDay === day && !!activeWorkoutRunner._express === isExpress) {
    renderWorkoutBody(activeWorkoutRunner);
    return;
  }
  requestWakeLock();
  let dayInfo = effectiveDayInfo(profile, day);
  const isTimeConstrained = hasConstraint('time');
  if (isExpress && dayInfo.circuit) {
    dayInfo = { ...dayInfo, rounds: '1' };
  } else if (isTimeConstrained && dayInfo.circuit) {
    const rounds = firstIntFrom(dayInfo.rounds, 2);
    dayInfo = { ...dayInfo, rounds: String(Math.max(1, rounds - 1)) };
  }
  if (isExpress && !dayInfo.rest && !dayInfo.circuit) {
    dayInfo = { ...dayInfo, exercises: dayInfo.exercises.slice(0, EXPRESS_MAX_EXERCISES) };
  }
  const steps = buildWorkoutSteps(dayInfo, exByCode);
  const phaseDef = PHASES.find(p => p.id === dayInfo.phase) || PHASES[0];
  const restSeconds = firstIntFrom(phaseDef.restBetween, 45);

  activeWorkoutDay = day;
  const startedAt = Date.now();
  const results = {}; // code -> {setsCompleted, setsTarget, skipped} — last write per exercise wins
  activeWorkoutRunner = new WorkoutRunner({
    dayInfo,
    steps,
    restSeconds,
    setsReduction: isExpress ? 99 : (isTimeConstrained ? 1 : 0),
    onLogSet: (code, setsCompleted, setsTarget, skipped) => {
      results[code] = { code, setsCompleted, setsTarget, skipped: !!skipped };
    },
    onStateChange: () => renderWorkoutBody(activeWorkoutRunner, day, profile),
  });
  activeWorkoutRunner._day = day;
  activeWorkoutRunner._results = results;
  activeWorkoutRunner._express = isExpress;
  activeWorkoutRunner._equipmentFlag = hasConstraint('equipment');
  activeWorkoutRunner._painParts = workoutConstraints.filter(c => c.type === 'pain').map(c => c.part);
  activeWorkoutRunner.begin();
  Music.startForWorkout();
  renderWorkoutBody(activeWorkoutRunner, day, profile);
}

function firstIntFrom(text, fallback) {
  const m = String(text || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : fallback;
}

function renderWorkoutBody(runner, day, profile) {
  const body = document.getElementById('workout-body');
  if (!body) return;
  const s = runner.state;
  const dayInfo = runner.dayInfo;
  day = day || activeWorkoutDay;

  announceWorkout(runner);

  let inner = '';
  if (dayInfo.rest || s.stage === STAGE.FEEDBACK) {
    inner = workoutFeedbackHtml(runner);
  } else if (s.stage === STAGE.DONE) {
    inner = `<div class="workout-center"><h2>Trening ukończony! 🎉</h2></div>`;
  } else {
    inner = workoutActiveHtml(runner);
  }

  body.innerHTML = `
    <div class="workout-header">
      <button type="button" class="icon-btn" data-action="workout-exit" aria-label="Zakończ">✕</button>
      <span class="muted">${esc(dayInfo.typeName)}${runner._express ? ' <span class="pill">⚡ ekspresowo</span>' : ''}</span>
      <div class="workout-header-actions">
        <button type="button" class="icon-btn" data-action="workout-toggle-voice" aria-label="Lektor">${Voice.isEnabled() ? '🔊' : '🔇'}</button>
        <button type="button" class="icon-btn" data-action="workout-toggle-music" aria-label="Muzyka">${Music.isEnabled() ? '🎵' : '🔕'}</button>
      </div>
    </div>
    ${Music.isEnabled() && Music.isPlaying() ? `<p class="muted small workout-track-label" data-action="workout-next-track">🎧 ${esc(Music.currentTitle())} · zmień ›</p>` : ''}
    ${inner}`;
}

// Wypowiada nazwę ćwiczenia, odliczanie 3-2-1, komunikaty odpoczynku i motywacyjne —
// tylko przy zmianie etapu/kroku, żeby nie powtarzać tego samego co 250ms.
function announceWorkout(runner) {
  const s = runner.state;
  const step = runner.currentStep;
  const stageOrStepChanged = runner._voiceStage !== s.stage || runner._voiceStepIndex !== s.stepIndex;

  if (stageOrStepChanged) {
    if (s.stage === STAGE.ACTIVE && step) {
      const reps = currentPhaseReps(step.exercise, runner.dayInfo.phase);
      Voice.speak(`${step.exercise.name}. ${reps}.`);
    } else if ([STAGE.SET_REST, STAGE.STATION_REST, STAGE.ROUND_REST].includes(s.stage)) {
      const phrase = Math.random() < 0.5 ? Voice.randomMotivation() : '';
      Voice.speak(`${restLabel(s.stage)}. ${phrase}`.trim());
    } else if (s.stage === STAGE.FEEDBACK) {
      Voice.speak(runner.dayInfo.rest ? 'Dziś dzień odpoczynku. Odpocznij dobrze.' : 'Trening ukończony. Brawo, jesteś coraz silniejszy!');
    }
    runner._voiceStage = s.stage;
    runner._voiceStepIndex = s.stepIndex;
    runner._voiceSecond = null;
  }

  if (s.stage === STAGE.COUNTDOWN && s.remainingSeconds > 0 && s.remainingSeconds <= 3 && s.remainingSeconds !== runner._voiceSecond) {
    Voice.speak(String(s.remainingSeconds));
    runner._voiceSecond = s.remainingSeconds;
  }
}

const PAIN_PART_TO_GROUPS = {
  'Kolana': ['B'],
  'Biodra': ['A', 'B'],
  'Kręgosłup / plecy': ['A'],
  'Barki': ['C'],
  'Nadgarstki': ['C'],
};

function constraintSuggestionFor(runner, ex) {
  if (runner._equipmentFlag && /bidon|hantl|taśm/i.test(ex.name + ' ' + ex.steps.join(' '))) {
    return `
    <div class="pain-suggestion">
      <span>🚫 To ćwiczenie zwykle wykorzystuje sprzęt (bidony/hantle/taśmę), którego dziś nie masz.</span>
      <button type="button" class="btn tiny primary" data-action="workout-swap" data-code="${ex.code}">Zamień</button>
    </div>`;
  }
  const parts = (runner._painParts || []).filter(p => (PAIN_PART_TO_GROUPS[p] || []).includes(ex.group));
  if (parts.length) {
    return `
    <div class="pain-suggestion">
      <span>😣 Zgłosiłaś/eś dziś: ${esc(parts.join(', '))}. To ćwiczenie może obciążać tę okolicę.</span>
      <button type="button" class="btn tiny primary" data-action="workout-swap" data-code="${ex.code}">Zamień</button>
    </div>`;
  }
  return '';
}

function workoutActiveHtml(runner) {
  const s = runner.state;
  const step = runner.currentStep;
  if (!step) return '';
  const ex = step.exercise;

  let headerLine, subLine = '';
  if (step.stationIndex) {
    headerLine = `STACJA ${step.stationIndex} / ${step.totalStations}`;
    subLine = `RUNDA ${step.round} / ${step.totalRounds}`;
  } else {
    headerLine = `ĆWICZENIE ${s.stepIndex + 1} / ${runner.steps.length}`;
  }

  let centerHtml = '';
  if (s.stage === STAGE.COUNTDOWN) {
    centerHtml = bigTimer(Math.max(0, s.remainingSeconds));
  } else if (s.stage === STAGE.SET_REST || s.stage === STAGE.STATION_REST || s.stage === STAGE.ROUND_REST) {
    centerHtml = `<p class="workout-rest-label">${restLabel(s.stage)}</p>${bigTimer(fmtSeconds(s.remainingSeconds))}`;
  } else if (s.stage === STAGE.ACTIVE) {
    centerHtml = s.isTimed ? bigTimer(fmtSeconds(s.remainingSeconds)) : `<p class="workout-reps">${esc(currentPhaseReps(ex, runner.dayInfo.phase))}</p>`;
  }

  const setsLine = !runner.isCircuit ? `<p class="workout-set-label">SERIA ${s.currentSet} / ${s.totalSets}</p>` : '';

  const profile = Store.getActiveProfile();
  const painCount = profile ? Store.getExercisePainCount(profile, ex.code) : 0;
  const painSuggestion = painCount >= 2 ? `
    <div class="pain-suggestion">
      <span>⚠️ Zgłaszałaś/eś ból przy tym ćwiczeniu (${painCount}×). Rozważ zamiennik.</span>
      <button type="button" class="btn tiny primary" data-action="workout-swap" data-code="${ex.code}">Zamień</button>
    </div>` : '';

  const constraintSuggestion = constraintSuggestionFor(runner, ex);

  return `
  <div class="workout-center">
    ${painSuggestion}
    ${constraintSuggestion}
    <p class="workout-step-label">${headerLine}</p>
    ${subLine ? `<p class="muted">${subLine}</p>` : ''}
    <h2 class="workout-exercise-name">${esc(ex.name.toUpperCase())}</h2>
    ${centerHtml}
    ${setsLine}
  </div>
  <div class="workout-controls">
    ${s.stage === STAGE.ACTIVE ? `
      <div class="btn-row">
        <button class="btn ghost" style="flex:1" data-action="workout-pause">${s.isPaused ? 'WZNÓW' : 'PAUZA'}</button>
        <button class="btn primary" style="flex:1" data-action="workout-done">GOTOWE</button>
      </div>` : ''}
    <div class="btn-row">
      <button class="btn ghost" style="flex:1" data-action="workout-skip">POMIŃ</button>
      <button class="btn ghost" style="flex:1" data-action="workout-swap" data-code="${ex.code}">ZAMIEŃ</button>
    </div>
    <button type="button" class="pain-report-link" data-action="workout-report-pain" data-code="${ex.code}">😣 Zgłoś ból przy tym ćwiczeniu</button>
  </div>`;
}

function bigTimer(text) {
  return `<div class="workout-timer">${esc(String(text))}</div>`;
}

function restLabel(stage) {
  return { SET_REST: 'ODPOCZYNEK', STATION_REST: 'PRZERWA MIĘDZY STACJAMI', ROUND_REST: 'PRZERWA MIĘDZY RUNDAMI' }[stage] || 'ODPOCZYNEK';
}

function workoutFeedbackHtml(runner) {
  if (runner.dayInfo.rest) {
    return `<div class="workout-center"><h2>Dzień odpoczynku</h2><p class="muted">To też jest część programu.</p>
      <button class="btn primary big" data-action="workout-finish-rest">Zamknij</button></div>`;
  }
  const f = runner.state.feedback;
  return `
  <div class="workout-center" style="text-align:left;width:100%">
    <h2 style="text-align:center">TRENING UKOŃCZONY</h2>
    <p class="onboard-field-label">Jak trudny był trening?</p>
    <input type="range" min="1" max="5" value="${f.difficulty}" data-action="workout-feedback-difficulty" style="width:100%">
    <p class="muted small">${f.difficulty} / 5</p>
    <p class="onboard-field-label">Jak się czujesz?</p>
    <input type="range" min="1" max="5" value="${f.feeling}" data-action="workout-feedback-feeling" style="width:100%">
    <p class="muted small">${f.feeling} / 5</p>
    <p class="onboard-field-label">Czy pojawił się ból?</p>
    <div class="chip-row">
      <button class="chip ${f.pain === 'none' ? 'active' : ''}" data-action="workout-feedback-pain" data-pain="none">Nie</button>
      <button class="chip ${f.pain === 'mild' ? 'active' : ''}" data-action="workout-feedback-pain" data-pain="mild">Lekki dyskomfort</button>
      <button class="chip ${f.pain === 'pain' ? 'active' : ''}" data-action="workout-feedback-pain" data-pain="pain">Ból</button>
    </div>
    <button class="btn primary big" data-action="workout-submit-feedback" style="margin-top:16px">Zapisz i zakończ</button>
  </div>`;
}

// ---------- Sprawdzian formy (kamera, w 100% lokalnie — patrz js/poseCheck.js) ----------
function viewFormCheck(code) {
  const ex = exByCode[code];
  const kind = FORM_CHECK_KIND[code];
  if (!ex || !kind) {
    return `<div class="empty-state"><p>Sprawdzian formy niedostępny dla tego ćwiczenia.</p><a class="link" href="#/library">Wróć do biblioteki</a></div>`;
  }
  if (typeof PoseCheck === 'undefined' || !PoseCheck.isSupported()) {
    return `
    <div class="workout-header">
      <button type="button" class="icon-btn" data-action="exit-form-check" data-code="${code}" aria-label="Zamknij">✕</button>
      <span class="muted">Sprawdzian formy</span>
      <div></div>
    </div>
    <div class="workout-center"><p class="muted">Ta przeglądarka nie obsługuje analizy kamery na urządzeniu. Spróbuj w aktualnej wersji Chrome lub Safari.</p></div>`;
  }
  const setupHint = kind === 'plank'
    ? 'Ustaw telefon z boku, ok. 1,5 metra od siebie, tak żeby było widać całą sylwetkę od ramion po kostki.'
    : 'Ustaw telefon z boku, ok. 2 metry od siebie, tak żeby było widać całą sylwetkę od stóp po ramiona.';
  return `
  <div class="workout-header">
    <button type="button" class="icon-btn" data-action="exit-form-check" data-code="${code}" aria-label="Zamknij">✕</button>
    <span class="muted">${esc(ex.code)} — Sprawdzian formy (beta)</span>
    <div></div>
  </div>
  <div class="form-check-root">
    <div class="form-check-video-wrap">
      <video id="fc-video" playsinline muted></video>
      <canvas id="fc-canvas"></canvas>
    </div>
    <p class="muted small" id="fc-status">${setupHint}</p>
    <div class="btn-row" id="fc-controls">
      <button type="button" class="btn primary" id="fc-btn-start">Uruchom kamerę</button>
    </div>
    <p class="muted small" style="margin-top:14px">Obraz z kamery jest przetwarzany wyłącznie na Twoim urządzeniu i nigdzie nie jest wysyłany ani zapisywany. To orientacyjna pomoc, nie ocena eksperta — pierwsze uruchomienie pobiera model rozpoznawania (kilka MB), potem działa bez ponownego pobierania.</p>
  </div>`;
}

function bindFormCheck(code) {
  const ex = exByCode[code];
  const kind = FORM_CHECK_KIND[code];
  const video = document.getElementById('fc-video');
  const canvas = document.getElementById('fc-canvas');
  const statusEl = document.getElementById('fc-status');
  const controls = document.getElementById('fc-controls');
  if (!ex || !kind || !video || !canvas || !statusEl || !controls) return;

  function setControls(html) { controls.innerHTML = html; }

  const startBtn = document.getElementById('fc-btn-start');
  if (!startBtn) return;
  startBtn.addEventListener('click', async () => {
    setControls('<button type="button" class="btn primary" disabled>Uruchamianie…</button>');
    statusEl.textContent = 'Uruchamianie kamery i (przy pierwszym użyciu) pobieranie modelu analizy — to może chwilę potrwać…';

    function attachStop() {
      document.getElementById('fc-btn-stop')?.addEventListener('click', () => {
        PoseCheck.stop();
        navigate(`#/exercise/${code}`);
      });
    }

    await PoseCheck.start({
      video, canvas, kind,
      onSpeak: (text) => Voice.speak(text, { interrupt: true }),
      onStatus: (s) => {
        if (s.phase === 'error') {
          statusEl.textContent = s.message;
          setControls('<button type="button" class="btn primary" id="fc-btn-retry">Spróbuj ponownie</button>');
          document.getElementById('fc-btn-retry')?.addEventListener('click', () => bindFormCheck(code));
        } else if (s.phase === 'ready' && kind === 'plank') {
          statusEl.textContent = 'Widzę obraz z kamery. Wejdź w pozycję deski, gdy będziesz gotowa/y — analiza już działa.';
          setControls('<button type="button" class="btn ghost" id="fc-btn-stop">Zakończ analizę</button>');
          attachStop();
        } else if (s.phase === 'ready') {
          statusEl.textContent = 'Widzę obraz z kamery. Stań prosto w kadrze, żeby skalibrować pozycję neutralną.';
          setControls('<button type="button" class="btn primary" id="fc-btn-calibrate">Kalibruj (stój prosto ok. 3 s)</button>');
          document.getElementById('fc-btn-calibrate')?.addEventListener('click', async () => {
            setControls('<button type="button" class="btn primary" disabled>Kalibracja — stój prosto…</button>');
            statusEl.textContent = 'Stój prosto i nieruchomo przez chwilę…';
            const ok = await PoseCheck.calibrate();
            if (ok) {
              statusEl.textContent = `Kalibracja gotowa. Zacznij ${kind === 'hinge' ? 'martwy ciąg' : 'przysiad / wykrok'} — będę liczyć powtórzenia i podpowiadać na głos.`;
              setControls('<button type="button" class="btn ghost" id="fc-btn-stop">Zakończ analizę</button>');
              attachStop();
            } else {
              statusEl.textContent = 'Nie udało się wykryć całej sylwetki — sprawdź, czy mieścisz się w kadrze, i spróbuj ponownie.';
              setControls('<button type="button" class="btn primary" id="fc-btn-calibrate2">Kalibruj ponownie</button>');
              document.getElementById('fc-btn-calibrate2')?.addEventListener('click', () => bindFormCheck(code));
            }
          });
        } else if (s.phase === 'tracking-lost') {
          statusEl.textContent = 'Nie widzę całej sylwetki — cofnij się lub popraw ustawienie telefonu.';
        } else if (s.phase === 'analyzing' && kind === 'plank') {
          const mm = String(Math.floor((s.holdSeconds || 0) / 60)).padStart(2, '0');
          const ss = String((s.holdSeconds || 0) % 60).padStart(2, '0');
          statusEl.textContent = (s.ok ? '✅ ' : '⚠️ ') + `${mm}:${ss} — ` + (s.ok ? 'dobra forma.' : (s.issues.includes('sag') ? 'biodra opadają.' : 'biodra za wysoko.'));
        } else if (s.phase === 'analyzing') {
          const repLabel = `Powtórzenia: ${s.repCount || 0}`;
          statusEl.textContent = (s.ok ? `✅ ${repLabel} — forma wygląda dobrze.` : `⚠️ ${repLabel} — ` + (s.issues.includes('back') ? 'sprawdź plecy / tułów.' : s.issues.includes('knee') ? 'sprawdź pozycję kolan.' : 'zwiększ zakres pochylenia w biodrach.'));
        }
      },
    });
  });
}

function exitWorkout() {
  Voice.stop();
  Music.stop();
  releaseWakeLock();
  if (activeWorkoutRunner) { activeWorkoutRunner.stop(); activeWorkoutRunner = null; activeWorkoutDay = null; }
  navigate('/today');
  render();
}

function showSwapDialog(alternatives, onSelect) {
  document.getElementById('swap-modal')?.remove();
  const list = alternatives.length
    ? alternatives.map(alt => `<button type="button" class="btn ghost" style="width:100%;margin-bottom:8px;text-align:left" data-swap-code="${esc(alt.code)}">${esc(alt.code + ' — ' + alt.name)}</button>`).join('')
    : `<p class="muted small">Brak zdefiniowanych zamienników w programie źródłowym dla tej grupy.</p>`;

  const overlay = document.createElement('div');
  overlay.id = 'swap-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal card">
      <h3 style="margin-top:0">Zamienniki</h3>
      <p class="muted small">Inne ćwiczenia z tej samej grupy:</p>
      ${list}
      <button type="button" class="btn ghost" style="width:100%" data-action="close-swap">Anuluj</button>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('[data-swap-code]').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.swapCode;
      const ex = exByCode[code];
      overlay.remove();
      if (ex) onSelect(ex);
    });
  });
  overlay.querySelector('[data-action="close-swap"]').addEventListener('click', () => overlay.remove());
}

// ---------- Exercise detail ----------
function viewExercise(profile, code) {
  const ex = exByCode[code];
  if (!ex) return `<div class="empty-state"><p>Nie znaleziono ćwiczenia.</p><a class="link" href="#/library">Wróć do biblioteki</a></div>`;

  const repsRows = [1, 2, 3, 4].map(p => `<tr><td>Faza ${p}</td><td>${esc(ex.reps['faza' + p])}</td></tr>`).join('');

  return `
  <a class="link back" href="#/library">← Biblioteka ćwiczeń</a>
  <section class="card">
    <span class="pill">${esc(groupLabel(ex.group))}</span>
    <h2>${esc(ex.code)} — ${esc(ex.name)}</h2>
    <p class="muted">${esc(ex.muscle)}</p>
  </section>

  <section class="card media-card">
    <h3>Infografika</h3>
    <div class="media-slot" id="media-image-${ex.code}" data-code="${ex.code}" data-kind="image">
      <div class="media-placeholder">Brak infografiki</div>
    </div>
    <div class="media-actions">
      <button class="btn small" data-action="upload-media" data-code="${ex.code}" data-kind="image">Dodaj / zmień zdjęcie</button>
      <button class="btn small ghost" data-action="remove-media" data-code="${ex.code}" data-kind="image">Usuń</button>
    </div>
  </section>

  <section class="card media-card">
    <h3>Animacja z 2-4 zdjęć (flipbook)</h3>
    <p class="muted small">Brak prawdziwego wideo? Wgraj kilka zdjęć pozycji (start / środek / koniec ruchu) — apka zapętli je jako prostą animację.</p>
    <div class="media-slot" id="media-frames-${ex.code}" data-code="${ex.code}" data-kind="frames">
      <div class="media-placeholder">Brak animacji</div>
    </div>
    <div class="media-actions">
      <button class="btn small" data-action="upload-frames" data-code="${ex.code}">Dodaj sekwencję zdjęć</button>
      <button class="btn small ghost" data-action="remove-frames" data-code="${ex.code}">Usuń</button>
    </div>
  </section>

  <section class="card media-card">
    <h3>Wideo instruktażowe</h3>
    <p class="muted small">Wideo jest wyciszone — puść je, a darmowy lektor przeczyta na głos instrukcje wykonania.</p>
    <div class="media-slot" id="media-video-${ex.code}" data-code="${ex.code}" data-kind="video">
      <div class="media-placeholder">Brak wideo</div>
    </div>
    <div class="media-actions">
      <button class="btn small" data-action="upload-media" data-code="${ex.code}" data-kind="video">Dodaj / zmień wideo</button>
      <button class="btn small ghost" data-action="remove-media" data-code="${ex.code}" data-kind="video">Usuń</button>
    </div>
  </section>

  <section class="card">
    <h3>Wykonanie</h3>
    <ol>${ex.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
  </section>

  <section class="card safety-card">
    <h3>Bezpieczeństwo</h3>
    <p>${esc(ex.safety)}</p>
  </section>

  ${FORM_CHECK_KIND[ex.code] ? `
  <section class="card" style="border-left:4px solid var(--gold)">
    <h3 style="margin-top:0">🎥 Sprawdzian formy (beta)</h3>
    <p class="muted small">${FORM_CHECK_KIND[ex.code] === 'plank'
      ? 'Kamera na Twoim urządzeniu orientacyjnie sprawdza, czy biodra nie opadają ani nie unoszą się za wysoko — obraz nigdy nie opuszcza telefonu/komputera.'
      : 'Kamera na Twoim urządzeniu orientacyjnie sprawdza pochylenie tułowia i pozycję kolan, a przy okazji liczy powtórzenia — obraz nigdy nie opuszcza telefonu/komputera.'} To pomoc, nie ocena eksperta — nie zastępuje wskazówek bezpieczeństwa powyżej.</p>
    <a class="btn small primary" href="#/form-check/${ex.code}">Uruchom kamerę</a>
  </section>` : ''}

  <section class="card">
    <h3>Serie × powtórzenia wg fazy</h3>
    <table class="reps-table"><tbody>${repsRows}</tbody></table>
  </section>

  <section class="card">
    <h3>Stoper</h3>
    <div class="timer-row">
      ${[15, 20, 30, 45, 60, 90].map(s => `<button class="chip" data-action="start-timer" data-seconds="${s}" data-label="${esc(ex.name)}">⏱ ${s}s</button>`).join('')}
    </div>
  </section>

  <details class="card">
    <summary>Prompty AI (do wygenerowania infografiki / wideo)</summary>
    <p class="muted small">Wklej w ChatGPT/DALL·E, Midjourney (obraz) lub Sora, Runway, Kling (wideo).</p>
    <div class="prompt-block">
      <div class="prompt-head"><strong>Infografika</strong><button class="btn tiny" data-action="copy-prompt" data-code="${ex.code}" data-kind="infographicPrompt">Kopiuj</button></div>
      <pre class="prompt-text">${esc(ex.infographicPrompt)}</pre>
    </div>
    <div class="prompt-block">
      <div class="prompt-head"><strong>Wideo</strong><button class="btn tiny" data-action="copy-prompt" data-code="${ex.code}" data-kind="videoPrompt">Kopiuj</button></div>
      <pre class="prompt-text">${esc(ex.videoPrompt)}</pre>
    </div>
  </details>`;
}

// Ćwiczenia obsługiwane przez sprawdzian formy (kamera). 'squat'/'hinge' — ruch przysiadu/
// wykroku/zawiasu biodrowego, gdzie heurystyka "odchylenie od pozycji stojącej" ma sens
// (B9, przysiad izometryczny przy ścianie, celowo pominięty — to statyczny wytrzym w ugięciu,
// więc odchylenie od stania jest tam z założenia duże i nie oznacza błędu formy).
// 'plank' — czysto geometryczny test prostej linii ciała, bez kalibracji (A7, deska boczna,
// pominięta — wymagałaby ustawienia kamery od przodu/tyłu zamiast z boku).
const FORM_CHECK_KIND = { B1: 'squat', B2: 'squat', B3: 'squat', E3: 'hinge', E8: 'squat', B13: 'squat', A2: 'plank', E5: 'plank' };

function groupLabel(g) {
  return { A: 'Brzuch + Biodra', B: 'Uda + Pośladki', C: 'Klatka + Ramiona', D: 'Aktywność / mobilność', E: 'Bonus (opona, plecak, skakanka)' }[g] || g;
}

const activeFlipbookIntervals = {};

// Filmiki są wyciszone (bez oryginalnego, generowanego przez AI dźwięku) — w zamian
// darmowy lektor (ten sam Web Speech API co w treningu) czyta instrukcje wykonania na głos.
function wireVideoNarration(video, code) {
  if (!video) return;
  const ex = exByCode[code];
  if (!ex || !ex.steps || !ex.steps.length) return;
  const text = ex.steps.join('. ');
  video.addEventListener('play', () => Voice.speak(text, { interrupt: true }));
  video.addEventListener('pause', () => Voice.stop());
  video.addEventListener('ended', () => Voice.stop());
}

async function loadMediaInto(code) {
  for (const kind of ['image', 'video']) {
    const slot = document.getElementById(`media-${kind}-${code}`);
    if (!slot) continue;
    const url = await MediaStore.getURL(code, kind);
    if (url) {
      slot.innerHTML = kind === 'image'
        ? `<img src="${url}" alt="Infografika ${esc(code)}">`
        : `<video src="${url}" muted controls playsinline></video>`;
    } else {
      const localPath = `assets/exercises/${code}.${kind === 'image' ? 'png' : 'mp4'}`;
      slot.innerHTML = kind === 'image'
        ? `<img src="${localPath}" alt="Infografika ${esc(code)}" onerror="this.parentElement.innerHTML='<div class=\\'media-placeholder\\'>Brak infografiki — użyj promptu AI poniżej</div>'">`
        : `<video src="${localPath}" muted controls playsinline onerror="this.parentElement.innerHTML='<div class=\\'media-placeholder\\'>Brak wideo — użyj promptu AI poniżej</div>'"></video>`;
    }
    if (kind === 'video') wireVideoNarration(slot.querySelector('video'), code);
  }

  const framesSlot = document.getElementById(`media-frames-${code}`);
  if (framesSlot) {
    clearInterval(activeFlipbookIntervals[code]);
    const urls = await MediaStore.getFrameURLs(code);
    if (urls && urls.length) {
      framesSlot.innerHTML = `<img id="flipbook-img-${esc(code)}" src="${urls[0]}" alt="Animacja ${esc(code)}">`;
      let i = 0;
      const imgEl = document.getElementById(`flipbook-img-${code}`);
      activeFlipbookIntervals[code] = setInterval(() => {
        i = (i + 1) % urls.length;
        if (imgEl.isConnected) imgEl.src = urls[i]; else clearInterval(activeFlipbookIntervals[code]);
      }, 700);
    } else {
      framesSlot.innerHTML = `<div class="media-placeholder">Brak animacji</div>`;
    }
  }
}

// ---------- Schedule ----------
let scheduleViewMode = 'list';
let calendarMonthOffset = 0;

function viewSchedule(profile) {
  const completed = new Set(profile.progress.completedDays);
  const toggle = `
  <div class="chip-row" style="margin-bottom:12px">
    <button type="button" class="chip ${scheduleViewMode === 'list' ? 'active' : ''}" data-action="set-schedule-view" data-mode="list">Lista</button>
    <button type="button" class="chip ${scheduleViewMode === 'calendar' ? 'active' : ''}" data-action="set-schedule-view" data-mode="calendar">Kalendarz</button>
  </div>`;

  if (scheduleViewMode === 'calendar') {
    return `<h2 class="page-title">Harmonogram 60 dni</h2>${toggle}${viewCalendarMonth(profile)}`;
  }

  const groups = PHASES.map(ph => {
    const rows = [];
    for (let d = ph.range[0]; d <= ph.range[1]; d++) {
      const info = getDayInfo(d);
      const isDone = completed.has(d);
      rows.push(`
      <a class="schedule-row ${isDone ? 'done' : ''}" href="#/day/${d}">
        <span class="sched-day">${d}</span>
        <span class="sched-type type-${info.type}">${info.type}</span>
        <span class="sched-label">${esc(dayTypeLabel(info))}</span>
        ${isDone ? '<span class="sched-check">✓</span>' : ''}
      </a>`);
    }
    return `<details class="card" ${ph.id === phaseForDay(Store.currentDayNumber(profile)).id ? 'open' : ''}>
      <summary>${esc(ph.name)} <span class="muted">(dni ${ph.range[0]}-${ph.range[1]})</span></summary>
      <div class="schedule-list">${rows.join('')}</div>
    </details>`;
  });
  return `<h2 class="page-title">Harmonogram 60 dni</h2>${toggle}${groups.join('')}`;
}

function viewCalendarMonth(profile) {
  const completed = new Set(profile.progress.completedDays);
  const start = new Date(profile.startDate + 'T00:00:00');

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + calendarMonthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startWeekday = new Date(year, month, 1).getDay();
  startWeekday = (startWeekday + 6) % 7; // 0=Pn..6=Nd

  const monthLabel = base.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

  let cells = '';
  for (let i = 0; i < startWeekday; i++) cells += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    const programDay = Math.floor((cellDate - start) / 86400000) + 1;
    const inProgram = programDay >= 1 && programDay <= 60;

    if (!inProgram) { cells += `<div class="cal-cell outside"><span class="cal-daynum">${d}</span></div>`; continue; }

    const info = getDayInfo(programDay);
    let statusClass, dot;
    if (completed.has(programDay)) { statusClass = 'cal-done'; dot = '🟢'; }
    else if (cellDate.getTime() === startOfToday.getTime()) { statusClass = 'cal-today'; dot = '🔵'; }
    else if (cellDate < startOfToday) { statusClass = info.rest ? 'cal-future' : 'cal-missed'; dot = info.rest ? '⚪' : '🔴'; }
    else { statusClass = 'cal-future'; dot = '⚪'; }

    cells += `<a class="cal-cell ${statusClass}" href="#/day/${programDay}">
      <span class="cal-daynum">${d}</span>
      <span class="cal-dot">${dot}</span>
    </a>`;
  }

  const trailing = (7 - ((startWeekday + daysInMonth) % 7)) % 7;
  for (let i = 0; i < trailing; i++) cells += `<div class="cal-cell empty"></div>`;

  return `
  <section class="card">
    <div class="cal-header">
      <button type="button" class="icon-btn" data-action="cal-prev" aria-label="Poprzedni miesiąc">‹</button>
      <strong>${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</strong>
      <button type="button" class="icon-btn" data-action="cal-next" aria-label="Następny miesiąc">›</button>
    </div>
    <div class="cal-grid cal-weekdays">
      <span>Pn</span><span>Wt</span><span>Śr</span><span>Cz</span><span>Pt</span><span>So</span><span>Nd</span>
    </div>
    <div class="cal-grid">${cells}</div>
    <div class="cal-legend">
      <span>🟢 wykonany</span><span>🔵 dziś</span><span>🔴 pominięty</span><span>⚪ zaplanowany / odpoczynek</span>
    </div>
  </section>`;
}

// ---------- Library ----------
function viewLibrary() {
  return `
  <h2 class="page-title">Biblioteka ćwiczeń</h2>
  <div class="lib-filters">
    <input type="search" id="lib-search" placeholder="Szukaj ćwiczenia lub partii...">
    <div class="chip-row" id="lib-chips">
      <button class="chip active" data-group="all">Wszystkie</button>
      <button class="chip" data-group="A">Brzuch/Biodra</button>
      <button class="chip" data-group="B">Uda/Pośladki</button>
      <button class="chip" data-group="C">Klatka/Ramiona</button>
      <button class="chip" data-group="D">Mobilność</button>
      <button class="chip" data-group="E">Bonus</button>
    </div>
  </div>
  <div id="lib-results" class="lib-grid">${libraryCards(EXERCISES)}</div>`;
}

function libraryCards(list) {
  if (!list.length) return `<p class="empty-state muted">Brak wyników.</p>`;
  return list.map(ex => `
    <a class="lib-card" href="#/exercise/${ex.code}">
      <span class="lib-code group-${ex.group}">${ex.code}</span>
      <span class="lib-name">${esc(ex.name)}</span>
      <span class="lib-muscle muted">${esc(ex.muscle)}</span>
    </a>`).join('');
}

function filterLibrary() {
  const q = (document.getElementById('lib-search')?.value || '').toLowerCase().trim();
  const active = document.querySelector('#lib-chips .chip.active')?.dataset.group || 'all';
  const list = EXERCISES.filter(ex => {
    const matchGroup = active === 'all' || ex.group === active;
    const matchQ = !q || ex.name.toLowerCase().includes(q) || ex.muscle.toLowerCase().includes(q) || ex.code.toLowerCase().includes(q);
    return matchGroup && matchQ;
  });
  document.getElementById('lib-results').innerHTML = libraryCards(list);
}

// ---------- Progress ----------
function viewProgress(profile) {
  const p = profile.progress;
  const completedCount = p.completedDays.length;
  const pct = Math.round((completedCount / 60) * 100);
  const streak = computeStreak(p.completedDays);
  const weightRows = [...p.weightLog].reverse().slice(0, 8);
  const measureRows = [...p.measurements].reverse().slice(0, 8);
  const sparkline = weightSparkline(p.weightLog);

  const badges = Store.getBadges(profile);
  const earnedCount = badges.filter(b => b.earned).length;

  return `
  <h2 class="page-title">Postępy</h2>
  <section class="card">
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    <p>${completedCount}/60 dni ukończonych (${pct}%) · seria: ${streak} dni</p>
    <div class="btn-row" style="margin-top:10px">
      <button type="button" class="btn small ghost" data-action="share-progress">📤 Udostępnij postęp</button>
      ${completedCount >= 60 ? `<button type="button" class="btn small primary" data-action="share-certificate">🏆 Pobierz certyfikat</button>` : ''}
    </div>
  </section>

  ${viewWeeklySummary(profile)}

  <section class="card">
    <h3 style="margin-top:0">Odznaki (${earnedCount}/${badges.length})</h3>
    <div class="badge-grid">
      ${badges.map(b => `
        <div class="badge-item ${b.earned ? 'earned' : ''}" title="${esc(b.desc)}">
          <span class="badge-item-icon">${b.icon}</span>
          <span class="badge-item-name">${esc(b.name)}</span>
        </div>`).join('')}
    </div>
  </section>

  ${viewSessionHistory(profile)}

  <section class="card">
    <h3>Waga</h3>
    ${sparkline}
    <form id="form-weight" class="form-inline">
      <input type="number" step="0.1" name="weight" placeholder="kg" required>
      <input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}">
      <button class="btn small primary" type="submit">Dodaj</button>
    </form>
    ${weightRows.length ? `<ul class="log-list">${weightRows.map(w => `<li>${fmtDate(w.date)} — <strong>${w.weight} kg</strong></li>`).join('')}</ul>` : '<p class="muted small">Brak wpisów.</p>'}
  </section>

  <section class="card">
    <h3>Obwody i test funkcjonalny</h3>
    <form id="form-measure" class="form">
      <div class="row2">
        <label>Talia (cm)<input type="number" step="0.1" name="waist"></label>
        <label>Biodra (cm)<input type="number" step="0.1" name="hips"></label>
      </div>
      <div class="row2">
        <label>Uda (cm)<input type="number" step="0.1" name="thighs"></label>
        <label>Ramiona (cm)<input type="number" step="0.1" name="arms"></label>
      </div>
      <label>Test funkcjonalny — przysiady przy krześle (B1) w 60s<input type="number" name="squats"></label>
      <input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}">
      <button class="btn small primary" type="submit">Zapisz pomiar</button>
    </form>
    ${measureRows.length ? `<ul class="log-list">${measureRows.map(m => `<li>${fmtDate(m.date)} — ${measureSummary(m)}</li>`).join('')}</ul>` : '<p class="muted small">Brak wpisów.</p>'}
  </section>

  <section class="card">
    <h3>Zdjęcia sylwetki</h3>
    <p class="muted small">Rób zdjęcie co 2 tygodnie, w tym samym oświetleniu i pozycji — najlepiej porówna je suwak poniżej.</p>
    <button type="button" class="btn small primary" data-action="add-photo">+ Dodaj zdjęcie</button>
    <div id="photo-compare" style="margin-top:12px"></div>
    <div id="photo-grid" class="photo-grid" style="margin-top:12px"><p class="muted small">Ładowanie…</p></div>
  </section>`;
}

function viewWeeklySummary(profile) {
  const sessions = profile.progress.sessions || [];
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = sessions.filter(s => s.completedAt >= weekAgo);

  if (!thisWeek.length) {
    return `
    <section class="card">
      <h3 style="margin-top:0">Ten tydzień</h3>
      <p class="muted small">Brak ukończonych treningów w ostatnich 7 dniach. Każdy trening się liczy — zacznij dziś.</p>
    </section>`;
  }

  const avgDifficulty = thisWeek.reduce((s, x) => s + (x.difficulty || 3), 0) / thisWeek.length;
  const avgFeeling = thisWeek.reduce((s, x) => s + (x.feeling || 3), 0) / thisWeek.length;
  const painCount = thisWeek.filter(s => s.pain && s.pain !== 'none').length;
  const totalMinutes = Math.round(thisWeek.reduce((s, x) => s + (x.durationSeconds || 0), 0) / 60);

  return `
  <section class="card">
    <h3 style="margin-top:0">Ten tydzień</h3>
    <div class="week-summary-grid">
      <div class="week-summary-stat"><strong>${thisWeek.length}</strong><span>${thisWeek.length === 1 ? 'trening' : 'treningi'}</span></div>
      <div class="week-summary-stat"><strong>${totalMinutes}</strong><span>minut łącznie</span></div>
      <div class="week-summary-stat"><strong>${avgDifficulty.toFixed(1)}</strong><span>śr. trudność /5</span></div>
      <div class="week-summary-stat"><strong>${avgFeeling.toFixed(1)}</strong><span>śr. samopoczucie /5</span></div>
    </div>
    ${painCount ? `<p class="muted small" style="margin-top:10px">⚠️ Zgłoszono dyskomfort/ból w ${painCount} ${painCount === 1 ? 'treningu' : 'treningach'} w tym tygodniu.</p>` : ''}
  </section>`;
}

function viewSessionHistory(profile) {
  const sessions = [...(profile.progress.sessions || [])].reverse();
  if (!sessions.length) {
    return `
    <section class="card">
      <h3 style="margin-top:0">Historia treningów</h3>
      <p class="muted small">Brak zapisanych sesji — pojawią się tutaj po pierwszym ukończonym treningu.</p>
    </section>`;
  }
  return `
  <section class="card">
    <h3 style="margin-top:0">Historia treningów (${sessions.length})</h3>
    <ul class="log-list">
      ${sessions.map(s => `
        <li>
          <strong>Dzień ${s.day}</strong> · ${esc(fmtTimestamp(s.completedAt))} · ${fmtSeconds(s.durationSeconds || 0)}
          · trudność ${s.difficulty}/5 · samopoczucie ${s.feeling}/5${s.pain && s.pain !== 'none' ? ` · ${esc(painLabel(s.pain))}` : ''}
        </li>`).join('')}
    </ul>
  </section>`;
}

function fmtTimestamp(ms) {
  return new Date(ms).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function loadPhotosInto(profile) {
  const grid = document.getElementById('photo-grid');
  const compareBox = document.getElementById('photo-compare');
  if (!grid) return;
  const photos = await MediaStore.getPhotos(profile.id);

  if (!photos.length) {
    grid.innerHTML = '<p class="muted small">Brak zdjęć. Dodaj pierwsze, żeby zacząć śledzić zmiany.</p>';
    if (compareBox) compareBox.innerHTML = '';
    return;
  }

  const withUrls = await Promise.all(photos.map(async p => ({ ...p, url: await MediaStore.getPhotoURL(p) })));

  grid.innerHTML = withUrls.map(p => `
    <div class="photo-thumb">
      <img src="${p.url}" alt="Zdjęcie ${esc(p.date)}">
      <span class="photo-thumb-date">${esc(fmtDate(p.date))}</span>
      <button type="button" class="photo-thumb-remove" data-action="remove-photo" data-id="${p.id}" aria-label="Usuń">✕</button>
    </div>`).join('');

  if (compareBox) {
    if (withUrls.length >= 2) {
      const before = withUrls[0];
      const after = withUrls[withUrls.length - 1];
      compareBox.innerHTML = `
        <p class="muted small">Porównanie: ${esc(fmtDate(before.date))} → ${esc(fmtDate(after.date))}</p>
        <div class="compare-slider" id="compare-slider">
          <img src="${after.url}" alt="Po" class="compare-img-back">
          <div class="compare-img-front-wrap" id="compare-front-wrap"><img src="${before.url}" alt="Przed" class="compare-img-front"></div>
          <div class="compare-handle" id="compare-handle"></div>
        </div>
        <input type="range" id="compare-range" min="0" max="100" value="50" style="width:100%;margin-top:8px">`;
      const range = document.getElementById('compare-range');
      const frontWrap = document.getElementById('compare-front-wrap');
      const handle = document.getElementById('compare-handle');
      const update = () => {
        frontWrap.style.width = range.value + '%';
        handle.style.left = range.value + '%';
      };
      range.addEventListener('input', update);
      update();
    } else {
      compareBox.innerHTML = '<p class="muted small">Dodaj co najmniej 2 zdjęcia, aby zobaczyć porównanie przed/po.</p>';
    }
  }
}

function measureSummary(m) {
  const parts = [];
  if (m.waist) parts.push(`talia ${m.waist}cm`);
  if (m.hips) parts.push(`biodra ${m.hips}cm`);
  if (m.thighs) parts.push(`uda ${m.thighs}cm`);
  if (m.arms) parts.push(`ramiona ${m.arms}cm`);
  if (m.squats) parts.push(`test: ${m.squats} powt.`);
  return esc(parts.join(', ') || '—');
}

function computeStreak(days) {
  const set = new Set(days);
  let streak = 0;
  let d = Math.max(...days, 0);
  if (!d) return 0;
  while (set.has(d)) { streak++; d--; }
  return streak;
}

function weightSparkline(log) {
  if (log.length < 2) return '<p class="muted small">Dodaj co najmniej 2 wpisy, aby zobaczyć wykres.</p>';
  const sorted = [...log].sort((a, b) => new Date(a.date) - new Date(b.date));
  const values = sorted.map(w => w.weight);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const w = 300, h = 60, pad = 6;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" class="sparkline"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}

// ---------- Info ----------
function viewInfo() {
  return `
  <h2 class="page-title">Bezpieczeństwo i informacje</h2>
  <section class="card safety-card">
    <h3>Ważna uwaga</h3>
    <p>${esc(SAFETY_NOTE)}</p>
  </section>
  <details class="card" open><summary>Sprzęt (opcjonalny)</summary><ul>${EQUIPMENT.map(e => `<li>${esc(e)}</li>`).join('')}</ul></details>
  <details class="card"><summary>Zasady treningowe</summary><ol>${RULES.map(r => `<li>${esc(r)}</li>`).join('')}</ol></details>
  <details class="card"><summary>Rozgrzewka i schłodzenie</summary>
    <p class="muted small">Rozgrzewka (5-8 min):</p>
    <ul>${WARMUP.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
    <p class="muted small">Schłodzenie:</p><p>${esc(COOLDOWN)}</p>
  </details>
  <details class="card"><summary>Jak śledzić postępy</summary><ul>${MONITORING.how.map(m => `<li>${esc(m)}</li>`).join('')}</ul></details>
  <details class="card"><summary>Kiedy przerwać i iść do lekarza</summary><ul>${MONITORING.stop.map(m => `<li>${esc(m)}</li>`).join('')}</ul></details>
  <details class="card"><summary>Uwaga o diecie</summary><p>${esc(MONITORING.diet)}</p></details>`;
}

// ---------- More / Settings ----------
function viewMore(profile) {
  return `
  <h2 class="page-title">Więcej</h2>
  <a class="card list-link" href="#/info">🛡️ Bezpieczeństwo i informacje</a>
  <a class="card list-link" href="#/settings">⚙️ Profil i ustawienia</a>
  <a class="card list-link" href="polityka-prywatnosci.html">🔒 Polityka prywatności</a>
  <a class="card list-link" href="regulamin.html">📄 Regulamin</a>`;
}

function viewSettings(profile) {
  const profiles = Store.getProfiles();
  const theme = Store.getTheme();
  const day = Store.currentDayNumber(profile);
  const info = effectiveDayInfo(profile, day);
  const streak = Store.currentStreak(profile);
  const completedCount = profile.progress.completedDays.length;
  const initial = (profile.name || '?').trim().charAt(0).toUpperCase() || '?';

  return `
  <h2 class="page-title">Profil i ustawienia</h2>

  <section class="card profile-header-card">
    <div class="profile-avatar">${esc(initial)}</div>
    <div class="profile-header-info">
      <h3 style="margin:0">${esc(profile.name)}</h3>
      <p class="muted small" style="margin:2px 0 0">Dzień ${day} / 60 · ${esc(info.phaseName)}</p>
    </div>
  </section>
  <section class="card">
    <div class="profile-stats-row">
      <div class="profile-stat"><strong>${completedCount}</strong><span>ukończone dni</span></div>
      <div class="profile-stat"><strong>${streak}</strong><span>seria dni</span></div>
      <div class="profile-stat"><strong>${60 - completedCount}</strong><span>pozostało</span></div>
    </div>
  </section>

  <section class="card">
    <h3>Twoje dane</h3>
    <form id="form-edit-profile" class="form">
      <label>Imię<input type="text" name="name" value="${esc(profile.name)}"></label>
      <div class="row2">
        <label>Wiek<input type="number" name="ageYears" value="${profile.ageYears || ''}"></label>
        <label>Data startu programu<input type="date" name="startDate" value="${profile.startDate}"></label>
      </div>
      <div class="row2">
        <label>Wzrost (cm)<input type="number" name="heightCm" value="${profile.heightCm || ''}"></label>
        <label>Waga (kg)<input type="number" name="weightKg" value="${profile.weightKg || ''}"></label>
      </div>

      <span class="onboard-field-label">Doświadczenie treningowe</span>
      <div class="chip-group">${Object.entries(EXPERIENCE_LABELS).map(([v, l]) => chipRadio('experience', v, l, profile.experience === v)).join('')}</div>

      <span class="onboard-field-label">Główny cel</span>
      <div class="chip-group">${Object.entries(GOAL_LABELS).map(([v, l]) => chipRadio('goal', v, l, profile.goal === v)).join('')}</div>

      <span class="onboard-field-label">Treningi tygodniowo</span>
      <div class="chip-group">${[3, 4, 5, 6, 7].map(n => chipRadio('sessionsPerWeek', n, String(n), profile.sessionsPerWeek === n)).join('')}</div>

      <span class="onboard-field-label">Długość treningu</span>
      <div class="chip-group">${[20, 30, 35, 45, 60].map(n => chipRadio('sessionDurationMinutes', n, n + ' min', profile.sessionDurationMinutes === n)).join('')}</div>

      <span class="onboard-field-label">Dostępny sprzęt</span>
      <div class="chip-group">${EQUIPMENT_OPTIONS.map(o => chipCheckbox('equipment', o, (profile.equipment || []).includes(o))).join('')}</div>

      <span class="onboard-field-label">Poziom trudności</span>
      <div class="chip-group">${Object.entries(DIFFICULTY_LABELS).map(([v, l]) => chipRadio('difficultyPreference', v, l, profile.difficultyPreference === v)).join('')}</div>

      <span class="onboard-field-label">Priorytetowe partie ciała</span>
      <div class="chip-group">${FOCUS_OPTIONS.map(o => chipCheckbox('focusAreas', o, (profile.focusAreas || []).includes(o))).join('')}</div>

      <span class="onboard-field-label">Ograniczenia ruchowe</span>
      <div class="chip-group">${LIMITATION_OPTIONS.map(o => chipCheckbox('limitations', o, (profile.limitations || []).includes(o))).join('')}</div>

      <label>Inne przeciwwskazania (opcjonalnie)<input type="text" name="contraindicationsNote" value="${esc(profile.contraindicationsNote || '')}"></label>

      <button class="btn primary" type="submit" style="margin-top:10px">Zapisz zmiany</button>
    </form>
  </section>

  <section class="card">
    <h3>Profile na tym urządzeniu</h3>
    <ul class="profile-list">
      ${profiles.map(p => `
        <li class="${p.id === profile.id ? 'active' : ''}">
          <span>${esc(p.name)}</span>
          <span class="profile-actions">
            ${p.id !== profile.id ? `<button class="btn tiny" data-action="switch-profile" data-id="${p.id}">Wybierz</button>` : '<span class="pill">Aktywny</span>'}
            <button class="btn tiny ghost" data-action="delete-profile" data-id="${p.id}">Usuń</button>
          </span>
        </li>`).join('')}
    </ul>
    <button class="btn secondary" data-action="add-profile">+ Nowy profil</button>
  </section>

  <section class="card">
    <h3>Wygląd</h3>
    <div class="chip-row">
      <button class="chip ${theme === 'auto' ? 'active' : ''}" data-action="set-theme" data-theme="auto">Auto</button>
      <button class="chip ${theme === 'light' ? 'active' : ''}" data-action="set-theme" data-theme="light">Jasny</button>
      <button class="chip ${theme === 'dark' ? 'active' : ''}" data-action="set-theme" data-theme="dark">Ciemny</button>
    </div>
  </section>

  ${viewVoiceSettings()}
  ${viewMusicSettings()}
  ${viewReminderSettings()}

  <section class="card">
    <h3>Kopia danych</h3>
    <div class="btn-row">
      <button class="btn small" data-action="export-data">Eksportuj</button>
      <button class="btn small" data-action="import-data">Importuj</button>
    </div>
  </section>

  <section class="card">
    <h3>Kalendarz</h3>
    <p class="muted small">Eksportuj cały 60-dniowy harmonogram jako plik .ics — wciągniesz go do Google Calendar, Apple Calendar albo Outlooka.</p>
    <button class="btn small" data-action="export-ics">Eksportuj do kalendarza</button>
  </section>

  <section class="card">
    <h3>Reset</h3>
    <button class="btn danger small" data-action="reset-progress">Wyzeruj postępy tego profilu</button>
  </section>`;
}

function viewVoiceSettings() {
  const enabled = Voice.isEnabled();
  const style = Voice.getStyle();
  return `
  <section class="card">
    <h3>Lektor i motywator (głos)</h3>
    ${Voice.supported ? '' : '<p class="muted small">Ta przeglądarka nie obsługuje syntezy mowy.</p>'}
    <div class="progress-mini-row">
      <span>Zapowiadanie ćwiczeń i odliczanie głosem</span>
      <label class="switch"><input type="checkbox" data-action="toggle-voice-enabled" ${enabled ? 'checked' : ''}><span class="switch-track"></span></label>
    </div>
    <p class="muted small" style="margin-top:10px">Styl motywacji</p>
    <div class="chip-row">
      <button class="chip ${style === 'gentle' ? 'active' : ''}" data-action="set-voice-style" data-style="gentle">Łagodny</button>
      <button class="chip ${style === 'tough' ? 'active' : ''}" data-action="set-voice-style" data-style="tough">Ostry</button>
    </div>
  </section>`;
}

function viewMusicSettings() {
  const enabled = Music.isEnabled();
  const volume = Music.getVolume();
  return `
  <section class="card">
    <h3>Muzyka motywacyjna</h3>
    <p class="muted small">Gra w tle podczas treningu (losowa playlista, 25 utworów). Nie zastępuje lektora — możesz mieć oba naraz.</p>
    <div class="progress-mini-row">
      <span>Odtwarzaj muzykę podczas treningu</span>
      <label class="switch"><input type="checkbox" data-action="toggle-music-enabled" ${enabled ? 'checked' : ''}><span class="switch-track"></span></label>
    </div>
    <p class="muted small" style="margin-top:10px">Głośność</p>
    <input type="range" min="0" max="1" step="0.05" value="${volume}" data-action="set-music-volume">
  </section>`;
}

function viewReminderSettings() {
  const r = Store.getReminderSettings();
  return `
  <section class="card">
    <h3>Przypomnienia o treningu</h3>
    <div class="progress-mini-row">
      <span>Codzienne przypomnienie o ${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}</span>
      <label class="switch"><input type="checkbox" id="reminder-enabled" ${r.enabled ? 'checked' : ''}><span class="switch-track"></span></label>
    </div>
    <div class="row2" style="margin-top:10px">
      <label>Godzina<input type="number" id="reminder-hour" min="0" max="23" value="${r.hour}"></label>
      <label>Minuta<input type="number" id="reminder-minute" min="0" max="59" value="${r.minute}"></label>
    </div>
    <button class="btn small primary" data-action="save-reminder" style="margin-top:8px">Zapisz przypomnienie</button>
    <p class="muted small" style="margin-top:8px">Przypomnienie pojawi się, gdy otworzysz aplikację po ustawionej godzinie (przeglądarka nie budzi zamkniętej appki jak natywna aplikacja).</p>
  </section>`;
}

// ---------- Timer ----------
let timerInterval = null;
function startTimer(seconds, label) {
  clearInterval(timerInterval);
  const modal = document.getElementById('timer-modal');
  const display = document.getElementById('timer-display');
  const labelEl = document.getElementById('timer-label');
  labelEl.textContent = label || '';
  let remaining = seconds;
  display.textContent = fmtSeconds(remaining);
  modal.hidden = false;
  timerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(timerInterval);
      display.textContent = '0:00';
      beep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } else {
      display.textContent = fmtSeconds(remaining);
    }
  }, 1000);
}

function fmtSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function closeTimer() {
  clearInterval(timerInterval);
  document.getElementById('timer-modal').hidden = true;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {}
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('sidebar')?.classList.contains('open')) closeSidebar();
});

// ---------- Event delegation ----------
document.addEventListener('click', async e => {
  const target = e.target.closest('[data-action]');
  if (!target) {
    const chip = e.target.closest('#lib-chips .chip');
    if (chip) {
      document.querySelectorAll('#lib-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterLibrary();
    }
    return;
  }
  const action = target.dataset.action;
  const profile = Store.getActiveProfile();

  switch (action) {
    case 'toggle-day': {
      const day = parseInt(target.dataset.day, 10);
      Store.toggleDayComplete(profile.id, day);
      render();
      break;
    }
    case 'toggle-ex': break; // handled by change event
    case 'toggle-constraint':
      toggleConstraint(target.dataset.type, target.dataset.part);
      render();
      break;
    case 'apply-constraint-text': {
      const input = document.getElementById('constraint-text-input');
      const found = parseConstraintText(input?.value || '');
      if (!found.length) {
        alert('Nie rozpoznałam nic konkretnego w tym tekście — spróbuj np. "mało czasu", "brak hantli" albo wybierz chipy poniżej.');
        break;
      }
      found.forEach(c => {
        const exists = workoutConstraints.some(x => x.type === c.type && x.part === c.part);
        if (!exists) workoutConstraints.push(c);
      });
      if (input) input.value = '';
      render();
      break;
    }
    case 'clear-constraints':
      workoutConstraints = [];
      render();
      break;
    case 'set-readiness-sleep': {
      const manual = Store.getReadinessInput(profile) || { sleep: 3, soreness: 3 };
      Store.setReadinessInput(profile.id, Number(target.dataset.value), manual.soreness);
      render();
      break;
    }
    case 'set-readiness-soreness': {
      const manual = Store.getReadinessInput(profile) || { sleep: 3, soreness: 3 };
      Store.setReadinessInput(profile.id, manual.sleep, Number(target.dataset.value));
      render();
      break;
    }
    case 'apply-difficulty-suggestion':
      Store.updateProfile(profile.id, { difficultyPreference: target.dataset.direction === 'easier' ? 'easier' : 'harder' });
      render();
      break;
    case 'set-eating':
      Store.setEatingLog(profile.id, target.dataset.value);
      render();
      break;
    case 'water-add':
      Store.addWaterLog(profile.id, 1);
      vibrate(20);
      render();
      break;
    case 'water-remove':
      Store.addWaterLog(profile.id, -1);
      render();
      break;
    case 'apply-phase-trend': {
      const phaseId = Number(target.dataset.phase);
      Store.setPhaseOverride(profile.id, phaseId);
      vibrate([40, 30, 80]);
      render();
      break;
    }
    case 'dismiss-phase-trend': {
      const phaseId = Number(target.dataset.phase);
      Store.dismissPhaseTrend(profile.id, phaseId);
      render();
      break;
    }
    case 'set-schedule-view':
      scheduleViewMode = target.dataset.mode === 'calendar' ? 'calendar' : 'list';
      render();
      break;
    case 'toggle-sidebar':
      document.getElementById('sidebar')?.classList.contains('open') ? closeSidebar() : openSidebar();
      break;
    case 'close-sidebar':
      closeSidebar();
      break;
    case 'cal-prev':
      calendarMonthOffset -= 1;
      render();
      break;
    case 'cal-next':
      calendarMonthOffset += 1;
      render();
      break;
    case 'onboard-quickstart': {
      const form = document.getElementById('form-onboard');
      if (form) {
        const nameField = form.querySelector('[name=name]');
        if (nameField && !nameField.value.trim()) nameField.value = 'Ty';
        form.requestSubmit();
      }
      break;
    }
    case 'onboard-next': {
      const form = document.getElementById('form-onboard');
      showOnboardStep(form, Number(form.dataset.step) + 1);
      break;
    }
    case 'onboard-back': {
      const form = document.getElementById('form-onboard');
      showOnboardStep(form, Number(form.dataset.step) - 1);
      break;
    }
    case 'workout-exit':
      if (confirm('Zakończyć trening teraz? Postęp tej sesji nie zostanie zapisany.')) exitWorkout();
      break;
    case 'exit-form-check':
      Voice.stop();
      if (typeof PoseCheck !== 'undefined') PoseCheck.stop();
      navigate(`#/exercise/${target.dataset.code}`);
      break;
    case 'workout-toggle-voice':
      Voice.setEnabled(!Voice.isEnabled());
      if (activeWorkoutRunner) renderWorkoutBody(activeWorkoutRunner);
      break;
    case 'workout-toggle-music':
      Music.setEnabled(!Music.isEnabled());
      if (activeWorkoutRunner) renderWorkoutBody(activeWorkoutRunner);
      break;
    case 'workout-next-track':
      Music.next();
      break;
    case 'install-accept':
      document.getElementById('install-banner')?.remove();
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; });
      }
      break;
    case 'install-dismiss':
      document.getElementById('install-banner')?.remove();
      localStorage.setItem(K_INSTALL_DISMISSED, '1');
      break;
    case 'workout-pause':
      if (activeWorkoutRunner) {
        activeWorkoutRunner.state.isPaused ? activeWorkoutRunner.resume() : activeWorkoutRunner.pause();
      }
      break;
    case 'workout-done':
      vibrate(40);
      activeWorkoutRunner?.completeSetManually();
      break;
    case 'workout-skip':
      activeWorkoutRunner?.skip();
      break;
    case 'workout-report-pain': {
      if (!profile) break;
      const count = Store.logExercisePain(profile.id, target.dataset.code);
      if (count >= 2 && activeWorkoutRunner) {
        renderWorkoutBody(activeWorkoutRunner); // re-render to surface the swap suggestion banner
      } else {
        target.textContent = '✓ Zgłoszono, dziękujemy';
        target.disabled = true;
      }
      break;
    }
    case 'workout-swap': {
      if (!activeWorkoutRunner) break;
      const code = target.dataset.code;
      const current = exByCode[code];
      const alternatives = EXERCISES.filter(e => e.code !== code && e.group === current.group);
      showSwapDialog(alternatives, alt => activeWorkoutRunner.swap(alt));
      break;
    }
    case 'workout-feedback-pain':
      activeWorkoutRunner?.updateFeedback({ pain: target.dataset.pain });
      renderWorkoutBody(activeWorkoutRunner);
      break;
    case 'workout-finish-rest':
      exitWorkout();
      break;
    case 'workout-submit-feedback': {
      if (!activeWorkoutRunner) break;
      const day = activeWorkoutDay;
      const f = activeWorkoutRunner.state.feedback;
      Store.recordSession(profile.id, {
        day, durationSeconds: activeWorkoutRunner.elapsedSeconds(),
        difficulty: f.difficulty, feeling: f.feeling, pain: f.pain,
        exercises: Object.values(activeWorkoutRunner._results || {}),
        express: !!activeWorkoutRunner._express,
      });
      const newBadges = Store.checkNewBadges(profile.id);
      exitWorkout();
      if (newBadges.length) showBadgeToast(newBadges);
      break;
    }
    case 'start-timer':
      startTimer(parseInt(target.dataset.seconds, 10), target.dataset.label);
      break;
    case 'close-timer':
      closeTimer();
      break;
    case 'copy-prompt': {
      const ex = exByCode[target.dataset.code];
      const text = ex[target.dataset.kind];
      try {
        await navigator.clipboard.writeText(text);
        target.textContent = 'Skopiowano!';
        setTimeout(() => { target.textContent = 'Kopiuj'; }, 1500);
      } catch { alert('Nie udało się skopiować. Zaznacz tekst ręcznie.'); }
      break;
    }
    case 'upload-media': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = target.dataset.kind === 'image' ? 'image/*' : 'video/*';
      input.onchange = async () => {
        if (input.files[0]) {
          await MediaStore.save(target.dataset.code, target.dataset.kind, input.files[0]);
          loadMediaInto(target.dataset.code);
        }
      };
      input.click();
      break;
    }
    case 'remove-media':
      await MediaStore.remove(target.dataset.code, target.dataset.kind);
      loadMediaInto(target.dataset.code);
      break;
    case 'upload-frames': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = async () => {
        const files = Array.from(input.files || []).slice(0, 4);
        if (files.length >= 2) {
          await MediaStore.saveFrames(target.dataset.code, files);
          loadMediaInto(target.dataset.code);
        } else if (files.length === 1) {
          alert('Wybierz co najmniej 2 zdjęcia (start i koniec ruchu), żeby powstała animacja.');
        }
      };
      input.click();
      break;
    }
    case 'remove-frames':
      await MediaStore.removeFrames(target.dataset.code);
      loadMediaInto(target.dataset.code);
      break;
    case 'add-photo': {
      if (!profile) break;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = async () => {
        if (input.files[0]) {
          await MediaStore.addPhoto(profile.id, new Date().toISOString().slice(0, 10), input.files[0]);
          loadPhotosInto(profile);
        }
      };
      input.click();
      break;
    }
    case 'remove-photo':
      if (confirm('Usunąć to zdjęcie?')) {
        await MediaStore.removePhoto(target.dataset.id);
        if (profile) loadPhotosInto(profile);
      }
      break;
    case 'switch-profile':
      Store.setActiveId(target.dataset.id);
      navigate('/today');
      render();
      break;
    case 'delete-profile':
      if (confirm('Usunąć ten profil i jego postępy?')) {
        Store.deleteProfile(target.dataset.id);
        render();
      }
      break;
    case 'add-profile':
      document.getElementById('app').insertAdjacentHTML('afterbegin', `<div class="modal-overlay" id="add-profile-modal"><div class="modal card">${viewOnboarding()}<button class="btn ghost" data-action="close-modal">Anuluj</button></div></div>`);
      bindOnboarding();
      break;
    case 'close-modal':
      target.closest('.modal-overlay')?.remove();
      break;
    case 'set-theme':
      Store.setTheme(target.dataset.theme);
      applyTheme(target.dataset.theme);
      render();
      break;
    case 'set-voice-style':
      Voice.setStyle(target.dataset.style);
      render();
      break;
    case 'save-reminder': {
      const hour = Math.max(0, Math.min(23, Number(document.getElementById('reminder-hour').value) || 0));
      const minute = Math.max(0, Math.min(59, Number(document.getElementById('reminder-minute').value) || 0));
      const enabled = document.getElementById('reminder-enabled').checked;
      if (enabled && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      Store.setReminderSettings({ ...Store.getReminderSettings(), hour, minute, enabled });
      alert('Zapisano ustawienia przypomnienia.');
      break;
    }
    case 'share-progress': {
      const streak = Store.currentStreak(profile);
      const completedCount = profile.progress.completedDays.length;
      shareAchievementImage({
        title: 'Mój postęp w programie',
        stat: `${completedCount}/60`,
        subtitle: `dni ukończonych · seria ${streak} ${streak === 1 ? 'dzień' : 'dni'} z rzędu`,
      }, `nowa-ja-postep-dzien-${completedCount}.png`);
      break;
    }
    case 'share-certificate': {
      shareAchievementImage({
        title: 'Program ukończony!',
        stat: '60/60',
        subtitle: '60 dni treningu w domu — od zera do nawyku',
      }, 'nowa-ja-certyfikat.png');
      break;
    }
    case 'export-ics': {
      const blob = new Blob([generateIcsCalendar(profile)], { type: 'text/calendar;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'nowa-ja-harmonogram.ics';
      a.click();
      break;
    }
    case 'export-data': {
      const blob = new Blob([Store.exportData()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `forma60-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      break;
    }
    case 'import-data': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = () => {
        const reader = new FileReader();
        reader.onload = () => {
          try { Store.importData(reader.result); render(); alert('Zaimportowano dane.'); }
          catch { alert('Nieprawidłowy plik.'); }
        };
        reader.readAsText(input.files[0]);
      };
      input.click();
      break;
    }
    case 'reset-progress':
      if (confirm('Na pewno wyzerować postępy tego profilu?')) {
        Store.updateProfile(profile.id, { progress: { completedDays: [], exerciseChecks: {}, measurements: [], weightLog: [] } });
        render();
      }
      break;
  }
});

document.addEventListener('change', async e => {
  if (e.target.dataset.action === 'toggle-ex') {
    const day = e.target.dataset.day;
    const code = e.target.dataset.code;
    const profile = Store.getActiveProfile();
    const current = new Set(Store.getExerciseChecks(profile, day));
    if (e.target.checked) current.add(code); else current.delete(code);
    Store.setExerciseChecks(profile.id, day, Array.from(current));
    e.target.closest('.exercise-row')?.classList.toggle('checked', e.target.checked);
  }
  if (e.target.dataset.action === 'toggle-voice-enabled') {
    Voice.setEnabled(e.target.checked);
  }
  if (e.target.dataset.action === 'toggle-music-enabled') {
    Music.setEnabled(e.target.checked);
    if (activeWorkoutRunner) renderWorkoutBody(activeWorkoutRunner);
  }
  if (e.target.id === 'reminder-enabled' && e.target.checked && 'Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'lib-search') filterLibrary();
  if (e.target.dataset.action === 'workout-feedback-difficulty' && activeWorkoutRunner) {
    activeWorkoutRunner.updateFeedback({ difficulty: Number(e.target.value) });
    renderWorkoutBody(activeWorkoutRunner);
  }
  if (e.target.dataset.action === 'workout-feedback-feeling' && activeWorkoutRunner) {
    activeWorkoutRunner.updateFeedback({ feeling: Number(e.target.value) });
    renderWorkoutBody(activeWorkoutRunner);
  }
  if (e.target.dataset.action === 'set-music-volume') {
    Music.setVolume(Number(e.target.value));
  }
});

document.addEventListener('submit', e => {
  const profile = Store.getActiveProfile();
  if (e.target.id === 'form-edit-profile') {
    e.preventDefault();
    const fd = new FormData(e.target);
    Store.updateProfile(profile.id, {
      name: fd.get('name')?.trim() || profile.name,
      ageYears: fd.get('ageYears') ? Number(fd.get('ageYears')) : null,
      heightCm: fd.get('heightCm') ? Number(fd.get('heightCm')) : null,
      weightKg: fd.get('weightKg') ? Number(fd.get('weightKg')) : null,
      startDate: fd.get('startDate'),
      experience: fd.get('experience') || profile.experience,
      goal: fd.get('goal') || profile.goal,
      sessionsPerWeek: fd.get('sessionsPerWeek') ? Number(fd.get('sessionsPerWeek')) : profile.sessionsPerWeek,
      sessionDurationMinutes: fd.get('sessionDurationMinutes') ? Number(fd.get('sessionDurationMinutes')) : profile.sessionDurationMinutes,
      equipment: fd.getAll('equipment'),
      difficultyPreference: fd.get('difficultyPreference') || profile.difficultyPreference,
      focusAreas: fd.getAll('focusAreas'),
      limitations: fd.getAll('limitations'),
      contraindicationsNote: fd.get('contraindicationsNote')?.trim() || '',
    });
    render();
  }
  if (e.target.id === 'form-weight') {
    e.preventDefault();
    const fd = new FormData(e.target);
    Store.addWeight(profile.id, Number(fd.get('weight')), fd.get('date'));
    render();
  }
  if (e.target.id === 'form-measure') {
    e.preventDefault();
    const fd = new FormData(e.target);
    Store.addMeasurement(profile.id, {
      waist: fd.get('waist') ? Number(fd.get('waist')) : null,
      hips: fd.get('hips') ? Number(fd.get('hips')) : null,
      thighs: fd.get('thighs') ? Number(fd.get('thighs')) : null,
      arms: fd.get('arms') ? Number(fd.get('arms')) : null,
      squats: fd.get('squats') ? Number(fd.get('squats')) : null,
      date: fd.get('date')
    });
    render();
  }
});

function bindDynamic(routeName, profile, arg) {
  const modal = document.getElementById('timer-modal');
  if (modal && !modal.dataset.bound) {
    modal.dataset.bound = '1';
    document.getElementById('timer-close-btn').addEventListener('click', closeTimer);
  }
  if (routeName === 'exercise' && exByCode[arg]) {
    loadMediaInto(arg);
  }
  if (routeName === 'workout') {
    const day = parseInt(arg, 10);
    const isExpress = /-express$/.test(arg || '');
    if (day >= 1 && day <= 60) initWorkout(profile, day, { express: isExpress });
  }
  if (routeName === 'form-check') {
    bindFormCheck(arg);
  }
  if (routeName === 'safety') {
    bindSafety();
  }
  if (routeName === 'onboarding') {
    bindOnboarding();
  }
  if (routeName === 'progress' && profile) {
    loadPhotosInto(profile);
  }
}

boot();
