# Propozycja dodatkowych ćwiczeń — do przygotowania (zdjęcia/wideo)

**Status: infografiki dostarczone i wpięte do aplikacji (E1–E11 w `exercises.json`, biblioteka ćwiczeń, filtr "Bonus", nowy sprzęt w onboardingu/ustawieniach).** Wideo do E1–E11 jeszcze nie dostarczone — jak dojdą pliki `E1.mp4`...`E11.mp4`, dograją się automatycznie (aplikacja już ma logikę fallbacku image/video per kod ćwiczenia, tak samo jak dla A–D).

**Zasada, którą trzymam:** 60-dniowy program z dokumentu źródłowego zostaje **podstawą** — nic w jego strukturze (4 fazy, cykl A→B→C→D→E→F→R, 38 ćwiczeń) się nie zmienia. To, co poniżej, to **opcjonalny dodatek** ("Bonus" / grupa E), który aplikacja może zaproponować użytkownikowi na podstawie jego dopasowania (dostępny sprzęt, poziom trudności, cel) — dokładnie tak, jak dziś działa dopasowanie reszty programu, tylko z nową pulą ćwiczeń do wyboru, nie zamiennikiem rdzenia.

---

## 1. Skrócona analiza konkurencji — co robią inni

Sprawdziłem, na czym stoją najpopularniejsze aplikacje fitness w 2026 (Nike Training Club, FitOn, Jefit, Hevy, Strong, Fitbod, SensAI, Fitloop, Boostcamp, Load Muscle) — wnioski praktyczne dla nas:

- **Ogromne biblioteki ćwiczeń** (Jefit 1400+, Load Muscle 4000+) — my mamy 38. To nie problem sam w sobie (jakość > ilość, program jest spójny i przemyślany), ale **zero wariacji sprzętowej** to realna luka względem konkurencji, która oferuje warianty pod różny dostępny sprzęt.
- **Adaptacja AI/reguły do sprzętu i celu** (Fitbod, SensAI, Load Muscle) — to już mamy częściowo (dopasowanie trudności, ograniczenia, sprzęt w onboardingu) — nowa pula ćwiczeń wzmocni tę personalizację, bo dziś przy zaznaczeniu "opona/plecak/skakanka" aplikacja nie ma czym odpowiedzieć.
- **Progresja umiejętności / "skill trees"** (Fitloop) — warto rozważyć na później jako rozwinięcie odznak, nie teraz.
- **Darmowy model z wideo bez sprzętu jako haczyk** (Nike Training Club, FitOn) — to dokładnie nasza obecna przewaga (0 zł, bez konta) — dodatkowe ćwiczenia sprzętowe ją wzmacniają, o ile zostają opcjonalne, a nie wymagane.
- **Luka, którą sam zauważyłem w naszych 38 ćwiczeniach**, niezależnie od konkurencji: grupa C (klatka+ramiona) ma dużo pchania (pompki, wyciskanie, prostowanie) i **zera ciągnięcia/pleców** (wiosłowanie, podciąganie). To sensowne miejsce, żeby nowe ćwiczenia coś realnie uzupełniły, a nie tylko dublowały.

---

## 2. Nowa pula: grupa E — "Bonus ze sprzętem zastępczym"

Trzy kategorie sprzętu, wszystkie tanie/dostępne w większości domów: **stara opona samochodowa**, **plecak obciążony** (książki/butelki) i **skakanka**. Każda wypełnia realną lukę: opona = intensywność i core, plecak = obciążenie/ciąganie (której dziś nie ma wcale), skakanka = kardio/HIIT (dziś D1/D4 są bardzo łagodne, zero czegoś bardziej intensywnego dla chętnych).

Kody robocze **E1–E11**, żeby nie kolidowały z A–D. Poziom trudności = sugestia, do której fazy/komu pasuje (nie sztywna reguła — jak reszta programu, dopasowanie zrobi `difficultyPreference` i ograniczenia).

