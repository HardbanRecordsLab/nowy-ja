// Silnik indywidualnego planu treningowego (reguły + deterministyczny dobór — bez
// zewnętrznego API, działa offline). Na podstawie profilu (cel, poziom, sprzęt,
// ograniczenia, priorytety, liczba sesji/tydz.) generuje plan na wybraną długość:
// 7 dni ... pół roku. Klasyczny program 60-dniowy zostaje jako wariant domyślny,
// gdy użytkownik nie wybrał własnej długości.
const PlanEngine = (() => {

  const DURATIONS = [
    { days: 7,   label: '7 dni' },
    { days: 14,  label: '2 tygodnie' },
    { days: 21,  label: '3 tygodnie' },
    { days: 30,  label: 'Miesiąc' },
    { days: 60,  label: '2 miesiące' },
    { days: 90,  label: '3 miesiące' },
    { days: 120, label: '4 miesiące' },
    { days: 150, label: '5 miesięcy' },
    { days: 180, label: 'Pół roku' },
  ];

  const PHASE_NAMES = {
    1: 'Faza 1: Adaptacja',
    2: 'Faza 2: Budowa',
    3: 'Faza 3: Wzmocnienie',
    4: 'Faza 4: Intensyfikacja',
  };

  // ---- deterministyczny generator liczb (żeby ten sam profil dawał ten sam plan) ----
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- typy dni treningowych ----
  const FOCUS = {
    core:     { code: 'K', groups: ['A'],      name: 'Brzuch + core',            muscles: 'Brzuch, mięśnie głębokie', size: 5 },
    legs:     { code: 'N', groups: ['B'],      name: 'Uda + Pośladki',           muscles: 'Uda, pośladki, łydki',     size: 6 },
    push:     { code: 'P', groups: ['C'],      name: 'Klatka + Ramiona (pchanie)', muscles: 'Klatka, barki, triceps',  size: 5,
               match: e => /(klatk|triceps|bark|pompk|wycisk|dips|deltoid|nad głową|szczupak|pike)/i.test(e.muscle + ' ' + e.name) },
    pull:     { code: 'C', groups: ['C'],      name: 'Plecy + Ramiona (ciągnięcie)', muscles: 'Plecy, biceps, tył barków', size: 4,
               match: e => /(plec|grzbiet|wiosł|superman|hiperek|prostownik|biceps|kaptur|band pull|ściąganie łopatek|najszersz)/i.test(e.muscle + ' ' + e.name) },
    fullbody: { code: 'F', groups: ['A', 'B', 'C'], name: 'Całe ciało (obwód stacyjny)', muscles: 'Wszystkie priorytetowe partie', size: 6, circuit: true },
    cardio:   { code: 'D', groups: ['G'],      name: 'Cardio / spalanie',        muscles: 'Wydolność, całe ciało',    size: 5 },
    mobility: { code: 'M', groups: ['D'],      name: 'Mobilność + rozciąganie',  muscles: 'Stawy, elastyczność, regeneracja', size: 8 },
  };

  // ---- tygodniowy układ wg liczby sesji i celu ----
  function weekPattern(sessions, goal) {
    const S = Math.max(2, Math.min(6, Number(sessions) || 4));
    const emphasis = ({
      weight_loss:    ['cardio', 'fullbody', 'legs', 'core', 'cardio', 'mobility'],
      endurance:      ['cardio', 'fullbody', 'legs', 'cardio', 'core', 'mobility'],
      muscle_tone:    ['legs', 'push', 'core', 'pull', 'legs', 'mobility'],
      mobility:       ['mobility', 'legs', 'mobility', 'core', 'fullbody', 'mobility'],
      general_health: ['fullbody', 'legs', 'core', 'cardio', 'push', 'mobility'],
    })[goal] || ['fullbody', 'legs', 'core', 'cardio', 'push', 'mobility'];

    const focusDays = emphasis.slice(0, S);
    // rozłóż S dni treningowych + (7-S) dni odpoczynku możliwie równomiernie
    const pat = new Array(7).fill('rest');
    for (let i = 0; i < S; i++) {
      pat[Math.round((i * 7) / S) % 7] = focusDays[i];
    }
    // gdyby kolizja zjadła dzień treningowy — dołóż w pierwszą wolną kratkę
    let placed = pat.filter(x => x !== 'rest').length;
    let fi = 0;
    while (placed < S && fi < focusDays.length) {
      const slot = pat.indexOf('rest');
      if (slot === -1) break;
      pat[slot] = focusDays[placed];
      placed++; fi++;
    }
    return pat;
  }

  // ---- faza wg pozycji w planie (skalowana do długości) ----
  function phaseForDay(day, total) {
    const maxPhase = total <= 10 ? 2 : total <= 21 ? 3 : 4;
    const p = (day - 1) / Math.max(1, total);
    return Math.min(maxPhase, Math.floor(p * 4) + 1);
  }

  // ---- filtrowanie puli ćwiczeń pod profil ----
  const EQUIP_KEYWORDS = [
    { re: /(bidon|hantl|ciężark)/i, item: 'Butelki wody / hantle' },
    { re: /taśm/i, item: 'Taśma oporowa' },
    { re: /krześl|krzeseł|krzesle/i, item: 'Krzesło' },
    { re: /(o ścian|przy ścian|od ścian)/i, item: 'Ściana' },
    { re: /(stopień|stopni|schod|step-?up|step touch|na stopie)/i, item: 'Stopień / schody' },
  ];
  function requiredEquipment(e) {
    const hay = e.name + ' ' + (e.steps || []).join(' ');
    return EQUIP_KEYWORDS.filter(k => k.re.test(hay)).map(k => k.item);
  }

  const LEVEL_RANK = { beginner: 1, intermediate: 2, advanced: 3, expert: 3 };
  function exLevel(e) {
    if (e.level && LEVEL_RANK[e.level]) return LEVEL_RANK[e.level];
    // heurystyka gdy brak pola: po nazwie
    if (/(zaawansow|z wyskokiem|jednonóż|jednorącz|bułgarski|pełna wersja|plyo|szczupak|scyzoryk)/i.test(e.name)) return 2;
    return 1;
  }

  // ograniczenia -> ćwiczenia do wykluczenia
  function violatesLimitation(e, lims) {
    const t = (e.name + ' ' + e.muscle + ' ' + (e.steps || []).join(' ')).toLowerCase();
    if (lims.has('Kolana')) {
      if (e.group === 'G' && /(wyskok|jump|skok|plyo|bound|hops|sprint)/i.test(t)) return true;
      if (/(wykrok w przód|wykrok chodzon|przysiad z wyskokiem|bułgarski|pełny przysiad głębok|frog|żab)/i.test(t)) return true;
    }
    if (lims.has('Barki')) {
      if (/(pompk|pike|szczupak|nad głow|overhead|handstand|dips|wyciskanie.*nad|wznos.*bark)/i.test(t)) return true;
    }
    if (lims.has('Kręgosłup / plecy')) {
      if (/(pełny brzuszek|sit-?up|scyzoryk|jackknife|hiperekst|prostowanie tułowia|rosyjsk|russian twist|nożyce|dzień dobry|good morning|superman)/i.test(t)) return true;
    }
    if (lims.has('Nadgarstki')) {
      if (/(pompk|deska(?! bokiem)|plank(?! bokiem)|czworak|wspinaczka|mountain|spider|burpee|niedźwiedz|bear)/i.test(t)
        && !/(od ścian|przy ścian|na przedramion|forearm)/i.test(t)) return true;
    }
    if (lims.has('Biodra')) {
      if (e.group === 'G' && /(wyskok|jump|skok|bound|hops)/i.test(t)) return true;
      if (/(głęboki wykrok|bułgarski|figura|hydrant szeroki)/i.test(t)) return true;
    }
    return false;
  }

  // dopasowanie do priorytetowych partii z profilu
  const FOCUS_AREA_RE = {
    'Brzuch': /(brzuch|skośn|core|prosty brzuch)/i,
    'Uda': /(uda|czworogłow|przód uda|tył uda|dwugłow)/i,
    'Biodra': /(biodr|zginacz bioder|przywodzic|odwodzic)/i,
    'Klatka piersiowa': /(klatk|piersiow)/i,
    'Ramiona': /(bark|triceps|biceps|ramion|przedrami)/i,
    'Pośladki': /(pośladk|glute|mostek|clam|hydrant|kickback|kopnięcie w tył)/i,
  };
  function focusAreaMatch(e, focusAreas) {
    const hay = e.muscle + ' ' + e.name;
    return focusAreas.some(fa => FOCUS_AREA_RE[fa] && FOCUS_AREA_RE[fa].test(hay));
  }

  function buildPool(profile, allEx) {
    const equip = new Set(profile.equipment || []);
    const lims = new Set((profile.limitations || []).filter(l => l !== 'Brak ograniczeń'));
    const level = LEVEL_RANK[profile.experience] || 1;
    const diff = profile.difficultyPreference || 'standard';
    const maxLevel = level + (diff === 'harder' ? 1 : 0);
    const minInterOK = diff === 'easier' ? level : Math.max(level, 2);

    return allEx.filter(e => {
      if (!e || !e.code || !e.group) return false;
      // grupa E (opona/plecak/skakanka) tylko gdy użytkownik ma ten sprzęt
      if (e.group === 'E') {
        return equip.has('Opona') || equip.has('Plecak obciążony') || equip.has('Skakanka');
      }
      const needs = requiredEquipment(e);
      if (needs.some(n => !equip.has(n))) return false;
      if (violatesLimitation(e, lims)) return false;
      const lv = exLevel(e);
      if (lv > maxLevel) return false;
      return true;
    });
  }

  // ---- dobór ćwiczeń na dzień ----
  function pickForDay(focusKey, phase, pool, rng, recent, focusAreas) {
    const spec = FOCUS[focusKey];
    let cands = pool.filter(e => spec.groups.includes(e.group));
    if (spec.match) {
      const m = cands.filter(spec.match);
      if (m.length >= 3) cands = m; // jeśli za mało pasujących, weź całą grupę C
    }
    if (!cands.length) return [];

    const scored = cands.map(e => {
      let s = rng() * 0.45;
      if (focusAreas.length && focusAreaMatch(e, focusAreas)) s += 0.7;
      s += (1 / (1 + (recent[e.code] || 0))) * 0.55;           // preferuj rzadziej używane
      const lv = exLevel(e);
      s += (lv === Math.min(3, Math.max(1, phase - 1 + 1)) ? 0.2 : 0); // lekko dopasuj poziom do fazy
      if (phase >= 3 && lv >= 2) s += 0.15;
      if (phase <= 1 && lv === 1) s += 0.15;
      return { e, s };
    });
    scored.sort((a, b) => b.s - a.s);

    const n = spec.size;
    const chosen = scored.slice(0, n).map(x => x.e.code);
    chosen.forEach(c => { recent[c] = (recent[c] || 0) + 3; });
    Object.keys(recent).forEach(k => { recent[k] = Math.max(0, recent[k] - 1); });
    return chosen;
  }

  // ---- główna funkcja ----
  function generate(profile, totalDays, allEx) {
    totalDays = Math.max(7, Math.min(180, Number(totalDays) || 30));
    const sig = signature(profile, totalDays);
    const rng = mulberry32(hashStr(sig));
    const pool = buildPool(profile, allEx);
    const week = weekPattern(profile.sessionsPerWeek, profile.goal);
    const focusAreas = profile.focusAreas || [];
    const recent = {};
    const plan = [];

    // awaryjna pula, gdyby filtr wyciął prawie wszystko z jakiejś grupy
    const anyByGroup = g => allEx.filter(e => e.group === g);

    for (let day = 1; day <= totalDays; day++) {
      const focusKey = week[(day - 1) % 7];
      const phase = phaseForDay(day, totalDays);
      const phaseName = PHASE_NAMES[phase];

      if (focusKey === 'rest') {
        plan.push({ day, rest: true, type: 'R', typeName: 'Odpoczynek', muscles: 'Regeneracja', phase, phaseName, circuit: false, exercises: [] });
        continue;
      }
      const spec = FOCUS[focusKey];
      let ex = pickForDay(focusKey, phase, pool, rng, recent, focusAreas);

      if (ex.length < 3) {
        // backfill z pełnej biblioteki danej grupy (bez ograniczeń poziomu)
        const extra = spec.groups.flatMap(anyByGroup)
          .filter(e => !violatesLimitation(e, new Set((profile.limitations || []).filter(l => l !== 'Brak ograniczeń'))))
          .map(e => e.code)
          .filter(c => !ex.includes(c));
        ex = ex.concat(extra).slice(0, spec.size);
      }

      const dayObj = { day, rest: false, type: spec.code, typeName: spec.name, muscles: spec.muscles, phase, phaseName, circuit: !!spec.circuit };
      if (spec.circuit) {
        dayObj.stations = ex;
        dayObj.rounds = String(phase <= 2 ? 2 : phase === 3 ? 3 : 4);
      } else {
        dayObj.exercises = ex;
      }
      plan.push(dayObj);
    }

    return { days: totalDays, generatedAt: Date.now(), sig, plan };
  }

  // podpis wejść — gdy się zmieni, plan trzeba przegenerować
  function signature(profile, totalDays) {
    return [
      totalDays, profile.experience, profile.goal, profile.sessionsPerWeek,
      profile.difficultyPreference,
      (profile.equipment || []).slice().sort().join(','),
      (profile.limitations || []).slice().sort().join(','),
      (profile.focusAreas || []).slice().sort().join(','),
      profile.planReseed || 0,
      profile.id,
    ].join('|');
  }

  return { DURATIONS, PHASE_NAMES, generate, signature, weekPattern, phaseForDay };
})();
