# Nowa Ja — specyfikacja funkcjonalna do projektowania UI/UX

**Cel dokumentu:** kompletny opis tego, co aplikacja robi i co musi zawierać każdy ekran — bez opisu obecnej warstwy wizualnej (kolorów, układu, stylu komponentów), żeby nie sugerować rozwiązania projektantowi/AI tworzącemu nowy UI/UX od zera.

**Kontekst produktu:** darmowa progresywna aplikacja webowa (PWA) — 60-dniowy program treningowy do wykonania w domu, w pełni personalizowany, bez zakładania konta, wszystkie dane użytkownika przechowywane wyłącznie lokalnie na urządzeniu. Grupa docelowa: osoby zaczynające regularną aktywność fizyczną w domu, różne typy sylwetek i poziomy sprawności, część użytkowników z ograniczeniami ruchowymi lub większą masą ciała — bezpieczeństwo i brak oceniania są częścią tożsamości produktu, nie dodatkiem.

---

## 1. Lista funkcji aplikacji

### Rdzeń programu
- Gotowy, algorytmicznie generowany 60-dniowy plan treningowy (4 fazy progresji, cykliczny schemat typów dni), a nie sztywno zakodowana lista.
- 49 ćwiczeń w bazie: 38 ćwiczeń podstawowych (bez sprzętu lub z minimalnym sprzętem domowym) + 11 ćwiczeń bonusowych wymagających dodatkowego sprzętu (opona, obciążony plecak, skakanka).
- Dni odpoczynku wbudowane w cykl, traktowane jako pełnoprawna część programu.
- Dni obwodowe (stacyjne, rundy) obok dni z sekwencją pojedynczych ćwiczeń.

### Personalizacja i adaptacja
- Profil użytkownika: dane ogólne (imię, wiek, wzrost, waga), doświadczenie treningowe, główny cel, dostępność czasowa, dostępny sprzęt, preferowany poziom trudności, priorytetowe partie ciała, ograniczenia ruchowe, dowolna notatka o przeciwwskazaniach.
- Bieżące dostosowanie pojedynczego treningu: zgłoszenie "mało czasu" (redukuje liczbę serii), zgłoszenie braku konkretnego sprzętu (podmienia ćwiczenia wymagające tego sprzętu), zgłoszenie bólu konkretnej partii ciała (podpowiada bezpieczniejszy zamiennik).
- Rozpoznawanie tych samych zgłoszeń z dowolnego zdania wpisanego przez użytkownika (naturalny język, bez sztywnych przycisków) — jasno oznaczone jako dopasowanie regułowe, nie prawdziwa rozmowa z AI.
- Automatyczna sugestia zmiany poziomu trudności (łatwiej/trudniej) na podstawie ostatnich 3–5 sesji (ocena trudności, samopoczucia, bólu, wskaźnik ukończenia serii), z uzasadnieniem i jednym przyciskiem akceptacji.
- Propozycja zamiennika ćwiczenia po dwukrotnym zgłoszeniu bólu przy tym samym ćwiczeniu.
- Orientacyjny wskaźnik gotowości do treningu (0–100), liczony z ostatnich sesji oraz opcjonalnego, ręcznego zgłoszenia jakości snu i poziomu zakwasów/zmęczenia — jawnie oznaczony jako wskaźnik poglądowy, nie diagnoza.

### Prowadzenie treningu
- Tryb "trening teraz": pełnoekranowy, prowadzony krok po kroku (odliczanie przygotowawcze, aktywna faza, odpoczynek między seriami/stacjami/rundami).
- Obsługa ćwiczeń na powtórzenia i na czas w tym samym silniku.
- Pauza/wznowienie w dowolnym momencie.
- Pominięcie ćwiczenia, zamiana ćwiczenia na inne z tej samej grupy mięśniowej (z listą alternatyw).
- Zgłoszenie bólu przy konkretnym ćwiczeniu w trakcie treningu.
- Formularz po zakończeniu treningu: ocena trudności, ocena samopoczucia, zgłoszenie bólu (brak/lekki dyskomfort/ból) — zapisywane per sesja, per ćwiczenie (liczba wykonanych serii vs. docelowa, pominięcie).
- Darmowy lektor głosowy: zapowiada nazwę ćwiczenia, prowadzi odliczanie, wygłasza frazy motywacyjne w jednym z dwóch stylów (łagodny/ostry), możliwość wyłączenia w dowolnym momencie treningu.
- Muzyka motywacyjna w tle podczas treningu: playlista odtwarzana losowo, niezależna od lektora (mogą działać jednocześnie), regulacja głośności, pomijanie utworu.
- Blokada wygaszania ekranu w trakcie aktywnego treningu.

