// Darmowa muzyka motywacyjna podczas treningu — statyczne pliki .m4a (AAC), odtwarzane
// natywnie przez <audio> (wszystkie współczesne przeglądarki), zero kosztów i zero API.
const Music = (() => {
  const K_ENABLED = 'forma60.musicEnabled';
  const K_VOLUME = 'forma60.musicVolume';
  const supported = typeof window !== 'undefined' && 'Audio' in window;

  const TRACKS = [
    { file: 'explosive-start.m4a', title: 'Explosive Start' },
    { file: 'apex-rise.m4a', title: 'Apex Rise' },
    { file: 'breakneck-pace.m4a', title: 'Breakneck Pace' },
    { file: 'brute-force.m4a', title: 'Brute Force' },
    { file: 'finish-strong.m4a', title: 'Finish Strong' },
    { file: 'incinerate.m4a', title: 'Incinerate' },
    { file: 'inferno.m4a', title: 'Inferno' },
    { file: 'iron-grind.m4a', title: 'Iron Grind' },
    { file: 'iron-vanguard.m4a', title: 'Iron Vanguard' },
    { file: 'keep-moving.m4a', title: 'Keep Moving' },
    { file: 'momentum.m4a', title: 'Momentum' },
    { file: 'momentum-2.m4a', title: 'Momentum II' },
    { file: 'one-more-rep.m4a', title: 'One More Rep' },
    { file: 'one-more.m4a', title: 'One More' },
    { file: 'overclocked.m4a', title: 'Overclocked' },
    { file: 'overdrive.m4a', title: 'Overdrive' },
    { file: 'peak-force.m4a', title: 'Peak Force' },
    { file: 'peak-velocity.m4a', title: 'Peak Velocity' },
    { file: 'peak-victory.m4a', title: 'Peak Victory' },
    { file: 'precision-drive.m4a', title: 'Precision Drive' },
    { file: 'raw-force.m4a', title: 'Raw Force' },
    { file: 'stronger.m4a', title: 'Stronger' },
    { file: 'tectonic-strike.m4a', title: 'Tectonic Strike' },
    { file: 'unstoppable.m4a', title: 'Unstoppable' },
    { file: 'victory.m4a', title: 'Victory' },
  ];

  let audioEl = null;
  let queue = [];
  let queuePos = -1;
  let onChange = () => {};

  function isEnabled() {
    return localStorage.getItem(K_ENABLED) === '1';
  }

  function setEnabled(on) {
    localStorage.setItem(K_ENABLED, on ? '1' : '0');
    if (on) resume(); else pause();
  }

  function getVolume() {
    const v = parseFloat(localStorage.getItem(K_VOLUME));
    return Number.isFinite(v) ? v : 0.5;
  }

  function setVolume(v) {
    const clamped = Math.max(0, Math.min(1, v));
    localStorage.setItem(K_VOLUME, String(clamped));
    if (audioEl) audioEl.volume = clamped;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function ensureAudio() {
    if (audioEl) return audioEl;
    audioEl = new Audio();
    audioEl.volume = getVolume();
    audioEl.addEventListener('ended', playNext);
    return audioEl;
  }

  function playAt(pos) {
    if (!supported || !TRACKS.length) return;
    queuePos = ((pos % queue.length) + queue.length) % queue.length;
    const el = ensureAudio();
    el.src = `assets/music/${queue[queuePos].file}`;
    el.play().catch(() => {});
    onChange();
  }

  function playNext() { playAt(queuePos + 1); }

  // Wywoływane z bramki gestu użytkownika (kliknięcie "Rozpocznij trening") —
  // dzięki temu play() nie zostanie zablokowane przez politykę autoplay przeglądarki.
  function startForWorkout() {
    if (!supported || !isEnabled()) return;
    queue = shuffle(TRACKS);
    playAt(0);
  }

  function resume() {
    if (!supported) return;
    if (!queue.length) { startForWorkout(); return; }
    ensureAudio().play().catch(() => {});
    onChange();
  }

  function pause() {
    if (audioEl) audioEl.pause();
    onChange();
  }

  function stop() {
    if (audioEl) { audioEl.pause(); audioEl.src = ''; }
    queue = [];
    queuePos = -1;
  }

  function next() {
    if (!isEnabled()) return;
    playNext();
  }

  function currentTitle() {
    return queuePos >= 0 && queue[queuePos] ? queue[queuePos].title : '';
  }

  function isPlaying() {
    return !!(audioEl && !audioEl.paused);
  }

  function onTrackChange(cb) { onChange = cb || (() => {}); }

  return {
    supported, isEnabled, setEnabled, getVolume, setVolume,
    startForWorkout, resume, pause, stop, next,
    currentTitle, isPlaying, onTrackChange,
  };
})();
