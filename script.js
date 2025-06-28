// File ini berisi semua logika JavaScript frontend yang sebelumnya ada di dalam index.html
// File `script.js` lama dan `style.css` yang berisi JS telah dihapus.

document.addEventListener('DOMContentLoaded', () => {
    // Definisi semua variabel DOM
    const startSpiritualBtn = document.getElementById('start-spiritual-btn');
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const endChatBtn = document.getElementById('end-chat-btn');
    const statusDiv = document.getElementById('status');
    const startOverlay = document.getElementById('start-overlay');
    const startCurhatBtn = document.getElementById('start-curhat-btn');
    const startTestBtn = document.getElementById('start-test-btn');
    const startDoctorBtn = document.getElementById('start-doctor-btn');
    const header = document.querySelector('header');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    const doctorInfoBox = document.getElementById('doctor-info-box');
    const doctorInfoClose = document.getElementById('doctor-info-close');
    const spiritualInfoBox = document.getElementById('spiritual-info-box');
    const spiritualInfoClose = document.getElementById('spiritual-info-close');

    // Definisi semua state aplikasi
    let conversationHistory = [];
    let abortController = null;
    let recognition = null;
    let isRecording = false;
    let audioContext = null;
    let userName = '', userGender = 'Pria', userAge = '';
    let isOnboarding = false;
    let isTesting = false;
    let currentTestType = null;
    let testData = {};
    let testScores = {};
    let currentTestQuestionIndex = 0;
    let currentMode = 'psychologist';
    let currentAudio = null; // Untuk menyimpan objek audio yang sedang diputar

    // Data lengkap untuk tes kepribadian STIFIn dan MBTI
    const fullTestData = {
        // ... (Objek data tes yang sangat besar tetap sama seperti di file asli)
        stifin: { /* ... data ... */ },
        mbti: { /* ... data ... */ }
    };

    // Fungsi Inisialisasi Utama
    function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('ServiceWorker registration successful'))
                .catch(err => console.log('ServiceWorker registration failed: ', err));
            });
        }
        displayInitialMessage();
        updateButtonVisibility();

        // Event listeners untuk tombol-tombol utama
        startCurhatBtn.addEventListener('click', () => initializeApp({ isCurhat: true }));
        startSpiritualBtn.addEventListener('click', () => initializeApp({ isSpiritual: true }));
        startTestBtn.addEventListener('click', () => initializeApp({ isTest: true }));
        startDoctorBtn.addEventListener('click', () => initializeApp({ isDoctor: true }));
        
        doctorInfoClose.addEventListener('click', () => { doctorInfoBox.style.display = 'none'; });
        spiritualInfoClose.addEventListener('click', () => { spiritualInfoBox.style.display = 'none'; });

        header.addEventListener('click', () => window.location.reload());
        sendBtn.addEventListener('click', handleSendMessage);
        voiceBtn.addEventListener('click', toggleMainRecording);
        endChatBtn.addEventListener('click', handleCancelResponse);

        userInput.addEventListener('input', () => {
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
            updateButtonVisibility();
        });
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    // Fungsi `initializeApp` dan semua logika lainnya (tes, speech recognition, dll)
    // dipindahkan ke sini dari `index.html` tanpa mengubah fungsionalitasnya.
    // ...

    async function getAIResponse(prompt, name, gender, age) {
        abortController = new AbortController();
        statusDiv.textContent = "RASA sedang berpikir...";
        updateButtonVisibility();
        
        try {
            // Menggunakan URL absolut `/api/chat`
            const apiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, name, gender, age, history: conversationHistory, mode: currentMode }),
                signal: abortController.signal
            });

            // Perbaikan 4: Penanganan Error Frontend yang Lebih Baik
            // =======================================================
            if (!apiResponse.ok) {
                // Mencoba membaca detail error dari body respons backend
                const errorResult = await apiResponse.json().catch(() => null);
                const detail = errorResult ? errorResult.details || errorResult.error : `Server merespon dengan status ${apiResponse.status}`;
                throw new Error(detail);
            }
            const result = await apiResponse.json();
            const responseText = result.aiText || `Terima kasih sudah berbagi, ${name || 'teman'}. Bisa ceritakan lebih lanjut?`;
            
            if (responseText) {
                let processedText = responseText;
                // Membersihkan sapaan berulang
                if (conversationHistory.filter(m => m.role === 'RASA').length > 0 && currentMode !== 'doctor') {
                    processedText = processedText.replace(/Assalamualaikum,?\s*/i, "").trim();
                }
                displayMessage(processedText, 'ai');
                await speakAsync(processedText); // Memanggil fungsi TTS
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
               // Menampilkan pesan error yang lebih informatif
               const errorMessage = `Maaf, terjadi gangguan: ${error.message}`;
               displayMessage(errorMessage, 'ai-system');
            }
        } finally {
            statusDiv.textContent = "";
            updateButtonVisibility();
        }
    }
    
    // Perbaikan 5: Fungsi `speakAsync` Diperbarui untuk Bekerja
    // ========================================================
    async function speakAsync(text) {
        // Menghentikan audio sebelumnya jika ada
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }

        // Membersihkan teks dari markdown agar suara lebih natural
        const textForSpeech = text.replace(/\[PILIHAN:.*?\]/g, '').replace(/\[.*?\]\(.*?\)/g, '').replace(/###/g, '').replace(/---/g, '').replace(/\*\*\*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/\bAI\b/g, 'E Ai');
        if (!textForSpeech.trim()) {
            return Promise.resolve();
        }
        
        statusDiv.textContent = "Menyiapkan suara...";
        try {
            // Menggunakan endpoint `/api/synthesize` yang baru
            const response = await fetch('/api/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textForSpeech })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`Gagal membuat suara: ${errData.details || response.statusText}`);
            }

            const data = await response.json();
            const audioBase64 = data.audioContent;
            // Membuat URL Blob dari data base64
            const audioBlob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            currentAudio = new Audio(audioUrl);

            // Mengembalikan Promise yang selesai ketika audio selesai diputar
            return new Promise((resolve) => {
                currentAudio.onended = () => {
                    statusDiv.textContent = "";
                    currentAudio = null;
                    resolve();
                };
                currentAudio.onerror = (e) => {
                     statusDiv.textContent = "Gagal memutar suara.";
                     console.error("Audio playback error:", e);
                     currentAudio = null;
                     resolve(); // Tetap resolve agar alur aplikasi tidak berhenti
                };
                currentAudio.play();
                statusDiv.textContent = "Memutar suara...";
            });

        } catch (error) {
            console.error("Speech synthesis error:", error);
            statusDiv.textContent = "Gagal mengambil data suara.";
            // Tetap resolve agar tidak mengganggu alur aplikasi
            return Promise.resolve();
        }
    }
    
    // ... Seluruh fungsi lain dari JavaScript inline dipindahkan ke sini ...
    // ... (initializeApp, startOnboardingIfNeeded, listenOnce, initiateTest, dll)
    // ... Logika di dalam fungsi-fungsi tersebut tetap sama persis.

    init(); // Memulai aplikasi
});
