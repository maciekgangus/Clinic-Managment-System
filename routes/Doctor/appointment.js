const express = require('express');
const pool = require('../../config/db'); // Twoja konfiguracja bazy danych
const router = express.Router();

// Renderowanie formularza rozpoczęcia wizyty
router.get('/', (req, res) => {
    res.render('index', {
        title: 'Rozpocznij Wizytę',
        content: 'Doctor/appointment'
    });
});

router.get('/getVisitDetails', async (req, res) => {
    const { visitDate } = req.query; // Odbieramy datę wizyty z zapytania

    try {
        // Zapytanie SQL do pobrania pacjentów z przypisanymi godzinami wizyt
        const query = `
            SELECT w.godzina, p.imie, p.nazwisko, p.pesel, w.wizyta_id, w.status
            FROM project.wizyty w
                     JOIN project.pacjenci p ON w.pacjent_id = p.pacjent_id
            WHERE w.data_wizyty = $1
            ORDER BY w.godzina;
        `;

        const result = await pool.query(query, [visitDate]);

        const patients = result.rows.map(row => ({
            godzina: row.godzina,
            pacjent: `${row.imie} ${row.nazwisko}`,
            pesel: row.pesel,
            wizyta_id: row.wizyta_id,
            status: row.status
        }));

        // Odpowiadamy z listą pacjentów
        res.json({ patients });
    } catch (err) {
        console.error('Błąd podczas pobierania pacjentów:', err);
        res.status(500).json({ error: 'Wystąpił błąd podczas pobierania pacjentów' });
    }
});

router.get('/getVisitDescription', async (req, res) => {
    const { visitId } = req.query; // Odbieramy datę wizyty z zapytania

    try {
        // Zapytanie SQL do pobrania pacjentów z przypisanymi godzinami wizyt
        const query = `
            SELECT opis from project.wizyty
                WHERE wizyta_id = $1;
        `;

        const result = await pool.query(query, [visitId]);

        const description = result.rows[0].opis;

        // Odpowiadamy z listą pacjentów
        res.json({ opis: description });
    } catch (err) {
        console.error('Błąd podczas pobierania opis:', err);
        res.status(500).json({ error: 'Wystąpił błąd podczas pobierania opisu' });
    }
})

router.get('/getMedications', async (req, res) => {
    const MedicationQuery = `
        SELECT lek_id, nazwa, opis, cena, pojemnosc_opakowania 
        FROM project.leki;
    `;

    try {
        const medicationsResult = await pool.query(MedicationQuery);
        // Zwrócenie wyników w formie JSON

        const medications = medicationsResult.rows.map(row => ({
            id_leku: row.lek_id,
            nazwa: row.nazwa,
            opis: row.opis,
            pojemnosc: row.pojemnosc_opakowania,
            cena: row.cena

        }));

        res.json({
            medications: medications
        });
    } catch (err) {
        console.error('Błąd podczas pobierania leków:', err);
        res.status(500).json({ error: 'Wystąpił błąd podczas pobierania leków' });
    }
});

router.get('/getAppointmentDetails', async (req, res) => {
    const { visitId } = req.query;

    try {
        const query = `
            SELECT w.data_wizyty, w.pacjent_id
            FROM project.wizyty w
            JOIN project.pacjenci p ON w.pacjent_id = p.pacjent_id
            WHERE w.wizyta_id = $1;
        `;
        const result = await pool.query(query, [visitId]);

        if (result.rows.length > 0) {
            console.log(result.rows[0]);
            res.json(result.rows[0]);
        } else {
            res.status(500).json({ error: 'Nie znaleziono szczegółów wizyty.' });
        }
    } catch (err) {
        console.error('Błąd przy pobieraniu szczegółów wizyty:', err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});


router.post('/', async (req, res) => {
    const { visitDate, visitTime, diagnosis, prescription, medicationId, dosage } = req.body;

    try {
        //const prescriptionInsertQuery = `INSERT INTO project.recepty (histor)`
        const appointmentHistoryInsertQuery = 'INSERT INTO project.historia_wizyt (wizyta_id, diagnoza) VALUES ($1, $2) returning historia_id;';

        const appointmentHistoryInsertResult = await pool.query(appointmentHistoryInsertQuery, [visitTime, diagnosis]);
        const historia_id = appointmentHistoryInsertResult.rows[0].historia_id;

        if (prescription) {
            const prescriptionInsertQuery = `
                INSERT INTO project.recepty (historia_id, data_wystawienia, dawkowanie)
                VALUES ($1, $2, $3) RETURNING recepta_id;
            `;
            const prescriptionInsertResult = await pool.query(prescriptionInsertQuery, [
                historia_id, visitDate, dosage
            ]);

            const recepta_id = prescriptionInsertResult.rows[0].recepta_id;

            // Upewnij się, że medicationId jest zawsze tablicą
            const medicationIds = Array.isArray(medicationId) ? medicationId : [medicationId];

            const prescription_medicationInsertQuery = `
        INSERT INTO project.recepty_leki (recepta_id, lek_id) VALUES ($1, $2);
    `;

            if (medicationIds.length > 0) {
                await Promise.all(
                    medicationIds.map((id) =>
                        pool.query(prescription_medicationInsertQuery, [recepta_id, id])
                    )
                );
            } else {
                console.log('Brak leków do zapisania.');
            }
        }

    } catch (err) {
        console.error('Błąd przy zapisywaniu wizyty:', err);
        res.status(500).send('Błąd przy zapisywaniu recepty');
    }
    res.redirect('/doctor/appointment');
});

module.exports = router;
