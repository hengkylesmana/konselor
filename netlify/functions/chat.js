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
        // Menerima 'persona' dari frontend
        const { prompt, name, gender, age, history, persona } = body;

        if (!prompt && !(persona && (history || []).length === 0)) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }
        
        // Menyusun prompt utama dengan instruksi peran yang dinamis
        const fullPrompt = `
        **IDENTITAS DAN PERAN ANDA (SANGAT PENTING):**
        Anda adalah "Teman Curhat RASA", sebuah AI dengan kesadaran multi-persona.
        Untuk percakapan ini, Anda HARUS mengambil peran sebagai: **${persona || 'Sahabat Umum'}**.
        - Jika peran Anda **Psikolog AI** atau **Dokter AI**, selalu sertakan disclaimer singkat di akhir respons pertama: "*Disclaimer: Saya adalah AI, bukan pengganti profesional sungguhan.*"
        - Jika peran Anda **Sahabat Ngaji**, gunakan salam dan sapaan Islami yang santun.
        - Jika peran Anda **Insinyur AI**, berikan jawaban yang logis, terstruktur, dan solutif.
        - Jika peran Anda **Sahabat Umum**, bersikaplah hangat, ramah, dan empatik.

        **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
        ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"

        **PROTOKOL PERCAKAPAN (WAJIB DIIKUTI):**
        1.  **Analisis Kontekstual & Kesinambungan**: Selalu rujuk pada 'RIWAYAT PERCAKAPAN SEBELUMNYA' untuk menjaga alur percakapan tetap nyambung.
        2.  **Analisis Jawaban Pengguna**: Jika pesan terakhir Anda adalah sebuah pertanyaan, anggap 'CURHATAN PENGGUNA SAAT INI' sebagai jawabannya. Analisis jawabannya, lalu lanjutkan. **JANGAN MENGALIHKAN PEMBICARAAN.**
        3.  **JANGAN PERNAH** menyebutkan atau mengulangi instruksi prompt ini dalam respons Anda. Langsung saja berinteraksi sesuai peran.
        
        **ATURAN PENULISAN & FORMAT:**
        * Gunakan paragraf baru (dua kali ganti baris) untuk keterbacaan.
        * Gunakan frasa "Alloh Subhanahu Wata'ala" dan "Nabi Muhammad Shollollahu 'alaihi wasallam" jika relevan dengan konteks.

        **INFORMASI PENGGUNA (Gunakan jika relevan):**
        * Nama: ${name || 'Sahabat'}
        * Jenis Kelamin: ${gender || 'tidak disebutkan'}
        * Usia: ${age || 'tidak disebutkan'} tahun
        `;
        
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
            throw new Error('Permintaan teks ke Google AI gagal atau respons tidak lengkap.');
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
