// Darmowy lektor/motywator treningu — Web Speech API (wbudowane w przeglądarkę, zero kosztów,
// działa offline na większości Androidów dzięki silnikowi TTS systemu).
const Voice = (() => {
  const K_ENABLED = 'forma60.voiceEnabled';
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function isEnabled() {
    const v = localStorage.getItem(K_ENABLED);
    return v === null ? true : v === '1';
  }

  function setEnabled(on) {
    localStorage.setItem(K_ENABLED, on ? '1' : '0');
    if (!on) window.speechSynthesis?.cancel();
  }

  function pickPolishVoice() {
    if (!supported) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.lang?.toLowerCase().startsWith('pl')) || null;
  }

  function speak(text, { interrupt = true } = {}) {
    if (!supported || !isEnabled() || !text) return;
    if (interrupt) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pl-PL';
    const voice = pickPolishVoice();
    if (voice) utter.voice = voice;
    utter.rate = 1.02;
    utter.pitch = 1.0;
    try { window.speechSynthesis.speak(utter); } catch {}
  }

  function stop() {
    if (supported) window.speechSynthesis.cancel();
  }

  // Some browsers load voice list asynchronously — warm it up so the first speak() has a Polish voice ready.
  if (supported) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }

  const MOTIVATION_GENTLE = [
    'Świetna robota, tak trzymaj!',
    'Dajesz radę!',
    'Czujesz to? To rośnie Twoja siła.',
    'Jeszcze trochę, nie poddawaj się!',
    'Super tempo, kontynuuj!',
    'Twoje ciało Ci za to podziękuje.',
    'Każdy trening przybliża Cię do celu.',
    'Oddychaj spokojnie i pilnuj techniki.',
    'Robisz to dla siebie — brawo!',
  ];

  // Ostrzejszy, bardziej bezpośredni styl — bez wulgaryzmów, ale bez cukierkowania.
  const MOTIVATION_TOUGH = [
    'Bez wymówek. Ruchy!',
    'Nie odpuszczaj teraz — właśnie o to chodzi.',
    'Boli? Dobrze, to znaczy że działa.',
    'Nikt tego za Ciebie nie zrobi. Dawaj.',
    'Przestań myśleć, zacznij działać.',
    'To jest ten moment, w którym inni się poddają. Ty nie.',
    'Zero taryfy ulgowej dla samego siebie.',
    'Wstałeś, więc kończ robotę.',
    'Silniejszy niż wczoraj — udowodnij to.',
  ];

  const K_STYLE = 'forma60.voiceStyle'; // 'gentle' | 'tough'
  function getStyle() { return localStorage.getItem(K_STYLE) || 'gentle'; }
  function setStyle(style) { localStorage.setItem(K_STYLE, style === 'tough' ? 'tough' : 'gentle'); }

  function randomMotivation() {
    const pool = getStyle() === 'tough' ? MOTIVATION_TOUGH : MOTIVATION_GENTLE;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return { supported, isEnabled, setEnabled, speak, stop, randomMotivation, getStyle, setStyle };
})();
