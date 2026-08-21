// Profile użytkowników i postępy — localStorage, żeby apka działała offline i dla wielu osób na jednym urządzeniu.
const Store = (() => {
  const K_PROFILES = 'forma60.profiles';
  const K_ACTIVE = 'forma60.activeProfileId';
  const K_THEME = 'forma60.theme';

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function getProfiles() {
    try { return JSON.parse(localStorage.getItem(K_PROFILES)) || []; }
    catch { return []; }
  }

  function saveProfiles(list) { localStorage.setItem(K_PROFILES, JSON.stringify(list)); }

  function getActiveId() { return localStorage.getItem(K_ACTIVE); }

  function setActiveId(id) { localStorage.setItem(K_ACTIVE, id); }

  function getActiveProfile() {
    const id = getActiveId();
    return getProfiles().find(p => p.id === id) || null;
  }

  function createProfile(data) {
    const profiles = getProfiles();
    const profile = {
      id: uid(),
      name: data.name || 'Mój profil',
      ageYears: data.ageYears || null,
      heightCm: data.heightCm || null,
      weightKg: data.weightKg || null,
      experience: data.experience || 'beginner',
      goal: data.goal || 'general_health',
      sessionsPerWeek: data.sessionsPerWeek || 6,
      sessionDurationMinutes: data.sessionDurationMinutes || 35,
      equipment: data.equipment || [],
      difficultyPreference: data.difficultyPreference || 'standard',
      focusAreas: data.focusAreas || [],
      limitations: data.limitations || [],
      contraindicationsNote: data.contraindicationsNote || '',
      safetyConsentAcceptedAt: null,
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
      progress: { completedDays: [], exerciseChecks: {}, measurements: [], weightLog: [], sessions: [] }
    };
    profiles.push(profile);
    saveProfiles(profiles);
    setActiveId(profile.id);
    return profile;
  }

  function acceptSafetyConsent(profileId) {
    return updateProfile(profileId, { safetyConsentAcceptedAt: Date.now() });
  }

  function updateProfile(id, patch) {
    const profiles = getProfiles();
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    profiles[idx] = { ...profiles[idx], ...patch };
    saveProfiles(profiles);
    return profiles[idx];
  }

  function deleteProfile(id) {
    let profiles = getProfiles().filter(p => p.id !== id);
    saveProfiles(profiles);
    if (getActiveId() === id) {
      setActiveId(profiles.length ? profiles[0].id : '');
    }
  }

  function currentDayNumber(profile) {
    if (!profile || !profile.startDate) return 1;
    const start = new Date(profile.startDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - start) / 86400000) + 1;
    return Math.min(60, Math.max(1, diffDays));
  }

  function toggleDayComplete(profileId, day) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    const set = new Set(p.progress.completedDays);
    if (set.has(day)) set.delete(day); else set.add(day);
    p.progress.completedDays = Array.from(set).sort((a, b) => a - b);
    saveProfiles(profiles);
    return p.progress.completedDays;
  }

  function setExerciseChecks(profileId, day, codes) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    p.progress.exerciseChecks[day] = codes;
    saveProfiles(profiles);
  }

  function getExerciseChecks(profile, day) {
    return (profile.progress.exerciseChecks && profile.progress.exerciseChecks[day]) || [];
  }

  function addMeasurement(profileId, entry) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    p.progress.measurements.push({ ...entry, date: entry.date || new Date().toISOString().slice(0, 10) });
    saveProfiles(profiles);
  }

  function addWeight(profileId, weightKg, date) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    p.progress.weightLog.push({ weight: weightKg, date: date || new Date().toISOString().slice(0, 10) });
    saveProfiles(profiles);
  }

  function setWeightGoal(profileId, goalKg) {
    return updateProfile(profileId, { weightGoalKg: goalKg || null });
  }

  // Cel jest sensowny tylko względem punktu startowego — bez pierwszego wpisu wagi nie da się
  // policzyć kierunku (chudnięcie vs przybieranie), więc funkcja po prostu nic nie zwraca.
  function computeWeightGoalProgress(profile) {
    const goal = profile.weightGoalKg;
    const log = [...(profile.progress.weightLog || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!goal || !log.length) return null;
    const start = log[0].weight;
    const current = log[log.length - 1].weight;
    const totalToGo = start - goal;
    if (Math.abs(totalToGo) < 0.05) return { start, current, goal, pct: 100, remainingKg: 0 };
    const done = start - current;
    const pct = Math.max(0, Math.min(100, Math.round((done / totalToGo) * 100)));
    return {
      start, current, goal, pct,
      remainingKg: Math.round(Math.abs(current - goal) * 10) / 10
    };
  }

  // Rekordy zapisywane przy okazji sprawdzianu formy przez kamerę (js/poseCheck.js) — dane
  // i tak są liczone na żywo do live-feedbacku, więc zachowanie najlepszego wyniku to tylko
  // zapis, bez dodatkowego trackingu.
  function getPersonalRecord(profile, code) {
    return (profile.progress.personalRecords && profile.progress.personalRecords[code]) || null;
  }

  function getAllPersonalRecords(profile) {
    return profile.progress.personalRecords || {};
  }

  function recordPersonalBest(profileId, code, { reps, holdSeconds }) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return null;
    if (!p.progress.personalRecords) p.progress.personalRecords = {};
    const existing = p.progress.personalRecords[code] || { reps: 0, holdSeconds: 0 };
    const improvedReps = (reps || 0) > (existing.reps || 0);
    const improvedHold = (holdSeconds || 0) > (existing.holdSeconds || 0);
    if (!improvedReps && !improvedHold) return null;
    p.progress.personalRecords[code] = {
      reps: Math.max(reps || 0, existing.reps || 0),
      holdSeconds: Math.max(holdSeconds || 0, existing.holdSeconds || 0),
      updatedAt: Date.now()
    };
    saveProfiles(profiles);
    return { improvedReps, improvedHold, record: p.progress.personalRecords[code] };
  }

  function recordSession(profileId, session) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    if (!p.progress.sessions) p.progress.sessions = [];
    p.progress.sessions.push({ ...session, completedAt: Date.now() });
    const days = new Set(p.progress.completedDays);
    days.add(session.day);
    p.progress.completedDays = Array.from(days).sort((a, b) => a - b);
    saveProfiles(profiles);
  }

  function getLastSession(profile) {
    const sessions = profile.progress.sessions || [];
    return sessions.length ? sessions[sessions.length - 1] : null;
  }

  function currentStreak(profile) {
    const days = profile.progress.completedDays || [];
    if (!days.length) return 0;
    let streak = 1;
    let d = days[days.length - 1];
    const set = new Set(days);
    while (set.has(d - 1)) { streak++; d--; }
    return streak;
  }

  // ---------- Gamifikacja ----------
  const BADGES = [
    { id: 'profile_created', icon: '🌱', name: 'Zaczynasz podróż', desc: 'Uzupełnij profil i zaakceptuj zasady bezpieczeństwa', check: p => !!p.safetyConsentAcceptedAt },
    { id: 'first_day', icon: '🎉', name: 'Pierwszy krok', desc: 'Ukończ pierwszy dzień programu', check: p => p.progress.completedDays.length >= 1 },
    { id: 'streak_3', icon: '🔥', name: '3 dni z rzędu', desc: 'Utrzymaj serię 3 dni', check: p => currentStreak(p) >= 3 },
    { id: 'streak_7', icon: '🔥', name: 'Tydzień w ogniu', desc: 'Seria 7 dni z rzędu', check: p => currentStreak(p) >= 7 },
    { id: 'streak_14', icon: '⚡', name: '2 tygodnie nonstop', desc: 'Seria 14 dni z rzędu', check: p => currentStreak(p) >= 14 },
    { id: 'quarter', icon: '🥉', name: '25% za Tobą', desc: 'Ukończ 15 dni programu', check: p => p.progress.completedDays.length >= 15 },
    { id: 'half', icon: '🥈', name: 'Połowa drogi', desc: 'Ukończ 30 dni programu', check: p => p.progress.completedDays.length >= 30 },
    { id: 'three_quarter', icon: '🥇', name: '75% za Tobą', desc: 'Ukończ 45 dni programu', check: p => p.progress.completedDays.length >= 45 },
    { id: 'finisher', icon: '🏆', name: 'Program ukończony!', desc: 'Ukończ wszystkie 60 dni', check: p => p.progress.completedDays.length >= 60 },
    { id: 'five_sessions', icon: '💪', name: '5 treningów', desc: 'Zapisz 5 sesji treningowych', check: p => (p.progress.sessions || []).length >= 5 },
    { id: 'ten_sessions', icon: '💪', name: '10 treningów', desc: 'Zapisz 10 sesji treningowych', check: p => (p.progress.sessions || []).length >= 10 },
    { id: 'first_measurement', icon: '📏', name: 'Pierwszy pomiar', desc: 'Zapisz pierwszy pomiar sylwetki', check: p => (p.progress.measurements || []).length >= 1 },
    {
      id: 'body_aware', icon: '🧘', name: 'Słuchasz swojego ciała',
      desc: 'Zgłoś dyskomfort i zamień ćwiczenie na bezpieczniejszy wariant łącznie 10 razy — to nie porażka, to mądrość',
      check: p => Object.values(p.progress.exercisePain || {}).reduce((a, b) => a + b, 0) >= 10
    },
    {
      id: 'comeback', icon: '🔄', name: 'Wracasz, i to się liczy',
      desc: 'Wróć do treningu po co najmniej 3-dniowej przerwie',
      check: p => {
        const days = (p.progress.completedDays || []).slice().sort((a, b) => a - b);
        for (let i = 1; i < days.length; i++) { if (days[i] - days[i - 1] >= 4) return true; }
        return false;
      }
    },
    {
      id: 'explorer', icon: '🧭', name: 'Odkrywca ćwiczeń',
      desc: 'Wykonaj co najmniej 20 różnych ćwiczeń z biblioteki',
      check: p => {
        const codes = new Set();
        Object.values(p.progress.exerciseChecks || {}).forEach(arr => (arr || []).forEach(c => codes.add(c)));
        return codes.size >= 20;
      }
    },
    { id: 'weight_tracker', icon: '⚖️', name: 'Śledzisz swoją wagę', desc: 'Zapisz wagę co najmniej 4 razy', check: p => (p.progress.weightLog || []).length >= 4 },
    {
      id: 'readiness_pro', icon: '📋', name: 'Znasz swoje ciało',
      desc: 'Uzupełnij "Gotowość do treningu" (sen/zakwasy) w co najmniej 10 różnych dniach',
      check: p => Object.keys(p.progress.readinessInputs || {}).length >= 10
    },
  ];

  function checkNewBadges(profileId) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return [];
    if (!p.progress.badges) p.progress.badges = [];
    const earned = new Set(p.progress.badges);
    const newly = [];
    for (const b of BADGES) {
      if (!earned.has(b.id) && b.check(p)) { earned.add(b.id); newly.push(b); }
    }
    if (newly.length) { p.progress.badges = Array.from(earned); saveProfiles(profiles); }
    return newly;
  }

  function getBadges(profile) {
    const earned = new Set(profile.progress.badges || []);
    return BADGES.map(b => ({ ...b, earned: earned.has(b.id) }));
  }

  // ---------- Gotowość (regeneracja) ----------
  // Orientacyjny wskaźnik, NIE diagnoza medyczna — łączy realne dane z treningów
  // (trudność/samopoczucie/ból z ostatnich sesji) z opcjonalnym ręcznym wpisem snu/zakwasów,
  // ponieważ PWA nie ma dostępu do Health Connect / danych z zegarka.
  function computeReadiness(profile) {
    let score = 78; // neutralny punkt startowy zanim zbierzemy jakiekolwiek dane
    const sessions = (profile.progress.sessions || []).slice(-5);
    if (sessions.length) {
      const avgDifficulty = sessions.reduce((s, x) => s + (x.difficulty || 3), 0) / sessions.length;
      const avgFeeling = sessions.reduce((s, x) => s + (x.feeling || 3), 0) / sessions.length;
      const painCount = sessions.filter(s => s.pain && s.pain !== 'none').length;
      score = 82 - (avgDifficulty - 3) * 7 + (avgFeeling - 3) * 6 - painCount * 10;
    }
    const manual = getReadinessInput(profile);
    if (manual) {
      score += (manual.sleep - 3) * 6;
      score -= (manual.soreness - 1) * 5;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function setReadinessInput(profileId, sleep, soreness) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    if (!p.progress.readinessInputs) p.progress.readinessInputs = {};
    p.progress.readinessInputs[new Date().toISOString().slice(0, 10)] = { sleep, soreness };
    saveProfiles(profiles);
  }

  function getReadinessInput(profile) {
    const today = new Date().toISOString().slice(0, 10);
    return (profile.progress.readinessInputs && profile.progress.readinessInputs[today]) || null;
  }

  // ---------- Dziennik dnia (posiłki / nawodnienie) ----------
  // Świadomie uproszczone: bez bazy kalorii, bez wagi porcji — jedno pytanie o charakter
  // odżywiania + licznik szklanek wody, żeby pokazać całościowy obraz dnia bez budowania
  // pełnego modułu dietetycznego (poza zakresem tej appki).
  function todayKey() { return new Date().toISOString().slice(0, 10); }

  function getDailyLog(profile, date) {
    const key = date || todayKey();
    return (profile.progress.dailyLog && profile.progress.dailyLog[key]) || { eating: null, water: 0 };
  }

  function setEatingLog(profileId, eating) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    if (!p.progress.dailyLog) p.progress.dailyLog = {};
    const key = todayKey();
    p.progress.dailyLog[key] = { ...(p.progress.dailyLog[key] || { water: 0 }), eating };
    saveProfiles(profiles);
  }

  function addWaterLog(profileId, delta) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return 0;
    if (!p.progress.dailyLog) p.progress.dailyLog = {};
    const key = todayKey();
    const current = p.progress.dailyLog[key] || { eating: null, water: 0 };
    const water = Math.max(0, Math.min(20, (current.water || 0) + delta));
    p.progress.dailyLog[key] = { ...current, water };
    saveProfiles(profiles);
    return water;
  }

  // ---------- Prognoza ukończenia programu ----------
  // Tempo liczone z ostatnich 14 dni KALENDARZOWYCH (nie sesji) — realistyczna projekcja
  // uwzględniająca przerwy, nie scenariusz "gdyby ćwiczyć bez przerwy od dziś".
  function computeCompletionForecast(profile) {
    const completedCount = profile.progress.completedDays.length;
    if (completedCount >= 60) return { done: true };
    const remaining = 60 - completedCount;
    const sessions = profile.progress.sessions || [];
    if (sessions.length < 3) return null;
    const now = Date.now();
    const windowDays = 14;
    const recentCount = sessions.filter(s => s.completedAt && (now - s.completedAt) <= windowDays * 86400000).length;
    const pace = recentCount / windowDays;
    if (pace <= 0) return { stalled: true };
    const daysNeeded = Math.ceil(remaining / pace);
    const finishDate = new Date(now + daysNeeded * 86400000).toISOString().slice(0, 10);
    return { daysNeeded, finishDate, pace };
  }

  // ---------- Trend formy (pierwsze vs ostatnie sesje) ----------
  // Prosty sygnał "łatwiej mi teraz niż na starcie", niezależny od computeDifficultySuggestion
  // (ta patrzy tylko na ostatnie 3-5 sesji, nie na cały przebyty dystans).
  function computeFormTrend(profile) {
    const sessions = profile.progress.sessions || [];
    if (sessions.length < 6) return null;
    const early = sessions.slice(0, 3);
    const recent = sessions.slice(-3);
    const avg = (arr, key) => arr.reduce((s, x) => s + (x[key] || 3), 0) / arr.length;
    return {
      earlyDifficulty: avg(early, 'difficulty'),
      recentDifficulty: avg(recent, 'difficulty'),
      earlyFeeling: avg(early, 'feeling'),
      recentFeeling: avg(recent, 'feeling'),
    };
  }

  // ---------- Adaptacja poziomu trudności ----------
  // Prosta, przejrzysta reguła (nie "czarna skrzynka") oparta o ostatnie 3-5 sesji.
  function computeDifficultySuggestion(profile) {
    const sessions = (profile.progress.sessions || []).slice(-5);
    if (sessions.length < 3) return null;
    const avgDifficulty = sessions.reduce((s, x) => s + (x.difficulty || 3), 0) / sessions.length;
    const avgFeeling = sessions.reduce((s, x) => s + (x.feeling || 3), 0) / sessions.length;
    const painCount = sessions.filter(s => s.pain && s.pain !== 'none').length;
    const completionRates = sessions.map(s => {
      const ex = s.exercises || [];
      if (!ex.length) return 1;
      const done = ex.filter(e => !e.skipped && e.setsCompleted >= e.setsTarget).length;
      return done / ex.length;
    });
    const avgCompletion = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;

    if (profile.difficultyPreference !== 'easier' && (painCount >= 2 || (avgDifficulty >= 4.3 && avgCompletion < 0.75))) {
      return {
        direction: 'easier',
        reason: painCount >= 2
          ? 'Ostatnio kilka razy zgłaszałaś/eś dyskomfort w trakcie treningu.'
          : 'Ostatnie treningi oceniasz jako bardzo trudne i nie zawsze kończysz wszystkie serie.'
      };
    }
    if (profile.difficultyPreference !== 'harder' && avgDifficulty <= 2.2 && avgFeeling >= 4 && avgCompletion >= 0.95 && painCount === 0) {
      return { direction: 'harder', reason: 'Ostatnie treningi kończysz bez trudności i czujesz się świetnie — możesz dodać sobie wyzwania.' };
    }
    return null;
  }

  // ---------- Adaptacja harmonogramu faz (dłuższy trend, nie pojedyncza sesja) ----------
  // computeDifficultySuggestion patrzy na 3-5 ostatnich sesji i sugeruje "łatwiej/trudniej" w OBRĘBIE tej samej fazy.
  // Tu patrzymy na dłuższe okno (10 sesji, ~2 tyg. przy planowanych 6 treningach/tydz.), żeby świadomie
  // zaproponować przejście do WYŻSZEJ fazy (więcej serii/powtórzeń) wcześniej niż wynika to z kalendarza.
  function computePhaseTrend(profile) {
    const sessions = (profile.progress.sessions || []).slice(-10);
    if (sessions.length < 10) return null;
    const nominalPhase = phaseForDay(currentDayNumber(profile)).id;
    const currentTarget = Math.max(nominalPhase, getPhaseOverride(profile) || 0);
    if (currentTarget >= 4) return null;
    const nextPhase = currentTarget + 1;
    if (profile.progress.phaseTrendDismissed === nextPhase) return null;

    const avgDifficulty = sessions.reduce((s, x) => s + (x.difficulty || 3), 0) / sessions.length;
    const avgFeeling = sessions.reduce((s, x) => s + (x.feeling || 3), 0) / sessions.length;
    const painCount = sessions.filter(s => s.pain && s.pain !== 'none').length;
    const completionRates = sessions.map(s => {
      const ex = s.exercises || [];
      if (!ex.length) return 1;
      const done = ex.filter(e => !e.skipped && e.setsCompleted >= e.setsTarget).length;
      return done / ex.length;
    });
    const avgCompletion = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;

    if (avgDifficulty <= 2.3 && avgFeeling >= 4 && avgCompletion >= 0.95 && painCount === 0) {
      const phaseName = (PHASES.find(p => p.id === nextPhase) || {}).name || `Faza ${nextPhase}`;
      return {
        suggestedPhase: nextPhase,
        phaseName,
        reason: `Od ${sessions.length} ostatnich treningów oceniasz je jako łatwe i kończysz w całości — możesz już teraz przejść na zakres serii/powtórzeń z „${phaseName}", zamiast czekać na zaplanowany dzień.`
      };
    }
    return null;
  }

  function getPhaseOverride(profile) {
    return (profile.progress && profile.progress.phaseOverride) || null;
  }

  function setPhaseOverride(profileId, phaseId) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    p.progress.phaseOverride = phaseId;
    saveProfiles(profiles);
  }

  function dismissPhaseTrend(profileId, phaseId) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    p.progress.phaseTrendDismissed = phaseId;
    saveProfiles(profiles);
  }

  // Personalizacja: liczymy ile razy ból zgłoszono przy danym ćwiczeniu, żeby po 2. razie
  // zaproponować zamiennik — prosta reguła zamiast pełnego "Personalization Engine".
  function logExercisePain(profileId, exerciseCode) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    if (!p.progress.exercisePain) p.progress.exercisePain = {};
    p.progress.exercisePain[exerciseCode] = (p.progress.exercisePain[exerciseCode] || 0) + 1;
    saveProfiles(profiles);
    return p.progress.exercisePain[exerciseCode];
  }

  function getExercisePainCount(profile, exerciseCode) {
    return (profile.progress.exercisePain && profile.progress.exercisePain[exerciseCode]) || 0;
  }

  const K_REMINDER = 'forma60.reminder';
  function getReminderSettings() {
    try { return JSON.parse(localStorage.getItem(K_REMINDER)) || { enabled: false, hour: 18, minute: 0, lastNotifiedDate: null }; }
    catch { return { enabled: false, hour: 18, minute: 0, lastNotifiedDate: null }; }
  }
  function setReminderSettings(settings) {
    localStorage.setItem(K_REMINDER, JSON.stringify(settings));
  }

  function getTheme() { return localStorage.getItem(K_THEME) || 'auto'; }
  function setTheme(t) { localStorage.setItem(K_THEME, t); }

  function exportData() {
    return JSON.stringify({ profiles: getProfiles(), activeId: getActiveId(), exportedAt: new Date().toISOString() }, null, 2);
  }

  function importData(json) {
    const data = JSON.parse(json);
    if (!Array.isArray(data.profiles)) throw new Error('Nieprawidłowy plik');
    saveProfiles(data.profiles);
    if (data.activeId) setActiveId(data.activeId);
  }

  return {
    getProfiles, getActiveId, setActiveId, getActiveProfile,
    createProfile, updateProfile, deleteProfile, acceptSafetyConsent,
    currentDayNumber, toggleDayComplete, setExerciseChecks, getExerciseChecks,
    addMeasurement, addWeight, setWeightGoal, computeWeightGoalProgress, recordSession, getLastSession, currentStreak,
    getPersonalRecord, getAllPersonalRecords, recordPersonalBest,
    logExercisePain, getExercisePainCount,
    checkNewBadges, getBadges,
    computeReadiness, setReadinessInput, getReadinessInput,
    getDailyLog, setEatingLog, addWaterLog,
    computeDifficultySuggestion,
    computeCompletionForecast, computeFormTrend,
    computePhaseTrend, getPhaseOverride, setPhaseOverride, dismissPhaseTrend,
    getReminderSettings, setReminderSettings,
    getTheme, setTheme, exportData, importData
  };
})();
