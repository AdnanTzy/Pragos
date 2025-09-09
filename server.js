const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

// Ganti nilai berikut dengan connection string MongoDB Atlas milikmu
// URL ini sudah hardcoded seperti yang Anda berikan
const mongoURI = 'mongodb+srv://Admin:Admin123@pragos.tdodzi7.mongodb.net/?retryWrites=true&w=majority&appName=pragos';

// Hubungkan ke MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Terhubung ke MongoDB Atlas'))
    .catch(err => console.error('Gagal terhubung ke MongoDB:', err));

// Definisikan skema data untuk leaderboard
const scoreSchema = new mongoose.Schema({
    username: { type: String, required: true, maxlength: 20 },
    score: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Score = mongoose.model('Score', scoreSchema);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Endpoint untuk KIRIM skor (POST)
app.post('/leaderboard', async (req, res) => {
    const { username, score } = req.body;

    if (!username || typeof score !== 'number' || score < 0) {
        return res.status(400).json({ error: 'Username dan skor harus valid.' });
    }

    try {
        // Check if username already exists
        const existingScore = await Score.findOne({ username });

        if (existingScore) {
            // Update score only if new score is higher
            if (score > existingScore.score) {
                existingScore.score = score;
                existingScore.createdAt = new Date();
                await existingScore.save();
                res.status(200).json({ message: 'Skor berhasil diperbarui.' });
            } else {
                res.status(200).json({ message: 'Skor tidak diperbarui (skor lebih rendah).' });
            }
        } else {
            // Create new score entry
            const newScore = new Score({ username, score });
            await newScore.save();
            res.status(201).json({ message: 'Skor berhasil ditambahkan.' });
        }
    } catch (error) {
        console.error('Error saat menyimpan skor:', error);
        res.status(500).json({ error: 'Gagal menyimpan skor.' });
    }
});

// Endpoint untuk AMBIL leaderboard (GET)
app.get('/leaderboard', async (req, res) => {
    try {
        // Use aggregation to get highest score for each username, then sort and limit
        const topScores = await Score.aggregate([
            {
                $group: {
                    _id: "$username",
                    username: { $first: "$username" },
                    score: { $max: "$score" },
                    createdAt: { $max: "$createdAt" }
                }
            },
            {
                $sort: { score: -1, createdAt: 1 }
            },
            {
                $limit: 5
            },
            {
                $project: {
                    _id: 0,
                    username: 1,
                    score: 1
                }
            }
        ]);

        res.json(topScores);
    } catch (error) {
        console.error('Error saat mengambil leaderboard:', error);
        res.status(500).json({ error: 'Gagal mengambil data leaderboard.' });
    }
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});