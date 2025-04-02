const express = require('express');
const router = express.Router();

// Obsługa wylogowania
router.get('/', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log('Błąd podczas wylogowywania:', err);
            return res.redirect('/');
        }
        res.clearCookie('connect.sid'); // Usunięcie ciasteczka sesji
        res.redirect('/login'); // Przekierowanie do strony logowania
    });
});

module.exports = router;
