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
    addMeasurement, addWeight, recordSession, getLastSession, currentStreak,
    logExercisePain, getExercisePainCount,
    checkNewBadges, getBadges,
    computeReadiness, setReadinessInput, getReadinessInput,
    computeDifficultySuggestion,
    getReminderSettings, setReminderSettings,
    getTheme, setTheme, exportData, importData
  };
})();