### 🛞 Opona samochodowa

#### E1 — Przewracanie opony (tire flip)
- **Cel / mięśnie:** całe ciało, nogi, plecy, core — najbardziej "flagowe" ćwiczenie z oponą
- **Sprzęt:** 1 opona (im większa/cięższa, tym trudniej — od osobówki po dostawczą)
- **Poziom:** średni/trudny (faza 3–4 albo `difficultyPreference: harder`)
- **Wykonanie:**
  1. Stań przed leżącą płasko oponą, stopy na szerokości barków, chwyt od dołu za krawędź opony.
  2. Z prostymi plecami (jak przy martwym ciągu) podnieś oponę, pchając biodrami do przodu.
  3. W momencie, gdy opona jest pionowo, popchnij ją mocno do przodu, aż się przewróci.
  4. Podejdź, powtórz w drugą stronę (lub wróć do startu, jeśli trenujesz w miejscu).
- **Bezpieczeństwo:** prosty kręgosłup przy podnoszeniu (nie okrągłe plecy), buty z dobrą przyczepnością, nie wykonywać przy bólu dolnego odcinka pleców.
- **Do nagrania:** zdjęcia pozycji start/środek/koniec ruchu + krótkie wideo (5–10 s) całego cyklu przewrócenia.
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "car tire flip" in 3 sequential steps (start position, mid-movement, end position), side angle, minimalist outdoor driveway background with a large car tire, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Przewracanie opony (tire flip)", partia mięśniowa "Całe ciało, nogi, plecy, core", oraz jedna wskazówka bezpieczeństwa: "Utrzymuj proste plecy przy podnoszeniu, nie okrąglaj kręgosłupa. Noś obuwie z dobrą przyczepnością.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, side angle, a calm plus-size adult flipping a large car tire across a driveway or grassy backyard with correct form, explosive push at the top of each flip with a brief reset between reps, subtle on-screen Polish captions fade in: "Przewracanie opony (tire flip)", "Całe ciało, nogi, plecy, core", and safety cue "Utrzymuj proste plecy przy podnoszeniu, nie okrąglaj kręgosłupa. Noś obuwie z dobrą przyczepnością.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

#### E2 — Skoki boczne przez oponę (tire lateral jumps)
- **Cel / mięśnie:** nogi, pośladki, zwinność, kardio
- **Sprzęt:** 1 opona leżąca płasko
- **Poziom:** średni
- **Wykonanie:**
  1. Stań bokiem przy oponie, stopy razem.
  2. Przeskocz obunóż na drugą stronę opony, miękko lądując w lekkim ugięciu kolan.
  3. Przeskakuj tam i z powrotem w rytmie (np. 20–30 s).
- **Bezpieczeństwo:** lądowanie zawsze na ugiętych kolanach (nie na sztywnych nogach), wariant delikatniejszy: przenoszenie stopy po stopie zamiast skoku.
- **Do nagrania:** wideo całej serii skoków z boku (widać oponę i pełen zakres ruchu).
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "lateral jumps over a flat tire" in 3 sequential steps (start position, mid-movement, end position), front angle, minimalist outdoor driveway background with a flat car tire on the ground, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Skoki boczne przez oponę (tire lateral jumps)", partia mięśniowa "Nogi, pośladki, zwinność, kardio", oraz jedna wskazówka bezpieczeństwa: "Ląduj zawsze na lekko ugiętych kolanach, nigdy na sztywnych nogach.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, front angle, a calm plus-size adult jumping side to side over a flat car tire on a driveway with correct form, quick rhythmic jumps with soft controlled landings, subtle on-screen Polish captions fade in: "Skoki boczne przez oponę (tire lateral jumps)", "Nogi, pośladki, zwinność, kardio", and safety cue "Ląduj zawsze na lekko ugiętych kolanach, nigdy na sztywnych nogach.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

