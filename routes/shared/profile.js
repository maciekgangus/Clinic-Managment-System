const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

// Strona logowania



// Strona z danymi użytkownika
router.get('/', async (req, res) => {
    console.log('Sesja po zapisaniu:', req.session);
    const userId = req.session.userId; // Zakładając, że userId jest zapisane w sesji
    const role = req.session.role;

    const tableType = role === 'administrator' ? 'administratorzy' :
        role === 'lekarz' ? 'lekarze' :
            role === 'recepcjonistka' ? 'recepcjonistki' : '';



    try {
        // Pobieranie danych o użytkowniku z tabeli 'uzytkownicy'
        const userResult = await pool.query(
            `SELECT * FROM project.uzytkownicy WHERE uzytkownik_id = $1`,
            [userId]
        );
        const user = userResult.rows[0];

        
        const specifiedResult = await pool.query(
            `SELECT * FROM project.${tableType} WHERE uzytkownik_id = $1`,
            [userId]
        );

        const userSpecified = specifiedResult.rows[0];
        

        

        // Przekazanie danych do widoku EJS
        res.render('index', { title: 'Profil uzytkownika', content:'profile', user, userSpecified});

    } catch (err) {
        console.error('Błąd podczas pobierania danych użytkownika:', err);
        res.status(500).send('Błąd podczas pobierania danych użytkownika');
    }
});


router.post('/', async (req, res) => {
    const { userId } = req.session; // Zakładając, że userId jest zapisane w sesji
    const { username, firstName, lastName, email, phoneNumber, specialization, dob, start, end} = req.body;
    const role = req.session.role;

    const tableType = role === 'administrator' ? 'administratorzy' :
                             role === 'lekarz' ? 'lekarze' :
                                 role === 'recepcjonistka' ? 'recepcjonistki' : '';

    try {
        // Zaktualizowanie danych w tabeli 'uzytkownicy'
        await pool.query(
            `UPDATE project.uzytkownicy 
            SET nazwa_uzytkownika = $1
            WHERE uzytkownik_id = $2`,
            [username,  userId]
        );
        await pool.query(
            `UPDATE project.${tableType} 
            SET imie = $1, nazwisko = $2, email = $3, numer_telefonu = $4, data_urodzenia = $5 
            WHERE uzytkownik_id = $6`,
            [firstName, lastName, email, phoneNumber, dob, userId]
        );

        // Jeśli użytkownik jest lekarzem, zaktualizowanie danych specjalizacji
        if (role === 'lekarze') {
            await pool.query(
                `UPDATE project.lekarze 
                SET specjalizacja = $1, godziny_pracy_od = $2, godziny_pracy_do = $3
                WHERE uzytkownik_id = $4`,
                [specialization, start, end, userId]
            );
        }

        // Przekierowanie po zapisaniu danych
        res.redirect('/profile');
    } catch (err) {
        console.error('Błąd podczas zapisywania danych użytkownika:', err);
        res.status(500).send('Błąd podczas zapisywania danych');
    }
});


module.exports = router;