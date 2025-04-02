const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./config/db');
const bcrypt = require('bcrypt');





// Ustawienia EJS
app.set('view engine', 'ejs'); // Ustaw EJS jako domyślny silnik widoków
app.set('views', path.join(__dirname, 'views')); // Ustaw katalog na szablony widoków

// Ustawienia dla zasobów statycznych (CSS, JS, grafiki)
app.use(express.static(path.join(__dirname, 'public')));

// Obsługa formularzy
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Bootstrap
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Konfiguracja sesji z użyciem `connect-pg-simple`
app.use(session({
    store: new pgSession({
        pool: pool, // Użycie puli połączeń z bazą danych PostgreSQL
        tableName: 'session', // Nazwa tabeli w bazie danych do przechowywania sesji
        schemaName: 'project'
    }),
    secret: 'admin',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // Sesja ważna przez 30 dni
}));

// Middleware do ustawienia zmiennych globalnych dla widoków
app.use((req, res, next) => {
    res.locals.isLoggedIn = req.session && req.session.userId ? true : false;
    res.locals.username = req.session && req.session.username ? req.session.username : '';
    res.locals.role = req.session && req.session.role ? req.session.role : '';
    next();
});


// Importowanie tras
const indexRouter = require('./routes/index');
const adminAddUserRouter = require('./routes/Admin/adduser');
const adminUserDeleteRouter = require('./routes/Admin/userdelete');
const doctorAppointmentRouter = require('./routes/Doctor/appointment');
const registerRegisterpatientRouter = require('./routes/Register/registerpatient');
const patientsRouter = require('./routes/Register/patients');
const registerAppointmentRouter = require('./routes/Register/appointment');
const loginRouter = require('./routes/shared/login');
const logoutRouter = require('./routes/shared/logout');
const profileRouter = require('./routes/shared/profile');
const calendarRouter = require('./routes/Doctor/calendar');
const prescriptionRouter = require('./routes/Doctor/prescription');
const calendarRegisterRouter = require('./routes/Register/calendar');
const doctorRaportRouter = require('./routes/Doctor/raport');




// Strona główna
app.use('/', indexRouter);

// Trasy dla administratora
app.use('/Admin/adduser', adminAddUserRouter);
app.use('/Admin/userdelete', adminUserDeleteRouter);

// Trasy dla lekarza
app.use('/Doctor/appointment', doctorAppointmentRouter);
app.use('/doctor', calendarRouter);
app.use('/doctor/prescription', prescriptionRouter);
app.use('/doctor/raport', doctorRaportRouter);

// Trasy dla recepcji
app.use('/register/registerpatient', registerRegisterpatientRouter);
app.use('/register/appointment', registerAppointmentRouter);
app.use('/register/patients', patientsRouter);
app.use('/register/calendar', calendarRegisterRouter);

// Trasy wspólne
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/profile', profileRouter);

// const checkDatabaseConnection = async () => {
//     try {
//         const result = await pool.query('SELECT 1');
//         console.log('Połączenie z bazą danych zostało pomyślnie nawiązane.');
//     } catch (error) {
//         console.error('Błąd połączenia z bazą danych:', error.message);
//         process.exit(1); // Zatrzymuje aplikację, jeśli nie można połączyć się z bazą danych
//     }
// };

const tryConnect = async (retries = 10) => {
    while (retries > 0) {
        try {
            await pool.query('SELECT 1');
            console.log('✅ Połączono z bazą danych!');
            await initializeUsers();
            return;
        } catch (err) {
            console.log(`❌ Brak połączenia z bazą. Próba ponownie za 1 s...`);
            retries--;
            await new Promise(res => setTimeout(res, 2000));
        }
    }

    console.error('❌ Nie udało się połączyć z bazą danych po wielu próbach.');
    process.exit(1); // <- tylko po wielu nieudanych próbach
};

tryConnect()

// Funkcja do inicjalizacji użytkowników
const initializeUsers = async () => {
    try {
        // Sprawdzenie, czy użytkownicy istnieją
        const res = await pool.query('SELECT * FROM project.uzytkownicy');
        if (res.rows.length > 0) {
            console.log("Użytkownicy już istnieją, brak potrzeby inicjalizacji.");
            return;
        }

        console.log("Inicjalizowanie użytkowników...");

        // Inicjalizacja użytkowników
        const passwordHashAdmin = await bcrypt.hash('adminpass123', 10);
        const passwordHashLekarz = await bcrypt.hash('lekarzpass', 10);
        const passwordHashRecepcjonistka = await bcrypt.hash('recepcjapass', 10);

        // Dodanie użytkowników
        await pool.query(
            `INSERT INTO project.uzytkownicy (nazwa_uzytkownika, haslo, typ_uzytkownika) VALUES
                ('admin1', $1, 'administrator'),
                ('lekarz1', $2, 'lekarz'),
                ('recepcja1', $3, 'recepcjonistka')`,
            [passwordHashAdmin, passwordHashLekarz, passwordHashRecepcjonistka]
        );

        console.log("Użytkownicy zostali dodani!");

        // Dodanie lekarza
        await pool.query(
            `INSERT INTO project.lekarze (uzytkownik_id, imie, nazwisko, numer_telefonu, email, specjalizacja, data_urodzenia, godziny_pracy_od, godziny_pracy_do) VALUES
                (2, 'Michał', 'Nowicki', '500100200', 'michal.nowicki@example.com', 'kardiolog', '1978-05-10', '08:00', '16:00')`
        );

        // Dodanie recepcjonistki
        await pool.query(
            `INSERT INTO project.recepcjonistki (uzytkownik_id, imie, nazwisko, numer_telefonu, email, data_urodzenia) VALUES
                (3, 'Karolina', 'Mazur', '600700800', 'karolina.mazur@example.com', '1995-09-22')`
        );

        // Dodanie administratora
        await pool.query(
            `INSERT INTO project.administratorzy (uzytkownik_id, imie, nazwisko, numer_telefonu, email, data_urodzenia) VALUES
                (1, 'Jan', 'Admin', '111222333', 'jan.admin@example.com', '1980-01-01')`
        );

        console.log("Lekarz, Recepcjonistka i Administrator zostali dodani!");
    } catch (err) {
        console.error('Błąd podczas inicjalizacji użytkowników:', err);
    }
};






// Uruchomienie serwera
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});

app.use((req, res, next) => {
    console.log(`Otrzymano żądanie: ${req.method} ${req.url}`);
    next();
});