#### E3 — Martwy ciąg + rzut oponą (tire deadlift to slam)
- **Cel / mięśnie:** plecy, pośladki, uda, core, siła funkcjonalna
- **Sprzęt:** 1 mniejsza/lżejsza opona (np. od osobówki)
- **Poziom:** średni
- **Wykonanie:**
  1. Podnieś oponę z ziemi techniką martwego ciągu (proste plecy, ciężar na piętach).
  2. Wyprostuj się w biodrach, opona na wysokości bioder/klatki.
  3. Rzuć oponą z powrotem na ziemię przed sobą (mocny, kontrolowany ruch).
- **Bezpieczeństwo:** absolutnie nie okrąglać pleców przy podnoszeniu; przy bólu pleców — pominąć.
- **Do nagrania:** zdjęcia 3 faz (dół/góra/rzut) + wideo.
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "tire deadlift to slam" in 3 sequential steps (start position, mid-movement, end position), side angle, minimalist outdoor driveway or garage background with a car tire, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Martwy ciąg + rzut oponą (tire deadlift to slam)", partia mięśniowa "Plecy, pośladki, uda, core", oraz jedna wskazówka bezpieczeństwa: "Nigdy nie okrąglaj pleców przy podnoszeniu — ciężar prowadź biodrami.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, side angle, a calm plus-size adult lifting a tire off the ground with a deadlift technique and slamming it back down in a driveway or garage setting, controlled lift followed by a powerful controlled slam, subtle on-screen Polish captions fade in: "Martwy ciąg + rzut oponą (tire deadlift to slam)", "Plecy, pośladki, uda, core", and safety cue "Nigdy nie okrąglaj pleców przy podnoszeniu — ciężar prowadź biodrami.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

#### E4 — Rosyjskie skręty na oponie (siedząc)
- **Cel / mięśnie:** brzuch (mięśnie skośne) — wersja siedząca, bez podnoszenia opony
- **Sprzęt:** 1 opona jako podwyższenie/oparcie do siedzenia
- **Poziom:** łatwy/średni — dobry kandydat, żeby dołączyć bliżej fazy 1–2
- **Wykonanie:**
  1. Usiądź na krawędzi opony (albo na ziemi obok, stopy oparte o oponę), tułów lekko odchylony do tyłu.
  2. Dłonie złączone przed klatką, skręcaj tułów na przemian w lewo i prawo.
  3. Wariant łatwiejszy: stopy na ziemi przez cały czas. Wariant trudniejszy: stopy uniesione.
- **Bezpieczeństwo:** przy bólu odcinka lędźwiowego — wersja ze stopami opartymi o podłogę.
- **Do nagrania:** zdjęcia pozycji + krótkie wideo skrętu.
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "seated Russian twist using a tire as a seat" in 3 sequential steps (start position, mid-movement, end position), side angle, minimalist home-gym background with a car tire used as a seat, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Rosyjskie skręty na oponie (siedząc)", partia mięśniowa "Brzuch (mięśnie skośne)", oraz jedna wskazówka bezpieczeństwa: "Przy bólu odcinka lędźwiowego trzymaj stopy oparte o podłogę przez cały czas.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, side angle, a calm plus-size adult sitting on a tire and performing slow controlled torso rotations with correct form in a bright home setting, slow controlled rotation side to side, subtle on-screen Polish captions fade in: "Rosyjskie skręty na oponie (siedząc)", "Brzuch (mięśnie skośne)", and safety cue "Przy bólu odcinka lędźwiowego trzymaj stopy oparte o podłogę przez cały czas.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

#### E5 — Deska z dłońmi na oponie (elevated plank)
- **Cel / mięśnie:** core, barki — deska w wersji podwyższonej, łatwiejszej niż na podłodze
- **Sprzęt:** 1 opona jako podwyższenie pod dłonie
- **Poziom:** łatwy — dobra alternatywa dla A2 dla osób, którym trudno o pełną deskę na podłodze
- **Wykonanie:**
  1. Oprzyj dłonie na krawędzi opony, ciało w linii prostej od głowy do pięt, stopy na ziemi za sobą.
  2. Napnij brzuch, utrzymaj pozycję przez określony czas.
