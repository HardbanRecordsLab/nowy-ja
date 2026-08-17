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
    getReminderSettings, setReminderSettings,
    getTheme, setTheme, exportData, importData
  };
})();
