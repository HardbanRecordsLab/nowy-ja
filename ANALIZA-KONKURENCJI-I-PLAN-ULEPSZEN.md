# Nowa Ja — analiza konkurencji i plan, żeby być topową appką

## 1. Krajobraz konkurencji (2026)

| Kategoria | Kto | Co robią dobrze | Czego nie mają / robią gorzej niż my |
|---|---|---|---|
| Algorytmiczne generowanie planu | Fitbod, Load Muscle, SensAI | Plan tworzony/aktualizowany na podstawie historii i regeneracji sesja po sesji | Prawie wszystkie wymagają konta i wysyłają dane na serwer — my robimy to samo lokalnie, za darmo |
| AI coaching premium | Future (trener-człowiek + AI między sesjami), SensAI (dane z zegarka) | Realne poczucie "kogoś, kto czuwa" | Płatne (50-100$/mies.), wymagają konta i najczęściej zegarka |
| Duże biblioteki ćwiczeń | Jefit (1400+), Load Muscle (4000+) | Mnogość wariantów pod różny sprzęt | Ilość ponad jakość — my mamy 49 dobrze opisanych (kroki, bezpieczeństwo, 4 fazy), ale wciąż mniej wariantów sprzętowych niż liderzy |
| Progresja/"skill trees" | Fitloop | Wizualne drzewko umiejętności, darmowy model | Węższy zakres (tylko trening z masą ciała) |
| Gamifikacja/social | Strava (kudos), duże apki fitness | Widoczność społeczna napędza powroty (patrz sekcja 2) | Wymaga konta + backendu — sprzeczne z naszą obietnicą "bez konta, dane lokalnie" |
| Forma/technika na żywo | nowa fala AI-fitness (kamera + rozpoznawanie postawy) | Analiza formy w czasie rzeczywistym przez kamerę telefonu | Rzadkość nawet u liderów — realna szansa na przewagę (patrz 3.2) |

**Wniosek ogólny:** w kategoriach "ile ćwiczeń" i "ile funkcji AI" nie wygramy z gigantami mającymi zespoły i budżety na backend. Wygrywamy w innej kategorii: **jedyna appka, która robi to wszystko bez konta, bez wysyłania czegokolwiek na serwer, w 100% za darmo, i wciąż realnie się dostosowuje.** To trzeba wzmacniać, nie rozmywać dodawaniem kompromisów (np. "logowanie opcjonalne, żeby odblokować funkcję X").

## 2. Co pokazują dane o retencji (nie opinie, badania)

- Osoby, które zdobywają jakiekolwiek osiągnięcie **pierwszego dnia**, wracają **64% częściej** niż te, które nic nie zdobyły. → mamy odznakę za dzień 1, ale dopiero po **ukończonym** treningu. Warto dodać coś, co można "zdobyć" wcześniej (patrz 3.1).
- Serie dni (streaki) z **widocznością społeczną** mają najsilniejszy wpływ na codzienne powroty. Sama widoczność społeczna wymaga backendu — u nas realna jest tylko "prywatna" wersja streaka (już mamy), plus opcja **udostępnienia** osiągnięcia na zewnątrz (Instagram/WhatsApp) bez trzymania żadnych danych u nas.
- Mikro-interakcje (pasek wypełniający się, wibracja przy ukończonej serii) zwiększają zaangażowanie wg cytowanych badań o ok. 30%. Mamy animacje wejścia kart, nie mamy jeszcze haptyki (Vibration API — działa lokalnie, bez backendu, bardzo tani do dodania).
- Najlepsze wdrożenia onboardingu: **cel → plan → pierwszy trening w mniej niż 60 sekund**, z możliwością pominięcia większości pytań. Nasz onboarding ma 8 kroków — dobre pod względem czytelności (jedno pytanie na ekran), ale warto dodać **szybką ścieżkę** ("Pomiń, ustaw później") dla niecierpliwych, bez usuwania samych pytań dla tych, którzy chcą je wypełnić.

## 3. Plan ulepszeń — trzy poziomy wg realnego kosztu wdrożenia

### 3.1 Poziom 1 — szybkie wygrane, zero backendu, można zrobić od razu
1. **Szybka ścieżka onboardingu**: przycisk "Zacznij od razu, dostosuję później" widoczny od pierwszego kroku — tworzy profil z sensownymi wartościami domyślnymi i wrzuca od razu w dzień 1.
2. **Mikro-osiągnięcie w dniu 0**: odznaka/potwierdzenie za samo ukończenie profilu i zaakceptowanie zgody bezpieczeństwa, zanim jeszcze ukończy się pierwszy trening — łapie efekt "64% więcej powrotów" wcześniej niż dziś.
3. **Haptyka** (Vibration API): krótka wibracja przy ukończonej serii, dłuższa przy ukończonym dniu/nowej odznace. Zero kosztu, spory efekt odczuwalny.
4. **Udostępnianie osiągnięć**: wygenerowany lokalnie obrazek ("Ukończyłam 30 dni! 🔥", z logo) + Web Share API do wysłania gdziekolwiek — łapie część efektu "social" bez trzymania niczyich danych.
5. **Certyfikat ukończenia programu** (dzień 60) — jednorazowy, mocny moment domykający całą podróż, do zapisania/udostępnienia.
6. **Skróty PWA** (manifest `shortcuts`) — długie przytrzymanie ikony aplikacji od razu przenosi do "Dzisiejszego treningu".
7. **Eksport przypomnień do kalendarza** (.ics) — jeden plik, wciąga harmonogram do Google/Apple Calendar.
8. Rozszerzenie biblioteki sprzętowej (już zrobione: opona, plecak, skakanka) — kolejny naturalny krok: **taśma oporowa** ma dziś tylko 1 ćwiczenie (C11), a to jeden z najpopularniejszych akcesoriów fitness — warto dodać 3-4 kolejne warianty z taśmą.

