const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const pool = require('../../config/db');

const saltRounds = 10;

router.get('/', (req, res) => {
    res.render('index', {
        title: 'Dodawanie Użytkownika',
        content: 'Admin/adduser'
    });
});

router.post('/', async (req, res) => {
    const { userType, email, username, password, dob, firstName, lastName, phoneNumber, specialization, start, end } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            'INSERT INTO project.uzytkownicy (nazwa_uzytkownika, haslo, typ_uzytkownika) VALUES ($1, $2, $3) RETURNING *',
            [username, hashedPassword, userType]
        );

        const user = result.rows[0];

        if (userType === 'lekarz') {
            await pool.query(
                'INSERT INTO project.lekarze (uzytkownik_id, imie, nazwisko, numer_telefonu, email, data_urodzenia, specjalizacja, godziny_pracy_od, godziny_pracy_do) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [user.uzytkownik_id, firstName, lastName, phoneNumber, email, dob, specialization, start, end]
            );
        } else if (userType === 'recepcjonistka') {
            await pool.query(
                'INSERT INTO project.recepcjonistki (uzytkownik_id, imie, nazwisko, numer_telefonu, email, data_urodzenia) VALUES ($1, $2, $3, $4, $5, $6)',
                [user.uzytkownik_id, firstName, lastName, phoneNumber, email, dob]
            );
        } else if (userType === 'administrator') {
            await pool.query(
                'INSERT INTO project.administratorzy (uzytkownik_id, imie, nazwisko, numer_telefonu, email, data_urodzenia) VALUES ($1, $2, $3, $4, $5, $6)',
                [user.uzytkownik_id, firstName, lastName, phoneNumber, email, dob]
            );
        }

        // Przekierowanie na listę użytkowników
        res.redirect('/admin/adduser');
    } catch (err) {
        console.error('Błąd przy tworzeniu użytkownika:', err);
        res.status(500).send('Błąd przy tworzeniu użytkownika');
    }
});

module.exports = router;
