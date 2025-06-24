// Gunakan sintaks import yang sesuai untuk node-fetch versi 2 di lingkungan CommonJS
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Tidak perlu require('dotenv').config() di Netlify, karena variabel diatur lewat UI
// const dotenv = require('dotenv');
// dotenv.config();

// Ambil Kunci API dari Environment Variables Netlify
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

exports.handler = async (event) => {
    // 1. Cek Metode HTTP
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
    console.log("[DEBUG] Metode POST diterima, melanjutkan proses.");

    // 2. Cek Apakah Kunci API Ada
    if (!GEMINI_API_KEY) {
        const errorMessage = "[DEBUG] KESALAHAN FATAL: GOOGLE_GEMINI_API_KEY tidak ditemukan di environment variables Netlify.";
        console.error(errorMessage);
        return { statusCode: 500, body: JSON.stringify({ error: 'Konfigurasi server tidak lengkap: Kunci API tidak ada.' }) };
    }
    console.log("[DEBUG] Kunci API ditemukan. Melanjutkan...");


    try {
        const body = JSON.parse(event.body);
        const userPrompt = body.prompt;

        if (!userPrompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt dari pengguna kosong.' }) };
        }
        console.log(`[DEBUG] Menerima prompt dari pengguna: "${userPrompt}"`);

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        
        const simplePayload = {
            contents: [{
                parts: [{ text: userPrompt }]
            }]
        };
        console.log("[DEBUG] Mengirim payload ke Google:", JSON.stringify(simplePayload, null, 2));

        const apiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(simplePayload)
        });
        console.log(`[DEBUG] Menerima status respons dari Google: ${apiResponse.status}`);

        const responseData = await apiResponse.json();
        console.log("[DEBUG] Menerima data respons dari Google:", JSON.stringify(responseData, null, 2));

        if (!apiResponse.ok || !responseData.candidates) {
            const errorMessage = responseData.error ? responseData.error.message : 'Respons tidak valid dari Google AI.';
            console.error('[DEBUG] Terjadi error dari Google API:', errorMessage);
            throw new Error(errorMessage);
        }

        const aiTextResponse = responseData.candidates[0].content.parts[0].text;
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiText: aiTextResponse })
        };

    } catch (error) {
        console.error('[DEBUG] Terjadi error di dalam blok catch:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Terjadi kesalahan internal di server: ${error.message}` })
        };
    }
};
