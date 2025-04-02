const express = require('express');
const router = express.Router();

// Strona główna
router.get('/', (req, res) => {
        if(req.session.role === 'lekarz' || req.session.role === 'recepcjonistka')
        {
                res.render('index', {title: 'Kalendarz Wizyt', content: 'calendar'});
        }
        else
        {
                res.render('index', {title: 'Poradnik', content: 'guide'});
        }



});



module.exports = router;
