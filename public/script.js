document.addEventListener('DOMContentLoaded', () => {
    // Definisi semua variabel DOM
    const startSpiritualBtn = document.getElementById('start-spiritual-btn');
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    //... (variabel lain tetap sama)
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    
    // ... (state lain tetap sama)
    let speechSynth = window.speechSynthesis;
    let voices = [];

    function loadVoices() {
        voices = speechSynth.getVoices();
        if (speechSynth.onvoiceschanged !== undefined) {
            speechSynth.onvoiceschanged = () => voices = speechSynth.getVoices();
        }
    }

    function init() {
        if ('serviceWorker' in navigator) { /* ... */ }
        loadVoices();
        displayInitialMessage();
        updateButtonVisibility();

        startCurhatBtn.addEventListener('click', () => initializeApp({ isCurhat: true }));
        // ... (event listener lain tetap sama)
    }
    
    function initializeApp(mode = {}) {
        if (!audioContext) { /* ... */ }
        startOverlay.classList.add('hidden');
        chatContainer.innerHTML = '';
        
        doctorInfoBox.style.display = 'none';
        spiritualInfoBox.style.display = 'none';
        
        if (mode.isTest) {
            // ... (logika Tes Kepribadian tetap sama)
        } else if (mode.isDoctor) {
            // ... (logika Dokter AI tetap sama)
        } else if (mode.isSpiritual) {
            // ... (logika Spiritual AI tetap sama)
        } else { 
            // PERBAIKAN: Mengembalikan ke mode Psikolog AI
            currentMode = 'psychologist'; 
            headerTitle.textContent = "Tanya ke Psikolog AI";
            headerSubtitle.textContent = "Namaku RASA, bersamamu sebagai Psikolog Profesional";
            isTesting = false; 
            startOnboardingIfNeeded();
        }
    }

    async function startOnboardingIfNeeded() {
        isOnboarding = true;
        statusDiv.textContent = "Sesi perkenalan...";
        updateButtonVisibility();
        try {
            // PERBAIKAN: Mengembalikan sapaan awal untuk Psikolog AI
            const firstGreeting = "Perkenalkan , saya adalah asisten pribadi Anda yang bernama RASA. Saya sebagai seorang Psikolog AI, siap membantu Anda. Mari kita mulai dengan sesi perkenalan, boleh saya tahu nama Anda?";
            displayMessage(firstGreeting, 'ai');
            await speakAsync(firstGreeting);
            // ... (sisa logika onboarding tetap sama)
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
    
    // PERBAIKAN: Fungsi suara tetap menggunakan API browser yang stabil
    async function speakAsync(fullText) {
        if (!speechSynth) {
            console.error("Browser tidak mendukung Speech Synthesis.");
            return;
        }
        speechSynth.cancel();
        const cleanText = fullText.replace(/\[PILIHAN:.*?\]/g, '').replace(/\[.*?\]\(.*?\)/g, '').replace(/###|---|\*|__/g, '');
        if (!cleanText.trim()) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const indonesianVoice = voices.find(voice => voice.lang === 'id-ID');
        if (indonesianVoice) utterance.voice = indonesianVoice;
        
        utterance.rate = 0.95;
        utterance.pitch = 1;

        return new Promise(resolve => {
            utterance.onstart = () => { statusDiv.textContent = "Memutar suara..."; };
            utterance.onend = () => { statusDiv.textContent = ""; resolve(); };
            utterance.onerror = (event) => {
                console.error("Speech Synthesis Error:", event.error);
                statusDiv.textContent = `Gagal memutar suara: ${event.error}`;
                resolve();
            };
            speechSynth.speak(utterance);
        });
    }

    // --- Semua fungsi lain (listenOnce, getAIResponse, displayMessage, dll) tetap sama ---
    // ...
    
    init();
});
