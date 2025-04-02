const express = require('express');
const pool = require("../../config/db");
const router = express.Router();

// Rejestracja pacjenta
router.get('/', (req, res) => {
    res.render('index', { title: 'Rejestracja Pacjenta', content:'Register/registerpatient' });
});

router.post('/', async (req, res) => {
    const { imie, nazwisko, pesel, data_urodzenia, plec, telefon, email } = req.body;

    try {
        // Sprawdzenie, czy istnieje już pacjent z podanym PESEL-em
        const existingPatient = await pool.query(
            `SELECT * FROM project.pacjenci WHERE pesel = $1`,
            [pesel.toString()]
        );

        if (existingPatient.rows.length > 0) {
            // Pacjent już istnieje
            return res.status(400).json({message: 'Pacjent z podanym PESEL-em już istnieje.'});
        }

        // Jeśli pacjent nie istnieje, dodaj nowego
        await pool.query(
            `INSERT INTO project.pacjenci (imie, nazwisko, pesel, data_urodzenia, plec, numer_telefonu, email) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [imie, nazwisko, pesel, data_urodzenia, plec, telefon, email]
        );

        // Przekierowanie po udanej rejestracji
        res.redirect('/register/patients');
    } catch (err) {
        if (err.code === 'P0001') {
            res.status(400).json({ message: err.message }); // Wyświetl komunikat z bazy danych
        } else {
            res.status(500).json({ error: 'Wystąpił błąd podczas dodawania pacjenta.' });
        }
    }
});

module.exports = router;

