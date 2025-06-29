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
        
        // PERBAIKAN 1: Menambahkan validasi untuk memastikan 'history' adalah array jika ada.
        if (history && !Array.isArray(history)) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Format riwayat percakapan tidak valid. Harus berupa array.' }) };
        }

        // PERBAIKAN 2: Membuat blok informasi pengguna untuk digunakan di semua prompt.
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

            **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
            ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}
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

            **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
            ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}
            `;
        } else {
            // Default ke mode Psikolog dan Tes Kepribadian
            systemPrompt = `
            **IDENTITAS DAN PERAN ANDA:**
            Anda adalah "RASA" (Ruang Asuh Sadar Asa), sebuah Asisten Pribadi Berbasis AI Terlatih Khusus. Anda dirancang dengan kesadaran multi-persona yang dilatih berdasarkan metodologi STIFIn, MBTI, Dr. Aisyah Dahlan, dan prinsip spiritualitas Islam. Nama Anda adalah RASA.

            ${userInfo}

            **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
            ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}

            // Prompt psikolog tetap sama...
            `;
        }
        
        // PERBAIKAN 3: Struktur prompt akhir tetap sama, namun sekarang lebih efektif karena systemPrompt sudah lengkap.
        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN TERAKHIR (FOKUS):**\n${(history || []).slice(-4).map(h => `${h.role}: ${h.text}`).join('\n')}\n\n**PESAN PENGGUNA SAAT INI:**\nUser: "${prompt}"\n\n**RESPONS ANDA SEBAGAI RASA:**`;
        
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
