// Vercel Serverless Function — trener AI (Groq, darmowy tier).
// Klucz GROQ_API_KEY trzymany po stronie serwera (env na Vercel), nigdy w kliencie.
// Klient wysyła tylko ANONIMOWY skrót dnia (bez imienia / danych osobowych) i ma
// fallback offline, więc ta funkcja nie jest krytyczna — może zawieść bez wpływu
// na działanie apki.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const GOAL_PL = {
  weight_loss: 'redukcja wagi', muscle_tone: 'ujędrnienie', mobility: 'mobilność',
  general_health: 'ogólna kondycja', endurance: 'wytrzymałość',
};
const EXP_PL = { beginner: 'początkująca', intermediate: 'średniozaawansowana', advanced: 'zaawansowana' };

const SYSTEM = [
  'Jesteś spokojnym, wspierającym trenerem personalnym w polskiej aplikacji treningowej "Nowa Ja".',
  'Piszesz JEDNO, maksymalnie DWA zdania po polsku — konkretną wskazówkę na dzisiejszy trening.',
  'Zasady:',
  '- ciepło i bez oceniania; apka jest dla osób ćwiczących w domu, często z większą masą ciała i po przerwie od sportu',
  '- odnieś się do dzisiejszego typu treningu i fazy, ewentualnie do serii lub samopoczucia po ostatnim treningu',
  '- ZERO porad medycznych, diet, obietnic wyników, emotikon i wykrzykników na siłę',
  '- forma żeńska lub bezosobowa (nie zakładaj płci na sztywno)',
  '- nie wypisuj listy ćwiczeń, nie powtarzaj liczb z kontekstu dosłownie',
  'Zwróć wyłącznie tekst wskazówki, bez cudzysłowów i etykiet.',
].join('\n');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  const key = process.env.GROQ_API_KEY;
  if (!key) { res.status(503).json({ error: 'no-key' }); return; }

  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body); } catch (e) { body = {}; }
  body = body || {};

  const cel = GOAL_PL[body.goal] || 'ogólna kondycja';
  const poziom = EXP_PL[body.experience] || 'początkująca';
  const dzien = Number(body.day) || 1;
  const dlugosc = Number(body.planDays) || 60;
  const typDnia = String(body.dayType || '').slice(0, 60);
  const faza = String(body.phaseName || '').slice(0, 40);
  const seria = Number(body.streak) || 0;
  const ukonczone = Number(body.completedCount) || 0;
  const priorytety = Array.isArray(body.focusAreas) ? body.focusAreas.slice(0, 6).join(', ') : '';
  const ograniczenia = Array.isArray(body.limitations)
    ? body.limitations.filter(l => l && l !== 'Brak ograniczeń').slice(0, 6).join(', ') : '';
  const last = body.lastSession && typeof body.lastSession === 'object' ? body.lastSession : null;
  const ostatni = last
    ? `trudność ${Number(last.difficulty) || '?'} na 5, samopoczucie ${Number(last.feeling) || '?'} na 5${last.pain && last.pain !== 'none' ? ', zgłoszono dyskomfort' : ''}`
    : 'brak danych';

  const userMsg = [
    'Kontekst na dziś (dane anonimowe):',
    `- cel: ${cel}, poziom: ${poziom}`,
    `- dzień ${dzien} z ${dlugosc}, ${faza}`,
    `- dzisiaj: ${body.rest ? 'DZIEŃ ODPOCZYNKU' : typDnia + (body.circuit ? ' (obwód stacyjny)' : '')}`,
    `- seria: ${seria} dni z rzędu, ukończone dni łącznie: ${ukonczone}`,
    `- priorytetowe partie: ${priorytety || 'brak'}`,
    `- ograniczenia ruchowe: ${ograniczenia || 'brak'}`,
    `- ostatni trening: ${ostatni}`,
    '',
    'Napisz wskazówkę na dziś.',
  ].join('\n');

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 9000);
  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 160,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMsg },
        ],
      }),
    });
    clearTimeout(to);
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      res.status(502).json({ error: 'groq', status: r.status, detail: t.slice(0, 200) });
      return;
    }
    const data = await r.json();
    let message = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
    message = message.replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 400);
    if (!message) { res.status(502).json({ error: 'empty' }); return; }
    res.status(200).json({ message: message, model: MODEL });
  } catch (e) {
    clearTimeout(to);
    res.status(504).json({ error: 'timeout', detail: String((e && e.message) || e).slice(0, 120) });
  }
};
