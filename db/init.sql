-- Tworzenie schematu
CREATE SCHEMA IF NOT EXISTS project;

-- Sekwencje
CREATE SEQUENCE IF NOT EXISTS project.administratorzy_administrator_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS project.historia_wizyt_historia_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS project.lekarze_lekarz_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS project.leki_lek_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS project.pacjenci_pacjent_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS project.recepcjonistki_recepcjonistka_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS project.recepty_recepta_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS project.uzytkownicy_uzytkownik_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS project.wizyty_wizyta_id_seq START 1;

-- Tabele
CREATE TABLE IF NOT EXISTS project.leki (
                                            lek_id SERIAL PRIMARY KEY,
                                            nazwa VARCHAR(255) NOT NULL,
                                            opis TEXT,
                                            cena NUMERIC(10, 2),
                                            jednostka VARCHAR(50),
                                            pojemnosc_opakowania INT
);

CREATE TABLE IF NOT EXISTS project.pacjenci (
                                                pacjent_id SERIAL PRIMARY KEY,
                                                imie VARCHAR(100) NOT NULL,
                                                nazwisko VARCHAR(100) NOT NULL,
                                                numer_telefonu VARCHAR(15),
                                                email VARCHAR(100),
                                                data_urodzenia DATE,
                                                pesel CHAR(11) NOT NULL UNIQUE,
                                                plec CHAR(1) NOT NULL CHECK (plec IN ('M', 'K'))
);

