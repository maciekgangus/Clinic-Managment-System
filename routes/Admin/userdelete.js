const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

// Wyświetlanie listy użytkowników do usunięcia
router.get('/', async (req, res) => {
    // Sprawdzamy, czy użytkownik jest administratorem
    if (!req.session.role === 'admin') {
        return res.redirect('/login'); // Przekierowanie, jeśli użytkownik nie jest administratorem
    }

    try {
        // Pobranie wszystkich użytkowników z bazy danych
        const result = await pool.query(
            `SELECT
                 u.uzytkownik_id,
                 u.nazwa_uzytkownika,
                 u.typ_uzytkownika,
                 COALESCE(d.imie, l.imie, r.imie) AS imie,
                 COALESCE(d.nazwisko, l.nazwisko, r.nazwisko) AS nazwisko,
                 COALESCE(d.email, l.email, r.email) AS email
             FROM
                 project.uzytkownicy u
                     LEFT JOIN
                 project.administratorzy d ON u.uzytkownik_id = d.uzytkownik_id
                     LEFT JOIN
                 project.lekarze l ON u.uzytkownik_id = l.uzytkownik_id
                     LEFT JOIN
                 project.recepcjonistki r ON u.uzytkownik_id = r.uzytkownik_id;`
        );

        const users = result.rows;

        // Przekazanie listy użytkowników do widoku EJS
        res.render('index', {
            title: 'Panel Administratora',
            content: 'Admin/userdelete',
            users,
            currentUserId: req.session.userId // Id aktualnie zalogowanego użytkownika
        });
    } catch (err) {
        console.error('Błąd podczas pobierania użytkowników:', err);
        res.status(500).send('Błąd podczas pobierania danych użytkowników');
    }
});

// Usuwanie użytkowników
router.post('/', async (req, res) => {
    const userIds = Array.isArray(req.body.userIds)
        ? req.body.userIds.map(id => parseInt(id, 10)) // Konwertuj na liczby
        : [parseInt(req.body.userIds, 10)];

    if (!userIds || userIds.length === 0) {
        return res.redirect('/admin/userdelete'); // Jeśli nie wybrano żadnego użytkownika
    }

    try {
        // Wykluczenie aktualnie zalogowanego użytkownika z listy do usunięcia
        const filteredUserIds = userIds.filter(id => id !== req.session.userId);

        if (filteredUserIds.length === 0) {
            return res.redirect('/admin/userdelete'); // Jeśli lista jest pusta po filtracji
        }

        // Usunięcie użytkowników z tabeli 'uzytkownicy'
        const deleteQuery = `DELETE FROM project.uzytkownicy WHERE uzytkownik_id = ANY($1::int[])`;
        await pool.query(deleteQuery, [filteredUserIds]);

        // Usunięcie danych z odpowiednich tabel (administratorzy, lekarze, recepcjonistki)
        await pool.query(
            `DELETE FROM project.administratorzy WHERE uzytkownik_id = ANY($1::int[])`,
            [filteredUserIds]
        );
        await pool.query(
            `DELETE FROM project.lekarze WHERE uzytkownik_id = ANY($1::int[])`,
            [filteredUserIds]
        );
        await pool.query(
            `DELETE FROM project.recepcjonistki WHERE uzytkownik_id = ANY($1::int[])`,
            [filteredUserIds]
        );

        // Przekierowanie po usunięciu użytkowników
        res.redirect('/admin/userdelete');
    } catch (err) {
        console.error('Błąd podczas usuwania użytkowników:', err);
        res.status(500).send('Błąd podczas usuwania użytkowników');
    }
});

module.exports = router;
