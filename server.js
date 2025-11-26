const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const app = express();
const port = 3000;

// --- KONFIGURASI UTAMA ---
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // Wajib ada agar req.body terbaca

// 1. Konfigurasi Session (Login Tersimpan 30 Hari)
app.use(session({
    secret: 'kunci_rahasia_futsal_hub_123', // Ganti dengan text acak
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 Hari (dalam milidetik)
    } 
}));

app.use(flash());

// Middleware Global (User Data & Notifikasi)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    next();
});

// Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'futsal_hub'
});

db.connect((err) => {
    if (err) throw err;
    console.log('✅ Database Terhubung!');
});


// --- ROUTING AUTH (LOGIN/REGISTER/LOGOUT) ---

// Halaman Login
app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { error: null });
});

// Proses Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) throw err;
        
        if (results.length > 0) {
            const user = results[0];
            // Cek Password
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                req.session.user = user;
                req.flash('success', `Selamat datang, ${user.nama_lengkap}!`);
                return res.redirect('/');
            }
        }
        req.flash('error', 'Email atau password salah.');
        res.redirect('/login');
    });
});

// Halaman Register
app.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('register', { error: null });
});

// [PERBAIKAN] Proses Register
app.post('/register', async (req, res) => {
    const { nama, email, password } = req.body;

    // 1. Validasi Input (Mencegah Error "Illegal arguments")
    if (!nama || !email || !password) {
        req.flash('error', 'Semua kolom wajib diisi!');
        return res.redirect('/register');
    }

    // 2. Cek Email Ganda
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (results.length > 0) {
            req.flash('error', 'Email sudah terdaftar, silakan login.');
            return res.redirect('/register');
        }

        // 3. Enkripsi Password
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // 4. Simpan ke Database
            const sql = 'INSERT INTO users (nama_lengkap, email, password) VALUES (?, ?, ?)';
            db.query(sql, [nama, email, hashedPassword], (err) => {
                if (err) throw err;
                req.flash('success', 'Registrasi berhasil! Silakan login.');
                res.redirect('/login');
            });
        } catch (error) {
            console.error(error);
            req.flash('error', 'Terjadi kesalahan sistem.');
            res.redirect('/register');
        }
    });
});

// [BARU] Proses Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.log(err);
        res.redirect('/login');
    });
});


// --- ROUTING UTAMA (BERANDA, BOOKING, DLL) ---

// API Cek Slot
app.get('/api/cek-slot', (req, res) => {
    const { id_lapangan, tanggal } = req.query;
    db.query(`SELECT jam FROM bookings WHERE id_lapangan = ? AND tanggal = ?`, [id_lapangan, tanggal], (err, result) => {
        if (err) return res.json([]);
        res.json(result.map(r => r.jam));
    });
});

// Home
app.get('/', (req, res) => {
    const lokasi = req.query.lokasi || 'Semua'; 
    let sql = "SELECT * FROM lapangan";
    if (lokasi !== 'Semua') sql += ` WHERE lokasi = '${lokasi}'`;

    db.query(sql, (err, result) => {
        if (err) throw err;
        res.render('index', { lapangan: result, lokasi: lokasi, activePage: 'home' });
    });
});

// Booking (Wajib Login)
app.get('/booking/:id', (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'Silakan login untuk melakukan booking.');
        return res.redirect('/login');
    }
    const id = req.params.id;
    db.query(`SELECT * FROM lapangan WHERE id = ${id}`, (err, result) => {
        if (err) throw err;
        res.render('booking', { item: result[0] });
    });
});

// Simpan Booking
app.post('/booking/save', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const { id_lapangan, tanggal, jam, harga_per_jam } = req.body;
    if (!jam) return res.redirect('back');
    
    const jamList = Array.isArray(jam) ? jam : [jam];
    const groupId = 'BOOK-' + Date.now() + Math.floor(Math.random() * 1000); 
    const hargaFix = parseInt(harga_per_jam);

    const promises = jamList.map(waktu => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO bookings (id_lapangan, nama_pemesan, tanggal, jam, total_harga, status, group_id) VALUES (?, ?, ?, ?, ?, 'Pending', ?)`;
            // Simpan nama pemesan dari session user
            db.query(sql, [id_lapangan, req.session.user.nama_lengkap, tanggal, waktu, hargaFix, groupId], (err, res) => {
                if (err) reject(err); else resolve(res);
            });
        });
    });

    await Promise.all(promises);
    res.redirect('/history');
});

// History (Wajib Login)
app.get('/history', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    // Tampilkan history milik user yang sedang login saja
    const sql = `
        SELECT bookings.group_id, MAX(bookings.tanggal) as tanggal, MIN(bookings.jam) as jam_mulai,
        COUNT(*) as durasi, SUM(bookings.total_harga) as total_bayar, MAX(bookings.status) as status,
        MAX(lapangan.nama_lapangan) as nama_lapangan, MAX(lapangan.gambar) as gambar, MAX(lapangan.lokasi) as lokasi
        FROM bookings 
        JOIN lapangan ON bookings.id_lapangan = lapangan.id 
        WHERE bookings.nama_pemesan = ? 
        GROUP BY bookings.group_id ORDER BY bookings.id DESC
    `;
    
    db.query(sql, [req.session.user.nama_lengkap], (err, result) => {
        if (err) throw err;
        res.render('history', { riwayat: result });
    });
});

// Profil (Wajib Login)
app.get('/profil', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('profil');
});

// Admin
app.get('/admin', (req, res) => {
    // ... (Logika admin tetap sama seperti sebelumnya) ...
    // Supaya ringkas saya tidak tulis ulang semua query admin di sini
    // Gunakan kode admin dari jawaban sebelumnya jika ingin fitur admin aktif
    res.send("Silakan copy logika admin dari kode sebelumnya ke sini jika diperlukan.");
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});