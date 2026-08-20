'use strict';

// ---------- Sprawdzian formy przez kamerę — w 100% lokalnie, na urządzeniu ----------
// Silnik: MediaPipe Tasks Vision (PoseLandmarker), uruchamiany przez WASM/GPU w przeglądarce.
// Biblioteka i model są pobierane z CDN przy pierwszym użyciu (wymaga wtedy internetu, potem
// są w pamięci podręcznej przeglądarki) — ale samo przetwarzanie obrazu z kamery dzieje się
// WYŁĄCZNIE lokalnie. Żadna klatka wideo nigdzie nie jest wysyłana ani zapisywana.
//
// Cztery tryby analizy (parametr `kind`):
// - 'squat' / 'hinge' — kalibrujemy się do pozycji stojącej użytkownika, a potem patrzymy na
//   ODCHYLENIE od tej bazy w trakcie ruchu (nie na sztywne progi kąta — różne proporcje ciała
//   dają różne "normalne" kąty). Przy okazji liczymy powtórzenia z oscylacji wysokości bioder
//   i porównujemy formę pierwszych i ostatnich powtórzeń w serii (wykrywanie zmęczenia formy).
// - 'plank' / 'pushup' — czysto geometryczny test (biodro powinno leżeć na prostej ramię-kostka),
//   bez kalibracji, bo "prosta linia ciała" jest kryterium niezależnym od proporcji użytkownika.
//   Ta sama matematyka dla obu — różnica jest tylko w tym, jak app.js prezentuje wynik (deska:
//   licznik czasu trzymania; pompki: bez licznika, bo to ćwiczenie na powtórzenia, nie hold).
// - 'wall-sit' — hold w ugięciu bez ruchu od stania: referencja głębokości ustalana raz po
//   wejściu w pozycję, dalej pilnowana stabilność (nie zjeżdżanie/prostowanie nóg).
//
// To orientacyjna pomoc/wskazówka, NIE ocena eksperta — uzupełnia, a nie zastępuje, pisemnych
// wskazówek bezpieczeństwa przy każdym ćwiczeniu.
const PoseCheck = (() => {
  const CDN_JS = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs';
  const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

  // Indeksy punktów szkieletu BlazePose (33 punkty) używane do analizy sylwetki z boku.
  const IDX = { LSH: 11, RSH: 12, LHIP: 23, RHIP: 24, LKNEE: 25, RKNEE: 26, LANK: 27, RANK: 28 };
  const SKELETON_PAIRS = [[11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [11, 13], [13, 15], [12, 14], [14, 16]];
  const MIN_DETECT_INTERVAL_MS = 120; // ~8 analiz/s wystarcza do oceny formy, oszczędza baterię
  const DOWN_THRESHOLD = 0.9; // próg opuszczenia bioder (znorm. szerokością bioder) uznawany za "dół" powtórzenia
  const UP_THRESHOLD = 0.35;  // powrót poniżej tego progu = koniec powtórzenia

  let landmarker = null;
  let loadingPromise = null;
  let stream = null;
  let rafId = null;
  let videoEl = null;
  let canvasEl = null;
  let lastDetectAt = 0;
  let running = false;
  let calibrating = false;
  let baseline = null; // { torsoLean, kneeOffset, hipY, hipWidth }
  let recentSamples = [];
  let lastSpokenAt = 0;
  let lastSpokenState = null;
  let holdStartAt = 0;
  let lastHoldAnnounceSec = 0;
  let wallSitRef = null; // { hipY, hipWidth } — referencja głębokości przysiadu przy ścianie, ustalana raz na starcie hold-u

  // Stan liczenia powtórzeń + wykrywania zmęczenia formy (tylko 'squat'/'hinge')
  let repPhase = 'up';
  let repCount = 0;
  let repPeak = null; // { torso, knee } — najgorsze odchylenie w trakcie bieżącego "dołu"
  let repHistory = [];
  let fatigueWarned = false;

  function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.WebAssembly);
  }

  function isRunning() { return running; }

  function vibrate(pattern) {
    try { navigator.vibrate?.(pattern); } catch {}
  }

  async function ensureLandmarker() {
    if (landmarker) return landmarker;
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      const { PoseLandmarker, FilesetResolver } = await import(CDN_JS);
      const vision = await FilesetResolver.forVisionTasks(CDN_WASM);
      const baseOptions = { modelAssetPath: MODEL_URL, delegate: 'GPU' };
      try {
        landmarker = await PoseLandmarker.createFromOptions(vision, { baseOptions, runningMode: 'VIDEO', numPoses: 1 });
      } catch {
        // Niektóre urządzenia/przeglądarki nie obsługują delegata GPU dla WASM — spróbuj CPU.
        landmarker = await PoseLandmarker.createFromOptions(vision, { baseOptions: { ...baseOptions, delegate: 'CPU' }, runningMode: 'VIDEO', numPoses: 1 });
      }
      return landmarker;
    })();
    return loadingPromise;
  }

  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  function torsoLeanDeg(shoulder, hip) {
    const dx = shoulder.x - hip.x, dy = shoulder.y - hip.y;
    return Math.atan2(Math.abs(dx), Math.abs(dy)) * 180 / Math.PI;
  }

  // Odchylenie biodra od prostej ramię-kostka, liczone WYŁĄCZNIE na osi pionowej (y rośnie w dół
  // w układzie obrazu) — dzięki temu wynik nie zależy od tego, czy osoba stoi bokiem w lewo czy
  // w prawo. Dodatnie = biodro NIŻEJ niż linia prosta (zapadanie), ujemne = WYŻEJ ("górka").
  function plankHipDeviation(shoulder, hip, ankle, segLen) {
    if (Math.abs(ankle.x - shoulder.x) < 1e-4) return 0;
    const t = (hip.x - shoulder.x) / (ankle.x - shoulder.x);
    const expectedY = shoulder.y + t * (ankle.y - shoulder.y);
    return (hip.y - expectedY) / segLen;
  }

  function readSample(landmarks) {
    const need = [IDX.LSH, IDX.RSH, IDX.LHIP, IDX.RHIP, IDX.LKNEE, IDX.RKNEE, IDX.LANK, IDX.RANK];
    if (need.some(i => !landmarks[i] || (landmarks[i].visibility ?? 1) < 0.5)) return null;
    const shoulder = mid(landmarks[IDX.LSH], landmarks[IDX.RSH]);
    const hip = mid(landmarks[IDX.LHIP], landmarks[IDX.RHIP]);
    const knee = mid(landmarks[IDX.LKNEE], landmarks[IDX.RKNEE]);
    const ankle = mid(landmarks[IDX.LANK], landmarks[IDX.RANK]);
    const hipWidth = Math.hypot(
      landmarks[IDX.LHIP].x - landmarks[IDX.RHIP].x,
      landmarks[IDX.LHIP].y - landmarks[IDX.RHIP].y
    ) || 0.08;
    const segLen = Math.hypot(ankle.x - shoulder.x, ankle.y - shoulder.y) || 0.3;
    return {
      torsoLean: torsoLeanDeg(shoulder, hip),
      kneeOffset: (knee.x - ankle.x) / hipWidth,
      hipY: hip.y,
      hipWidth,
      plankDeviation: plankHipDeviation(shoulder, hip, ankle, segLen),
    };
  }

  function drawOverlay(landmarks) {
    if (!canvasEl || !videoEl) return;
    const w = videoEl.videoWidth || canvasEl.width || 480;
    const h = videoEl.videoHeight || canvasEl.height || 640;
    if (canvasEl.width !== w) canvasEl.width = w;
    if (canvasEl.height !== h) canvasEl.height = h;
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    if (!landmarks) return;
    ctx.strokeStyle = '#9AC94A';
    ctx.lineWidth = Math.max(2, w * 0.006);
    SKELETON_PAIRS.forEach(([a, b]) => {
      if (!landmarks[a] || !landmarks[b]) return;
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
      ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
      ctx.stroke();
    });
    ctx.fillStyle = '#E8636E';
    [IDX.LSH, IDX.RSH, IDX.LHIP, IDX.RHIP, IDX.LKNEE, IDX.RKNEE, IDX.LANK, IDX.RANK].forEach(i => {
      if (!landmarks[i]) return;
      ctx.beginPath();
      ctx.arc(landmarks[i].x * w, landmarks[i].y * h, Math.max(3, w * 0.012), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function speakThrottled(text, state, onSpeak, minGapMs = 6000) {
    const nowMs = Date.now();
    if (!onSpeak || (state === lastSpokenState && nowMs - lastSpokenAt < minGapMs)) return;
    lastSpokenState = state;
    lastSpokenAt = nowMs;
    onSpeak(text);
  }

  function analyzePlankFrame(kind, sample, onStatus, onSpeak) {
    recentSamples.push(sample);
    if (recentSamples.length > 8) recentSamples.shift();
    if (recentSamples.length < 5) return;

    const avgDev = recentSamples.reduce((s, x) => s + x.plankDeviation, 0) / recentSamples.length;
    const holdSeconds = Math.floor((Date.now() - holdStartAt) / 1000);
    let issue = null;
    if (avgDev > 0.09) issue = 'sag';
    else if (avgDev < -0.09) issue = 'pike';

    onStatus({ phase: 'analyzing', ok: !issue, issues: issue ? [issue] : [], holdSeconds });

    if (issue === 'sag') speakThrottled('Biodra opadają — unieś je odrobinę, napnij brzuch.', 'sag', onSpeak);
    else if (issue === 'pike') speakThrottled('Biodra są za wysoko — opuść je do linii prostej.', 'pike', onSpeak);
    else if (kind === 'plank' && holdSeconds > 0 && holdSeconds % 15 === 0 && holdSeconds !== lastHoldAnnounceSec) {
      // Ogłaszanie upływu czasu ma sens tylko dla prawdziwego hold-u (deska) — pompki to
      // ćwiczenie na powtórzenia, więc dla kind==='pushup' pomijamy ten komunikat.
      lastHoldAnnounceSec = holdSeconds;
      speakThrottled(`${holdSeconds} sekund, dobra forma.`, 'ok-' + holdSeconds, onSpeak, 0);
    }
  }

  // Przysiad izometryczny przy ścianie — bez kalibracji do pozycji stojącej (to hold w ugięciu
  // z założenia, nie ruch od stania). Referencja głębokości jest ustalana raz, na podstawie
  // pierwszych stabilnych klatek po wejściu w pozycję — dalej pilnujemy, czy biodro nie
  // "zjeżdża" niżej ani nie "prostuje się" wyżej od tej referencji.
  function analyzeWallSitFrame(sample, onStatus, onSpeak) {
    recentSamples.push(sample);
    if (recentSamples.length > 8) recentSamples.shift();
    if (recentSamples.length < 5) return;

    if (!wallSitRef) {
      wallSitRef = {
        hipY: recentSamples.reduce((s, x) => s + x.hipY, 0) / recentSamples.length,
        hipWidth: recentSamples.reduce((s, x) => s + x.hipWidth, 0) / recentSamples.length,
      };
      holdStartAt = Date.now();
      return;
    }

    const avgHipY = recentSamples.reduce((s, x) => s + x.hipY, 0) / recentSamples.length;
    const drift = (avgHipY - wallSitRef.hipY) / wallSitRef.hipWidth;
    const holdSeconds = Math.floor((Date.now() - holdStartAt) / 1000);

    let issue = null;
    if (drift > 0.3) issue = 'sliding_down';
    else if (drift < -0.3) issue = 'straightening';

    onStatus({ phase: 'analyzing', ok: !issue, issues: issue ? [issue] : [], holdSeconds });

    if (issue === 'sliding_down') speakThrottled('Zjeżdżasz w dół po ścianie — wróć do wyjściowej głębokości przysiadu.', 'sliding_down', onSpeak);
    else if (issue === 'straightening') speakThrottled('Prostujesz nogi — wróć do głębszej pozycji.', 'straightening', onSpeak);
    else if (holdSeconds > 0 && holdSeconds % 15 === 0 && holdSeconds !== lastHoldAnnounceSec) {
      lastHoldAnnounceSec = holdSeconds;
      speakThrottled(`${holdSeconds} sekund, dobra pozycja.`, 'ok-' + holdSeconds, onSpeak, 0);
    }
  }

  function analyzeSquatFrame(kind, sample, onStatus, onSpeak) {
    recentSamples.push(sample);
    if (recentSamples.length > 10) recentSamples.shift();
    if (recentSamples.length < 6) return;

    const avgTorso = recentSamples.reduce((s, x) => s + x.torsoLean, 0) / recentSamples.length;
    const avgKnee = recentSamples.reduce((s, x) => s + x.kneeOffset, 0) / recentSamples.length;
    const avgHipY = recentSamples.reduce((s, x) => s + x.hipY, 0) / recentSamples.length;
    const avgHipWidth = recentSamples.reduce((s, x) => s + x.hipWidth, 0) / recentSamples.length;
    const torsoDelta = avgTorso - baseline.torsoLean;
    const kneeDelta = Math.abs(avgKnee - baseline.kneeOffset);
    const hipDrop = (avgHipY - baseline.hipY) / avgHipWidth;

    const issues = [];
    if (kind === 'squat' && torsoDelta > 35) issues.push('back');
    if (kind === 'hinge' && torsoDelta < 15) issues.push('hinge_shallow');
    if (kneeDelta > 0.55) issues.push('knee');

    // Licznik powtórzeń: prosty automat stanów na podstawie oscylacji wysokości bioder.
    if (repPhase === 'up' && hipDrop > DOWN_THRESHOLD) {
      repPhase = 'down';
      repPeak = { torso: torsoDelta, knee: kneeDelta };
    } else if (repPhase === 'down') {
      if (repPeak) {
        repPeak.torso = Math.max(repPeak.torso, torsoDelta);
        repPeak.knee = Math.max(repPeak.knee, kneeDelta);
      }
      if (hipDrop < UP_THRESHOLD) {
        repPhase = 'up';
        repCount++;
        vibrate(30);
        if (repPeak) repHistory.push(repPeak);
        repPeak = null;

        if (repCount > 0 && repCount % 5 === 0) {
          speakThrottled(`${repCount} powtórzeń.`, 'rep-' + repCount, onSpeak, 0);
        }
        if (!fatigueWarned && repHistory.length >= 4) {
          const early = repHistory.slice(0, 2);
          const earlyTorso = early.reduce((s, x) => s + x.torso, 0) / early.length;
          const earlyKnee = early.reduce((s, x) => s + x.knee, 0) / early.length;
          const latest = repHistory[repHistory.length - 1];
          if (latest.torso > earlyTorso + 15 || latest.knee > earlyKnee + 0.3) {
            fatigueWarned = true;
            speakThrottled('Widać, że forma zaczyna się pogarszać — rozważ krótszą przerwę albo koniec tej serii.', 'fatigue', onSpeak, 0);
          }
        }
      }
    }

    onStatus({ phase: 'analyzing', ok: !issues.length, issues, repCount });

    const state = issues.length ? issues.join('+') : 'ok';
    if (issues.includes('back')) speakThrottled('Zwróć uwagę na plecy — spróbuj trzymać tułów bardziej pionowo.', state, onSpeak);
    else if (issues.includes('hinge_shallow')) speakThrottled('Pochyl się bardziej w biodrach, żeby poczuć pracę tylnej taśmy.', state, onSpeak);
    else if (issues.includes('knee')) speakThrottled('Sprawdź kolana — nie powinny mocno wychodzić przed linię stóp.', state, onSpeak);
  }

  function loop(kind, onStatus, onSpeak) {
    if (!running) return;
    rafId = requestAnimationFrame(() => loop(kind, onStatus, onSpeak));
    const now = performance.now();
    if (now - lastDetectAt < MIN_DETECT_INTERVAL_MS) return;
    if (!videoEl || videoEl.readyState < 2) return;
    lastDetectAt = now;

    let result;
    try { result = landmarker.detectForVideo(videoEl, now); }
    catch { return; }

    const landmarks = result?.landmarks?.[0] || null;
    drawOverlay(landmarks);
    const sample = landmarks ? readSample(landmarks) : null;

    if (kind === 'plank' || kind === 'pushup') {
      // Ten sam geometryczny test (biodro na prostej ramię-kostka) działa identycznie w ruchu
      // (pompki) jak w bezruchu (deska) — różni się tylko to, jak app.js prezentuje wynik
      // (deska: czas trzymania; pompki: bez licznika czasu, bo to ćwiczenie na powtórzenia).
      if (!sample) { onStatus({ phase: 'tracking-lost' }); return; }
      analyzePlankFrame(kind, sample, onStatus, onSpeak);
      return;
    }
    if (kind === 'wall-sit') {
      if (!sample) { onStatus({ phase: 'tracking-lost' }); return; }
      analyzeWallSitFrame(sample, onStatus, onSpeak);
      return;
    }

    if (calibrating) {
      if (sample) recentSamples.push(sample);
      return;
    }
    if (!baseline) return;
    if (!sample) { onStatus({ phase: 'tracking-lost' }); return; }
    analyzeSquatFrame(kind, sample, onStatus, onSpeak);
  }

  async function start({ video, canvas, kind, onStatus, onSpeak }) {
    onStatus = onStatus || (() => {});
    if (running) stop();
    videoEl = video; canvasEl = canvas;
    baseline = null; recentSamples = []; calibrating = false;
    lastSpokenState = null; lastSpokenAt = 0;
    repPhase = 'up'; repCount = 0; repPeak = null; repHistory = []; fatigueWarned = false;
    holdStartAt = 0; lastHoldAnnounceSec = 0; wallSitRef = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch {
      onStatus({ phase: 'error', message: 'Brak dostępu do kamery — sprawdź uprawnienia w przeglądarce i spróbuj ponownie.' });
      return;
    }
    videoEl.srcObject = stream;
    await videoEl.play().catch(() => {});

    try {
      await ensureLandmarker();
    } catch {
      onStatus({ phase: 'error', message: 'Nie udało się pobrać modelu analizy — sprawdź połączenie z internetem i spróbuj ponownie.' });
      stopStream();
      return;
    }

    running = true;
    if (kind === 'plank' || kind === 'pushup') holdStartAt = Date.now();
    onStatus({ phase: 'ready' });
    loop(kind, onStatus, onSpeak);
  }

  // Kalibracja pozycji stojącej — tylko dla 'squat'/'hinge'. Dla 'plank' analiza geometryczna
  // nie wymaga kalibracji (prosta linia ciała to kryterium niezależne od proporcji użytkownika).
  function calibrate(durationMs = 2500) {
    return new Promise(resolve => {
      calibrating = true;
      recentSamples = [];
      setTimeout(() => {
        calibrating = false;
        if (recentSamples.length >= 3) {
          baseline = {
            torsoLean: recentSamples.reduce((s, x) => s + x.torsoLean, 0) / recentSamples.length,
            kneeOffset: recentSamples.reduce((s, x) => s + x.kneeOffset, 0) / recentSamples.length,
            hipY: recentSamples.reduce((s, x) => s + x.hipY, 0) / recentSamples.length,
          };
          recentSamples = [];
          resolve(true);
        } else {
          resolve(false);
        }
      }, durationMs);
    });
  }

  function stopStream() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (videoEl) videoEl.srcObject = null;
  }

  function stop() {
    running = false;
    calibrating = false;
    baseline = null;
    recentSamples = [];
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    stopStream();
  }

  return { isSupported, isRunning, start, stop, calibrate };
})();
