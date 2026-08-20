'use strict';

// ---------- Sprawdzian formy przez kamerę — w 100% lokalnie, na urządzeniu ----------
// Silnik: MediaPipe Tasks Vision (PoseLandmarker), uruchamiany przez WASM/GPU w przeglądarce.
// Biblioteka i model są pobierane z CDN przy pierwszym użyciu (wymaga wtedy internetu, potem
// są w pamięci podręcznej przeglądarki) — ale samo przetwarzanie obrazu z kamery dzieje się
// WYŁĄCZNIE lokalnie. Żadna klatka wideo nigdzie nie jest wysyłana ani zapisywana.
//
// Metoda: zamiast sztywnych progów kąta (różne proporcje ciała = różne "normalne" kąty),
// kalibrujemy się do pozycji stojącej użytkownika, a potem patrzymy na ODCHYLENIE od tej
// bazy w trakcie ruchu. To orientacyjna pomoc/wskazówka, NIE ocena eksperta — uzupełnia,
// a nie zastępuje, pisemnych wskazówek bezpieczeństwa przy każdym ćwiczeniu.
const PoseCheck = (() => {
  const CDN_JS = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs';
  const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

  // Indeksy punktów szkieletu BlazePose (33 punkty) używane do analizy sylwetki z boku.
  const IDX = { LSH: 11, RSH: 12, LHIP: 23, RHIP: 24, LKNEE: 25, RKNEE: 26, LANK: 27, RANK: 28 };
  const SKELETON_PAIRS = [[11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [11, 13], [13, 15], [12, 14], [14, 16]];
  const MIN_DETECT_INTERVAL_MS = 120; // ~8 analiz/s wystarcza do oceny formy, oszczędza baterię

  let landmarker = null;
  let loadingPromise = null;
  let stream = null;
  let rafId = null;
  let videoEl = null;
  let canvasEl = null;
  let lastDetectAt = 0;
  let running = false;
  let calibrating = false;
  let baseline = null; // { torsoLean, kneeOffset }
  let recentSamples = [];
  let lastSpokenAt = 0;
  let lastSpokenState = null;

  function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.WebAssembly);
  }

  function isRunning() { return running; }

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
    return { torsoLean: torsoLeanDeg(shoulder, hip), kneeOffset: (knee.x - ankle.x) / hipWidth };
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

    if (calibrating) {
      if (sample) recentSamples.push(sample);
      return;
    }
    if (!baseline) return;
    if (!sample) { onStatus({ phase: 'tracking-lost' }); return; }

    recentSamples.push(sample);
    if (recentSamples.length > 10) recentSamples.shift();
    if (recentSamples.length < 6) return;

    const avgTorso = recentSamples.reduce((s, x) => s + x.torsoLean, 0) / recentSamples.length;
    const avgKnee = recentSamples.reduce((s, x) => s + x.kneeOffset, 0) / recentSamples.length;
    const torsoDelta = avgTorso - baseline.torsoLean;
    const kneeDelta = Math.abs(avgKnee - baseline.kneeOffset);

    const issues = [];
    if (kind === 'squat' && torsoDelta > 35) issues.push('back');
    if (kind === 'hinge' && torsoDelta < 15) issues.push('hinge_shallow');
    if (kneeDelta > 0.55) issues.push('knee');

    onStatus({ phase: 'analyzing', ok: !issues.length, issues });

    const state = issues.length ? issues.join('+') : 'ok';
    const nowMs = Date.now();
    if (onSpeak && (state !== lastSpokenState || nowMs - lastSpokenAt > 6000)) {
      lastSpokenState = state;
      lastSpokenAt = nowMs;
      if (issues.includes('back')) onSpeak('Zwróć uwagę na plecy — spróbuj trzymać tułów bardziej pionowo.');
      else if (issues.includes('hinge_shallow')) onSpeak('Pochyl się bardziej w biodrach, żeby poczuć pracę tylnej taśmy.');
      else if (issues.includes('knee')) onSpeak('Sprawdź kolana — nie powinny mocno wychodzić przed linię stóp.');
      else onSpeak('Dobra forma, tak trzymaj.');
    }
  }

  async function start({ video, canvas, kind, onStatus, onSpeak }) {
    onStatus = onStatus || (() => {});
    if (running) stop();
    videoEl = video; canvasEl = canvas;
    baseline = null; recentSamples = []; calibrating = false;
    lastSpokenState = null; lastSpokenAt = 0;

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
    onStatus({ phase: 'ready' });
    loop(kind, onStatus, onSpeak);
  }

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