CREATE TABLE IF NOT EXISTS project."session" (
                                                 sid VARCHAR NOT NULL PRIMARY KEY,
                                                 sess JSON NOT NULL,
                                                 expire TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS project.uzytkownicy (
                                                   uzytkownik_id SERIAL PRIMARY KEY,
                                                   nazwa_uzytkownika VARCHAR(50) NOT NULL UNIQUE,
                                                   haslo VARCHAR(255) NOT NULL,
                                                   typ_uzytkownika VARCHAR(20) NOT NULL CHECK (typ_uzytkownika IN ('lekarz', 'recepcjonistka', 'administrator'))
);

CREATE TABLE IF NOT EXISTS project.administratorzy (
                                                       administrator_id SERIAL PRIMARY KEY,
                                                       uzytkownik_id INT REFERENCES project.uzytkownicy ON DELETE CASCADE,
                                                       imie VARCHAR(100) NOT NULL,
                                                       nazwisko VARCHAR(100) NOT NULL,
                                                       numer_telefonu VARCHAR(15),
                                                       email VARCHAR(100),
                                                       data_urodzenia DATE
);

CREATE TABLE IF NOT EXISTS project.lekarze (
                                               lekarz_id SERIAL PRIMARY KEY,
                                               uzytkownik_id INT REFERENCES project.uzytkownicy ON DELETE CASCADE,
                                               imie VARCHAR(100) NOT NULL,
                                               nazwisko VARCHAR(100) NOT NULL,
                                               numer_telefonu VARCHAR(15),
                                               email VARCHAR(100),
                                               specjalizacja VARCHAR(100),
                                               data_urodzenia DATE,
                                               godziny_pracy_od TIME,
                                               godziny_pracy_do TIME
);

CREATE TABLE IF NOT EXISTS project.recepcjonistki (
                                                      recepcjonistka_id SERIAL PRIMARY KEY,
                                                      uzytkownik_id INT REFERENCES project.uzytkownicy ON DELETE CASCADE,
                                                      imie VARCHAR(100) NOT NULL,
                                                      nazwisko VARCHAR(100) NOT NULL,
                                                      numer_telefonu VARCHAR(15),
                                                      email VARCHAR(100),
                                                      data_urodzenia DATE
);

CREATE TABLE IF NOT EXISTS project.wizyty (
                                              wizyta_id SERIAL PRIMARY KEY,
                                              pacjent_id INT REFERENCES project.pacjenci ON DELETE CASCADE,
                                              lekarz_id INT REFERENCES project.lekarze ON DELETE CASCADE,
                                              data_wizyty DATE NOT NULL,
                                              godzina TIME NOT NULL,
                                              opis TEXT,
                                              status VARCHAR(20) NOT NULL DEFAULT 'zaplanowana' CHECK (status IN ('zaplanowana', 'odbyta', 'odwołana')),
                                              UNIQUE(pacjent_id, lekarz_id, data_wizyty, godzina)
);

CREATE TABLE IF NOT EXISTS project.historia_wizyt (
                                                      historia_id SERIAL PRIMARY KEY,
                                                      wizyta_id INT REFERENCES project.wizyty ON DELETE CASCADE,
                                                      diagnoza TEXT
);

CREATE TABLE IF NOT EXISTS project.recepty (
                                               recepta_id SERIAL PRIMARY KEY,
                                               historia_id INT REFERENCES project.historia_wizyt ON DELETE CASCADE,
                                               data_wystawienia DATE,
                                               dawkowanie VARCHAR(255),
                                               nr_recepty TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS project.recepty_leki (
                                                    recepta_id INT REFERENCES project.recepty ON DELETE CASCADE,
                                                    lek_id INT REFERENCES project.leki ON DELETE CASCADE,
                                                    PRIMARY KEY (recepta_id, lek_id)
);

-- Funkcje i triggery

CREATE OR REPLACE FUNCTION project.delete_patient_related_data()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM project.recepty_leki WHERE recepta_id IN (
        SELECT recepta_id FROM project.recepty WHERE historia_id IN (
            SELECT historia_id FROM project.historia_wizyt WHERE wizyta_id IN (
                SELECT wizyta_id FROM project.wizyty WHERE pacjent_id = OLD.pacjent_id
            )
        )
    );

    DELETE FROM project.recepty WHERE historia_id IN (
        SELECT historia_id FROM project.historia_wizyt WHERE wizyta_id IN (
            SELECT wizyta_id FROM project.wizyty WHERE pacjent_id = OLD.pacjent_id
        )
    );

    DELETE FROM project.historia_wizyt WHERE wizyta_id IN (
        SELECT wizyta_id FROM project.wizyty WHERE pacjent_id = OLD.pacjent_id
    );

    DELETE FROM project.wizyty WHERE pacjent_id = OLD.pacjent_id;

    RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION project.generuj_nr_recepty()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
DECLARE
    losowy_numer TEXT;
BEGIN
    losowy_numer := lpad((trunc(random() * 10000)::int)::text, 4, '0');
    NEW.nr_recepty := 'REC' || TO_CHAR(NEW.data_wystawienia, 'YYYYMMDD') || '-' || losowy_numer;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION project.sprawdz_date_wizyty()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.data_wizyty < CURRENT_DATE THEN
        RAISE EXCEPTION 'Nie można umówić wizyty w przeszłości. Proszę wybrać datę z przyszłości.' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION project.update_wizyta_status()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE project.wizyty SET status = 'odbyta' WHERE wizyta_id = NEW.wizyta_id;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION project.validate_pesel(pesel text, birth_date date, gender character)
    RETURNS boolean
    LANGUAGE plpgsql
AS $$
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
                WHEN SUBSTRING(pesel, 3, 1)::INT IN (2, 3) THEN '20' || SUBSTRING(pesel, 1, 2) || '-' || LPAD((SUBSTRING(pesel, 3, 2)::INT - 20)::TEXT, 2, '0') || '-' || SUBSTRING(pesel, 5, 2)
                WHEN SUBSTRING(pesel, 3, 1)::INT IN (8, 9) THEN '18' || SUBSTRING(pesel, 1, 2) || '-' || LPAD((SUBSTRING(pesel, 3, 2)::INT - 80)::TEXT, 2, '0') || '-' || SUBSTRING(pesel, 5, 2)
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
$$;

CREATE OR REPLACE FUNCTION project.validate_pesel_trigger()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT project.validate_pesel(NEW.pesel, NEW.data_urodzenia, NEW.plec) THEN
        RAISE EXCEPTION 'Niepoprawny numer PESEL: % dla daty urodzenia % i płci %', NEW.pesel, NEW.data_urodzenia, NEW.plec;
    END IF;
    RETURN NEW;
END;
$$;

-- Triggery (na końcu)
CREATE TRIGGER check_pesel_validity
    BEFORE INSERT OR UPDATE ON project.pacjenci
    FOR EACH ROW EXECUTE FUNCTION project.validate_pesel_trigger();

CREATE TRIGGER before_patient_delete
    BEFORE DELETE ON project.pacjenci
    FOR EACH ROW EXECUTE FUNCTION project.delete_patient_related_data();

CREATE TRIGGER sprawdz_date
    BEFORE INSERT OR UPDATE ON project.wizyty
    FOR EACH ROW EXECUTE FUNCTION project.sprawdz_date_wizyty();

CREATE TRIGGER set_wizyta_status_after_history
    AFTER INSERT ON project.historia_wizyt
    FOR EACH ROW EXECUTE FUNCTION project.update_wizyta_status();

CREATE TRIGGER generuj_nr_recepty_trigger
    BEFORE INSERT ON project.recepty
    FOR EACH ROW EXECUTE FUNCTION project.generuj_nr_recepty();


INSERT INTO project.uzytkownicy (nazwa_uzytkownika, haslo, typ_uzytkownika) VALUES
                                                                                ('admin1', 'adminpass', 'administrator'),
                                                                                ('lekarz1', 'lekarzpass', 'lekarz'),
                                                                                ('recepcja1', 'recepcjapass', 'recepcjonistka');

-- Lekarz
INSERT INTO project.lekarze (uzytkownik_id, imie, nazwisko, numer_telefonu, email, specjalizacja, data_urodzenia, godziny_pracy_od, godziny_pracy_do) VALUES
    (2, 'Michał', 'Nowicki', '500100200', 'michal.nowicki@example.com', 'kardiolog', '1978-05-10', '08:00', '16:00');

-- Recepcjonistka
INSERT INTO project.recepcjonistki (uzytkownik_id, imie, nazwisko, numer_telefonu, email, data_urodzenia) VALUES
    (3, 'Karolina', 'Mazur', '600700800', 'karolina.mazur@example.com', '1995-09-22');

INSERT INTO project.administratorzy (uzytkownik_id, imie, nazwisko, numer_telefonu, email, data_urodzenia) VALUES
    (1, 'Jan', 'Admin', '111222333', 'jan.admin@example.com', '1980-01-01');