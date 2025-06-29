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
    let currentAudio = null;

    let fullTestData = {};

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
    
    function listenOnce() {
        playSound('start'); 
        return new Promise((resolve, reject) => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                playSound('stop');
                reject("Not supported");
                return;
            }
            const rec = new SpeechRecognition();
            rec.lang = 'id-ID';
            rec.continuous = false;
            rec.interimResults = false;
            let hasResolved = false;
            rec.onresult = (event) => {
                if (hasResolved) return;
                hasResolved = true;
                playSound('stop');
                resolve(event.results[0][0].transcript);
            };
            rec.onerror = (event) => {
                if (hasResolved) return;
                hasResolved = true;
                playSound('stop');
                reject(event.error);
            };
            rec.onend = () => {
                if (!hasResolved) { 
                    hasResolved = true;
                    playSound('stop');
                    reject('no-speech');
                }
                if (statusDiv.textContent === "Mendengarkan...") statusDiv.textContent = "";
            };
            rec.onstart = () => statusDiv.textContent = "Mendengarkan...";
            rec.start();
        });
    }

    async function askAndListen(question) {
        displayMessage(question, 'ai');
        await speakAsync(question);
        try {
            const answer = await listenOnce();
            displayMessage(answer, 'user');
            return answer;
        } catch (e) {
            const errorMessage = (e === 'no-speech' || e === 'audio-capture')
                ? "Maaf, saya tidak mendengar suaramu. Bisa ulangi lagi?"
                : "Maaf, terjadi sedikit gangguan. Silakan coba lagi.";
            console.error("Listen error:", e);
            displayMessage(errorMessage, 'ai-system');
            return "";
        }
    }

    async function initiateTest(type) {
        if (Object.keys(fullTestData).length === 0) {
            try {
                statusDiv.textContent = "Memuat data tes...";
                const response = await fetch('testData.json');
                if (!response.ok) throw new Error('Gagal memuat file data tes.');
                fullTestData = await response.json();
                statusDiv.textContent = "";
            } catch (error) {
                console.error('Gagal memuat testData.json:', error);
                displayMessage('Maaf, data tes tidak dapat dimuat. Silakan coba lagi nanti.', 'ai-system');
                statusDiv.textContent = "Gagal memuat data.";
                isTesting = false;
                return;
            }
        }
        
        currentTestType = type;
        const originalTestData = (type === 'stifin') ? fullTestData.stifin : fullTestData.mbti;
        let questionsToAsk = selectRandomQuestions(originalTestData.questions);
        testData = { ...originalTestData, questions: questionsToAsk };
        testScores = {};
        currentTestQuestionIndex = 0;
        displayMessage(`Baik, mari kita mulai ${type.toUpperCase()}. Jawablah ${testData.questions.length} pertanyaan berikut.`, 'ai-system');
        setTimeout(displayNextTestQuestion, 1000);
    }

    function displayNextTestQuestion() {
        if (currentTestQuestionIndex >= testData.questions.length) {
            calculateAndDisplayResult();
            return;
        }
        const q = testData.questions[currentTestQuestionIndex];
        const qText = (currentTestType === 'mbti') ? q.q : q.question;
        const qOptions = (currentTestType === 'mbti') ? q.o.map(opt => opt.t) : q.options.map(opt => opt.text);
        let questionDisplay = `**Pertanyaan ${currentTestQuestionIndex + 1}/${testData.questions.length}:**\n\n${qText}`;
        if (q.isDriveQuestion) {
            questionDisplay = `**Pertanyaan Terakhir:**\n\n${q.question}`;
        }
        let fullMessage = `${questionDisplay}[PILIHAN:${qOptions.join('|')}]`;
        displayMessage(fullMessage, 'ai');
    }

    function processTestAnswer(choice) {
        const q = testData.questions[currentTestQuestionIndex];
        if (!q) return;

        if (currentTestType === 'stifin') {
            const selectedOption = q.options.find(opt => opt.text === choice);
            if (!selectedOption) return;
            if (q.isDriveQuestion) {
                calculateAndDisplayResult(selectedOption.type);
                return;
            }
            testScores[selectedOption.type] = (testScores[selectedOption.type] || 0) + 1;
        } else { 
            const selectedOption = q.o.find(opt => opt.t === choice);
            if (!selectedOption) return;
            testScores[selectedOption.v] = (testScores[selectedOption.v] || 0) + 1;
        }
        
        currentTestQuestionIndex++;

        if (currentTestQuestionIndex >= testData.questions.length) {
            calculateAndDisplayResult();
        } else if (currentTestType === 'stifin' && testData.questions[currentTestQuestionIndex].isDriveQuestion) {
             let dominantMK = Object.keys(testScores).reduce((a, b) => testScores[a] > testScores[b] ? a : b);
             if (dominantMK === 'In') {
                 calculateAndDisplayResult(null); 
                 return;
             }
            setTimeout(displayNextTestQuestion, 500);
        }
        else {
            setTimeout(displayNextTestQuestion, 500);
        }
    }

    function calculateAndDisplayResult(stifinDrive = null) {
        const localTestType = currentTestType;
        isTesting = false;
        currentTestType = null;
        let finalType = '';
        let result;

        if (localTestType === 'stifin') {
            let dominantMK = Object.keys(testScores).length > 0 ? Object.keys(testScores).reduce((a, b) => testScores[a] > testScores[b] ? a : b) : "In";
            finalType = dominantMK;
            if (dominantMK !== 'In' && stifinDrive) {
                finalType += stifinDrive;
            }
            result = fullTestData.stifin.results[finalType];
        } else if (localTestType === 'mbti') {
            const E = testScores['E'] || 0; const I = testScores['I'] || 0;
            const S = testScores['S'] || 0; const N = testScores['N'] || 0;
            const T = testScores['T'] || 0; const F = testScores['F'] || 0;
            const J = testScores['J'] || 0; const P = testScores['P'] || 0;
            finalType += (E > I) ? 'E' : 'I';
            finalType += (S > N) ? 'S' : 'N';
            finalType += (T > F) ? 'T' : 'F';
            finalType += (J > P) ? 'J' : 'P';
            result = fullTestData.mbti.results[finalType];
        }

        if (result) {
            let resultMessage = `Terima kasih telah menjawab. Berikut adalah hasil analisa kepribadian Anda:\n\n${result.explanation}\n\n---\n\n### **${result.title}**\n\n**Potensi Diri:**\n${result.potensiDiri}\n\n**Cara Belajar yang Cocok:**\n${result.caraBelajar}\n\n**Potensi Profesi yang Sesuai:**\n- ${result.profesi.split(', ').join('\n- ')}\n\n---\n\nIngat, ini adalah peta potensi, bukan takdir. Gunakan wawasan ini untuk berkembang.`;
            displayMessage(resultMessage, 'ai');
            speakAsync(resultMessage);
        } else {
            displayMessage("Maaf, terjadi kesalahan dalam menampilkan hasil tes. Silakan mulai ulang dari header.", 'ai-system');
        }
        updateButtonVisibility();
    }
    
    async function getAIResponse(prompt, name, gender, age) {
        abortController = new AbortController();
        statusDiv.textContent = "RASA sedang berpikir...";
        updateButtonVisibility();
        
        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, name, gender, age, history: conversationHistory, mode: currentMode }),
                signal: abortController.signal
            });
            if (!apiResponse.ok) throw new Error(`Server merespon dengan status ${apiResponse.status}`);
            const result = await apiResponse.json();
            const responseText = result.aiText || `Terima kasih sudah berbagi, ${name || 'teman'}. Bisa ceritakan lebih lanjut?`;
            
            if (responseText) {
                let processedText = responseText;
                if (conversationHistory.filter(m => m.role === 'RASA').length > 0 && currentMode !== 'doctor') {
                    processedText = processedText.replace(/Assalamualaikum,?\s*/i, "").trim();
                }
                displayMessage(processedText, 'ai');
                await speakAsync(processedText);
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
               displayMessage(`Maaf, sepertinya ada sedikit gangguan koneksi. Bisa ceritakan kembali?`, 'ai-system');
            }
        } finally {
            statusDiv.textContent = "";
            updateButtonVisibility();
        }
    }

    async function speakAsync(fullText) {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }

        const cleanFullText = fullText
            .replace(/\[PILIHAN:.*?\]/g, '')
            .replace(/\[.*?\]\(.*?\)/g, '')
            .replace(/###/g, '')
            .replace(/---/g, '')
            .replace(/\*\*\*|__/g, '')
            .replace(/\*\*|__/g, '')
            .replace(/\*|_/g, '');

        let textForApi;
        const MAX_VOICE_LENGTH = 120; 
        const VOICE_INSTRUCTION = " Untuk lebih lengkap, silakan dibaca di layar Anda ya.";

        if (cleanFullText.length > MAX_VOICE_LENGTH) {
            let shortText = cleanFullText.substring(0, MAX_VOICE_LENGTH);
            let cutOffPoint = shortText.lastIndexOf('.');
            if (cutOffPoint <= 0) cutOffPoint = shortText.lastIndexOf(',');
            if (cutOffPoint <= 0) cutOffPoint = shortText.lastIndexOf(' ');
            if (cutOffPoint > 0) {
                shortText = shortText.substring(0, cutOffPoint);
            }
            textForApi = shortText.trim() + ". " + VOICE_INSTRUCTION;
        } else {
            textForApi = cleanFullText;
        }
        
        const finalTextForApi = textForApi.replace(/\bAI\b/g, 'E Ai');

        if (!finalTextForApi.trim()) {
            return Promise.resolve();
        }

        statusDiv.textContent = "Menyiapkan suara...";
        try {
            console.log("Mengirim teks ke API suara (panjang: " + finalTextForApi.length + "):", finalTextForApi); 
            
            const response = await fetch('/api/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: finalTextForApi })
            });

            if (!response.ok) {
                // PERBAIKAN: Tangkap pesan error dari backend
                const errData = await response.json().catch(() => ({}));
                const detail = errData.error || errData.details || "Unknown server error";
                throw new Error(`Gagal membuat suara (${response.status}): ${detail}`);
            }

            const data = await response.json();
            if (!data.audioContent) {
                throw new Error("Respon audio dari server kosong.");
            }

            const audioBase64 = data.audioContent;
            const audioBlob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            currentAudio = new Audio(audioUrl);
            
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
                     resolve();
                };
                currentAudio.play().catch(e => {
                    console.error("Error saat mencoba memutar audio:", e);
                    statusDiv.textContent = "Gagal memulai audio.";
                    resolve();
                });
                statusDiv.textContent = "Memutar suara...";
            });

        } catch (error) {
            console.error("Kesalahan pada fungsi speakAsync:", error);
            // PERBAIKAN: Tampilkan pesan error yang lebih informatif
            statusDiv.textContent = `Gagal mengambil data suara: ${error.message}`; 
            return Promise.resolve();
        }
    }

    // --- Sisa fungsi (handleSendMessage, displayMessage, dll) tetap sama ---
    function selectRandomQuestions(arr, n) { /* ... */ }
    function handleSendMessage() {
        if (isRecording || isOnboarding || isTesting) return;
        const userText = userInput.value.trim();
        if (!userText) return;
        displayMessage(userText, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';
        updateButtonVisibility();
        getAIResponse(userText, userName, userGender, userAge);
    }
    async function handleSendMessageWithChoice(choice) {
        displayMessage(choice, 'user');
        if (isTesting) {
            if (currentTestType === 'selection') {
                const type = choice.toLowerCase().includes('stifin') ? 'stifin' : 'mbti';
                await initiateTest(type);
            } else {
                processTestAnswer(choice);
            }
        } else {
            getAIResponse(choice, userName, userGender, userAge);
        }
    }
    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        const isInputDisabled = isTesting || isOnboarding;
        userInput.disabled = isInputDisabled;
        userInput.placeholder = isInputDisabled ? "Jawab melalui tombol atau suara..." : "Tulis ceritamu di sini...";
        if (isRecording || isInputDisabled) {
            sendBtn.style.display = 'none';
            if (isOnboarding) {
                voiceBtn.style.display = 'flex';
            } else {
                voiceBtn.style.display = 'none';
            }
        } else if (isTyping) {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex';
        }
         if (!isRecording && userInput.value.length > 0) {
             sendBtn.style.display = 'flex';
             voiceBtn.style.display = 'none';
         }
    }
    function handleCancelResponse() {
        if (abortController) abortController.abort();
        if (currentAudio) {
            currentAudio.pause();
        }
        if (recognition) recognition.abort();
        isRecording = false;
        isTesting = false;
        isOnboarding = false;
        currentTestType = null;
        voiceBtn.classList.remove('recording');
        statusDiv.textContent = "Proses dibatalkan.";
        updateButtonVisibility();
        setTimeout(() => { if (statusDiv.textContent === "Proses dibatalkan.") statusDiv.textContent = ""; }, 2000);
    }
    function toggleMainRecording() {
        if (isTesting || isOnboarding) return;
        if (isRecording) stopRecording();
        else startRecording();
    }
    function startRecording() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition || isRecording) return;
        playSound('start');
        isRecording = true;
        voiceBtn.classList.add('recording');
        updateButtonVisibility();
        recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            updateButtonVisibility();
            handleSendMessage();
        };
        recognition.onerror = (event) => {
            console.error(`Error: ${event.error}`);
            statusDiv.textContent = "Tidak dapat mengenali suara.";
        };
        recognition.onstart = () => statusDiv.textContent = "Mendengarkan...";
        recognition.onend = () => { if (isRecording) stopRecording(); };
        recognition.start();
    }
    function stopRecording() {
        if (!isRecording) return;
        playSound('stop');
        isRecording = false;
        voiceBtn.classList.remove('recording');
        if (recognition) recognition.stop();
        updateButtonVisibility();
        if (statusDiv.textContent === "Mendengarkan...") statusDiv.textContent = "";
    }
    function playSound(type) {
        if (audioContext && audioContext.state === 'suspended') { audioContext.resume(); }
        if (!audioContext) return;
        const now = audioContext.currentTime;
        function beep(startTime, freq, duration) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, startTime);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
            oscillator.start(startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
            oscillator.stop(startTime + duration);
        }
        if (type === 'start') {
            beep(now, 1000, 0.1);
        } else if (type === 'stop') {
            beep(now, 800, 0.08);
            beep(now + 0.12, 800, 0.08);
        }
    }
    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        conversationHistory = [];
        displayMessage("Pilih layanan di layar awal untuk memulai...", 'ai-system');
    }
    function displayMessage(message, sender) {
        if (sender !== 'ai-system') {
            const role = (sender === 'ai') ? 'RASA' : 'User';
            conversationHistory.push({ role: role, text: message });
        }
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-message', `${sender}-message`);

        if (sender.startsWith('user')) {
            messageContainer.textContent = message;
        } else {
            let textWithChoices = message.replace(/\[PILIHAN:(.*?)\]/g, (match, optionsString) => {
                const options = optionsString.split('|');
                let buttonsHTML = '<div class="choice-container">';
                options.forEach(option => {
                    const trimmedOption = option.trim();
                    buttonsHTML += `<button class="choice-button" data-choice="${trimmedOption}">${trimmedOption}</button>`;
                });
                return buttonsHTML + '</div>';
            });

            let textPart = textWithChoices.split('<div class="choice-container">')[0];
            let choicePart = textWithChoices.includes('<div class="choice-container">') ? '<div class="choice-container">' + textWithChoices.split('<div class="choice-container">')[1] : '';

            let html = textPart
                .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>')
                .replace(/\[LINK:(.*?)\](.*?)\[\/LINK\]/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$2</a>')
                .replace(/\*\*\*(.*?)\*\*\*/g, '<em><strong>$1</strong></em>') 
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/###\s*(.*)/g, '<h3>$1</h3>')
                .replace(/---\n?/g, '<hr>')
                .replace(/\n\s*-\s/g, '<li>');

            const lines = html.split('\n');
            let inList = false;
            let finalHTML = '';
            lines.forEach(line => {
                let trimmedLine = line.trim();
                if (trimmedLine.startsWith('<li>')) {
                    if (!inList) { finalHTML += '<ul>'; inList = true; }
                    finalHTML += `<li>${trimmedLine.substring(4)}</li>`;
                } else {
                    if (inList) { finalHTML += '</ul>'; inList = false; }
                    if (trimmedLine) {
                        finalHTML += `<p>${trimmedLine}</p>`;
                    }
                }
            });
            if (inList) finalHTML += '</ul>';
            
            finalHTML = finalHTML.replace(/<p><\/p>/g, '');
            messageContainer.innerHTML = finalHTML + choicePart;
        }

        messageContainer.querySelectorAll('.choice-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const choiceText = e.currentTarget.dataset.choice;
                button.parentElement.querySelectorAll('.choice-button').forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                });
                e.currentTarget.classList.add('selected');
                handleSendMessageWithChoice(choiceText);
            });
        });
        chatContainer.appendChild(messageContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    init();
});