### Śledzenie postępów
- Ogólny pasek postępu programu (dni ukończone / 60, %) i aktualna seria dni z rzędu.
- Pełna, chronologiczna historia wszystkich sesji (dzień, data, czas trwania, ocena trudności/samopoczucia, zgłoszony ból).
- Podsumowanie bieżącego tygodnia (liczba treningów, łączny czas, średnia trudność/samopoczucie, flaga zgłoszonego bólu).
- Rejestr wagi ciała w czasie (wpisy z datą + wizualizacja trendu).
- Rejestr obwodów ciała (talia, biodra, uda, ramiona) oraz prostego testu funkcjonalnego (liczba przysiadów w 60 s).
- Zdjęcia sylwetki: dodawanie zdjęć z datą, usuwanie, porównanie "przed/po" dwóch wybranych zdjęć z suwakiem odsłaniającym jedno na drugim.
- System odznak/osiągnięć (m.in. za serie dni z rzędu, ukończone kamienie milowe programu, liczbę sesji, pierwszy pomiar) z widocznym stanem zdobyte/niezdobyte i opisem warunku.
- Powiadomienie (toast) o zdobyciu nowej odznaki bezpośrednio po zapisaniu treningu.

### Biblioteka ćwiczeń
- Przeglądanie wszystkich ćwiczeń z wyszukiwarką (po nazwie, partii mięśniowej, kodzie) i filtrami wg grupy mięśniowej (w tym osobna kategoria ćwiczeń bonusowych).
- Widok szczegółowy ćwiczenia: instrukcja krok po kroku, wskazówka bezpieczeństwa, tabela serii×powtórzeń dla każdej z 4 faz programu, infografika, wideo instruktażowe (bez oryginalnego dźwięku — lektor czyta instrukcje na żywo po odtworzeniu), skróty do stopera z kilkoma gotowymi czasami.
- Zastępczy podgląd typu "flipbook" (animacja z 2–4 zdjęć) dla ćwiczeń bez prawdziwego wideo.
- Możliwość dodania własnego zdjęcia/wideo/sekwencji zdjęć do dowolnego ćwiczenia oraz ich usunięcia.
- Gotowe prompty do wygenerowania infografiki/wideo przez AI dla ćwiczeń, którym brakuje materiału.

### Harmonogram
- Widok listy: cały 60-dniowy plan pogrupowany wg faz, z oznaczeniem dni ukończonych.
- Widok kalendarza: siatka miesiąca z nawigacją między miesiącami, status każdego dnia (ukończony / dzisiejszy / pominięty / zaplanowany), przejście do szczegółów dnia po kliknięciu.

### Profil i konto
- Obsługa wielu profili na jednym urządzeniu (tworzenie, przełączanie, usuwanie).
- Pełna edycja wszystkich danych profilu po zakończeniu onboardingu (nie tylko przy zakładaniu).
- Eksport i import wszystkich danych użytkownika do pliku.
- Reset postępów wybranego profilu.

### Ustawienia i personalizacja aplikacji
- Wybór motywu: automatyczny / jasny / ciemny.
- Ustawienia lektora (włącz/wyłącz, styl motywacji).
- Ustawienia muzyki (włącz/wyłącz, głośność).
- Przypomnienie o treningu o wybranej porze dnia (z zastrzeżeniem ograniczeń przeglądarki, gdy aplikacja jest zamknięta).

### Bezpieczeństwo i zaufanie
- Ekran zgody bezpieczeństwa wymagany przed pierwszym treningiem: opis ogólnego charakteru programu, wskazania kiedy skonsultować się z lekarzem, wyraźne potwierdzenie zrozumienia wymagane do kontynuacji.
- Stały dostęp do strony "Bezpieczeństwo i informacje" z poziomu aplikacji.
- Jasne, wielokrotnie powtórzone zastrzeżenie: aplikacja nie jest poradą medyczną.

### Instalacja i działanie offline
- Instalacja jako aplikacja na ekranie głównym (baner z akcją instalacji, możliwość odrzucenia).
- Działanie w trybie offline po zainstalowaniu (poza treściami pobieranymi na żądanie, jak wideo).

### Strona informacyjna/marketingowa (poza samą aplikacją)
- Strona docelowa opisująca produkt dla nowych odwiedzających: propozycja wartości, kluczowe funkcje, zastrzeżenie bezpieczeństwa, wezwanie do działania prowadzące do otwarcia aplikacji.
- Strony prawne: polityka prywatności (co się dzieje z danymi, w tym ujawnienie analityki i reklam), regulamin korzystania.

