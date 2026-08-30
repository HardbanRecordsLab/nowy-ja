// Darmowy lektor/motywator treningu — Web Speech API (wbudowane w przeglądarkę, zero kosztów,
// działa offline na większości Androidów dzięki silnikowi TTS systemu).
const Voice = (() => {
  const K_ENABLED = 'forma60.voiceEnabled';
  const K_STYLE = 'forma60.voiceStyle'; // 'gentle' | 'tough' | 'hype'
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function isEnabled() {
    const v = localStorage.getItem(K_ENABLED);
    return v === null ? true : v === '1';
  }

  function setEnabled(on) {
    localStorage.setItem(K_ENABLED, on ? '1' : '0');
    if (!on) window.speechSynthesis?.cancel();
  }

  // Wybór głosu: najpierw znane, naturalne głosy PL, potem dowolny PL, z preferencją
  // dla głosów lokalnych (płynniejszych, działają offline).
  const PREFERRED_VOICE_HINTS = [
    'google', 'paulina', 'zosia', 'ewa', 'agnieszka', 'krzysztof', 'adam', 'natural', 'wavenet',
  ];
  function pickPolishVoice() {
    if (!supported) return null;
    const pl = window.speechSynthesis.getVoices().filter(v => v.lang?.toLowerCase().startsWith('pl'));
    if (!pl.length) return null;
    for (const hint of PREFERRED_VOICE_HINTS) {
      const hit = pl.find(v => v.name?.toLowerCase().includes(hint));
      if (hit) return hit;
    }
    return pl.find(v => v.localService) || pl[0];
  }

  // Prozodia zależna od stylu — „na maksa" mówi szybciej i wyżej, „ostry" niżej i twardziej.
  function styleProsody() {
    const s = getStyle();
    if (s === 'hype') return { rate: 1.14, pitch: 1.12 };
    if (s === 'tough') return { rate: 1.06, pitch: 0.92 };
    return { rate: 1.02, pitch: 1.0 };
  }

  let _lastSpokenAt = 0;
  function speak(text, { interrupt = true, rate, pitch } = {}) {
    if (!supported || !isEnabled() || !text) return;
    if (interrupt) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(String(text));
    utter.lang = 'pl-PL';
    const voice = pickPolishVoice();
    if (voice) utter.voice = voice;
    utter.rate = rate ?? 1.02;
    utter.pitch = pitch ?? 1.0;
    utter.volume = 1;
    _lastSpokenAt = Date.now();
    try { window.speechSynthesis.speak(utter); } catch {}
  }

  function stop() {
    if (supported) window.speechSynthesis.cancel();
  }

  // Chrome bywa: przy dłuższej ciszy syntezator „usypia" i pierwsze speak() milczy.
  // Delikatny puls utrzymuje kolejkę żywą podczas treningu.
  if (supported) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    setInterval(() => {
      if (!isEnabled()) return;
      const ss = window.speechSynthesis;
      if (ss.speaking && !ss.paused && Date.now() - _lastSpokenAt > 12000) {
        try { ss.pause(); ss.resume(); } catch {}
      }
    }, 6000);
  }

  // ---------------------------------------------------------------------------
  // Kwestie trenera — pełne pule na każdy moment treningu, w 3 stylach.
  //  gentle = ciepły, wspierający  |  tough = bez cukierkowania  |  hype = na maksa
  // ---------------------------------------------------------------------------
  // Kwestie sformułowane bezosobowo (bez końcówek rodzajowych kierowanych do słuchacza) —
  // działają tak samo dla każdego użytkownika.
  const LINES = {
    gentle: {
      start: [
        'Zaczynamy. Spokojnie, wszystko masz przygotowane.',
        'Pierwszy krok już zrobiony — po prostu tu jesteś. Ruszamy.',
        'Dziś liczy się to, że się pojawiłaś lub pojawiłeś. Reszta przyjdzie sama.',
        'To Twój czas, tylko dla Ciebie. Zaczynamy.',
        'Bez pośpiechu. Technika przed tempem. Ruszamy.',
      ],
      active: [
        'Świetnie, kontroluj każdy ruch.',
        'Oddychaj równo — wydech przy wysiłku.',
        'Czujesz pracujące mięśnie? Tak rośnie Twoja siła.',
        'Ładnie, trzymaj tę formę.',
        'Spokojnie i pewnie, dokładnie tak.',
        'Każde powtórzenie się liczy.',
        'Masz w sobie więcej siły, niż Ci się wydaje.',
        'Robisz to dla siebie — i to widać.',
      ],
      rest: [
        'Dobra robota. Złap oddech.',
        'Odpocznij, zaraz wracamy.',
        'Rozluźnij barki, napij się wody.',
        'Ta przerwa też jest częścią planu.',
        'Serce zwalnia, siła zostaje. Odpoczywaj.',
        'To była świetna seria.',
        'Kilka spokojnych oddechów i lecimy dalej.',
      ],
      last10: [
        'Ostatnie dziesięć sekund — jeszcze chwila.',
        'Utrzymaj formę do końca.',
        'Końcówka. Spokojnie dokończ.',
        'Dziesięć sekund do przerwy. Trzymaj się.',
      ],
      lastSet: [
        'Ostatnia seria tego ćwiczenia — dokończ ją porządnie.',
        'Jeszcze ta jedna i zmieniamy.',
        'Finał tego ćwiczenia. Pełne skupienie.',
      ],
      lastExercise: [
        'Ostatnie ćwiczenie. Zostaw tu resztę energii.',
        'To już finisz treningu. Jeszcze tylko to.',
        'Ostatnia prosta — meta jest blisko.',
      ],
      finish: [
        'Trening ukończony. Dziś jest w Tobie więcej siły niż wczoraj.',
        'I gotowe. Masz powód do dumy.',
        'Koniec. Twoje ciało Ci za to podziękuje.',
        'Świetna sesja. Każdy taki dzień się sumuje.',
        'Zrobione. Tak właśnie wygląda konsekwencja.',
      ],
      skip: [
        'Pomijamy. Nie szkodzi — lecimy dalej.',
        'Dobrze, następne ćwiczenie. Słuchaj swojego ciała.',
        'Okej, dalej. Ważne, że nie stajesz w miejscu.',
      ],
      restDay: [
        'Dziś dzień odpoczynku. Regeneracja jest równie ważna jak trening.',
        'Wolne. Mięśnie budują się właśnie teraz. Odpocznij dobrze.',
      ],
    },

    tough: {
      start: [
        'Bez wymówek. Zaczynamy.',
        'Przyszłaś lub przyszedłeś tu w konkretnym celu. To go zrealizuj.',
        'Nikt tego za Ciebie nie zrobi. Ruchy.',
        'Rozgrzewka skończona. Teraz robota.',
        'Ten trening się sam nie zrobi. Start.',
      ],
      active: [
        'Nie zwalniaj. Właśnie o to chodzi.',
        'Trudne? Dobrze. To znaczy, że działa.',
        'Każde odpuszczone powtórzenie to Twoja strata.',
        'Skup się. Technika, nie tempo.',
        'To jest ten moment, w którym inni odpuszczają. Ty nie.',
        'Zaciśnij zęby i rób.',
        'Zero taryfy ulgowej dla siebie.',
        'Mocniej niż wczoraj — udowodnij to teraz.',
      ],
      rest: [
        'Przerwa. Krótka. Oddychaj i wracamy.',
        'Odpocznij, ale nie rozsiadaj się.',
        'Zegar tyka. Za chwilę kolejna seria.',
        'To nie koniec, to pauza. Skup się.',
        'Napij się. Głowa dalej w grze.',
        'Dobra seria. Ale to jeszcze nie koniec.',
      ],
      last10: [
        'Ostatnie dziesięć sekund. Nie odpuszczaj teraz.',
        'Dziesięć sekund. Wyciśnij z siebie wszystko.',
        'Końcówka. Tu się nie pęka.',
        'Dziesięć. Zaciśnij i dowieź do końca.',
      ],
      lastSet: [
        'Ostatnia seria. Żadnego odpuszczania.',
        'Ta jedna decyduje. Dowieź ją.',
        'Finał ćwiczenia. Pełne zaangażowanie albo nic.',
      ],
      lastExercise: [
        'Ostatnie ćwiczenie. Zostaw tu wszystko.',
        'To finisz. Teraz nie ma miejsca na słabość.',
        'Ostatnia prosta. Dokończ to jak należy.',
      ],
      finish: [
        'Koniec. Zrobione, mimo że część Ciebie nie chciała.',
        'Trening dowieziony. Tak buduje się charakter.',
        'Gotowe. Jutro znowu. Bez dyskusji.',
        'Skończone. Bez odpuszczania — zapamiętaj to uczucie.',
        'Robota wykonana. Ten oddech jest zasłużony.',
      ],
      skip: [
        'Pomijasz. Zapamiętaj to i wróć do tego mocniej.',
        'Okej, dalej. Ale bez nawyku odpuszczania.',
        'Następne. Tego jednego dziś zabrakło.',
      ],
      restDay: [
        'Dzień odpoczynku. Obowiązkowy — nie pomijaj go.',
        'Wolne. Regeneracja to nie lenistwo, to część planu. Odpocznij.',
      ],
    },

    hype: {
      start: [
        'No to jedziemy! Dziś rozkładamy ten trening na łopatki!',
        'Startujemy na maksa! Pokaż, na co Cię stać!',
        'To jest TWÓJ dzień! Wchodzimy w to z pełnym gazem!',
        'Rozgrzani? Bo ja tak! Lecimy z tym!',
        'Pełna moc od pierwszej sekundy! Zaczynamy!',
      ],
      active: [
        'Tak! Dokładnie tak! Nie zatrzymuj się!',
        'Ale jazda! Czujesz tę moc?!',
        'Miażdżysz to! Jeszcze! Jeszcze!',
        'To jest to! Dawaj z tym do końca!',
        'Ogień! Każde powtórzenie to level wyżej!',
        'Rośniesz w siłę z każdą sekundą! Widzę to!',
        'Nie ma mocnych! Jesteś maszyną!',
        'Gaz do dechy — o to właśnie chodzi!',
      ],
      rest: [
        'Boom! Seria rozbita! Łap oddech!',
        'Ale wynik! Krótka pauza i wracamy po więcej!',
        'Odpoczynek zasłużony w stu procentach! Woda, oddech, reset!',
        'To była petarda! Ładujemy baterie na kolejną!',
        'Serce wali, uśmiech na twarzy — o to chodzi!',
        'Chwila oddechu i znowu rozkładamy to na czynniki pierwsze!',
      ],
      last10: [
        'Ostatnie dziesięć! Wszystko co masz — TERAZ!',
        'Dziesięć sekund do chwały! Nie odpuszczaj!',
        'Końcówka! Zostaw tu każdą kroplę energii!',
        'Dziesięć! Dziewięć! Trzymaj to! Dajesz!',
      ],
      lastSet: [
        'Ostatnia seria! Zostaw serce na macie!',
        'Ta jedna, ostatnia — zrób z niej najlepszą!',
        'Finał ćwiczenia! Pełny gaz, zero hamulców!',
      ],
      lastExercise: [
        'OSTATNIE ćwiczenie! Wszystko co zostało — wrzuć tutaj!',
        'To finisz treningu! Zakończ to z hukiem!',
        'Ostatnia prosta i meta! Sprint do końca!',
      ],
      finish: [
        'I KONIEC! Ten trening rozłożony na łopatki! Legenda!',
        'Meta! Zrobione na maksa — czas na dumę!',
        'Klapa! Kolejny dzień, kolejne zwycięstwo! Tak się to robi!',
        'Trening zmiażdżony! Jutro wracamy po więcej!',
        'BOOM! Zrobione! Zapamiętaj to uczucie — jesteś nie do zatrzymania!',
      ],
      skip: [
        'Pomijamy i pędzimy dalej! Tempa nie tracimy!',
        'Okej, następne! Głowa do góry, jedziemy!',
        'Dalej, dalej! Ważne, że koło się kręci!',
      ],
      restDay: [
        'Dziś regeneracja — i to też jest trening! Odpocznij jak mistrz!',
        'Dzień wolny! Ciało buduje siłę właśnie teraz. Ładuj baterie na maksa!',
      ],
    },
  };

  function getStyle() {
    const s = localStorage.getItem(K_STYLE);
    return s === 'tough' || s === 'hype' ? s : 'gentle';
  }
  function setStyle(style) {
    localStorage.setItem(K_STYLE, ['gentle', 'tough', 'hype'].includes(style) ? style : 'gentle');
  }

  const _recent = [];
  function pick(pool) {
    if (!pool || !pool.length) return '';
    // unikaj powtórzenia ostatnich 4 kwestii
    let choice, guard = 0;
    do { choice = pool[Math.floor(Math.random() * pool.length)]; guard++; }
    while (_recent.includes(choice) && guard < 12);
    _recent.push(choice);
    if (_recent.length > 4) _recent.shift();
    return choice;
  }

  // Zwraca tekst kwestii dla danego momentu ('start' | 'active' | 'rest' | 'last10' |
  // 'lastSet' | 'lastExercise' | 'finish' | 'skip' | 'restDay').
  function line(moment) {
    const styleLines = LINES[getStyle()] || LINES.gentle;
    return pick(styleLines[moment] || LINES.gentle[moment] || []);
  }

  // Wypowiada kwestię danego momentu z prozodią właściwą dla stylu.
  function motivate(moment, { prefix = '', interrupt = true } = {}) {
    const text = line(moment);
    if (!text) return;
    speak(`${prefix} ${text}`.trim(), { interrupt, ...styleProsody() });
  }

  // Zgodność wstecz — dawny losowy tekst motywacyjny (używa puli 'rest').
  function randomMotivation() {
    return line('rest');
  }

  const STYLE_LABELS = { gentle: 'Łagodny', tough: 'Ostry', hype: 'Na maksa 🔥' };

  return {
    supported, isEnabled, setEnabled, speak, stop,
    line, motivate, randomMotivation, styleProsody,
    getStyle, setStyle, STYLE_LABELS,
  };
})();
