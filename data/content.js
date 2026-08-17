// Statyczna treść programu 60-dniowego + algorytm generowania harmonogramu.
// Źródło: Program_60_dni.docx

const DAY_CYCLE = ['A', 'B', 'C', 'D', 'E', 'F', 'R'];

const DAY_TYPES = {
  A: {
    name: 'Brzuch + Biodra',
    muscles: 'Brzuch, biodra',
    variants: { 1: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'], 2: ['A7', 'A8', 'A9', 'A5', 'A6'] }
  },
  B: {
    name: 'Uda + Pośladki',
    muscles: 'Uda, pośladki, łydki',
    variants: { 1: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'], 2: ['B8', 'B9', 'B10', 'B11', 'B12'] }
  },
  C: {
    name: 'Klatka + Ramiona',
    muscles: 'Klatka piersiowa, ramiona, barki',
    variants: { 1: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'], 2: ['C8', 'C9', 'C10', 'C11', 'C12'] }
  },
  D: {
    name: 'Aktywność / mobilność',
    muscles: 'Cały organizm (mobilność, krążenie)',
    variants: { 1: ['D1', 'D2', 'D3', 'D4', 'D5'] }
  },
  E: {
    name: 'Całe ciało (obwód stacyjny)',
    muscles: 'Wszystkie priorytetowe partie',
    circuit: true,
    variants: {
      1: { stations: ['B1', 'C2', 'A2', 'B4', 'C4', 'A6'] },
      2: { stations: ['B9', 'C8', 'A7', 'B11', 'C10', 'D5'] }
    },
    rounds: { 1: '2', 2: '3', 3: '3', 4: '4' }
  },
  F: {
    name: 'Priorytet: Uda + Pośladki + Brzuch',
    muscles: 'Uda, pośladki, brzuch',
    circuit: true,
    variants: {
      1: { stations: ['B1', 'B4', 'B2', 'A2', 'B5', 'A1'] },
      2: { stations: ['B9', 'B11', 'B10', 'A7', 'B12', 'A8'] }
    },
    rounds: { 1: '2', 2: '2-3', 3: '3', 4: '3-4' }
  },
  R: {
    name: 'Odpoczynek',
    muscles: 'Regeneracja',
    rest: true
  }
};

const PHASES = [
  { id: 1, name: 'Faza 1: Adaptacja', range: [1, 15], goal: 'Nauka poprawnej techniki, oswojenie z ruchem', scheme: '2 serie, dolny zakres powtórzeń', restBetween: '45-60 s', notes: 'Priorytet to technika i oddech, nie tempo ani ciężar.' },
  { id: 2, name: 'Faza 2: Budowa', range: [16, 30], goal: 'Budowa wytrzymałości mięśniowej', scheme: '3 serie, środkowy zakres powtórzeń', restBetween: '45-60 s', notes: 'Marsz (D1) można wydłużać co kilka dni, jeśli samopoczucie na to pozwala.' },
  { id: 3, name: 'Faza 3: Wzmocnienie', range: [31, 45], goal: 'Zwiększenie siły funkcjonalnej i stabilizacji', scheme: '3 serie, górny zakres powtórzeń, wolniejsze tempo', restBetween: '30-45 s', notes: 'Dodaj 1-2 sekundowe przytrzymanie w punkcie szczytowym ruchu. Dni E/F i połowa dni A/B/C przechodzą na Zestaw/Wariant 2.' },
  { id: 4, name: 'Faza 4: Intensyfikacja', range: [46, 60], goal: 'Utrwalenie nawyku, maksymalna bezpieczna objętość', scheme: '3-4 serie, górny zakres, forma obwodowa w dniach E/F', restBetween: '30-45 s', notes: 'Dni E i F stają się głównym testem wytrzymałości całego ciała (Wariant 2).' }
];

function phaseForDay(day) {
  return PHASES.find(p => day >= p.range[0] && day <= p.range[1]) || PHASES[PHASES.length - 1];
}

// Zwraca pełny opis danego dnia (1-60): typ, faza, zestaw/wariant, ćwiczenia.
function getDayInfo(day) {
  const type = DAY_CYCLE[(day - 1) % 7];
  const phase = phaseForDay(day);
  let occurrence = 0;
  for (let d = 1; d <= day; d++) {
    if (DAY_CYCLE[(d - 1) % 7] === type) occurrence++;
  }
  const zestaw = occurrence % 2 === 1 ? 1 : 2;
  const def = DAY_TYPES[type];
  const info = { day, type, typeName: def.name, muscles: def.muscles, phase: phase.id, phaseName: phase.name, rest: !!def.rest, circuit: !!def.circuit };

  if (def.rest) return info;

  if (def.circuit) {
    const variant = phase.id <= 2 ? 1 : 2;
    info.variant = variant;
    info.stations = def.variants[variant].stations;
    info.rounds = def.rounds[phase.id];
  } else {
    const variant = def.variants[2] ? zestaw : 1;
    info.variant = variant;
    info.exercises = def.variants[variant];
  }
  return info;
}

const EQUIPMENT = [
  'Mata do ćwiczeń lub gruby dywan / ręcznik',
  'Stabilne krzesło bez kółek (do przysiadów, pompek, tricepsów)',
  'Wolna ściana (do pompek od ściany i przysiadu izometrycznego)',
  '1-2 butelki wody (0,5-1,5 l) lub lekkie hantle — jako obciążenie do ramion i klatki piersiowej',
  'Opcjonalnie: taśma oporowa (mini-band) do ćwiczeń bioder, pośladków i barków',
  'Opcjonalnie: niski, stabilny stopień lub najniższy stopień schodów (do step-upów)',
  'Wygodne obuwie sportowe z amortyzacją',
  'Woda do picia i ręcznik'
];

const RULES = [
  'Zawsze wykonuj rozgrzewkę (5-8 min) przed treningiem.',
  'Zasada bólu: dyskomfort mięśniowy (pieczenie, zmęczenie) jest normalny. Ostry ból stawu, kolana lub pleców = natychmiast przerwij ćwiczenie.',
  'Oddychaj płynnie — wydech przy wysiłku, wdech przy powrocie. Nigdy nie wstrzymuj oddechu.',
  'Pij wodę małymi łykami w trakcie treningu.',
  'Zwiększaj liczbę powtórzeń/serii tylko wtedy, gdy obecny poziom wykonujesz bez utraty techniki.',
  'Jeśli dany dzień jest zbyt trudny, wykonaj łatwiejszy wariant (mniej powtórzeń, krótszy czas) — lepiej ukończyć bezpiecznie niż przerwać z bólem.',
  'Dzień oznaczony literą R (odpoczynek) jest obowiązkowy — nie pomijaj go.',
  'W dniach typu D (aktywność/mobilność) priorytetem jest ruch bez obciążenia: spacer, rozciąganie, mobilność stawów.'
];

const WARMUP = [
  'Marsz w miejscu — 2 min',
  'Krążenia ramion (przód i tył) — 1 min',
  'Krążenia biodrem (ćwiczenie A6) — 1 min',
  'Płytkie przysiady bez obciążenia — 1 min',
  'Delikatne skłony tułowia / „kot-wielbłąd” w klęku lub siadzie na krześle — 1 min',
  'Kilka głębokich oddechów, rozluźnienie barków — 1 min'
];

const COOLDOWN = 'Wykonaj sekwencję rozciągania opisaną jako ćwiczenie D2 („Rozciąganie całego ciała”) — 8-10 minut. Rozciągaj do uczucia delikatnego napięcia, nigdy do bólu.';

const CIRCUIT_INFO = 'Wykonaj wskazane ćwiczenia jedno po drugim w formie obwodu (stacji), z przerwą 20-30 s między stacjami i 60-90 s między pełnymi rundami. Liczba powtórzeń/czasu dla każdego ćwiczenia — zgodnie z bieżącą fazą.';

const MONITORING = {
  how: [
    'Pomiar obwodów (talia, biodra, uda, ramiona) co tydzień, tego samego dnia i o tej samej porze.',
    'Zdjęcia sylwetki co 2 tygodnie, w tym samym oświetleniu i pozycji.',
    'Krótki dziennik samopoczucia, energii i jakości snu.',
    'Test funkcjonalny na start i powtarzany co 2 tygodnie: liczba przysiadów przy krześle (B1) wykonanych poprawnie w 60 sekund.',
    'Ważenie raz w tygodniu, zawsze tego samego dnia rano.'
  ],
  stop: [
    'Ostry ból stawu (kolano, biodro, bark) niezwiązany ze zwykłym zmęczeniem mięśni.',
    'Ból lub ucisk w klatce piersiowej.',
    'Duszność nieproporcjonalna do wykonywanego wysiłku.',
    'Zawroty głowy, mroczki przed oczami.',
    'Obrzęk lub „przegrzanie” stawu po treningu utrzymujące się dłużej niż dzień.'
  ],
  diet: 'Program skupia się na aktywności ruchowej. Efekty w postaci redukcji obwodów i poprawy sylwetki będą znacząco wzmocnione przez zbilansowaną dietę z odpowiednio dobranym deficytem kalorycznym — to wykracza poza zakres tego planu i najlepiej ustalić to indywidualnie z lekarzem lub dietetykiem.'
};

const SAFETY_NOTE = 'Przy większej masie ciała zdecydowanie zalecana jest konsultacja lekarska (badanie ogólne, ocena wydolności serca i układu oddechowego oraz stanu stawów) przed rozpoczęciem programu, a najlepiej także kilka sesji z fizjoterapeutą lub trenerem, aby ocenić technikę i ewentualne ograniczenia (kolana, biodra, kręgosłup). Plan ma charakter ogólny, edukacyjny i nie zastępuje indywidualnej porady medycznej. W razie bólu w klatce piersiowej, duszności nieadekwatnej do wysiłku, zawrotów głowy lub ostrego bólu stawu — przerwij ćwiczenie i skonsultuj się z lekarzem.';

const PROGRAM_INTRO = 'Ten 60-dniowy plan treningowy stawia na bezpieczeństwo stawów, stopniowanie obciążenia oraz ćwiczenia możliwe do wykonania w domu przy minimalnym sprzęcie. Priorytetowe partie ciała: brzuch, uda, biodra, klatka piersiowa, ramiona i pośladki. Program jest w pełni dostosowywalny — podaj swoje parametry w profilu, a aplikacja dopasuje opis planu do Ciebie.';
