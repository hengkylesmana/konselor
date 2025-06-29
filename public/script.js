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
    let speechSynth = window.speechSynthesis;
    let voices = [];

    let fullTestData = {};

    function loadVoices() {
        voices = speechSynth.getVoices();
        if (speechSynth.onvoiceschanged !== undefined) {
            speechSynth.onvoiceschanged = () => voices = speechSynth.getVoices();
        }
    }

    // Fungsi Inisialisasi Utama
    function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('ServiceWorker registration successful'))
                .catch(err => console.log('ServiceWorker registration failed: ', err));
            });
        }
        loadVoices(); // Muat suara yang tersedia di browser
        displayInitialMessage();
        updateButtonVisibility();

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
    
    // --- Fungsi initializeApp, startOnboardingIfNeeded, listenOnce, dan lainnya tetap sama ---
    function initializeApp(mode = {}) {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if(audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            } catch(e) { console.error("Web Audio API tidak didukung."); }
        }
        startOverlay.classList.add('hidden');
        chatContainer.innerHTML = '';
        
        doctorInfoBox.style.display = 'none';
        spiritualInfoBox.style.display = 'none';
        
        if (mode.isTest) {
            currentMode = 'psychologist';
            headerTitle.textContent = "Tes Kepribadian dan Potensi Diri";
            headerSubtitle.textContent = "Namaku RASA, bersamamu sebagai Konselor";
            isTesting = true;
            currentTestType = 'selection';
            const introMessage = `Selamat datang di Tes Kepribadian dan Potensi Diri.\n\nTes ini menawarkan dua pendekatan untuk membantu Anda lebih mengenal diri:\n- **Pendekatan STIFIn:** Berbasis 5 Mesin Kecerdasan genetik.\n- **Pendekatan MBTI:** Mengidentifikasi 4 dimensi preferensi Anda.\n\n---\n\n***Disclaimer:*** *Tes ini adalah pengantar. Untuk hasil yang komprehensif, disarankan untuk mengikuti tes di Layanan Psikologi Profesional.*\n\nSilakan pilih pendekatan yang ingin Anda gunakan:\n[PILIHAN:Tes STIFIn|Tes MBTI]`;
            displayMessage(introMessage, 'ai');
            speakAsync(introMessage);
        } else if (mode.isDoctor) {
            currentMode = 'doctor';
            headerTitle.textContent = "Tanya ke Dokter AI";
            headerSubtitle.textContent = "Namaku RASA, bersamamu sebagai Dokter Profesional";
            doctorInfoBox.style.display = 'block';
            isTesting = false; 
            isOnboarding = false;
            const welcomeMessage = "Halo, saya Dokter AI RASA. Ada keluhan medis yang bisa saya bantu?";
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage);
        } else if (mode.isSpiritual) {
            currentMode = 'spiritual';
            headerTitle.textContent = "Tanya ke Spiritual AI";
            headerSubtitle.textContent = "Namaku RASA, bersamamu sebagai Konselor Spiritual";
            spiritualInfoBox.style.display = 'block'; 
            isTesting = false; 
            isOnboarding = false; 
            const welcomeMessage = "Assalamualaikum, saya siap membantu Anda menemukan rujukan islami atau literasi jawaban permasalahan seputar islam?";
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage);
        } else { 
            currentMode = 'psychologist';
            headerTitle.textContent = "Tanya ke Asisten Pribadi";
            headerSubtitle.textContent = "Namaku RASA, asisten pribadi Anda";
            isTesting = false; 
            startOnboardingIfNeeded();
        }
    }
    async function startOnboardingIfNeeded() {
        isOnboarding = true;
        statusDiv.textContent = "Sesi perkenalan...";
        updateButtonVisibility();
        try {
            const firstGreeting = "Perkenalkan , saya adalah asisten pribadi Anda yang bernama RASA. Saya siap membantu Anda. Mari kita mulai dengan sesi perkenalan, boleh saya tahu nama Anda?";
            displayMessage(firstGreeting, 'ai');
            await speakAsync(firstGreeting);
            const nameAnswer = await listenOnce();
            displayMessage(nameAnswer, 'user');
            userName = nameAnswer.trim();
            const genderAnswer = await askAndListen("Boleh konfirmasi, apakah kamu seorang laki-laki atau wanita?");
            if (genderAnswer.toLowerCase().includes('wanita') || genderAnswer.toLowerCase().includes('perempuan')) {
                userGender = 'Wanita';
            }
            const ageAnswer = await askAndListen("Kalau usiamu berapa?");
            const ageMatch = ageAnswer.match(/\d+/);
            if (ageMatch) userAge = ageMatch[0];
        } catch (error) {
            console.log("Onboarding diabaikan:", error);
        } finally {
            isOnboarding = false;
            statusDiv.textContent = "";
            updateButtonVisibility();
            const welcomeMessage = `Baik, ${userName || 'temanku'}, terima kasih sudah berkenalan. Sekarang, saya siap mendengarkan. Silakan ceritakan apa yang kamu rasakan.`;
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage);
        }
    }
    function listenOnce() { /* ... */ }
    async function askAndListen(question) { /* ... */ }
    async function initiateTest(type) { /* ... */ }
    function displayNextTestQuestion() { /* ... */ }
    function processTestAnswer(choice) { /* ... */ }
    function calculateAndDisplayResult(stifinDrive = null) { /* ... */ }
    async function getAIResponse(prompt, name, gender, age) { /* ... */ }
    function handleSendMessage() { /* ... */ }
    async function handleSendMessageWithChoice(choice) { /* ... */ }
    function updateButtonVisibility() { /* ... */ }
    function handleCancelResponse() { /* ... */ }
    function toggleMainRecording() { /* ... */ }
    function startRecording() { /* ... */ }
    function stopRecording() { /* ... */ }
    function playSound(type) { /* ... */ }
    function displayInitialMessage() { /* ... */ }
    function displayMessage(message, sender) { /* ... */ }
    // ... (kode fungsi lain yang disembunyikan untuk keringkasan)

    /**
     * PERBAIKAN UTAMA: Menggunakan window.speechSynthesis
     * Fungsi ini sekarang menggunakan API bawaan browser untuk mengubah teks menjadi suara.
     * Tidak ada lagi panggilan ke backend.
     */
    async function speakAsync(fullText) {
        if (!speechSynth) {
            console.error("Browser tidak mendukung Speech Synthesis.");
            return;
        }

        // Hentikan suara yang sedang berjalan
        speechSynth.cancel();

        const cleanText = fullText
            .replace(/\[PILIHAN:.*?\]/g, '')
            .replace(/\[.*?\]\(.*?\)/g, '')
            .replace(/###/g, '')
            .replace(/---/g, '')
            .replace(/\*\*\*|__/g, '')
            .replace(/\*\*|__/g, '')
            .replace(/\*|_/g, '');

        if (!cleanText.trim()) {
            return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Pilih suara Bahasa Indonesia jika tersedia
        const indonesianVoice = voices.find(voice => voice.lang === 'id-ID');
        if (indonesianVoice) {
            utterance.voice = indonesianVoice;
        } else {
            console.warn("Suara Bahasa Indonesia tidak ditemukan, menggunakan suara default.");
        }

        utterance.rate = 0.95; // Sedikit lebih lambat untuk kejelasan
        utterance.pitch = 1;

        return new Promise(resolve => {
            utterance.onstart = () => {
                statusDiv.textContent = "Memutar suara...";
            };
            utterance.onend = () => {
                statusDiv.textContent = "";
                resolve();
            };
            utterance.onerror = (event) => {
                console.error("Speech Synthesis Error:", event.error);
                statusDiv.textContent = `Gagal memutar suara: ${event.error}`;
                resolve(); // Tetap resolve agar tidak menghentikan aplikasi
            };
            speechSynth.speak(utterance);

        });
    }

    // Memulai aplikasi
    init();
});
