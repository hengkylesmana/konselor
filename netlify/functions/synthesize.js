/*
 * File Backend Baru: netlify/functions/synthesize.js
 * =================================================
 *
 * Fungsi serverless ini bertujuan untuk mengatasi "Kesalahan Kritis" di mana fitur suara AI tidak berfungsi.
 * Fungsi ini menerima teks dari frontend, memanggil Google Cloud Text-to-Speech API untuk mengubahnya menjadi audio,
 * dan mengirimkan kembali audio tersebut dalam format base64.
 *
 * Catatan Penting untuk Setup:
 * 1. Anda perlu mengaktifkan "Cloud Text-to-Speech API" di Google Cloud Console.
 * 2. Anda harus membuat Service Account dengan peran "Cloud Text-to-Speech User" dan mengunduh file kredensial JSON-nya.
 * 3. Simpan isi dari file JSON tersebut sebagai Environment Variable di Netlify dengan nama `GOOGLE_CREDENTIALS`.
 * 4. Tambahkan juga `GOOGLE_PROJECT_ID` sebagai Environment Variable di Netlify.
 */

const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
require('dotenv').config();

// Inisialisasi Google Text-to-Speech Client
// Kredensial akan diambil secara otomatis dari environment variable di Netlify
const ttsClient = new TextToSpeechClient();

exports.handler = async (event) => {
    // Hanya izinkan metode POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { text } = JSON.parse(event.body);

        if (!text) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Teks tidak boleh kosong.' }) };
        }

        // Konfigurasi permintaan ke API
        const request = {
            input: { text: text },
            // Pilihan suara: Pilih suara yang sesuai dengan persona RASA
            // 'id-ID-Standard-A' adalah suara wanita. 'id-ID-Standard-B' & 'C' adalah pria.
            voice: { languageCode: 'id-ID', name: 'id-ID-Standard-A', ssmlGender: 'FEMALE' },
            // Tentukan format audio
            audioConfig: { audioEncoding: 'MP3' },
        };

        // Panggil API untuk men-sintesis ucapan
        const [response] = await ttsClient.synthesizeSpeech(request);
        
        // Kirim konten audio (dalam format base64) kembali ke frontend
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioContent: response.audioContent.toString('base64') })
        };

    } catch (error) {
        console.error('Error pada fungsi Text-to-Speech:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Terjadi kesalahan saat membuat data suara.', details: error.message })
        };
    }
};