- **Bezpieczeństwo:** biodra nie mogą opadać ani sterczeć do góry — prosta linia ciała.
- **Do nagrania:** 1 zdjęcie pozycji z boku wystarczy (statyczne ćwiczenie) + opcjonalnie krótkie wideo.
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "elevated plank with hands on a tire" in 3 sequential steps (start position, mid-movement, end position), side angle, minimalist home-gym background with a car tire, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Deska z dłońmi na oponie (elevated plank)", partia mięśniowa "Core, barki", oraz jedna wskazówka bezpieczeństwa: "Biodra w linii prostej — nie unoś ani nie opuszczaj ich nadmiernie.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, side angle, a calm plus-size adult holding a steady elevated plank with hands resting on a tire in a bright home setting, holding a steady static position with controlled breathing, subtle on-screen Polish captions fade in: "Deska z dłońmi na oponie (elevated plank)", "Core, barki", and safety cue "Biodra w linii prostej — nie unoś ani nie opuszczaj ich nadmiernie.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

#### E6 — Wejścia na oponę (tire step-up)
- **Cel / mięśnie:** uda, pośladki — mocniejsza wersja B8 (step-up na stopień)
- **Sprzęt:** 1 stabilnie leżąca opona (grubsza/wyższa niż typowy stopień)
- **Poziom:** średni
- **Wykonanie:**
  1. Postaw jedną stopę na oponie, przenieś ciężar ciała i wejdź na nią całym ciałem.
  2. Zejdź kontrolowanym ruchem, powtórz na drugą nogę.
- **Bezpieczeństwo:** upewnij się, że opona się nie przesuwa (oprzeć o ścianę/inną przeszkodę); przy bólu kolan — niższa, szersza opona.
- **Do nagrania:** wideo pełnego cyklu wejścia+zejścia z boku.
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "step-ups onto a tire" in 3 sequential steps (start position, mid-movement, end position), side angle, minimalist outdoor garage background with a car tire braced against a wall, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Wejścia na oponę (tire step-up)", partia mięśniowa "Uda, pośladki", oraz jedna wskazówka bezpieczeństwa: "Upewnij się, że opona się nie przesuwa — oprzyj ją o ścianę lub inną stabilną przeszkodę.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, side angle, a calm plus-size adult stepping up onto a stable tire braced against a wall and stepping back down with correct form in a garage setting, controlled step up and down at a steady tempo, subtle on-screen Polish captions fade in: "Wejścia na oponę (tire step-up)", "Uda, pośladki", and safety cue "Upewnij się, że opona się nie przesuwa — oprzyj ją o ścianę lub inną stabilną przeszkodę.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

#### E7 — Przeciąganie opony (tire drag/pull)
- **Cel / mięśnie:** plecy, ramiona, nogi, kardio siłowe — jedyne ćwiczenie **ciągnięcia** w całej aplikacji
- **Sprzęt:** 1 opona + sznur/pas/stara taśma do przewiązania (albo ciągnięcie bezpośrednio za oponę)
- **Poziom:** średni/trudny
- **Wykonanie:**
  1. Przewiąż linę/pas przez środek opony, złap za drugi koniec.
  2. Idąc do tyłu (lub w wykroku do przodu), ciągnij oponę po ziemi na wyznaczonym dystansie.
  3. Wersja stacjonarna: siad, opona z przodu, ciągnij liną do klatki jak przy wiosłowaniu (naprzemiennie lub oburącz).