---

## 2. Inwentarz interfejsu — co musi zawierać każdy ekran

Poniżej: cel ekranu, treść/dane do pokazania, dostępne akcje. Świadomie pominięty opis wyglądu (kolory, układ, styl komponentów) — to zostaje w gestii projektanta.

### 2.1 Onboarding (formularz wieloetapowy, 8 kroków)
Wymaga: wizualnego wskaźnika postępu (który krok z ilu), nawigacji wstecz/dalej, możliwości pominięcia dowolnego pytania (żadne pole nie jest twardo wymagane poza tym co niezbędne do startu).

1. Imię + wiek.
2. Wzrost + waga (z zastrzeżeniem: dane ogólne, nie medyczne).
3. Doświadczenie treningowe (jednokrotny wybór z 3 opcji) + główny cel (jednokrotny wybór z 5 opcji).
4. Liczba treningów w tygodniu (3–7) + długość pojedynczego treningu (5 opcji czasowych).
5. Dostępny sprzęt (wielokrotny wybór, ok. 9 opcji: mata, krzesło, butelki/hantle, taśma oporowa, stopień/schody, ściana, opona, plecak obciążony, skakanka).
6. Poziom trudności (jednokrotny wybór z 3 opcji) + priorytetowe partie ciała (wielokrotny wybór, 6 opcji).
7. Ograniczenia ruchowe (wielokrotny wybór, 6 opcji w tym "brak") + dowolna notatka tekstowa (opcjonalnie).
8. Data startu programu (domyślnie dzisiaj) + informacja że przed startem będzie ekran zgody bezpieczeństwa.

Ostatni krok: przycisk kończący, tworzy profil i przechodzi do ekranu zgody.

### 2.2 Ekran zgody bezpieczeństwa
- Tekst wprowadzający o charakterze programu.
- Rozszerzony tekst ostrzeżeń bezpieczeństwa (kiedy skonsultować się z lekarzem, sygnały ostrzegawcze do przerwania ćwiczeń).
- Pole wyboru "przeczytałam/em i rozumiem".
- Przycisk potwierdzenia, nieaktywny dopóki pole wyboru nie jest zaznaczone.
- Ekran blokujący — nie da się z niego przejść dalej bez potwierdzenia.

### 2.3 Ekran główny / "Dziś"
Pierwszy ekran po zalogowaniu/otwarciu, cel: natychmiastowa odpowiedź na "co dziś mam zrobić".
- Powitanie z imieniem użytkownika.
- Nazwa aktualnej fazy programu + numer dnia (X/60).
- Typ dzisiejszego dnia + partie mięśniowe na dziś.
- Główna akcja: rozpocznij trening / zobacz dzień odpoczynku / zobacz ukończony trening (zależnie od stanu).
- Znacznik "ukończono dzisiaj", jeśli dotyczy.
- Skrócony pasek postępu całego programu + aktualna seria dni + link do pełnych postępów.
- Karta gotowości do treningu: liczba 0–100, krótkie wyjaśnienie że to nie diagnoza, dwa zestawy szybkiego wyboru 1–5 (jakość snu, poziom zakwasów).
- Karta sugestii zmiany trudności (pojawia się warunkowo) z uzasadnieniem i przyciskiem zastosowania.
- Krótka porada/motywacja kontekstowa zależna od typu dnia i serii.
- Podsumowanie ostatniego treningu (jeśli istnieje): dzień, czas trwania, oceny, zgłoszony ból.
- Skróty: harmonogram, biblioteka ćwiczeń, bezpieczeństwo, oraz warunkowo "ćwiczenia bonusowe" (widoczny tylko gdy profil ma zaznaczony odpowiedni sprzęt).

### 2.4 Widok konkretnego dnia
- Numer dnia, faza, typ dnia, partie mięśniowe.
- Przypomnienie o rozgrzewce/schłodzeniu (zwijalne).
- Panel bieżących dostosowań (zwijalny): chipy szybkiego wyboru (mało czasu, brak sprzętu, konkretna partia bólu), pole tekstowe do wpisania własnymi słowami, licznik aktywnych dostosowań, opcja wyczyszczenia wszystkich naraz.
- Lista ćwiczeń dnia: numer porządkowy, kod, nazwa, docelowe serie×powtórzenia, pole wyboru "wykonane" per ćwiczenie, link do szczegółów ćwiczenia.
- Akcja: oznacz cały dzień jako ukończony.
- Akcja: rozpocznij tryb prowadzony.
- Dla dnia odpoczynku: uproszczony widok z komunikatem że odpoczynek jest częścią programu, bez listy ćwiczeń.

