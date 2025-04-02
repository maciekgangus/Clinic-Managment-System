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



-- Triggery (na końcu)


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



INSERT INTO project.pacjenci (imie, nazwisko, numer_telefonu, email, data_urodzenia, pesel, plec) VALUES

                                                                                                      ('Tomasz', 'Wójcik', '654321987', 'tomasz.wojcik@example.com', '1985-07-25', '85072563176', 'M'),
                                                                                                      ('Ewa', 'Dąbrowska', '112233445', 'ewa.dabrowska@example.com', '1960-11-05', '60110579591', 'K'),
                                                                                                      ('Jolanta', 'Nowak', '123456789', 'jolanta.nowak@example.com', '1965-09-26', '65092657383', 'K'),
                                                                                                      ('Krzysztof', 'Bąk', '987654321', 'krzysztof.bak@example.com', '1989-05-21', '89052172336', 'M'),
                                                                                                      ('Andrzej', 'Kowalski', '123456789', 'andrzej.kowalski@example.com', '1953-01-25', '53012555222', 'M'),
                                                                                                      ('Pawel', 'Białecki', '987654321', 'ewa.bialecka@example.com', '1964-07-29', '64072953312', 'M'),
                                                                                                      ('Krzysztof', 'Mazurek', '555123456', 'krzysztof.mazurek@example.com', '1993-02-09', '93020965932', 'M');