### 3.2 Poziom 2 — realna przewaga konkurencyjna, więcej pracy, wciąż zero backendu
1. **Analiza formy przez kamerę, w 100% lokalnie** (MediaPipe / TensorFlow.js Pose Landmarker — biblioteki działające w przeglądarce, obraz z kamery nigdy nie opuszcza urządzenia). To dokładnie ta funkcja, którą dziś mają tylko najdroższe apki AI-fitness — u nas mogłaby być **darmowa i prywatna**, co żaden konkurent oferujący to samo nie może powiedzieć (oni wysyłają obraz na serwer). Realistyczny zakres na start: wykrywanie czy plecy są proste przy przysiadzie/martwym ciągu, czy kolana nie wychodzą za linię stóp — nie pełna ocena każdego ćwiczenia, tylko kilku kluczowych, gdzie błąd formy realnie boli.
2. **Głębsza adaptacja programu między fazami** — dziś sugestia trudności patrzy na ostatnie 3-5 sesji; można dodać wykrywanie trendu w dłuższym oknie (np. "od 2 tygodni oceniasz trening jako łatwy — czas na fazę wyżej wcześniej niż zaplanowano") i pokazywać to jako świadomą propozycję przesunięcia harmonogramu faz, nie tylko poziomu trudności.
3. **Rozszerzone drzewko odznak/progresji** w stylu Fitloop — więcej mikro-celów po drodze (nie tylko streaki i % ukończenia), np. "10 razy zgłoszony ból i zamieniony na bezpieczniejszy wariant" jako odznaka doceniająca słuchanie ciała, nie tylko "więcej/mocniej".
4. **Tryb ekspresowy** (osobne 10-minutowe warianty dnia, nie tylko redukcja serii przy "mało czasu") dla dni zerowej motywacji — psychologicznie łatwiej zacząć 10-minutowy dedykowany plan niż "skrócony" pełny trening.
5. **Prosty, lokalny dziennik posiłków/nawodnienia** (bez bazy kalorii, bez backendu) — jedno pytanie dziennie typu "jak jadłaś/eś dziś: lekko / normalnie / ciężko" + licznik szklanek wody — wystarczy, żeby pokazać całościowy obraz dnia bez budowania pełnego modułu dietetycznego (to zostaje poza zakresem, zgodnie z wcześniejszą decyzją).

### 3.3 Poziom 3 — wymaga backendu/kosztów, do rozważenia tylko jeśli zmienicie model biznesowy
*(świadomie oddzielone — wdrożenie czegokolwiek z tej listy oznacza koniec obietnicy "0 zł, bez konta, dane lokalne" w obecnej formie, więc to decyzja strategiczna, nie techniczna)*
1. Prawdziwe funkcje społecznościowe (znajomi, wspólne wyzwania, publiczne rankingi streaków).
2. Prawdziwy rozmówca AI (LLM) zamiast dopasowania regułowego — realne rozumienie dowolnego pytania, nie tylko rozpoznawanie wzorców.
3. Integracja z zegarkami/Health Connect (tętno, sen, kalorie z urządzenia).
4. Synchronizacja profilu między urządzeniami (wymaga konta i serwera, nawet minimalnego).

## 4. Rekomendacja: co robić najpierw

Zaczynać od **3.1 w całości** (tydzień-dwa pracy, żadnego ryzyka dla obietnicy "za darmo, bez konta"), potem **jeden konkretny element z 3.2** — rekomendacja: **analiza formy przez kamerę** (3.2.1), bo to jedyna rzecz na tej liście, której żaden bezpłatny, beznakontowy konkurent dziś nie ma, i jest technicznie w pełni wykonalna bez łamania obietnicy prywatności. To realna, obronialna przewaga, nie kolejna kopia tego, co ma Fitbod.

**Źródła:**
- [Fitness App UI UX Design 2026 — Fireart](https://fireart.studio/blog/user-interface-design-for-a-fitness-app/)
- [Mobile App Design Trends 2026 — Muzli](https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/)
- [Gamification Examples — StriveCloud](https://www.strivecloud.io/blog/app-engagement-examples)
- [10 Best Gamified Fitness Apps 2026 — Yu-kai Chou](https://yukaichou.com/gamification-analysis/top-10-gamification-in-fitness/)
- [Retention Metrics for Fitness Apps — Lucid](https://www.lucid.now/blog/retention-metrics-for-fitness-apps-industry-insights/)
- [Best AI Personal Trainer Apps 2026 — SensAI](https://www.sensai.fit/blog/best-ai-personal-trainer-apps-2026)
- [8 Best AI Workout Apps 2026 — LoadMuscle](https://loadmuscle.com/blog/best-ai-workout-apps-2026)
- [How AI Is Replacing Personal Trainers — Polaris Market Research](https://www.polarismarketresearch.com/blog/how-ai-is-replacing-the-personal-trainer-inside-the-future-of-adaptive-fitness-coaching)