### 2.5 Tryb prowadzony (pełnoekranowy runner treningu)
- Wyjście z treningu (z potwierdzeniem utraty postępu).
- Etykieta typu dnia.
- Przełącznik lektora (widoczny stan włączony/wyłączony).
- Przełącznik muzyki + nazwa aktualnie granego utworu + akcja "następny utwór" (widoczne tylko gdy muzyka aktywna).
- Dla dni obwodowych: numer stacji/z ilu, numer rundy/z ilu.
- Nazwa aktualnego ćwiczenia.
- Cel: liczba powtórzeń albo czas.
- Duży licznik odliczający: przygotowanie, aktywna faza (dla ćwiczeń na czas), odpoczynek między seriami/stacjami/rundami.
- Dla ćwiczeń na powtórzenia: licznik serii (seria X/Y).
- Akcje: pauza/wznów, oznacz serię jako gotową, pomiń, zamień ćwiczenie (otwiera listę alternatyw z tej samej grupy), zgłoś ból przy tym ćwiczeniu.
- Kontekstowe podpowiedzi: sugestia zamiany przy zgłoszonym wcześniej bólu, sugestia zamiany przy braku wymaganego sprzętu.
- Ekran końcowy: suwak/skala trudności (1–5), suwak/skala samopoczucia (1–5), wybór bólu (brak/lekki/ból), przycisk zapisu i zakończenia.
- Powiadomienie o nowej zdobytej odznace (jeśli dotyczy), pojawiające się po zapisie.

### 2.6 Harmonogram / Plan
- Przełącznik widoku: lista / kalendarz.
- Widok listy: grupowanie wg fazy (zwijalne sekcje), każdy wiersz = numer dnia, typ, nazwa typu dnia, znacznik ukończenia.
- Widok kalendarza: siatka dni tygodnia dla wybranego miesiąca, nawigacja miesiąc wstecz/dalej, każda komórka dnia = numer + status wizualny (ukończony/dzisiejszy/pominięty/nadchodzący), kliknięcie przenosi do widoku dnia.

### 2.7 Biblioteka ćwiczeń
- Pole wyszukiwania tekstowego.
- Filtry wg grupy mięśniowej (jednokrotny wybór, w tym kategoria bonusowa).
- Siatka/lista wyników: kod ćwiczenia (wizualnie odróżnialny wg grupy), nazwa, partia mięśniowa.
- Stan pusty przy braku wyników.

### 2.8 Szczegóły ćwiczenia
- Odznaka grupy, kod + nazwa, partia mięśniowa.
- Sekcja infografiki (z opcją dodania/zmiany/usunięcia własnego zdjęcia).
- Sekcja animacji z sekwencji zdjęć (alternatywa dla wideo, z opcją dodania sekwencji/usunięcia).
- Sekcja wideo instruktażowego (wyciszone, uruchomienie odtwarzania startuje czytanie instrukcji przez lektora; opcja dodania/zmiany/usunięcia).
- Lista kroków wykonania (numerowana).
- Wskazówka bezpieczeństwa.
- Tabela serii×powtórzeń dla 4 faz programu.
- Skróty stopera (kilka gotowych czasów do jednego kliknięcia).
- Zwijalna sekcja z promptami AI (osobno do infografiki i wideo) + akcja kopiowania do schowka.

### 2.9 Postępy
- Pasek ogólnego postępu programu + seria dni.
- Karta podsumowania bieżącego tygodnia.
- Siatka odznak: wszystkie odznaki, stan zdobyta/niezdobyta, ikona, nazwa, opis warunku (np. jako podpowiedź po najechaniu/dotknięciu), licznik zdobytych.
- Pełna historia sesji: chronologiczna lista wszystkich treningów z datą, czasem trwania, ocenami, zgłoszonym bólem.
- Sekcja wagi: wykres/trend, formularz dodania wpisu (waga + data), lista ostatnich wpisów.
- Sekcja obwodów ciała: formularz (talia, biodra, uda, ramiona, wynik testu funkcjonalnego, data), lista ostatnich wpisów.
- Sekcja zdjęć sylwetki: akcja dodania zdjęcia, siatka miniatur z datami i akcją usunięcia, suwak porównania przed/po (widoczny od 2 zdjęć wzwyż) pokazujący najstarsze vs. najnowsze zdjęcie z możliwością przeciągania granicy.

### 2.10 Więcej (hub)
- Lista linków: Bezpieczeństwo i informacje, Profil i ustawienia, Polityka prywatności, Regulamin.

