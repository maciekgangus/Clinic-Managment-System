const express = require('express');
const pool = require("../../config/db");
const router = express.Router();

// Endpoint 1: Renderowanie strony
router.get('/', (req, res) => {
    res.render('index', {
        title: 'Zarejestrowani pacjenci',
        content: 'Register/patients'
    });
});

// Endpoint 2: Pobieranie danych pacjentów (JSON)
router.get('/getPatients', async (req, res) => {
    const perPage = 10;
    const currentPage = parseInt(req.query.page) || 1;
    const { search, sortBy, order, gender } = req.query;

    try {
        let conditions = [];
        let values = [];
        if (search) {
            conditions.push(`
                (
                    imie ILIKE $${values.length + 1} OR 
                    nazwisko ILIKE $${values.length + 1} OR 
                    numer_telefonu ILIKE $${values.length + 1} OR 
                    email ILIKE $${values.length + 1} OR 
                    pesel ILIKE $${values.length + 1}
                )
            `);
            values.push(`%${search}%`);
        }
        if (gender) {
            conditions.push(`plec = $${values.length + 1}`);
            values.push(gender);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sortColumn = ['imie', 'nazwisko', 'data_urodzenia'].includes(sortBy) ? sortBy : 'nazwisko';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        const totalPatientsQuery = `SELECT COUNT(*) AS total FROM project.pacjenci ${whereClause}`;
        const totalPatientsResult = await pool.query(totalPatientsQuery, values);
        const totalPatients = parseInt(totalPatientsResult.rows[0].total);
        const totalPages = Math.ceil(totalPatients / perPage);

        const offset = (currentPage - 1) * perPage;
        const patientsQuery = `
            SELECT * FROM project.pacjenci
            ${whereClause}
            ${sortBy ? `ORDER BY ${sortColumn} ${sortOrder}` : ''}
            LIMIT $${values.length + 1} OFFSET $${values.length + 2}
        `;
        values.push(perPage, offset);
        const patientsResult = await pool.query(patientsQuery, values);

        res.json({
            patients: patientsResult.rows,
            totalPages,
            currentPage,
        });
    } catch (err) {
        console.error('Błąd podczas pobierania pacjentów:', err);
        res.status(500).send('Błąd podczas pobierania danych');
    }
});


// Endpoint: Usuwanie pacjenta
router.delete('/delete/:id', async (req, res) => {
    const patientId = req.params.id;

    try {

        // Usunięcie rekordu z pacjenci
        await pool.query(`
            DELETE FROM project.pacjenci
            WHERE pacjent_id = $1
        `, [patientId]);

        res.status(200).send('Pacjent oraz powiązane dane zostały usunięte.');
    } catch (err) {
        console.error('Błąd podczas usuwania pacjenta:', err);
        res.status(500).send('Błąd podczas usuwania pacjenta.');
    }
});


module.exports = router;
