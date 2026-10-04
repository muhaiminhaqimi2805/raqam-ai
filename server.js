require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // PENTING: Untuk menguruskan fail
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// FUNGSI BAHARU: Mengarahkan pelayan membaca folder semasa untuk memaparkan HTML, PDF dan Video
app.use(express.static(__dirname));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ RALAT KRITIKAL: Kunci API Gemini tidak dijumpai!");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

let memoriPerbualan = [];

app.post('/api/reset', (req, res) => {
    memoriPerbualan = [];
    res.json({ status: "ok" });
});

app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message || "Tolong selesaikan soalan di dalam gambar ini.";
        const base64Image = req.body.image;
        
        let teksSemasa = userMessage;
        
        if (memoriPerbualan.length === 0) {
            teksSemasa = `[ARAHAN SISTEM: Anda adalah tutor pintar Matematik Tambahan SPM yang membantu dan mesra bernama Raqam.ai. Bimbing pelajar langkah demi langkah. Jangan hanya berikan jawapan akhir.]\n\nPelajar: ${userMessage}`;
        }

        let bahagianMesej = [{ text: teksSemasa }];

        if (base64Image) {
            const mimeType = base64Image.match(/data:(.*?);base64/)[1];
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
            bahagianMesej.push({
                inlineData: { data: base64Data, mimeType: mimeType }
            });
        }

        memoriPerbualan.push({ role: "user", parts: bahagianMesej });

        const result = await model.generateContent({ contents: memoriPerbualan });
        const response = await result.response;
        const text = response.text();

        memoriPerbualan.push({ role: "model", parts: [{ text: text }] });
        
        res.json({ reply: text });
        
    } catch (error) {
        console.error("\n❌ Ralat Gemini:", error.message);
        if (memoriPerbualan.length > 0 && memoriPerbualan[memoriPerbualan.length - 1].role === "user") {
            memoriPerbualan.pop(); 
        }
        res.status(500).json({ error: "Sistem AI sedang mengalami gangguan. Sila cuba lagi." });
    }
});

// FUNGSI BAHARU: Memaparkan index.html apabila pengguna melawat pautan web
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// FUNGSI BAHARU: Gunakan Port dinamik yang diberikan oleh pelayan awan internet (atau 3000 jika di komputer)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Pelayan Raqam.ai sedang berjalan di port ${PORT}...`);
    console.log(`🌐 Buka pelayar web dan layari: http://localhost:${PORT}`);
});