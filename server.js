const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

// Middleware & Config
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Database Connection
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

// --- 1. API CEK SLOT (Penting untuk Frontend) ---
app.get('/api/cek-slot', (req, res) => {
    const { id_lapangan, tanggal } = req.query;
    const sql = `SELECT jam FROM bookings WHERE id_lapangan = ? AND tanggal = ?`;
    
    db.query(sql, [id_lapangan, tanggal], (err, result) => {
        if (err) {
            console.error(err);
            return res.json([]);
        }
        const bookedSlots = result.map(row => row.jam);
        res.json(bookedSlots);
    });
});

// --- 2. ROUTE BERANDA ---
app.get('/', (req, res) => {
    const lokasiDipilih = req.query.lokasi || 'Semua'; 
    let sql = "SELECT * FROM lapangan";
    
    if (lokasiDipilih !== 'Semua') {
        sql += ` WHERE lokasi = '${lokasiDipilih}'`;
    }

    db.query(sql, (err, result) => {
        if (err) throw err;
        res.render('index', { 
            lapangan: result, 
            lokasi: lokasiDipilih, 
            activePage: 'home' 
        });
    });
});

// --- 3. ROUTE HALAMAN BOOKING ---
app.get('/booking/:id', (req, res) => {
    const id = req.params.id;
    db.query(`SELECT * FROM lapangan WHERE id = ${id}`, (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            res.render('booking', { item: result[0], activePage: 'booking' });
        } else {
            res.redirect('/');
        }
    });
});

// --- 4. ROUTE SIMPAN BOOKING (CORE LOGIC) ---
app.post('/booking/save', async (req, res) => {
    console.log("--- DATA BOOKING MASUK ---");
    console.log(req.body);

    const { id_lapangan, tanggal, jam, harga_per_jam } = req.body;

    // Validasi: Jika jam kosong, balik lagi
    if (!jam) return res.redirect('back');

    const jamList = Array.isArray(jam) ? jam : [jam];
    
    // Generate Group ID Unik
    const groupId = 'BOOK-' + Date.now() + '-' + Math.floor(Math.random() * 1000); 
    
    // Pastikan harga terisi
    const hargaFix = harga_per_jam ? parseInt(harga_per_jam) : 0;

    try {
        const insertPromises = jamList.map(waktu => {
            return new Promise((resolve, reject) => {
                const sql = `INSERT INTO bookings (id_lapangan, tanggal, jam, total_harga, status, group_id) VALUES (?, ?, ?, ?, 'Pending', ?)`;
                
                db.query(sql, [id_lapangan, tanggal, waktu, hargaFix, groupId], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
        });

        await Promise.all(insertPromises);
        console.log("Sukses menyimpan booking Group ID:", groupId);
        res.redirect('/history');

    } catch (error) {
        console.error("Gagal Booking:", error);
        res.send("Gagal melakukan booking. Cek terminal server.");
    }
});

// --- 5. ROUTE HISTORY (GROUPING) ---
app.get('/history', (req, res) => {
    const sql = `
        SELECT 
            bookings.group_id,
            MAX(bookings.tanggal) as tanggal,
            MIN(bookings.jam) as jam_mulai,
            COUNT(*) as durasi, 
            SUM(bookings.total_harga) as total_bayar,
            MAX(bookings.status) as status,
            MAX(lapangan.nama_lapangan) as nama_lapangan,
            MAX(lapangan.gambar) as gambar,
            MAX(lapangan.lokasi) as lokasi
        FROM bookings 
        LEFT JOIN lapangan ON bookings.id_lapangan = lapangan.id 
        GROUP BY bookings.group_id
        ORDER BY MAX(bookings.id) DESC
    `;
    
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.render('history', { riwayat: result, activePage: 'history' });
    });
});

// --- 6. ROUTE PROFIL ---
app.get('/profil', (req, res) => {
    res.render('profil', { activePage: 'profil' });
});

// --- 7. ROUTE ADMIN DASHBOARD ---
app.get('/admin', (req, res) => {
    // Ambil data booking (Grouped)
    const sqlBooking = `
        SELECT 
            bookings.group_id,
            MAX(bookings.nama_pemesan) as nama_pemesan,
            MAX(bookings.tanggal) as tanggal,
            MIN(bookings.jam) as jam_mulai,
            COUNT(*) as durasi,
            SUM(bookings.total_harga) as total_bayar,
            MAX(bookings.status) as status,
            MAX(lapangan.nama_lapangan) as nama_lapangan
        FROM bookings 
        LEFT JOIN lapangan ON bookings.id_lapangan = lapangan.id 
        GROUP BY bookings.group_id
        ORDER BY MAX(bookings.id) DESC
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

// --- 8. ADMIN ACTIONS ---

// Konfirmasi Lunas (By Group ID)
app.post('/admin/confirm/:group_id', (req, res) => {
    const sql = "UPDATE bookings SET status = 'Lunas' WHERE group_id = ?";
    db.query(sql, [req.params.group_id], (err) => {
        if (err) throw err;
        res.redirect('/admin');
    });
});

// Hapus Data (By Group ID)
app.post('/admin/delete/:group_id', (req, res) => {
    const sql = "DELETE FROM bookings WHERE group_id = ?";
    db.query(sql, [req.params.group_id], (err) => {
        if (err) throw err;
        res.redirect('/admin');
    });
});

// --- 9. START SERVER ---
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});