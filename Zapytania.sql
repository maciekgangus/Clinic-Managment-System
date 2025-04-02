-- ======================================================
-- Funkcje dla Administratora
-- ======================================================

-- Dodawanie nowego użytkownika
-- ====================================
-- Zapytanie dodaje nowego użytkownika do tabeli 'uzytkownicy' i w zależności od typu użytkownika
-- wstawia dodatkowe dane do odpowiednich tabel szczegółowych ('lekarze', 'recepcjonistki', 'administratorzy').

-- Wstawienie danych użytkownika do tabeli 'uzytkownicy'
INSERT INTO project.uzytkownicy (nazwa_uzytkownika, haslo, typ_uzytkownika)
VALUES ($1, $2, $3)
RETURNING *;

-- Wstawienie szczegółowych danych lekarza
INSERT INTO project.lekarze (
    uzytkownik_id, imie, nazwisko, numer_telefonu, email, data_urodzenia, specjalizacja, godziny_pracy_od, godziny_pracy_do
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

-- Wstawienie szczegółowych danych recepcjonistki
INSERT INTO project.recepcjonistki (
    uzytkownik_id, imie, nazwisko, numer_telefonu, email, data_urodzenia
)
VALUES ($1, $2, $3, $4, $5, $6);

-- Wstawienie szczegółowych danych administratora
INSERT INTO project.administratorzy (
    uzytkownik_id, imie, nazwisko, numer_telefonu, email, data_urodzenia
)
VALUES ($1, $2, $3, $4, $5, $6);

-- Usuwanie użytkowników
-- ====================================
-- Zapytanie usuwa użytkowników z tabeli 'uzytkownicy' oraz związane dane z tabel szczegółowych.

-- Usunięcie użytkowników z tabeli 'uzytkownicy'
DELETE FROM project.uzytkownicy
WHERE uzytkownik_id = ANY($1::int[]);

-- Usunięcie szczegółowych danych administratorów
DELETE FROM project.administratorzy
WHERE uzytkownik_id = ANY($1::int[]);

-- Usunięcie szczegółowych danych lekarzy
DELETE FROM project.lekarze
WHERE uzytkownik_id = ANY($1::int[]);

-- Usunięcie szczegółowych danych recepcjonistek
DELETE FROM project.recepcjonistki
WHERE uzytkownik_id = ANY($1::int[]);

-- Wyświetlenie listy użytkowników
-- ====================================
-- Zapytanie pobiera listę wszystkich użytkowników z tabeli 'uzytkownicy',
-- scalając dane z tabel szczegółowych za pomocą funkcji COALESCE.

SELECT
    u.uzytkownik_id,
    u.nazwa_uzytkownika,
    u.typ_uzytkownika,
    COALESCE(d.imie, l.imie, r.imie) AS imie,
    COALESCE(d.nazwisko, l.nazwisko, r.nazwisko) AS nazwisko,
    COALESCE(d.email, l.email, r.email) AS email
FROM
    project.uzytkownicy u
        LEFT JOIN project.administratorzy d ON u.uzytkownik_id = d.uzytkownik_id
        LEFT JOIN project.lekarze l ON u.uzytkownik_id = l.uzytkownik_id
        LEFT JOIN project.recepcjonistki r ON u.uzytkownik_id = r.uzytkownik_id;


-- ======================================================
-- Funkcje dla Rejestracji i Recepcjonistki
-- ======================================================

-- Dodawanie pacjentów
-- ====================================
-- Zapytanie dodaje nowego pacjenta do tabeli 'pacjenci'.
-- Przed dodaniem sprawdza, czy pacjent z podanym PESEL-em już istnieje.

-- Sprawdzenie, czy pacjent z PESEL-em już istnieje
SELECT * FROM project.pacjenci WHERE pesel = $1;

-- Dodanie nowego pacjenta
INSERT INTO project.pacjenci (imie, nazwisko, pesel, data_urodzenia, plec, numer_telefonu, email)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- Wyświetlanie listy pacjentów
-- ====================================
-- Zapytanie pobiera listę pacjentów z możliwością filtrowania (np. po imieniu, nazwisku, płci).
-- Umożliwia sortowanie i paginację wyników.

-- Obliczenie całkowitej liczby pacjentów (do paginacji)
SELECT COUNT(*) AS total FROM project.pacjenci
WHERE
    (imie ILIKE $1 OR nazwisko ILIKE $1 OR numer_telefonu ILIKE $1 OR email ILIKE $1 OR pesel ILIKE $1)
  AND (plec = $2);

-- Pobranie listy pacjentów z filtrowaniem, sortowaniem i paginacją
SELECT * FROM project.pacjenci
WHERE
    (imie ILIKE $1 OR nazwisko ILIKE $1 OR numer_telefonu ILIKE $1 OR email ILIKE $1 OR pesel ILIKE $1)
  AND (plec = $2)
ORDER BY nazwisko ASC
LIMIT $3 OFFSET $4;

-- Umawianie wizyt
-- ====================================
-- Zapytanie umawia wizytę dla pacjenta u lekarza na konkretną datę i godzinę.

-- Dodanie wizyty
INSERT INTO project.wizyty (lekarz_id, pacjent_id, data_wizyty, godzina, opis)
VALUES ($1, $2, $3, $4, $5);

-- Pobieranie dostępnych godzin wizyt
-- ====================================
-- Zapytanie sprawdza godziny pracy lekarza i zwraca dostępne sloty w określonym dniu.

-- Pobranie godzin pracy lekarza
SELECT godziny_pracy_od, godziny_pracy_do
FROM project.lekarze
WHERE lekarz_id = $1;

-- Pobranie zajętych godzin wizyt dla lekarza w danym dniu
SELECT godzina
FROM project.wizyty
WHERE lekarz_id = $1
  AND data_wizyty = $2;

-- Odwoływanie wizyt
-- ====================================
-- Zapytanie usuwa wizytę z tabeli 'wizyty' na podstawie jej identyfikatora.

DELETE FROM project.wizyty
WHERE wizyta_id = $1;

-- Wyświetlanie listy lekarzy
-- ====================================
-- Zapytanie pobiera listę lekarzy, w tym ich imię, nazwisko i specjalizację.

SELECT lekarz_id AS id, imie, nazwisko, specjalizacja
FROM project.lekarze;

-- Wyświetlanie listy pacjentów
-- ====================================
-- Zapytanie pobiera listę pacjentów, w tym ich imię, nazwisko, i PESEL.

SELECT pacjent_id AS id, imie, nazwisko, pesel
FROM project.pacjenci;


-- ======================================================
-- Funkcje dla Lekarza
-- ======================================================

-- Pobieranie szczegółów wizyt w danym dniu
-- ====================================
-- Zapytanie zwraca pacjentów wraz z godzinami wizyt w podanym dniu.
SELECT w.godzina, p.imie, p.nazwisko, p.pesel, w.wizyta_id, w.status
FROM project.wizyty w
         JOIN project.pacjenci p ON w.pacjent_id = p.pacjent_id
WHERE w.data_wizyty = $1
ORDER BY w.godzina;

-- Pobieranie opisu wizyty
-- ====================================
-- Zapytanie zwraca opis wizyty na podstawie jej ID.
SELECT opis
FROM project.wizyty
WHERE wizyta_id = $1;

-- Pobieranie listy leków
-- ====================================
-- Zapytanie zwraca listę dostępnych leków z tabeli 'leki'.
SELECT lek_id, nazwa, opis, cena, pojemnosc_opakowania
FROM project.leki;

-- Pobieranie szczegółów wizyty
-- ====================================
-- Zapytanie zwraca datę i pacjenta powiązanego z wizytą.
SELECT w.data_wizyty, w.pacjent_id
FROM project.wizyty w
         JOIN project.pacjenci p ON w.pacjent_id = p.pacjent_id
WHERE w.wizyta_id = $1;

-- Dodanie historii wizyty i recepty
-- ====================================
-- Zapytanie dodaje diagnozę do tabeli 'historia_wizyt'.
INSERT INTO project.historia_wizyt (wizyta_id, diagnoza)
VALUES ($1, $2)
RETURNING historia_id;

-- Dodanie recepty
INSERT INTO project.recepty (historia_id, data_wystawienia, dawkowanie)
VALUES ($1, $2, $3)
RETURNING recepta_id;

-- Przypisanie leków do recepty
INSERT INTO project.recepty_leki (recepta_id, lek_id)
VALUES ($1, $2);

-- Generowanie kalendarza lekarza
-- ====================================
-- Pobranie godzin pracy lekarza.
SELECT godziny_pracy_od AS startHour, godziny_pracy_do AS endHour
FROM project.lekarze
WHERE uzytkownik_id = $1;

-- Pobieranie tygodniowego harmonogramu
-- ====================================
-- Zapytanie zwraca harmonogram wizyt lekarza na podstawie zakresu dat.
SELECT
    w.godzina,
    CASE WHEN w.data_wizyty = $2 THEN JSON_BUILD_OBJECT('pesel', p.pesel, 'visitId', w.wizyta_id) ELSE NULL END AS poniedzialek,
    CASE WHEN w.data_wizyty = $3 THEN JSON_BUILD_OBJECT('pesel', p.pesel, 'visitId', w.wizyta_id) ELSE NULL END AS wtorek,
    CASE WHEN w.data_wizyty = $4 THEN JSON_BUILD_OBJECT('pesel', p.pesel, 'visitId', w.wizyta_id) ELSE NULL END AS sroda,
    CASE WHEN w.data_wizyty = $5 THEN JSON_BUILD_OBJECT('pesel', p.pesel, 'visitId', w.wizyta_id) ELSE NULL END AS czwartek,
    CASE WHEN w.data_wizyty = $6 THEN JSON_BUILD_OBJECT('pesel', p.pesel, 'visitId', w.wizyta_id) ELSE NULL END AS piatek
FROM project.wizyty w
         LEFT JOIN project.pacjenci p ON w.pacjent_id = p.pacjent_id
WHERE w.lekarz_id = $1 AND w.data_wizyty BETWEEN $2 AND $6
ORDER BY w.godzina;

-- Pobieranie pacjentów z odbytymi wizytami
-- ====================================
-- Zapytanie zwraca listę pacjentów z odbytymi wizytami przypisanych do danego lekarza.
SELECT DISTINCT
    p.pacjent_id,
    p.imie,
    p.nazwisko,
    p.pesel
FROM project.wizyty w
         JOIN project.pacjenci p ON w.pacjent_id = p.pacjent_id
         JOIN project.lekarze l ON l.uzytkownik_id = $1
WHERE w.lekarz_id = l.lekarz_id AND w.status = 'odbyta'
ORDER BY p.nazwisko, p.imie;

-- Pobieranie szczegółów pacjenta (wizyty i recepty)
-- ====================================
-- Zapytanie zwraca szczegóły wizyt i recept pacjenta.
SELECT
    w.data_wizyty,
    w.opis,
    CONCAT(l.imie, ' ', l.nazwisko) AS lekarz_prowadzacy,
    hw.diagnoza,
    r.recepta_id,
    r.nr_recepty,
    r.data_wystawienia
FROM project.pacjenci p
         LEFT JOIN project.wizyty w ON w.pacjent_id = p.pacjent_id
         LEFT JOIN project.historia_wizyt hw ON hw.wizyta_id = w.wizyta_id
         LEFT JOIN project.recepty r ON hw.historia_id = r.historia_id
         LEFT JOIN project.lekarze l ON w.lekarz_id = l.lekarz_id
WHERE p.pacjent_id = $1
ORDER BY w.data_wizyty DESC;

-- Pobieranie statystyk rocznych
-- ====================================
-- Liczenie wizyt i średniej miesięcznej.
SELECT
    SUM(month_visits) AS total_visits,
    ROUND(AVG(month_visits)::numeric, 2) AS avg_visits_per_month
FROM (
         SELECT COUNT(*) AS month_visits
         FROM project.wizyty wizyty
                  JOIN project.lekarze lekarze ON wizyty.lekarz_id = lekarze.lekarz_id
         WHERE lekarze.uzytkownik_id = $1
           AND EXTRACT(YEAR FROM wizyty.data_wizyty) = $2
         GROUP BY EXTRACT(MONTH FROM wizyty.data_wizyty)
     ) AS monthly_visits;

-- Sumowanie kosztów leków.
SELECT
    COALESCE(SUM(leki.cena), 0) AS total_cost,
    COALESCE(COUNT(*)) AS total_meds
FROM project.recepty recepty
         JOIN project.historia_wizyt historia ON recepty.historia_id = historia.historia_id
         JOIN project.wizyty wizyty ON historia.wizyta_id = wizyty.wizyta_id
         JOIN project.lekarze lekarze ON wizyty.lekarz_id = lekarze.lekarz_id
         JOIN project.recepty_leki recepty_leki ON recepty.recepta_id = recepty_leki.recepta_id
         JOIN project.leki leki ON recepty_leki.lek_id = leki.lek_id
WHERE lekarze.uzytkownik_id = $1
  AND EXTRACT(YEAR FROM wizyty.data_wizyty) = $2;

-- Pobieranie statystyk miesięcznych
-- ====================================
-- Liczenie wizyt i sumowanie kosztów leków w miesiącu.
SELECT
    COUNT(*) AS total_visits
FROM project.wizyty wizyty
         JOIN project.lekarze lekarze ON wizyty.lekarz_id = lekarze.lekarz_id
WHERE lekarze.uzytkownik_id = $1
  AND EXTRACT(YEAR FROM wizyty.data_wizyty) = $2
  AND EXTRACT(MONTH FROM wizyty.data_wizyty) = $3;

SELECT
    COALESCE(SUM(leki.cena), 0) AS total_cost,
    COALESCE(COUNT(*)) AS total_meds
FROM project.recepty recepty
         JOIN project.historia_wizyt historia ON recepty.historia_id = historia.historia_id
         JOIN project.wizyty wizyty ON historia.wizyta_id = wizyty.wizyta_id
         JOIN project.lekarze lekarze ON wizyty.lekarz_id = lekarze.lekarz_id
         JOIN project.recepty_leki recepty_leki ON recepty.recepta_id = recepty_leki.recepta_id
         JOIN project.leki leki ON recepty_leki.lek_id = leki.lek_id
WHERE lekarze.uzytkownik_id = $1
  AND EXTRACT(YEAR FROM wizyty.data_wizyty) = $2
  AND EXTRACT(MONTH FROM wizyty.data_wizyty) = $3;


-- ======================================================
-- Funkcje Wspólne dla Każdego Użytkownika
-- ======================================================

-- Wyświetlenie danych użytkownika
-- ====================================
-- Zapytanie pobiera dane użytkownika z tabeli 'uzytkownicy'.
SELECT *
FROM project.uzytkownicy
WHERE uzytkownik_id = $1;

-- Pobranie szczegółowych danych użytkownika na podstawie roli
-- ====================================
-- Zapytanie pobiera dane użytkownika z odpowiadającej tabeli w zależności od roli:
-- - administratorzy
-- - lekarze
-- - recepcjonistki
SELECT *
FROM project.${tableType}
WHERE uzytkownik_id = $1;

-- Aktualizacja danych użytkownika
-- ====================================
-- Aktualizacja danych użytkownika w tabeli 'uzytkownicy'.
UPDATE project.uzytkownicy
SET nazwa_uzytkownika = $1
WHERE uzytkownik_id = $2;

-- Aktualizacja szczegółowych danych użytkownika w tabelach ról
-- ====================================
-- - administratorzy
-- - lekarze
-- - recepcjonistki
UPDATE project.${tableType}
SET imie = $1,
    nazwisko = $2,
    email = $3,
    numer_telefonu = $4,
    data_urodzenia = $5
WHERE uzytkownik_id = $6;

-- Aktualizacja dodatkowych danych lekarzy
-- ====================================
-- Jeśli użytkownik jest lekarzem, zapytanie dodatkowo aktualizuje specjalizację i godziny pracy.
UPDATE project.lekarze
SET specjalizacja = $1,
    godziny_pracy_od = $2,
    godziny_pracy_do = $3
WHERE uzytkownik_id = $4;

-- Weryfikacja istnienia użytkownika
-- ====================================
-- Zapytanie sprawdza, czy użytkownik o podanej nazwie istnieje w bazie danych.
SELECT *
FROM project.uzytkownicy
WHERE nazwa_uzytkownika = $1;

-- Logika logowania:
-- 1. Sprawdza, czy użytkownik istnieje w bazie danych na podstawie nazwy użytkownika.
-- 2. Pobiera dane użytkownika, w tym:
--    - `uzytkownik_id`: ID użytkownika.
--    - `haslo`: Zaszyfrowane hasło.
--    - `typ_uzytkownika`: Rola użytkownika (administrator, lekarz, recepcjonistka).
-- 3. Waliduje hasło za pomocą algorytmu `bcrypt.compare` (hasło użytkownika jest porównywane z hasłem zapisanym w bazie danych).
-- 4. Po udanym logowaniu zapisuje w sesji dane:
--    - `userId`: ID użytkownika.
--    - `username`: Nazwa użytkownika.
--    - `role`: Rola użytkownika.


-- Dokumentacja funkcji i wyzwalaczy w schemacie 'project'

-- ################################################################################################
-- FUNKCJA: delete_patient_related_data
-- Opis:
-- Funkcja usuwa wszystkie powiązane dane (recepty, historia wizyt, wizyty) przed usunięciem rekordu
-- z tabeli 'pacjenci'. Wywoływana przez wyzwalacz przed usunięciem pacjenta.
-- Parametry wejściowe:
--   Brak - korzysta z OLD.pacjent_id (wartość usuwanego rekordu).
-- Zwracany typ:
--   trigger
-- ################################################################################################
CREATE OR REPLACE FUNCTION project.delete_patient_related_data()
    RETURNS trigger
    LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM project.recepty_leki
    WHERE recepta_id IN (
        SELECT recepta_id
        FROM project.recepty
        WHERE historia_id IN (
            SELECT historia_id
            FROM project.historia_wizyt
            WHERE wizyta_id IN (
                SELECT wizyta_id
                FROM project.wizyty
                WHERE pacjent_id = OLD.pacjent_id
            )
        )
    );

    DELETE FROM project.recepty
    WHERE historia_id IN (
        SELECT historia_id
        FROM project.historia_wizyt
        WHERE wizyta_id IN (
            SELECT wizyta_id
            FROM project.wizyty
            WHERE pacjent_id = OLD.pacjent_id
        )
    );

    DELETE FROM project.historia_wizyt
    WHERE wizyta_id IN (
        SELECT wizyta_id
        FROM project.wizyty
        WHERE pacjent_id = OLD.pacjent_id
    );

    DELETE FROM project.wizyty
    WHERE pacjent_id = OLD.pacjent_id;

    RETURN OLD;
END;
$function$;

-- ################################################################################################
-- FUNKCJA: generuj_nr_recepty
-- Opis:
-- Funkcja generuje unikalny numer recepty w formacie "RECYYYYMMDD-XXXX", gdzie YYYYMMDD to data
-- wystawienia, a XXXX to losowy numer o długości 4 cyfr.
-- Parametry wejściowe:
--   NEW.data_wystawienia - data wystawienia recepty.
-- Zwracany typ:
--   trigger
-- ################################################################################################
CREATE OR REPLACE FUNCTION project.generuj_nr_recepty()
    RETURNS trigger
    LANGUAGE plpgsql
AS $function$
DECLARE
    losowy_numer TEXT;
BEGIN
    losowy_numer := lpad((trunc(random() * 10000)::int)::text, 4, '0');
    NEW.nr_recepty := 'REC' || TO_CHAR(NEW.data_wystawienia, 'YYYYMMDD') || '-' || losowy_numer;
    RETURN NEW;
END;
$function$;

-- ################################################################################################
-- FUNKCJA: sprawdz_date_wizyty
-- Opis:
-- Funkcja waliduje, czy data wizyty nie jest w przeszłości.
-- Parametry wejściowe:
--   NEW.data_wizyty - data wizyty.
-- Zwracany typ:
--   trigger
-- ################################################################################################
CREATE OR REPLACE FUNCTION project.sprawdz_date_wizyty()
    RETURNS trigger
    LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.data_wizyty < CURRENT_DATE THEN
        RAISE EXCEPTION 'Nie można umówić wizyty w przeszłości. Proszę wybrać datę z przyszłości.' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$function$;

-- ################################################################################################
-- FUNKCJA: update_wizyta_status
-- Opis:
-- Funkcja automatycznie zmienia status wizyty na "odbyta".
-- Parametry wejściowe:
--   NEW.wizyta_id - identyfikator wizyty.
-- Zwracany typ:
--   trigger
-- ################################################################################################
CREATE OR REPLACE FUNCTION project.update_wizyta_status()
    RETURNS trigger
    LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE project.wizyty
    SET status = 'odbyta'
    WHERE wizyta_id = NEW.wizyta_id;
    RETURN NEW;
END;
$function$;

-- ################################################################################################
-- FUNKCJA: validate_pesel
-- Opis:
-- Funkcja waliduje numer PESEL na podstawie daty urodzenia i płci oraz sprawdza jego sumę kontrolną.
-- Parametry wejściowe:
--   pesel - numer PESEL.
--   birth_date - data urodzenia w formacie DATE.
--   gender - płeć w formacie znakowym ('M' - mężczyzna, 'K' - kobieta).
-- Zwracany typ:
--   boolean - TRUE, jeśli PESEL jest poprawny; FALSE w przeciwnym wypadku.
-- ################################################################################################
CREATE OR REPLACE FUNCTION project.validate_pesel(pesel text, birth_date date, gender character)
    RETURNS boolean
    LANGUAGE plpgsql
AS $function$
DECLARE
    pesel_date DATE;
    checksum INT;
    gender_digit INT;
    weights INT[] := ARRAY[1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
    calculated_checksum INT := 0;
BEGIN
    IF LENGTH(pesel) != 11 OR pesel !~ '^[0-9]+$' THEN
        RETURN FALSE;
    END IF;

    pesel_date := TO_DATE(
            CASE
                WHEN SUBSTRING(pesel, 3, 1)::INT IN (0, 1) THEN '19' || SUBSTRING(pesel, 1, 2) || '-' || SUBSTRING(pesel, 3, 2) || '-' || SUBSTRING(pesel, 5, 2)
                WHEN SUBSTRING(pesel, 3, 1)::INT IN (2, 3) THEN '20' || SUBSTRING(pesel, 1, 2) || '-' || SUBSTRING(pesel, 3, 2)::INT - 20 || '-' || SUBSTRING(pesel, 5, 2)
                WHEN SUBSTRING(pesel, 3, 1)::INT IN (8, 9) THEN '18' || SUBSTRING(pesel, 1, 2) || '-' || SUBSTRING(pesel, 3, 2)::INT - 80 || '-' || SUBSTRING(pesel, 5, 2)
                ELSE NULL
                END, 'YYYY-MM-DD'
                  );

    IF pesel_date IS NULL OR pesel_date != birth_date THEN
        RETURN FALSE;
    END IF;

    gender_digit := SUBSTRING(pesel, 10, 1)::INT;
    IF (gender = 'M' AND gender_digit % 2 = 0) OR (gender = 'K' AND gender_digit % 2 != 0) THEN
        RETURN FALSE;
    END IF;

    FOR i IN 1..10 LOOP
            calculated_checksum := calculated_checksum + (SUBSTRING(pesel, i, 1)::INT * weights[i]);
        END LOOP;
    checksum := (10 - (calculated_checksum % 10)) % 10;

    IF checksum != SUBSTRING(pesel, 11, 1)::INT THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$function$;

-- ################################################################################################
-- FUNKCJA: validate_pesel_trigger
-- Opis:
-- Funkcja wywołuje walidację numeru PESEL za pomocą funkcji project.validate_pesel.
-- Parametry wejściowe:
--   NEW.pesel - numer PESEL.
--   NEW.data_urodzenia - data urodzenia.
--   NEW.plec - płeć ('M' lub 'K').
-- Zwracany typ:
--   trigger
-- ################################################################################################
CREATE OR REPLACE FUNCTION project.validate_pesel_trigger()
    RETURNS trigger
    LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT project.validate_pesel(NEW.pesel, NEW.data_urodzenia, NEW.plec) THEN
        RAISE EXCEPTION 'Niepoprawny numer PESEL: % dla daty urodzenia % i płci %', NEW.pesel, NEW.data_urodzenia, NEW.plec;
    END IF;
    RETURN NEW;
END;
$function$;

-- TRIGGERY
-- Zmiana statusu wizyty na odbytą
create trigger set_wizyta_status_after_history after
    insert
    on
        project.historia_wizyt for each row execute function project.update_wizyta_status();

-- Usunięcie wszystkich pwoiązań z pacjentem po jego usunięciu
create trigger before_patient_delete before
    delete
    on
        project.pacjenci for each row execute function project.delete_patient_related_data();

-- Sprawdzenie poprawnosci nr PESEL przed dodaniem pacjenta
create trigger check_pesel_validity before
    insert
    or
    update
    on
        project.pacjenci for each row execute function project.validate_pesel_trigger();

-- Generacja nr Recepty
create trigger generuj_nr_recepty_trigger before
    insert
    on
        project.recepty for each row execute function project.generuj_nr_recepty();

-- Sprawdzenie czy wizyty rejestrowana jest w przyszłości
create trigger sprawdz_date before
    insert
    or
    update
    on
        project.wizyty for each row execute function project.sprawdz_date_wizyty();