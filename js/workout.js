// Silnik trybu "Trening teraz" — odliczanie, serie, obwody stacyjne, pauza/pomiń/zamień.
// Port tej samej logiki co planowany WorkoutViewModel/RepsParser w wersji Android,
// tak żeby zachowanie (parsowanie serii, przejścia faz) było identyczne w obu wersjach.

function parseReps(text) {
  const trimmed = (text || '').trim();
  const parts = trimmed.split(/[×xX]/);
  if (parts.length >= 2) {
    const setsMatch = parts[0].match(/\d+/);
    const sets = setsMatch ? parseInt(setsMatch[0], 10) : 1;
    const right = parts.slice(1).join('×').trim();
    const seconds = extractSeconds(right);
    return seconds != null
      ? { sets, isTimed: true, timedSeconds: seconds, label: right }
      : { sets, isTimed: false, timedSeconds: 0, label: right };
  }
  const seconds = extractSeconds(trimmed) ?? extractMinutesAsSeconds(trimmed);
  return seconds != null
    ? { sets: 1, isTimed: true, timedSeconds: seconds, label: trimmed }
    : { sets: 1, isTimed: false, timedSeconds: 0, label: trimmed };
}

function extractSeconds(text) {
  const m = text.match(/(\d+)(?:-(\d+))?\s*s\b/);
  if (!m) return null;
  return m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10);
}

function extractMinutesAsSeconds(text) {
  const m = text.match(/(\d+)(?:-(\d+))?\s*min/);
  if (!m) return null;
  const val = m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10);
  return val * 60;
}

