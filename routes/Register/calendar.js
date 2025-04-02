const express = require('express');
const pool = require('../../config/db'); // Twoja konfiguracja bazy danych
const router = express.Router();

router.post('/cancelVisit', async (req, res) => {
    const { visitId } = req.body;

    try {
        const cancelQuery = `
            DELETE FROM project.wizyty
            WHERE wizyta_id = $1;
        `;
        await pool.query(cancelQuery, [visitId]);
        res.status(200).json({ message: 'Wizyta została odwołana.' });
    } catch (err) {
        console.error('Błąd podczas odwoływania wizyty:', err);
        res.status(500).json({ error: 'Błąd serwera podczas odwoływania wizyty.' });
    }
});
module.exports = router;