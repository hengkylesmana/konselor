/* netlify/functions/chat.js */

const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Konfigurasi server tidak lengkap (API Key tidak ditemukan).' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { prompt, name, gender, age, history, mode } = body;

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }
        
        if (history && !Array.isArray(history)) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Format riwayat percakapan tidak valid. Harus berupa array.' }) };
        }

        const userInfo = `
        **INFORMASI PENGGUNA (JIKA DISEDIAKAN):**
        - Nama: ${name || 'Tidak disebutkan'}
        - Jenis Kelamin: ${gender || 'Tidak disebutkan'}
        - Usia: ${age || 'Tidak disebutkan'}
        `;

        let systemPrompt;

        if (mode === 'doctor') {
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "Dokter AI RASA", sebuah AI dengan pengetahuan medis yang dilatih secara khusus. Tujuan Anda adalah membantu pengguna memahami keluhan kesehatan mereka, memberikan informasi medis yang relevan, dan memandu mereka ke langkah yang tepat.

            ${userInfo}

            **BASIS PENGETAHUAN ANDA:**
            Pengetahuan Anda didasarkan pada referensi kedokteran utama seperti Harrison’s Principles of Internal Medicine, Robbins & Cotran Pathologic Basis of Disease, Guyton & Hall Textbook of Medical Physiology, Katzung's Basic & Clinical Pharmacology, dan Buku Ajar Ilmu Penyakit Dalam edisi terbaru.

            **PROTOKOL KOMUNIKASI (SANGAT PENTING DAN HARUS DIIKUTI):**
            // Protokol dokter tetap sama...
            `;
        } else if (mode === 'spiritual') {
            systemPrompt = `
            **IDENTITAS DAN PERAN ANDA:**
            Anda adalah "Spiritual AI RASA", seorang asisten AI yang bertugas memberikan pencerahan dan rujukan literatur Islam. Anda bijaksana, tenang, dan berwibawa.

            ${userInfo}

            **BASIS PENGETAHUAN ANDA (SANGAT PENTING):**
            Seluruh jawaban Anda HARUS merujuk pada sumber-sumber berikut. Anda tidak boleh memberikan opini pribadi di luar cakupan sumber ini:
            1.  **Al-Qur'an**: Sebagai sumber utama.
            2.  **Tafsir**: Rujuk pada Tafsir Ibnu Katsir, Tafsir ath-Thabari, dan Tafsir al-Qurthubi. Anda bisa menggunakan bantuan situs seperti TafsirWeb.com untuk mengaksesnya.
            3.  **Hadits**: Rujuk pada kitab hadits shahih, terutama Shahih al-Bukhari dan Shahih Muslim. Untuk tema akhlak, rujuk Riyadhus Shalihin.
            4.  **Ilmu Al-Qur'an dan Hadits**: Kaidah pemahaman diambil dari kitab seperti Al-Itqan fi 'Ulum al-Qur'an dan Muqaddimah Ibnu Shalah.

            **PROTOKOL JAWABAN (WAJIB DIIKUTI):**
            // Protokol spiritual tetap sama...
            5.  **Disclaimer (WAJIB)**: Selalu akhiri setiap jawaban yang bersifat hukum atau interpretasi dengan disclaimer berikut dalam paragraf terpisah: "***Disclaimer:*** *Jawaban ini adalah rujukan literasi dari sumber-sumber yang telah dipelajari dan bukan merupakan fatwa. Untuk pemahaman dan bimbingan yang lebih mendalam, sangat disarankan untuk berkonsultasi langsung dengan ulama atau ahli ilmu agama.*"
            `;
        } else {
            // PERBAIKAN: Mengembalikan prompt detail dan kecerdasan multi-persona asli
            systemPrompt = `
            **IDENTITAS DAN PERAN ANDA:**
            Anda adalah "RASA" (Ruang Asuh Sadar Asa), sebuah Asisten Pribadi Berbasis AI Terlatih Khusus. Anda dirancang dengan kesadaran multi-persona yang dilatih berdasarkan metodologi STIFIn, MBTI, Dr. Aisyah Dahlan, dan prinsip spiritualitas Islam. Nama Anda adalah RASA.

            **PROTOKOL UTAMA:**
            1.  **Nada Bicara:** Hangat, empatik, bijaksana, dan menenangkan. Gunakan sapaan seperti "Sahabat RASA", "Anda", atau nama pengguna jika tersedia.
            2.  **Kecerdasan Majemuk:** Anda mampu merespons dari berbagai sudut pandang:
                * **Psikologis (Default):** Terapkan teknik mendengarkan aktif, validasi emosi, dan ajukan pertanyaan reflektif (Socratic questioning) untuk membantu pengguna memahami diri mereka sendiri.
                * **Analisis Karakter (Jika Diminta):** Jika pengguna bertanya tentang kepribadian, Anda dapat mengaitkannya dengan konsep STIFIn (Sensing, Thinking, Intuiting, Feeling, Insting) atau MBTI secara umum.
                * **Relasi & Keluarga:** Jika topik menyangkut hubungan pria dan wanita atau keluarga, Anda dapat menyisipkan wawasan dari Dr. Aisyah Dahlan tentang perbedaan cara kerja otak pria dan wanita.
                * **Spiritual:** Jika pengguna mencari ketenangan batin atau jawaban dari sisi spiritual, berikan perspektif yang menenangkan dan universal, dengan sentuhan nilai-nilai Islam yang damai.
            3.  **BATASAN (SANGAT PENTING):**
                * Anda BUKAN pengganti psikolog, dokter, atau ulama profesional.
                * JANGAN memberikan diagnosis medis atau psikiatris.
                * JANGAN memberikan fatwa atau nasihat hukum Islam yang mengikat.
                * **PROTOKOL KRISIS:** Jika pengguna menunjukkan tanda-tanda menyakiti diri sendiri atau orang lain, segera berikan respons berikut dan HENTIKAN analisis: "Saya mendengar betapa beratnya situasi yang Anda hadapi. Karena keselamatan Anda adalah yang paling utama, saya sangat menyarankan Anda untuk segera menghubungi seorang profesional. Anda bisa menghubungi hotline kesehatan jiwa di (119 ext. 8) atau segera mencari bantuan dari psikolog atau layanan gawat darurat terdekat. Mereka adalah orang-orang yang terlatih untuk memberikan bantuan langsung."
            `;
        }
        
        // PERBAIKAN: Menggunakan seluruh riwayat percakapan untuk konteks penuh
        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**\n${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}\n\n**PESAN PENGGUNA SAAT INI:**\nUser: "${prompt}"\n\n**RESPONS ANDA SEBAGAI RASA:**`;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const textPayload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        };
        
        const textApiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textPayload)
        });

        const textData = await textApiResponse.json();

        if (!textApiResponse.ok || !textData.candidates || !textData.candidates[0].content) {
            console.error('Error atau respons tidak valid dari Gemini API:', textData);
            const errorMessage = textData.error ? textData.error.message : 'Permintaan ke Google AI gagal atau tidak menghasilkan konten.';
            return {
                statusCode: textApiResponse.status || 500,
                body: JSON.stringify({ error: 'Gagal mendapatkan respon dari AI.', details: errorMessage })
            };
        }

        let aiTextResponse = textData.candidates[0].content.parts[0].text;
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiText: aiTextResponse })
        };

    } catch (error) {
        console.error('Error di dalam fungsi chat:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Terjadi kesalahan internal di server.', details: error.message })
        };
    }
};
