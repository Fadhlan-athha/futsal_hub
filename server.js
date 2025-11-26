const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const app = express();
const port = 3000;

// --- KONFIGURASI ---
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// 1. Konfigurasi Session (Login Tersimpan 30 Hari)
app.use(session({
    secret: 'kunci_rahasia_futsal_hub_123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 Hari
    } 
}));

app.use(flash());

// Middleware Global (User & Notifikasi)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    next();
});

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'futsal_hub'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Database Terhubung!');
});


// --- MIDDLEWARE KEAMANAN ---

// Cek Login (Wajib Login)
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        req.flash('error', 'Silakan login terlebih dahulu.');
        return res.redirect('/login');
    }
    next();
};

// Cek Admin (Hanya Admin Boleh Masuk)
const verifyAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        req.flash('error', 'Akses ditolak! Halaman ini khusus Admin.');
        return res.redirect('/');
    }
    next();
};


// --- ROUTING AUTH (LOGIN, REGISTER, LOGOUT) ---

// Halaman Login
app.get('/login', (req, res) => {
    if (req.session.user) {
        // Jika sudah login, langsung arahkan sesuai role
        if (req.session.user.role === 'admin') return res.redirect('/admin');
        return res.redirect('/');
    }
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
                
                // [PENTING] Arahkan sesuai Role
                if (user.role === 'admin') {
                    return res.redirect('/admin');
                }
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

// Proses Register (Fix Error)
app.post('/register', async (req, res) => {
    const { nama, email, password } = req.body;

    if (!nama || !email || !password) {
        req.flash('error', 'Semua kolom wajib diisi!');
        return res.redirect('/register');
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (results.length > 0) {
            req.flash('error', 'Email sudah terdaftar.');
            return res.redirect('/register');
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            // Default role = 'user'
            const sql = 'INSERT INTO users (nama_lengkap, email, password, role) VALUES (?, ?, ?, "user")';
            
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

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});


// --- ROUTING UTAMA ---

app.get('/api/cek-slot', (req, res) => {
    const { id_lapangan, tanggal } = req.query;
    db.query(`SELECT jam FROM bookings WHERE id_lapangan = ? AND tanggal = ?`, [id_lapangan, tanggal], (err, result) => {
        if (err) return res.json([]);
        res.json(result.map(r => r.jam));
    });
});

app.get('/', (req, res) => {
    const lokasi = req.query.lokasi || 'Semua'; 
    let sql = "SELECT * FROM lapangan";
    if (lokasi !== 'Semua') sql += ` WHERE lokasi = '${lokasi}'`;

    db.query(sql, (err, result) => {
        if (err) throw err;
        res.render('index', { lapangan: result, lokasi: lokasi });
    });
});

// Booking (Wajib Login)
app.get('/booking/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    db.query(`SELECT * FROM lapangan WHERE id = ${id}`, (err, result) => {
        if (err) throw err;
        res.render('booking', { item: result[0] });
    });
});

// Simpan Booking
app.post('/booking/save', requireLogin, async (req, res) => {
    const { id_lapangan, tanggal, jam, harga_per_jam } = req.body;
    if (!jam) return res.redirect('back');
    
    const jamList = Array.isArray(jam) ? jam : [jam];
    const groupId = 'BOOK-' + Date.now() + Math.floor(Math.random() * 1000); 
    const hargaFix = parseInt(harga_per_jam);

    const promises = jamList.map(waktu => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO bookings (id_lapangan, nama_pemesan, tanggal, jam, total_harga, status, group_id) VALUES (?, ?, ?, ?, ?, 'Pending', ?)`;
            // Gunakan nama user yang sedang login
            db.query(sql, [id_lapangan, req.session.user.nama_lengkap, tanggal, waktu, hargaFix, groupId], (err, res) => {
                if (err) reject(err); else resolve(res);
            });
        });
    });

    await Promise.all(promises);
    res.redirect('/history');
});

// Cancel Booking
app.post('/booking/cancel/:group_id', requireLogin, (req, res) => {
    const groupId = req.params.group_id;
    // Hapus hanya booking milik user sendiri (kecuali admin bisa hapus semua, tapi di sini pakai logic user)
    // Agar aman, idealnya cek nama_pemesan juga, tapi untuk simple delete by ID dulu
    const sql = "DELETE FROM bookings WHERE group_id = ?";
    db.query(sql, [groupId], (err) => {
        if (err) console.error(err);
        res.redirect('/history');
    });
});

// History (Wajib Login)
app.get('/history', requireLogin, (req, res) => {
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
app.get('/profil', requireLogin, (req, res) => {
    res.render('profil');
});


// --- ROUTE ADMIN (DIPROTEKSI) ---
app.get('/admin', verifyAdmin, (req, res) => {
    const sqlBooking = `
        SELECT bookings.group_id, MAX(bookings.nama_pemesan) as nama_pemesan, MAX(bookings.tanggal) as tanggal,
        MIN(bookings.jam) as jam_mulai, COUNT(*) as durasi, SUM(bookings.total_harga) as total_bayar,
        MAX(bookings.status) as status, MAX(lapangan.nama_lapangan) as nama_lapangan
        FROM bookings JOIN lapangan ON bookings.id_lapangan = lapangan.id 
        GROUP BY bookings.group_id ORDER BY MAX(bookings.id) DESC
    `;
    
    const sqlLapangan = `SELECT * FROM lapangan`;
    const sqlIncome = `SELECT SUM(total_harga) AS total FROM bookings WHERE status = 'Lunas'`;

    db.query(sqlBooking, (err, bookings) => {
        if (err) throw err;
        db.query(sqlLapangan, (err, lapangans) => {
            if (err) throw err;
            db.query(sqlIncome, (err, income) => {
                if (err) throw err;
                res.render('admin', { 
                    bookings: bookings,
                    lapangans: lapangans,
                    totalPendapatan: income[0].total || 0
                });
            });
        });
    });
});

app.post('/admin/confirm/:group_id', verifyAdmin, (req, res) => {
    db.query("UPDATE bookings SET status = 'Lunas' WHERE group_id = ?", [req.params.group_id], (err) => {
        if (err) throw err;
        res.redirect('/admin');
    });
});

app.post('/admin/delete/:group_id', verifyAdmin, (req, res) => {
    db.query("DELETE FROM bookings WHERE group_id = ?", [req.params.group_id], (err) => {
        if (err) throw err;
        res.redirect('/admin');
    });
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});