- **Bezpieczeństwo:** równa, nieśliska powierzchnia (trawnik/podjazd, nie ostry beton, który zniszczy oponę i może być śliski).
- **Do nagrania:** wideo całego ciągu ruchu (idealnie z dwóch ujęć: chód + wersja siedząca "wiosłowanie").
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "dragging a tire with a rope" in 3 sequential steps (start position, mid-movement, end position), side angle, minimalist outdoor driveway or grassy backyard background with a car tire and a rope, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Przeciąganie opony (tire drag/pull)", partia mięśniowa "Plecy, ramiona, nogi, kardio siłowe", oraz jedna wskazówka bezpieczeństwa: "Ćwicz na równej, nieśliskiej powierzchni — trawnik lub podjazd, nie mokry beton.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, side angle, a calm plus-size adult walking backward while pulling a tire attached to a rope across a driveway or grassy yard with correct form, steady walking pace with a firm grip on the rope, subtle on-screen Polish captions fade in: "Przeciąganie opony (tire drag/pull)", "Plecy, ramiona, nogi, kardio siłowe", and safety cue "Ćwicz na równej, nieśliskiej powierzchni — trawnik lub podjazd, nie mokry beton.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

### 🎒 Plecak obciążony (nowość — obecnie brak ćwiczeń z obciążeniem do noszenia)

#### E8 — Przysiad z plecakiem
- **Cel / mięśnie:** uda, pośladki — mocniejsza wersja B1/B2 dla osób gotowych na progresję
- **Sprzęt:** plecak wypełniony książkami/butelkami z wodą
- **Poziom:** średni — naturalna progresja po fazie 2–3, kiedy przysiad bez obciążenia robi się łatwy
- **Wykonanie:**
  1. Załóż plecak, stopy na szerokości bioder.
  2. Wykonaj przysiad jak w B1/B2, plecak dociąża ruch.
- **Bezpieczeństwo:** nie przeciążać plecaka na start (2–4 kg wystarczy na początek); przy bólu kolan — płytszy zakres.
- **Do nagrania:** zdjęcia góra/dół + wideo.
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "weighted backpack squat" in 3 sequential steps (start position, mid-movement, end position), front angle, minimalist home-gym background, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Przysiad z plecakiem", partia mięśniowa "Uda, pośladki", oraz jedna wskazówka bezpieczeństwa: "Zacznij od lekkiego obciążenia (2–4 kg) i przy bólu kolan skróć zakres ruchu.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, front angle, a calm plus-size adult wearing a loaded backpack and performing a controlled squat with correct form on a non-slip mat in a bright home setting, slow controlled tempo with a brief pause at the bottom, subtle on-screen Polish captions fade in: "Przysiad z plecakiem", "Uda, pośladki", and safety cue "Zacznij od lekkiego obciążenia (2–4 kg) i przy bólu kolan skróć zakres ruchu.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

#### E9 — Wiosłowanie w opadzie tułowia z plecakiem
- **Cel / mięśnie:** plecy (mięsień najszerszy, czworoboczny) — **jedyne ćwiczenie pleców w całej aplikacji**, realnie uzupełnia lukę
- **Sprzęt:** plecak z obciążeniem (trzymany oburącz za szelki)
- **Poziom:** średni
- **Wykonanie:**
  1. Lekki wykrok, tułów pochylony do przodu pod kątem ok. 45°, plecy proste.
  2. Trzymaj plecak oburącz, ręce wyprostowane pod klatką.
  3. Przyciągnij plecak do brzucha, łokcie blisko ciała, ściśnij łopatki.
  4. Kontrolowany powrót do pozycji wyjściowej.