### 2.11 Profil i ustawienia
- Nagłówek profilu: inicjał/awatar, imię, numer dnia programu.
- Formularz edycji wszystkich danych profilu (te same pola co onboarding, w pełni edytowalne po fakcie).
- Lista profili na urządzeniu + przełączanie aktywnego + dodanie nowego + usunięcie.
- Wybór wyglądu: automatyczny/jasny/ciemny.
- Ustawienia lektora: przełącznik + styl motywacji (łagodny/ostry).
- Ustawienia muzyki: przełącznik + informacja o liczbie utworów + suwak głośności.
- Ustawienia przypomnień: przełącznik codziennego przypomnienia + wybór godziny/minuty + zapis + wyjaśnienie ograniczeń.
- Kopia danych: eksport, import.
- Reset: wyzerowanie postępów bieżącego profilu (akcja nieodwracalna, wymaga jasnego oznaczenia).

### 2.12 Boczne menu (dostępne z dowolnego miejsca w aplikacji)
- Skrócone podsumowanie profilu (imię, numer dnia).
- Linki: profil i ustawienia, bezpieczeństwo i informacje, polityka prywatności, regulamin, powrót do strony głównej/marketingowej.
- Zapewnienie o lokalnym przechowywaniu danych.

### 2.13 Nawigacja główna (stała, widoczna na głównych ekranach)
5 pozycji najwyższego poziomu: Dziś, Plan, Ćwiczenia, Postępy, Więcej.

### 2.14 Nagłówek aplikacji (stały)
- Dostęp do bocznego menu.
- Tożsamość marki / link do ekranu głównego.
- Nazwa aktywnego profilu / skrót do ustawień.

### 2.15 Strona docelowa (marketing, poza samą aplikacją)
- Sekcja powitalna: główna obietnica produktu, wezwanie do działania (otwórz aplikację) + akcja drugorzędna (zobacz funkcje).
- Pasek zaufania: liczba dni programu, liczba ćwiczeń w bazie, liczba faz, koszt (za darmo).
- Sekcja funkcji: krótkie opisy głównych możliwości (silnik programu, tryb prowadzony, lektor, śledzenie postępów, instalacja).
- Sekcja bezpieczeństwa/zaufania: wprost sformułowane zastrzeżenie medyczne, zachęta do zgłaszania bólu jako normalnej części korzystania.
- Powtórzone wezwanie do działania na końcu strony.
- Stopka: identyfikacja marki, link do kodu źródłowego, linki prawne, kontakt.

### 2.16 Strony prawne
- **Polityka prywatności:** jakie dane istnieją i gdzie są przechowywane (lokalnie), tożsamość administratora, obsługa danych wrażliwych, ujawnienie hostingu/danych technicznych, ujawnienie analityki, ujawnienie reklam (w tym linki do zarządzania personalizacją), wykorzystywane uprawnienia przeglądarki (mowa, aparat/galeria, powiadomienia), prawa użytkownika (dostęp/eksport, sprostowanie, usunięcie), polityka wobec dzieci, informacja o aktualizacjach dokumentu.
- **Regulamin:** postanowienia ogólne, charakter usługi, zastrzeżenie medyczne, odesłanie do polityki prywatności, własność intelektualna, ograniczenie odpowiedzialności, zmiany regulaminu, prawo właściwe i kontakt.

---

## 3. Stany i przypadki brzegowe do uwzględnienia
- Pierwsza wizyta bez profilu → wymusza onboarding.
- Profil istnieje, ale brak potwierdzonej zgody bezpieczeństwa → wymusza ekran zgody przed czymkolwiek innym.
- Brak zapisanych sesji / pomiarów / zdjęć / wpisów wagi → każda z tych sekcji potrzebuje osobnego stanu pustego z zachętą do pierwszego wpisu.
- Dzień odpoczynku vs. dzień treningowy vs. dzień obwodowy — trzy różne układy treści na tym samym typie ekranu (dzień/trening).
- Ćwiczenie z pełnym materiałem (zdjęcie + wideo) vs. tylko ze zdjęciem vs. z sekwencją zdjęć (flipbook) vs. zupełnie bez materiału (sam prompt AI).
- Aktywne dostosowania dnia (0 vs. 1 vs. kilka jednocześnie) wpływające na treść treningu.
- Sugestia zmiany trudności: widoczna dopiero po odpowiedniej liczbie sesji, inaczej ukryta.
- Porównanie zdjęć: niedostępne przy mniej niż 2 zdjęciach.
- Wiele profili na urządzeniu vs. dokładnie jeden.
