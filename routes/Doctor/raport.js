const express = require('express');
const pool = require('../../config/db');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', {
        title: 'Raport',
        content: 'Doctor/raport'
    });
});

// Endpoint do pobierania dostępnych lat
router.get('/years', async (req, res) => {
    const userId = req.session.userId;
    try {
        const query = `
            SELECT DISTINCT EXTRACT(YEAR FROM w.data_wizyty) AS year
            FROM project.wizyty w
                     JOIN project.lekarze l ON w.lekarz_id = l.lekarz_id
            WHERE l.uzytkownik_id = $1
        `;
        const result = await pool.query(query, [userId]);
        res.json({ years: result.rows.map(row => row.year) });
    } catch (err) {
        console.error('Błąd podczas pobierania lat:', err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Endpoint do pobierania statystyk rocznych
router.get('/yearStats', async (req, res) => {
    const userId = req.session.userId; // Pobranie ID użytkownika z sesji
    const { year } = req.query; // Rok przekazany jako parametr

    try {
        // Liczenie wizyt i średniej miesięcznej
        const visitStatsQuery = `
            SELECT
                SUM(month_visits) AS total_visits,
                ROUND(AVG(month_visits)::numeric, 2) AS avg_visits_per_month
            FROM (
                     SELECT COUNT(*) AS month_visits
                     FROM project.wizyty wizyty
                              JOIN project.lekarze lekarze ON wizyty.lekarz_id = lekarze.lekarz_id
                     WHERE lekarze.uzytkownik_id = $1
                       AND EXTRACT(YEAR FROM wizyty.data_wizyty) = $2
                     GROUP BY EXTRACT(MONTH FROM wizyty.data_wizyty)
                 ) AS monthly_visits;
        `;

        // Sumowanie kosztów leków
        const costQuery = `
            SELECT
                COALESCE(SUM(leki.cena), 0) AS total_cost,
                COALESCE(COUNT(*)) AS total_meds
            FROM project.recepty recepty
                     JOIN project.historia_wizyt historia ON recepty.historia_id = historia.historia_id
                     JOIN project.wizyty wizyty ON historia.wizyta_id = wizyty.wizyta_id
                     JOIN project.lekarze lekarze ON wizyty.lekarz_id = lekarze.lekarz_id
                     JOIN project.recepty_leki recepty_leki ON recepty.recepta_id = recepty_leki.recepta_id
                     JOIN project.leki leki ON recepty_leki.lek_id = leki.lek_id
            WHERE lekarze.uzytkownik_id = $1
              AND EXTRACT(YEAR FROM wizyty.data_wizyty) = $2;
        `;

        const visitStatsResult = await pool.query(visitStatsQuery, [userId, year]);
        const costResult = await pool.query(costQuery, [userId, year]);

        // Łączenie wyników
        res.json({
            totalVisits: visitStatsResult.rows[0].total_visits,
            avgVisitsPerMonth: visitStatsResult.rows[0].avg_visits_per_month,
            totalMeds: costResult.rows[0].total_meds,
            totalCost: costResult.rows[0].total_cost
        });
    } catch (err) {
        console.error('Błąd podczas pobierania statystyk rocznych:', err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

router.get('/months', async (req, res) => {
    const userId = req.session.userId; // ID użytkownika z sesji
    const { year } = req.query; // Rok przekazany jako parametr

    try {
        const query = `
            SELECT DISTINCT EXTRACT(MONTH FROM w.data_wizyty) AS month
            FROM project.wizyty w
                     JOIN project.lekarze l ON w.lekarz_id = l.lekarz_id
            WHERE l.uzytkownik_id = $1
              AND EXTRACT(YEAR FROM w.data_wizyty) = $2
            ORDER BY month;
        `;
        const result = await pool.query(query, [userId, year]);

        // Zwracamy tablicę miesięcy w formacie JSON
        res.json({ months: result.rows.map(row => row.month) });
    } catch (err) {
        console.error('Błąd podczas pobierania miesięcy:', err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});


// Endpoint do pobierania statystyk miesięcznych
router.get('/monthStats', async (req, res) => {
    const userId = req.session.userId;
    const { year, month } = req.query;

    try {
        // Liczenie wizyt w miesiącu
        const visitStatsQuery = `
            SELECT
                COUNT(*) AS total_visits
            FROM project.wizyty wizyty
                     JOIN project.lekarze lekarze ON wizyty.lekarz_id = lekarze.lekarz_id
            WHERE lekarze.uzytkownik_id = $1
              AND EXTRACT(YEAR FROM wizyty.data_wizyty) = $2
              AND EXTRACT(MONTH FROM wizyty.data_wizyty) = $3;
        `;

        // Sumowanie kosztów leków w miesiącu
        const costQuery = `
            SELECT
                COALESCE(SUM(leki.cena), 0) AS total_cost,
                COALESCE(COUNT(*)) AS total_meds
            FROM project.recepty recepty
                     JOIN project.historia_wizyt historia ON recepty.historia_id = historia.historia_id
                     JOIN project.wizyty wizyty ON historia.wizyta_id = wizyty.wizyta_id
                     JOIN project.lekarze lekarze ON wizyty.lekarz_id = lekarze.lekarz_id
                     JOIN project.recepty_leki recepty_leki ON recepty.recepta_id = recepty_leki.recepta_id
                     JOIN project.leki leki ON recepty_leki.lek_id = leki.lek_id
            WHERE lekarze.uzytkownik_id = $1
              AND EXTRACT(YEAR FROM wizyty.data_wizyty) = $2
              AND EXTRACT(MONTH FROM wizyty.data_wizyty) = $3;
        `;

        const visitStatsResult = await pool.query(visitStatsQuery, [userId, year, month]);
        const costResult = await pool.query(costQuery, [userId, year, month]);

        // Łączenie wyników
        res.json({
            totalVisits: visitStatsResult.rows[0].total_visits,
            totalMeds: costResult.rows[0].total_meds,
            totalCost: costResult.rows[0].total_cost
        });
    } catch (err) {
        console.error('Błąd podczas pobierania statystyk miesięcznych:', err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});


module.exports = router;
