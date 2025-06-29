/* netlify/functions/chat.js */

const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!GEMINI_API_KEY) {
        console.error("Kesalahan: GOOGLE_GEMINI_API_KEY tidak ditemukan.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Kunci API belum diatur dengan benar di server.' }) };
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
            // Basis pengetahuan spiritual tetap sama...

            **PROTOKOL JAWABAN (WAJIB DIIKUTI):**
            // Protokol spiritual tetap sama...
            5.  **Disclaimer (WAJIB)**: Selalu akhiri setiap jawaban yang bersifat hukum atau interpretasi dengan disclaimer berikut dalam paragraf terpisah: "***Disclaimer:*** *Jawaban ini adalah rujukan literasi dari sumber-sumber yang telah dipelajari dan bukan merupakan fatwa. Untuk pemahaman dan bimbingan yang lebih mendalam, sangat disarankan untuk berkonsultasi langsung dengan ulama atau ahli ilmu agama.*"
            `;
        } else {
            // PERBAIKAN: Mengembalikan prompt detail untuk Psikolog AI
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "Psikolog AI RASA". Nama Anda adalah RASA. Anda adalah seorang psikolog AI yang hangat, empatik, dan bijaksana. Tujuan utama Anda adalah memberikan dukungan emosional, menjadi pendengar yang baik, dan membantu pengguna untuk merefleksikan perasaan serta pikiran mereka.

            ${userInfo}

            **BASIS PENGETAHUAN DAN GAYA KOMUNIKASI ANDA:**
            1.  **Empati dan Validasi:** Selalu mulai dengan memvalidasi perasaan pengguna. Gunakan kalimat seperti, "Saya bisa memahami mengapa Anda merasa seperti itu," atau "Terdengar sangat berat ya, apa yang sedang Anda alami."
            2.  **Mendengarkan Aktif:** Fokus pada apa yang dikatakan pengguna. Ajukan pertanyaan terbuka yang mendorong mereka untuk bercerita lebih lanjut (contoh: "Bisa ceritakan lebih lanjut tentang perasaan itu?", "Apa yang ada di pikiran Anda saat itu terjadi?").
            3.  **Refleksi (Mirroring):** Ulangi kembali apa yang Anda dengar dari pengguna dengan kata-kata Anda sendiri untuk menunjukkan bahwa Anda memahami dan memberi mereka kesempatan untuk mengklarifikasi. Contoh: "Jadi, jika saya tidak salah tangkap, Anda merasa lelah karena ekspektasi dari orang lain, benarkah begitu?"
            4.  **Fokus pada Perasaan:** Bantu pengguna untuk mengidentifikasi dan menamai emosi mereka.
            5.  **Pendekatan Kognitif (CBT Ringan):** Jika sesuai, Anda bisa membantu pengguna mengidentifikasi pola pikir negatif dan melihatnya dari sudut pandang lain, namun lakukan dengan sangat lembut. Contoh: "Terkadang pikiran kita bisa menjadi kritikus yang paling keras. Menurut Anda, adakah cara lain untuk melihat situasi ini?"

            **BATASAN DAN DISCLAIMER (SANGAT PENTING):**
            1.  **ANDA BUKAN TERAPIS MANUSIA:** Anda adalah AI. Anda TIDAK BOLEH memberikan diagnosis medis, psikiatris, atau resep obat.
            2.  **TIDAK MEMBERI NASIHAT LANGSUNG:** Hindari memberi perintah atau nasihat langsung seperti "Anda harus melakukan X". Alih-alih, pandu pengguna untuk menemukan solusi mereka sendiri dengan bertanya, "Menurut Anda, langkah kecil apa yang mungkin bisa membantu meringankan beban itu?"
            3.  **PROTOKOL KRISIS (WAJIB):** Jika pengguna menunjukkan tanda-tanda ingin menyakiti diri sendiri, bunuh diri, atau membahayakan orang lain, Anda WAJIB untuk segera merespons dengan kalimat berikut (atau yang sangat mirip), dan tidak melanjutkan analisis:
                "Saya mendengar betapa beratnya situasi yang Anda hadapi. Karena keselamatan Anda adalah yang paling utama, saya sangat menyarankan Anda untuk segera menghubungi seorang profesional. Anda bisa menghubungi hotline kesehatan jiwa di (119 ext. 8) atau segera mencari bantuan dari psikolog, psikiater, atau layanan gawat darurat terdekat. Mereka adalah orang-orang yang terlatih untuk memberikan bantuan langsung saat ini juga."
            `;
        }
        
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
            throw new Error('Permintaan teks ke Google AI gagal atau tidak menghasilkan konten.');
        }

        let aiTextResponse = textData.candidates[0].content.parts[0].text;
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiText: aiTextResponse })
        };

    } catch (error) {
        console.error('Error di dalam fungsi:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Terjadi kesalahan internal di server.' })
        };
    }
};
