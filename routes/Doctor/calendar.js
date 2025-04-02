const express = require('express');
const pool = require('../../config/db'); // Twoja konfiguracja bazy danych
const router = express.Router();

router.get('/calendar/getWorkingHours', async (req, res) => {
    const doctorId = req.session.userId;

    try {
        const query = `
            SELECT godziny_pracy_od AS startHour, godziny_pracy_do AS endHour
            FROM project.lekarze
            WHERE uzytkownik_id = $1
        `;
        const result = await pool.query(query, [doctorId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Brak zdefiniowanych godzin pracy lekarza.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Błąd podczas pobierania godzin pracy lekarza:', err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

router.get('/calendar/getWeeklySchedule', async (req, res) => {
    const { startDate, endDate, doctorId } = req.query;
    let finalDoctorId = doctorId;
    console.log(startDate);
    try {
        if (!finalDoctorId) {
            const userId = req.session.userId;
            const doctorIdQuery = 'SELECT lekarz_id FROM project.lekarze WHERE uzytkownik_id = $1';
            const doctorIdResult = await pool.query(doctorIdQuery, [userId]);
            if (doctorIdResult.rows.length === 0) {
                return res.status(400).json({ error: 'Nie znaleziono lekarza dla tego użytkownika.' });
            }
            finalDoctorId = doctorIdResult.rows[0].lekarz_id;
        }
        const hoursQuery = `
            SELECT godziny_pracy_od AS startHour, godziny_pracy_do AS endHour
            FROM project.lekarze
            WHERE lekarz_id = $1
        `;
        const hoursResult = await pool.query(hoursQuery, [finalDoctorId]);
        if (hoursResult.rows.length === 0) {
            return res.status(404).json({ error: 'Brak zdefiniowanych godzin pracy lekarza.' });
        }
        const { starthour, endhour } = hoursResult.rows[0];

        const scheduleQuery = `
            SELECT
                w.godzina,
                CASE
                    WHEN w.data_wizyty = $2 THEN JSON_BUILD_OBJECT('pesel', p.pesel, 'visitId', w.wizyta_id)
                    ELSE NULL
                    END AS poniedzialek,
                CASE
                    WHEN w.data_wizyty = $3 THEN JSON_BUILD_OBJECT('pesel', p.pesel, 'visitId', w.wizyta_id)
                    ELSE NULL
                    END AS wtorek,
                CASE
                    WHEN w.data_wizyty = $4 THEN JSON_BUILD_OBJECT('pesel', p.pesel, 'visitId', w.wizyta_id)
                    ELSE NULL
                    END AS sroda,
                CASE
                    WHEN w.data_wizyty = $5 THEN JSON_BUILD_OBJECT('pesel', p.pesel, 'visitId', w.wizyta_id)
                    ELSE NULL
                    END AS czwartek,
                CASE
                    WHEN w.data_wizyty = $6 THEN JSON_BUILD_OBJECT('pesel', p.pesel, 'visitId', w.wizyta_id)
                    ELSE NULL
                    END AS piatek
            FROM project.wizyty w
                     LEFT JOIN project.pacjenci p ON w.pacjent_id = p.pacjent_id
            WHERE w.lekarz_id = $1 AND w.data_wizyty BETWEEN $2 AND $6
            ORDER BY w.godzina;


        `;


        const scheduleResult = await pool.query(scheduleQuery, [
            finalDoctorId,
            startDate,
            new Date(new Date(startDate).getTime() + 1 * 86400000).toISOString().slice(0, 10),
            new Date(new Date(startDate).getTime() + 2 * 86400000).toISOString().slice(0, 10),
            new Date(new Date(startDate).getTime() + 3 * 86400000).toISOString().slice(0, 10),
            new Date(new Date(startDate).getTime() + 4 * 86400000).toISOString().slice(0, 10),
        ]);
        console.log(scheduleResult.rows);
        console.log(startDate);
        res.json({ startHour: starthour, endHour: endhour, schedule: scheduleResult.rows });
    } catch (err) {
        console.error('Błąd podczas pobierania danych:', err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

router.get('/calendar/getDoctors', async (req, res) => {
    try {
        const doctorsResult = await pool.query(
            'SELECT lekarz_id AS id, imie, nazwisko, specjalizacja FROM project.lekarze'
        );
        res.json(doctorsResult.rows); // Zwróć bezpośrednio tablicę
    } catch (err) {
        console.error('Błąd podczas pobierania listy lekarzy:', err);
        res.status(500).json({ error: 'Błąd serwera podczas pobierania lekarzy.' });
    }
});

router.get('/calendar/getVisitDetails', async (req, res) => {
    const { visitId } = req.query; // Odbieramy id wizyty z zapytania

    try {
        const visitDetailsQuery = `
            SELECT
                w.data_wizyty AS date,
                w.godzina AS time,
                w.opis AS description,
                CONCAT(p.imie, ' ', p.nazwisko) AS patientname,
                p.pesel,
                w.wizyta_id AS visitId,
                w.status 
            FROM
                project.wizyty w
                    JOIN
                project.pacjenci p
                ON
                    w.pacjent_id = p.pacjent_id
            WHERE
                w.wizyta_id = $1; -- Identyfikacja wizyty po jej ID
        `;

        const result = await pool.query(visitDetailsQuery, [visitId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Nie znaleziono szczegółów wizyty.' });
        }

        // Zwracamy szczegóły wizyty
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Błąd podczas pobierania szczegółów wizyty:', err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});




module.exports = router;
