const express = require('express');
const pool = require('../../config/db'); // Połączenie do bazy danych
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', {
        title: 'Historia wizyt',
        content: 'Doctor/prescription'
    });
});

// Endpoint do pobierania pacjentów z odbytymi wizytami
router.get('/patients', async (req, res) => {
    const userId = req.session.userId; // Identyfikator lekarza z sesji

    try {
        const patientsQuery = `
            SELECT DISTINCT
                p.pacjent_id,
                p.imie,
                p.nazwisko,
                p.pesel
            FROM
                project.wizyty w 
                    JOIN project.pacjenci p ON w.pacjent_id = p.pacjent_id
                    JOIN project.lekarze l ON l.uzytkownik_id = $1
            WHERE
                w.lekarz_id = l.lekarz_id AND w.status = 'odbyta'
            ORDER BY p.nazwisko, p.imie;
        `;
        const patients = await pool.query(patientsQuery, [userId]);
        res.json({ patients: patients.rows });
    } catch (err) {
        console.error('Błąd podczas pobierania pacjentów:', err);
        res.status(500).json({ error: 'Błąd podczas pobierania pacjentów.' });
    }
});

// Endpoint do pobierania recept i diagnoz dla danego pacjenta
router.get('/patientDetails', async (req, res) => {
    const { patientId } = req.query;

    try {
        // Pobranie szczegółów wizyt pacjenta, w tym lekarza, opisu, diagnozy, recepty
        const detailsQuery = `
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
        `;

        const detailsResult = await pool.query(detailsQuery, [patientId]);
        const details = detailsResult.rows;

        // Pobranie leków przypisanych do recept
        const receptaIds = details.map((detail) => detail.recepta_id).filter((id) => id);

        let medications = [];
        if (receptaIds.length > 0) {
            const medicationsQuery = `
                SELECT
                    rl.recepta_id,
                    l.nazwa AS nazwa_leku,
                    l.pojemnosc_opakowania AS ilosc_leku,
                    l.opis AS opis_leku
                FROM project.recepty_leki rl
                         LEFT JOIN project.leki l ON rl.lek_id = l.lek_id
                WHERE rl.recepta_id = ANY($1);
            `;
            const medicationsResult = await pool.query(medicationsQuery, [receptaIds]);
            medications = medicationsResult.rows;
        }

        // Mapowanie leków do odpowiednich recept
        details.forEach((detail) => {
            detail.leki = medications
                .filter((med) => med.recepta_id === detail.recepta_id)
                .map((med) => ({
                    nazwa: med.nazwa_leku,
                    ilosc: med.ilosc_leku,
                    opis: med.opis_leku,
                }));
        });

        // Przekształcenie danych do pożądanego formatu
        const formattedDetails = details.map((detail) => ({
            data_wizyty: detail.data_wizyty,
            opis_wizyty: detail.opis,
            lekarz_prowadzacy: detail.lekarz_prowadzacy,
            diagnoza: detail.diagnoza,
            recepta: detail.recepta_id
                ? {
                    nr_recepty: detail.nr_recepty,
                    data_wystawienia: detail.data_wystawienia,
                    leki: detail.leki,
                }
                : null,
        }));
        console.log(formattedDetails);
        res.json({ details: formattedDetails });
    } catch (err) {
        console.error('Błąd podczas pobierania szczegółów pacjenta:', err);
        res.status(500).json({ error: 'Błąd podczas pobierania szczegółów pacjenta.' });
    }
});


module.exports = router;
