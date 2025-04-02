const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

// Renderowanie widoku umawiania wizyt
router.get('/', async (req, res) => {
    try {
        // Pobranie danych lekarzy
        const doctorsResult = await pool.query(
            'SELECT lekarz_id AS id, imie, nazwisko, specjalizacja FROM project.lekarze'
        );

        // Pobranie danych pacjentów
        const patientsResult = await pool.query(
            'SELECT pacjent_id AS id, imie, nazwisko, pesel FROM project.pacjenci'
        );

        // Przekazanie danych do widoku
        res.render('index', {
            title: 'Umawianie Wizyt',
            content: 'Register/appointment',
            doctors: doctorsResult.rows,
            patients: patientsResult.rows,
        });
    } catch (err) {
        console.error('Błąd podczas pobierania danych:', err);
        res.status(500).send('Błąd podczas ładowania widoku umawiania wizyt');
    }
});

// Endpoint GET do pobierania dostępnych godzin
router.get('/available-hours', async (req, res) => {

    console.log('Received request for available hours:', req.query);

    const { doctorId, visitDate } = req.query;

    try {
        // Pobranie godzin pracy lekarza
        const doctorWorkHoursQuery = `
            SELECT godziny_pracy_od, godziny_pracy_do
            FROM project.lekarze
            WHERE lekarz_id = $1
        `;
        const doctorWorkHoursResult = await pool.query(doctorWorkHoursQuery, [doctorId]);

        if (doctorWorkHoursResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lekarz nie ma zdefiniowanych godzin pracy.' });
        }

        const { godziny_pracy_od, godziny_pracy_do } = doctorWorkHoursResult.rows[0];

        const generateAvailableHours = (start, end) => {
            const availableHours = [];
            const [startHour, startMinute] = start.split(':').map(Number);
            const [endHour, endMinute] = end.split(':').map(Number);

            let currentTime = new Date(1970, 0, 1, startHour, startMinute); // Data początkowa
            const endTime = new Date(1970, 0, 1, endHour, endMinute); // Data końcowa

            while (currentTime <= endTime) {
                // Formatowanie w HH:mm:ss
                const formattedTime = currentTime.toTimeString().slice(0, 8); // Wyciągnięcie 'HH:mm:ss'
                availableHours.push(formattedTime);

                // Zwiększ czas o 30 minut
                currentTime.setMinutes(currentTime.getMinutes() + 30);
            }

            return availableHours;
        };




        // Generowanie dostępnych godzin pracy lekarza
        const availableHours = generateAvailableHours(godziny_pracy_od, godziny_pracy_do);

        // Sprawdzenie, które godziny są już zarezerwowane
        const visitCheckQuery = `
            SELECT godzina
            FROM project.wizyty
            WHERE lekarz_id = $1
              AND data_wizyty = $2

        `;
        const visitCheckResult = await pool.query(visitCheckQuery, [doctorId, visitDate]);

        const reservedHours = visitCheckResult.rows.map(row => row.godzina);

        console.log('Zajęte godziny wizyt:', visitCheckResult.rows.map(row => row.godzina));

        // Filtrowanie dostępnych godzin (usuwamy te, które są już zarezerwowane)
        const availableSlots = availableHours.filter(hour => !reservedHours.includes(hour));

        console.log('Dostępne godziny wizyt:', availableSlots);

        // Zwrócenie dostępnych godzin
        res.json({
            availableHours: availableSlots
        });
    } catch (err) {
        console.error('Błąd podczas pobierania dostępnych godzin:', err);
        res.status(500).send('Błąd podczas pobierania dostępnych godzin');
    }
});

router.post('/', async (req, res) => {
    const { doctorId, patientId, visitDate, visitTime, description } = req.body;

    try {
        const appointmentInsertQuery = `
            INSERT INTO project.wizyty (lekarz_id, pacjent_id, data_wizyty, godzina, opis) VALUES ($1, $2, $3, $4, $5)
        `;

        await pool.query(appointmentInsertQuery, [doctorId, patientId, visitDate, visitTime, description]);

        // Zwrócenie odpowiedzi JSON w przypadku sukcesu
        res.sendStatus(200);
    } catch (err) {
        if (err.code === 'P0001') {
            // Obsługa wyjątku PostgreSQL
            res.status(400).json({ message: err.message });
        } else {
            console.error('Błąd podczas zapisu wizyty:', err);
            res.status(500).json({ message: 'Wystąpił błąd podczas zapisu wizyty.' });
        }
    }
});



module.exports = router;