- **Bezpieczeństwo:** kluczowe są proste plecy przez cały ruch — przy bólu odcinka lędźwiowego pominąć lub robić siedząc.
- **Do nagrania:** wideo z boku (widać kąt pochylenia i ruch łokci).
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "bent-over row using a weighted backpack" in 3 sequential steps (start position, mid-movement, end position), side angle, minimalist home-gym background, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Wiosłowanie w opadzie tułowia z plecakiem", partia mięśniowa "Plecy (mięsień najszerszy, czworoboczny)", oraz jedna wskazówka bezpieczeństwa: "Przez cały ruch utrzymuj proste plecy — przy bólu odcinka lędźwiowego wykonuj siedząc.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, side angle, a calm plus-size adult in a hinged forward-lean position pulling a loaded backpack toward the stomach with correct form on a non-slip mat in a bright home setting, slow controlled tempo with a brief squeeze at the top, subtle on-screen Polish captions fade in: "Wiosłowanie w opadzie tułowia z plecakiem", "Plecy (mięsień najszerszy, czworoboczny)", and safety cue "Przez cały ruch utrzymuj proste plecy — przy bólu odcinka lędźwiowego wykonuj siedząc.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

### 🪢 Skakanka (nowość — obecnie D1/D4 to jedyne "kardio", oba bardzo łagodne)

#### E10 — Skakanka, podstawowe skoki obunóż
- **Cel / mięśnie:** kardio, łydki, koordynacja — pierwsze realne HIIT w aplikacji
- **Sprzęt:** skakanka (albo imitacja ruchu bez sznura, jeśli ktoś nie ma — da się zaznaczyć jako wariant "bez sprzętu")
- **Poziom:** średni (obciążenie stawu skokowego/kolan — nie dla wszystkich, warto powiązać z ograniczeniem "kolana/biodra" z panelu dostosowań)
- **Wykonanie:**
  1. Skakanka za piętami, chwyt uchwytów w dłoniach.
  2. Drobne skoki obunóż, sznur przechodzi pod stopami, lądowanie na śródstopiu (nie na pięcie).
  3. Interwały np. 20–30 s skoków / 30–40 s przerwy.
- **Bezpieczeństwo:** miękkie podłoże (mata, nie beton), przeciwwskazane przy aktywnych problemach z kolanami/stawem skokowym — wtedy zaproponować E11 zamiast.
- **Do nagrania:** wideo 10–15 s ciągłych skoków.
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "basic two-foot jump rope skipping" in 3 sequential steps (start position, mid-movement, end position), front angle, minimalist home-gym background with a jump rope, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Skakanka, podstawowe skoki obunóż", partia mięśniowa "Kardio, łydki, koordynacja", oraz jedna wskazówka bezpieczeństwa: "Ląduj miękko na śródstopiu, nie na piętach. Ćwicz na miękkim podłożu.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, front angle, a calm plus-size adult jumping rope with correct form on a non-slip mat in a bright home setting, steady rhythmic skipping tempo with soft landings, subtle on-screen Polish captions fade in: "Skakanka, podstawowe skoki obunóż", "Kardio, łydki, koordynacja", and safety cue "Ląduj miękko na śródstopiu, nie na piętach. Ćwicz na miękkim podłożu.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

#### E11 — Skakanka bez sznura (low-impact, wariant dla stawów)
- **Cel / mięśnie:** kardio, koordynacja — bezpieczny zamiennik E10
- **Sprzęt:** brak (imitacja ruchu) — dobra opcja "zero sprzętu"
- **Poziom:** łatwy — dla każdego, kandydat nawet do fazy 1
- **Wykonanie:**
  1. Ten sam ruch nadgarstków co przy skakance, ale bez sznura.
  2. Zamiast skoku — naprzemienne unoszenie pięt (low impact) w rytmie ruchu nadgarstków.
