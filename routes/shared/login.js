const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../../config/db');



router.get('/', (req, res) => {
    res.render('index', { title: 'Logowanie', content:'login' });
});

router.post('/', async (req, res) => {
    const { username, password } = req.body;
    console.log('🔑 Próba logowania...');
    console.log('Dane z formularza:', req.body);
    // Sprawdzenie, czy użytkownik istnieje w bazie danych
    try {
        const result = await pool.query('SELECT * FROM project.uzytkownicy WHERE nazwa_uzytkownika = $1', [username]);
        console.log(result);
        if (result.rows.length === 0) {
            // Jeśli użytkownik nie istnieje w bazie
            return res.redirect('/login');
        }

        const user = result.rows[0];
        console.log(user.haslo)
        // Sprawdzanie, czy hasło jest poprawne
        const isPasswordValid = await bcrypt.compare(password, user.haslo);
        console.log(isPasswordValid);
        if (isPasswordValid) {
            req.session.userId = user.uzytkownik_id;
            req.session.username = user.nazwa_uzytkownika;
            req.session.role = user.typ_uzytkownika;
            res.redirect('/');
        } else {
            // Jeśli hasło jest niepoprawne
            res.redirect('/login');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Wystąpił błąd podczas logowania');
    }
});


module.exports = router;
