const fetch = require('node-fetch');
require('dotenv').config();

// Ambil Kunci API dari Environment Variables Netlify
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

exports.handler = async (event) => {
    // 1. Cek Metode HTTP
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // 2. Cek Apakah Kunci API Ada (Pemeriksaan Paling Penting)
    if (!GEMINI_API_KEY) {
        console.error("[DEBUG] KESALAHAN FATAL: GOOGLE_GEMINI_API_KEY tidak ditemukan di environment variables Netlify.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Konfigurasi server tidak lengkap: Kunci API tidak ada.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const userPrompt = body.prompt;

        if (!userPrompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt dari pengguna kosong.' }) };
        }

        // 3. Log untuk Debugging: Tampilkan prompt yang diterima
        console.log(`[DEBUG] Menerima prompt dari pengguna: "${userPrompt}"`);

        // Buat URL API Google Gemini
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        
        // Buat payload yang SANGAT SEDERHANA untuk tes
        const simplePayload = {
            contents: [{
                parts: [{ text: userPrompt }]
            }]
        };

        // 4. Log untuk Debugging: Tampilkan payload yang akan dikirim
        console.log("[DEBUG] Mengirim payload ke Google:", JSON.stringify(simplePayload, null, 2));

        const apiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(simplePayload)
        });

        const responseData = await apiResponse.json();

        // 5. Log untuk Debugging: Tampilkan respons LENGKAP dari Google
        console.log("[DEBUG] Menerima respons dari Google:", JSON.stringify(responseData, null, 2));

        // Cek jika Google merespons dengan error
        if (!apiResponse.ok || !responseData.candidates) {
            console.error('[DEBUG] Terjadi error dari Google API. Respons:', responseData);
            // Kembalikan pesan error yang lebih spesifik dari Google jika ada
            const errorMessage = responseData.error ? responseData.error.message : 'Respons tidak valid dari Google AI.';
            throw new Error(errorMessage);
        }

        const aiTextResponse = responseData.candidates[0].content.parts[0].text;
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiText: aiTextResponse })
        };

    } catch (error) {
        // 6. Log untuk Debugging: Tangkap semua error lain
        console.error('[DEBUG] Terjadi error di dalam blok catch:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Terjadi kesalahan internal di server: ${error.message}` })
        };
    }
};