- **Bezpieczeństwo:** minimalne obciążenie stawów — bezpieczne dla większości.
- **Do nagrania:** krótkie wideo (10 s wystarczy).
- **Prompt AI (opcjonalnie, jeśli wolisz wygenerować zamiast nagrać):**
  - *Infografika:* `Clean flat-vector fitness infographic, square format, showing a friendly plus-size adult demonstrating "low-impact jump rope motion without a rope" in 3 sequential steps (start position, mid-movement, end position), front angle, minimalist home-gym background, soft blue-and-white color palette, bold sans-serif captions in Polish labeling: nazwa ćwiczenia "Skakanka bez sznura (low-impact)", partia mięśniowa "Kardio, koordynacja", oraz jedna wskazówka bezpieczeństwa: "Ruch niskiego wpływu — bezpieczny dla większości, w tym dla osób z wrażliwymi stawami.". Numbered arrows indicating movement direction, dashed alignment guide lines on knees/spine, no spelling errors, high contrast, flat illustration style, no photorealism, inclusive and body-positive character design.`
  - *Wideo:* `10-15 second instructional fitness demo video, static camera, front angle, a calm plus-size adult mimicking a jump rope wrist motion with alternating light heel raises with correct form on a non-slip mat in a bright home setting, steady low-impact rhythmic tempo, subtle on-screen Polish captions fade in: "Skakanka bez sznura (low-impact)", "Kardio, koordynacja", and safety cue "Ruch niskiego wpływu — bezpieczny dla większości, w tym dla osób z wrażliwymi stawami.", soft ambient background music, seamless loop, photorealistic, steady well-lit shot, encouraging non-judgmental tone suitable for beginners with a larger body size.`

---

## 3. Co dokładnie przygotować (żeby pasowało do reszty aplikacji)

Ten sam format co przy oryginalnych 38 ćwiczeniach:

| Materiał | Format | Ile |
|---|---|---|
| Zdjęcie/infografika pozycji | `.png`, najlepiej pion lub kwadrat | 1 na ćwiczenie |
| Wideo instruktażowe | `.mp4`, kilka–kilkanaście sekund, **bez dźwięku wystarczy** (lektor czyta instrukcje na żywo — patrz ostatnia zmiana w aplikacji) | 1 na ćwiczenie |

Nazwy plików: `E1.png` / `E1.mp4`, `E2.png` / `E2.mp4`, ... — dokładnie ten sam wzorzec co `A1`–`D5`.

## 4. Co zrobię, jak dostarczysz materiał

1. Dopiszę E1–E11 do `exercises.json` (grupa "E — Bonus", z opisami/krokami/bezpieczeństwem jak wyżej).
2. Dodam `E` do sprzętu w onboardingu i panelu ustawień: "opona", "plecak obciążony", "skakanka" jako nowe opcje do zaznaczenia obok istniejących (mata, krzesło, hantle, taśma, schody, ściana).
3. Sekcja "Bonus" w bibliotece ćwiczeń i/lub sugestia na końcu dnia treningowego ("Masz dziś więcej czasu / chcesz coś ekstra? Spróbuj: ...") — **opcjonalna, nie wchodzi w podstawowy cykl 60 dni**, zgodnie z tym, co ustaliliśmy: baza programu się nie rusza.

---

**Źródła (analiza konkurencji):**
- [Najlepsze aplikacje do ćwiczeń w domu — TOP 7](https://nano.komputronik.pl/n/najlepsze-aplikacje-sportowe-do-cwiczen-fitness/)
- [Aplikacje fitness ranking 2026 — trenerka.ai](https://trenerka.ai/aplikacje-fitness-ranking)
- [Best Workout Apps 2026 — JEFIT](https://www.jefit.com/blog/best-workout-apps-for-2026-top-7-options-tested-and-reviewed)
- [11 Best Workout Apps in 2026 — LoadMuscle](https://loadmuscle.com/blog/best-workout-app-2026)
- [5 Best Bodyweight Apps 2026 — Fitloop](https://fitloop.app/compare/best-bodyweight-fitness-apps)
- [Opona – zastosowanie w treningu — PoTreningu.pl](https://potreningu.pl/artykuly/poprawa-kondycji/opona-zastosowanie-w-treningu-5465)
- [Fitness z oponami samochodowymi — Semperit](https://www.semperit.com/pl/pl/car/tyre-knowledge/fitness-with-car-tyres/)
- [Tire Workouts: The Best Exercises — Healthline](https://www.healthline.com/health/fitness/tire-workouts)