function firstInt(text, fallback) {
  const m = String(text || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : fallback;
}

// ---------- "Napisz co się dzieje" — dopasowanie wzorców, NIE prawdziwe rozumienie języka ----------
// Świadomy kompromis: bez serwera i płatnego API nie da się bezpiecznie wywołać modelu
// językowego z czystego JS w przeglądarce. To rozpoznaje typowe, udokumentowane sytuacje
// (mało czasu / brak sprzętu / ból konkretnej okolicy / zmęczenie) i odpala TĘ SAMĄ logikę
// co przyciski szybkiego wyboru — więc działa przewidywalnie, za darmo i natychmiast.
const PAIN_KEYWORDS = [
  { kw: /kolan/i, label: 'Kolana' },
  { kw: /biodr/i, label: 'Biodra' },
  { kw: /(plec|kręgosłup|krzyż)/i, label: 'Kręgosłup / plecy' },
  { kw: /bark/i, label: 'Barki' },
  { kw: /nadgarst/i, label: 'Nadgarstki' },
];

function parseConstraintText(text) {
  const t = (text || '').toLowerCase();
  const constraints = [];

  const timeMatch = t.match(/(\d+)\s*min/);
  if (timeMatch || /\b(mało czasu|niewiele czasu|na szybko|w pośpiechu|nie mam czasu)\b/.test(t)) {
    constraints.push({ type: 'time', minutes: timeMatch ? parseInt(timeMatch[1], 10) : null });
  }

  if (/\b(nie mam|brak)\b[^.!?]{0,25}\b(hantl|bidon|taśm|sprzęt|krzesł|schod|stopni|ścian)/.test(t)
    || /\b(hantl|bidon|taśm)\w*[^.!?]{0,15}\b(nie mam|brak)\b/.test(t)) {
    constraints.push({ type: 'equipment' });
  }

  for (const { kw, label } of PAIN_KEYWORDS) {
    if (kw.test(t) && /\b(bol|ból|boli|obolał|dyskomfort)/.test(t)) {
      constraints.push({ type: 'pain', part: label });
    }
  }

  if (/\b(ciężki trening|bardzo zmęczon|wyczerpując|nie doszed[łl]em do siebie)\b/.test(t) && !constraints.some(c => c.type === 'pain')) {
    constraints.push({ type: 'fatigue' });
  }

  return constraints;
}

// Zbuduj listę kroków treningu: najpierw lekka rozgrzewka (przed KAŻDYM treningiem),
// potem ćwiczenia sekwencyjne albo stacje×rundy dla dni obwodowych.
function buildWorkoutSteps(dayInfo, exByCode, opts = {}) {
  if (dayInfo.rest) return [];

  let main;
  if (dayInfo.circuit) {
    const rounds = firstInt(dayInfo.rounds, 1);
    main = [];
    for (let round = 1; round <= rounds; round++) {
      dayInfo.stations.forEach((code, idx) => {
        const ex = exByCode[code];
        if (ex) main.push({ exercise: ex, stationIndex: idx + 1, totalStations: dayInfo.stations.length, round, totalRounds: rounds });
      });
    }
  } else {
    main = (dayInfo.exercises || []).map(code => exByCode[code]).filter(Boolean).map(ex => ({ exercise: ex }));
  }

  let warm = [];
  if (!opts.noWarmup) {
    const seq = (opts.express && typeof WARMUP_SEQUENCE_EXPRESS !== 'undefined')
      ? WARMUP_SEQUENCE_EXPRESS
      : (typeof WARMUP_SEQUENCE !== 'undefined' ? WARMUP_SEQUENCE : []);
    warm = seq.map(w => ({ exercise: exByCode[w.code], warmup: true, warmupSeconds: w.seconds }))
      .filter(s => s.exercise);
    warm.forEach((s, i) => { s.warmupIndex = i + 1; s.warmupTotal = warm.length; });
  }
  return warm.concat(main);
}

const STAGE = {
  COUNTDOWN: 'COUNTDOWN', ACTIVE: 'ACTIVE', SET_REST: 'SET_REST',
  STATION_REST: 'STATION_REST', ROUND_REST: 'ROUND_REST', FEEDBACK: 'FEEDBACK', DONE: 'DONE',
};

const PREP_SECONDS = 3;
const DEFAULT_REST_SECONDS = 45;

class WorkoutRunner {
  constructor({ dayInfo, steps, restSeconds, stationRestSeconds, roundRestSeconds, setsReduction, onLogSet, onStateChange }) {
    this.dayInfo = dayInfo;
    this.steps = steps;
    this.restSeconds = restSeconds || DEFAULT_REST_SECONDS;
    this.stationRestSeconds = stationRestSeconds || 25;
    this.roundRestSeconds = roundRestSeconds || 75;
    this.setsReduction = setsReduction || 0; // "Mało czasu": ile serii mniej niż standardowo (min. 1 seria zostaje)
    this.onLogSet = onLogSet || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.startedAt = Date.now();
    this._timer = null;
    this._endAt = 0;
    this._pausedRemainingMs = 0;
    this.state = {
      stepIndex: 0, currentSet: 1, totalSets: 1, isTimed: false,
      stage: STAGE.COUNTDOWN, remainingSeconds: PREP_SECONDS, totalSeconds: PREP_SECONDS,
      isPaused: false,
      feedback: { difficulty: 3, feeling: 3, pain: 'none' },
    };
  }

  get currentStep() { return this.steps[this.state.stepIndex]; }
  get isCircuit() { return !!this.dayInfo.circuit; }

  begin() {
    if (!this.steps.length) { this._setState({ stage: STAGE.FEEDBACK }); return; }
    this._prepareStep();
  }

  _prepareStep() {
    clearInterval(this._timer);
    const step = this.currentStep;
    if (!step) { this._setState({ stage: STAGE.FEEDBACK }); return; }

    // Krok rozgrzewki — stały czas, zawsze 1 "seria", bez redukcji.
    if (step.warmup) {
      this._currentSpec = { sets: 1, isTimed: true, timedSeconds: step.warmupSeconds, label: 'rozgrzewka' };
      this._setState({ currentSet: 1, totalSets: 1, isTimed: true, stage: STAGE.COUNTDOWN });
      this._runCountdown(PREP_SECONDS, () => {
        this._setState({ stage: STAGE.ACTIVE });
        this._runCountdown(step.warmupSeconds, () => this._onSetCompleted());
      });
      return;
    }

    const phase = this.dayInfo.phase;
    const spec = parseReps(step.exercise.reps['faza' + phase]);
    this._currentSpec = spec;
    const totalSets = this.isCircuit ? 1 : Math.max(1, spec.sets - this.setsReduction);
    this._setState({
      currentSet: 1,
      totalSets,
      isTimed: spec.isTimed,
      stage: STAGE.COUNTDOWN,
    });
    this._runCountdown(PREP_SECONDS, () => {
      this._setState({ stage: STAGE.ACTIVE });
      if (spec.isTimed) {
        this._runCountdown(spec.timedSeconds, () => this._onSetCompleted());
      }
    });
  }

  _runCountdown(seconds, onDone) {
    clearInterval(this._timer);
    this._endAt = Date.now() + seconds * 1000;
    this._pausedRemainingMs = 0;
    this._onDone = onDone;
    this._setState({ remainingSeconds: seconds, totalSeconds: seconds, isPaused: false });
    this._timer = setInterval(() => this._tick(), 250);
  }

  _tick() {
    if (this.state.isPaused) return;
    const remaining = Math.max(0, Math.round((this._endAt - Date.now()) / 1000));
    if (remaining !== this.state.remainingSeconds) this._setState({ remainingSeconds: remaining });
    if (Date.now() >= this._endAt) {
      clearInterval(this._timer);
      const done = this._onDone;
      this._onDone = null;
      if (done) done();
    }
  }

  pause() {
    if (this.state.isPaused) return;
    this._pausedRemainingMs = Math.max(0, this._endAt - Date.now());
    this._setState({ isPaused: true });
  }

  resume() {
    if (!this.state.isPaused) return;
    this._endAt = Date.now() + this._pausedRemainingMs;
    this._setState({ isPaused: false });
  }

  completeSetManually() {
    if (this.state.stage !== STAGE.ACTIVE) return;
    clearInterval(this._timer);
    this._onSetCompleted();
  }

  _onSetCompleted() {
    const step = this.currentStep;
    if (!step) return;
    if (!step.warmup) this.onLogSet(step.exercise.code, this.state.currentSet, this.state.totalSets);

    if (!this.isCircuit && !step.warmup && this.state.currentSet < this.state.totalSets) {
      this._setState({ currentSet: this.state.currentSet + 1, stage: STAGE.SET_REST });
      this._runCountdown(this.restSeconds, () => this._prepareStep());
      return;
    }
    this._advance();
  }

  _advance() {
    const current = this.currentStep;
    const nextIndex = this.state.stepIndex + 1;
    if (nextIndex >= this.steps.length) { this._setState({ stage: STAGE.FEEDBACK }); return; }
    const next = this.steps[nextIndex];
    this._setState({ stepIndex: nextIndex });

    // Rozgrzewka: płynne przejścia, bez długiego odpoczynku — wystarczy 3 s "przygotuj się".
    if (current && current.warmup) {
      this._prepareStep();
      return;
    }

    if (this.isCircuit && current && next.round !== current.round) {
      this._setState({ stage: STAGE.ROUND_REST });
      this._runCountdown(this.roundRestSeconds, () => this._prepareStep());
    } else if (this.isCircuit) {
      this._setState({ stage: STAGE.STATION_REST });
      this._runCountdown(this.stationRestSeconds, () => this._prepareStep());
    } else {
      this._setState({ stage: STAGE.SET_REST });
      this._runCountdown(this.restSeconds, () => this._prepareStep());
    }
  }

  skip() {
    clearInterval(this._timer);
    const step = this.currentStep;
    if (step && !step.warmup) this.onLogSet(step.exercise.code, 0, this.state.totalSets, true);
    this._advance();
  }

  skipWarmup() {
    clearInterval(this._timer);
    const firstMain = this.steps.findIndex(st => !st.warmup);
    if (firstMain <= 0) return;
    this._setState({ stepIndex: firstMain });
    this._prepareStep();
  }

  swap(newExercise) {
    clearInterval(this._timer);
    const step = this.currentStep;
    if (!step || step.warmup) return;
    this.steps[this.state.stepIndex] = { ...step, exercise: newExercise, swappedFrom: step.exercise.code };
    this._prepareStep();
  }

  updateFeedback(patch) {
    this._setState({ feedback: { ...this.state.feedback, ...patch } });
  }

  elapsedSeconds() {
    return Math.round((Date.now() - this.startedAt) / 1000);
  }

  stop() {
    clearInterval(this._timer);
  }

  _setState(patch) {
    this.state = { ...this.state, ...patch };
    this.onStateChange(this.state);
  }
}
