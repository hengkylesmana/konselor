document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENT SELECTION ===
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const endChatBtn = document.getElementById('end-chat-btn');
    const statusDiv = document.getElementById('status');
    const startOverlay = document.getElementById('start-overlay');
    const startCurhatBtn = document.getElementById('start-curhat-btn');
    const startTestBtn = document.getElementById('start-test-btn');
    const header = document.querySelector('header');
    
    // === APPLICATION STATE ===
    let conversationHistory = []; 
    let speechVoices = [];
    let userName = '', userGender = 'Pria', userAge = '';
    let abortController = null;
    let recognition = null;
    let isRecording = false;
    let audioContext = null;

    // --- Personality Test State ---
    let isTesting = false;
    let testScores = {};
    let currentTestQuestionIndex = 0;
    let dominantMK = ''; // Main Machine Intelligence (S, T, I, F, or In)

    // === INITIALIZATION ===
    loadVoices();
    displayInitialMessage();
    updateButtonVisibility();

    // === EVENT LISTENERS ===
    startCurhatBtn.addEventListener('click', () => initializeApp(false));
    startTestBtn.addEventListener('click', () => initializeApp(true));
    header.addEventListener('click', () => window.location.reload());
    
    sendBtn.addEventListener('click', handleSendMessage);
    voiceBtn.addEventListener('click', toggleMainRecording);
    endChatBtn.addEventListener('click', handleCancelResponse);
    userInput.addEventListener('input', updateButtonVisibility);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    function initializeApp(startWithTest = false) {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch(e) { console.error("Web Audio API not supported."); }
        }
        startOverlay.classList.add('hidden');
        
        if (startWithTest) {
            initiatePersonalityTest();
        } else {
            // Normal chat starts, can ask for onboarding if needed
            displayMessage("Assalamualaikum, saya RASA. Apa yang ingin kamu ceritakan hari ini?", 'ai');
        }
    }

    // === PERSONALITY TEST DATA & LOGIC ===

    const personalityTestData = {
        questions: [
            {
                question: "Ketika dihadapkan pada masalah baru, apa yang pertama kali Anda lakukan?",
                options: [
                    { text: "Mencari data dan fakta konkret yang pernah terjadi.", type: "S" },
                    { text: "Menganalisis sebab-akibat dan mencari solusi paling logis.", type: "T" },
                    { text: "Membayangkan berbagai kemungkinan dan ide-ide baru.", type: "I" },
                    { text: "Memikirkan dampaknya pada orang lain dan mencari harmoni.", type: "F" },
                    { text: "Merespon secara spontan dan beradaptasi dengan keadaan.", type: "In" }
                ]
            },
            {
                question: "Lingkungan kerja seperti apa yang paling Anda sukai?",
                options: [
                    { text: "Praktis, terstruktur, dan ada hasil nyata yang bisa dilihat.", type: "S" },
                    { text: "Efisien, berbasis aturan yang jelas, dan objektif.", type: "T" },
                    { text: "Inovatif, fleksibel, dan memberikan ruang untuk kreativitas.", type: "I" },
                    { text: "Kolaboratif, mendukung, dan penuh interaksi dengan rekan kerja.", type: "F" },
                    { text: "Dinamis, beragam, di mana saya bisa membantu di banyak bidang.", type: "In" }
                ]
            },
            {
                question: "Bagaimana cara Anda mengambil keputusan penting?",
                options: [
                    { text: "Berdasarkan pengalaman masa lalu dan bukti yang ada.", type: "S" },
                    { text: "Dengan pertimbangan untung-rugi yang matang dan rasional.", type: "T" },
                    { text: "Mengikuti intuisi dan gambaran besar tentang masa depan.", type: "I" },
                    { text: "Mempertimbangkan nilai-nilai pribadi dan perasaan orang lain.", type: "F" },
                    { text: "Dengan cepat, sesuai dengan naluri saat itu juga.", type: "In" }
                ]
            },
            {
                question: "Apa yang paling membuat Anda merasa puas dalam sebuah pencapaian?",
                options: [
                    { text: "Menyelesaikan tugas dengan tuntas dan hasilnya bisa diandalkan.", type: "S" },
                    { text: "Menciptakan sistem yang efisien atau memenangkan persaingan.", type: "T" },
                    { text: "Menghasilkan sebuah karya atau ide orisinal yang diakui.", type: "I" },
                    { text: "Membangun hubungan yang baik atau memimpin orang lain menuju sukses.", type: "F" },
                    { text: "Bisa berkontribusi dan membawa kedamaian bagi banyak orang.", type: "In" }
                ]
            },
            // Final question to determine the drive (kemudi)
            {
                question: "Mana yang lebih menggambarkan diri Anda?",
                isDriveQuestion: true,
                options: [
                    { text: "Energi dan ide saya lebih sering muncul dari dalam diri. Saya memikirkannya dulu baru beraksi.", type: "i" },
                    { text: "Saya mendapatkan energi dan ide dari interaksi dengan dunia luar. Saya lebih suka langsung mencoba.", type: "e" }
                ]
            }
        ],
        results: {
            Si: { title: "Sensing introvert (Si)", strengths: "Mengingat, rajin, otot, tergerak dari dalam.", characteristics: "Seperti 'kamus berjalan' yang penuh fakta. Seorang pekerja keras yang ulet, disiplin, dan efisien. Percaya diri dan suka menjadi pelaku atau pemain di lapangan.", careers: "Keuangan, Perbankan, Bahasa, Sejarah, Atlet, Tentara, Manufaktur, Pilot, Medis (Dokter), Administrasi." },
            Se: { title: "Sensing extrovert (Se)", strengths: "Mengingat, otot, rajin, tercetak oleh lingkungan.", characteristics: "Pandai menangkap peluang. Pembelajar yang cepat dari pengalaman ('learning by doing'). Suka bersenang-senang, dermawan, namun terkadang boros. Butuh pemicu dari luar untuk bergerak.", careers: "Wirausaha (Pedagang), Sales, Entertainer, Bisnis Perhotelan, Fotografer, Presenter, Marketing." },
            Ti: { title: "Thinking introvert (Ti)", strengths: "Menalar, mandiri, mendalam, berprinsip pada logika.", characteristics: "Seorang pakar atau spesialis yang berpikir mendalam. Bertangan dingin dalam menyelesaikan masalah. Mandiri, teguh, dan kadang keras kepala.", careers: "Ahli Riset & Teknologi, IT (Programmer, System Analyst), Insinyur, Ahli Strategi, Auditor, Konsultan Manajemen, Dokter Spesialis." },
            Te: { title: "Thinking extrovert (Te)", strengths: "Menalar, mandiri, memimpin secara logis, meluas.", characteristics: "Seorang komandan atau manajer yang hebat. Mampu mengelola sistem dan organisasi secara efektif untuk melipatgandakan hasil. Objektif, adil, dan suka mengendalikan.", careers: "Eksekutif/Manajer, Birokrat, Pembuat Kebijakan, Manufaktur, Bisnis Properti, Ahli Hukum." },
            Ii: { title: "Intuiting introvert (Ii)", strengths: "Mengarang, perubahan, murni, ide orisinal.", characteristics: "Penggagas atau pencipta ide-ide baru yang orisinal dan berkualitas tinggi. Seorang perfeksionis yang visioner. Bekerja di balik layar sebagai konseptor.", careers: "Peneliti Sains Murni, Penulis Sastra, Sutradara, Arsitek, Desainer, Investor, Pencipta Lagu, Entrepreneur (Bidang Inovasi)." },
            Ie: { title: "Intuiting extrovert (Ie)", strengths: "Mengarang, perubahan, merakit ide, inovatif.", characteristics: "Pembaharu yang pandai merakit berbagai ide menjadi sebuah inovasi yang diterima pasar. Mampu memprediksi tren bisnis. Pandai membumikan ide-ide besar.", careers: "Wirausaha/Investor, Marketing & Periklanan, Konsultan Bisnis, Cinematografer, Detektif, Bidang Lifestyle & Mode." },
            Fi: { title: "Feeling introvert (Fi)", strengths: "Merasakan, memimpin, dicintai, kharismatik.", characteristics: "Pemimpin yang kharismatik dengan pengaruh kuat dari dalam. Mampu menyentuh emosi orang lain dan memiliki visi yang jauh ke depan. Populer dan pandai meyakinkan.", careers: "Politisi, Negarawan, Pemimpin Organisasi, Psikolog, Motivator, Trainer/Public Speaker, Budayawan." },
            Fe: { title: "Feeling extrovert (Fe)", strengths: "Merasakan, memimpin dari belakang, mencintai, sosial.", characteristics: "Seorang 'king-maker' atau pemilik yang hebat dalam membangun hubungan dan menggembleng orang lain. Kemampuan sosialnya luar biasa. Senang menjadi mentor dan membangun tim yang solid.", careers: "Psikolog, Konselor, Ahli Komunikasi/Humas, Diplomat, HRD (Personalia), Aktivis Sosial." },
            In: { title: "Insting (In)", strengths: "Merangkai, refleks, berkorban, serba bisa.", characteristics: "Juru damai yang responsif dan pandai beradaptasi. Memiliki naluri yang tajam dan kemampuan untuk melihat hikmah di balik kejadian. Seorang generalis yang bisa diandalkan di banyak bidang.", careers: "Mediator, Jurnalis, Chef, Musisi, Aktivis Kemanusiaan/Agama, Pelayan Masyarakat. Cocok sebagai 'tangan kanan' di berbagai posisi." }
        }
    };

    function initiatePersonalityTest() {
        isTesting = true;
        testScores = { S: 0, T: 0, I: 0, F: 0, In: 0 };
        currentTestQuestionIndex = 0;
        chatContainer.innerHTML = ''; // Clear chat
        displayMessage("Baik, mari kita mulai Tes Kepribadian untuk mengenal dirimu lebih dalam. Jawablah beberapa pertanyaan berikut sesuai dengan yang paling mewakili dirimu.", 'ai');
        setTimeout(displayNextTestQuestion, 1000);
    }

    function displayNextTestQuestion() {
        const testData = personalityTestData;
        if (currentTestQuestionIndex < testData.questions.length) {
            const q = testData.questions[currentTestQuestionIndex];
            let questionText = `**Pertanyaan ${currentTestQuestionIndex + 1}/${testData.questions.length}:**\n${q.question}`;
            
            let choices = q.options.map(opt => opt.text).join('|');
            let fullMessage = `${questionText}\n[PILIHAN:${choices}]`;
            
            // If it's the final (drive) question, modify the prompt text slightly
            if(q.isDriveQuestion) {
                 questionText = `**Pertanyaan Terakhir:**\n${q.question}`;
                 fullMessage = `${questionText}\n[PILIHAN:${choices}]`;
            }

            displayMessage(fullMessage, 'ai');
        } else {
            // This case should be handled by processTestAnswer's logic
            calculateAndDisplayResult('e'); // Default to extrovert if something goes wrong
        }
    }

    function processTestAnswer(choice) {
        const testData = personalityTestData;
        const q = testData.questions[currentTestQuestionIndex];
        const selectedOption = q.options.find(opt => opt.text === choice);

        if (selectedOption) {
            if (q.isDriveQuestion) {
                // This was the last question, now calculate and show results
                calculateAndDisplayResult(selectedOption.type); // 'i' or 'e'
                return;
            } else {
                // It's a regular question, update score
                testScores[selectedOption.type]++;
            }
        }

        currentTestQuestionIndex++;

        // Determine dominant MK after the first 4 questions
        if (currentTestQuestionIndex === 4) {
             dominantMK = Object.keys(testScores).reduce((a, b) => testScores[a] > testScores[b] ? a : b);
             if (dominantMK === 'In') {
                 // If Insting is dominant, the test ends here as it has no drive.
                 calculateAndDisplayResult(null); // Pass null for drive
                 return;
             }
        }
        
        // Display the next question after a short delay
        setTimeout(displayNextTestQuestion, 500);
    }

    function calculateAndDisplayResult(drive) {
        isTesting = false;
        let finalType = dominantMK;

        if (finalType !== 'In') {
            finalType += drive; // e.g., 'S' + 'i' = 'Si'
        }
        
        const result = personalityTestData.results[finalType];

        if (result) {
            let resultMessage = `Terima kasih telah menjawab. Berdasarkan jawabanmu, tipe kepribadian genetikmu yang paling dominan adalah...\n\n### **${result.title}**\n\n**Kekuatan Utama:**\n*${result.strengths}*\n\n**Ciri Khas:**\n${result.characteristics}\n\n**Saran Karir yang Sesuai:**\n- ${result.careers.split(', ').join('\n- ')}\n\n---\n\nIngat, ini adalah peta potensi, bukan takdir. Gunakan wawasan ini untuk membantumu berkembang. Jika ada yang ingin kamu diskusikan tentang hasil ini, jangan ragu untuk bertanya!`;
            displayMessage(resultMessage, 'ai');
            speakAsync(resultMessage.replace(/[\*#\-]/g, ''), true);
        } else {
            displayMessage("Maaf, terjadi kesalahan dalam menampilkan hasil tes. Silakan coba lagi.", 'ai');
        }
    }

    // === CORE CHAT FUNCTIONS ===
    async function handleSendMessage() {
        if (isRecording) return;
        const userText = userInput.value.trim();
        if (!userText) return;

        displayMessage(userText, 'user');
        userInput.value = '';
        updateButtonVisibility();
        
        await getAIResponse(userText, userName, userGender, userAge);
    }
    
    function handleSendMessageWithChoice(choice) {
        displayMessage(choice, 'user');

        if (isTesting) {
            processTestAnswer(choice);
        } else {
            getAIResponse(choice, userName, userGender, userAge);
        }
    }

    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        if (isRecording || isTesting) {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'none';
        } else if (isTyping) {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'flex';
        }
    }

    // --- (The rest of the functions: getAIResponse, speakAsync, etc. remain largely the same) ---
    // --- You can copy the rest of the functions from your previous script.js version ---

    function handleCancelResponse() {
        if (abortController) abortController.abort();
        window.speechSynthesis.cancel();
        if (recognition) recognition.abort();
        isRecording = false;
        isTesting = false; // Also cancel test mode
        voiceBtn.classList.remove('recording');
        updateButtonVisibility();
        statusDiv.textContent = "Proses dibatalkan.";
        setTimeout(() => { if (statusDiv.textContent === "Proses dibatalkan.") statusDiv.textContent = ""; }, 2000);
    }
    
    function toggleMainRecording() {
        if (isTesting) return; // Disable voice input during test
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
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
        };
        recognition.onerror = (event) => {
            console.error(`Error: ${event.error}`);
            stopRecording();
        };
        recognition.onstart = () => statusDiv.textContent = "Mendengarkan...";
        recognition.onend = () => {
            if (isRecording) {
                stopRecording();
                handleSendMessage();
            }
        };
        recognition.start();
    }

    function stopRecording() {
        if (!isRecording) return;
        playSound('stop');
        isRecording = false;
        voiceBtn.classList.remove('recording');
        if (recognition) {
            recognition.stop();
            recognition = null;
        }
        updateButtonVisibility();
    }

    async function getAIResponse(prompt, name, gender, age) {
        abortController = new AbortController();
        statusDiv.textContent = "RASA sedang berpikir...";
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, name, gender, age, history: conversationHistory }),
                signal: abortController.signal
            });
            if (!response.ok) throw new Error(`Server merespon dengan status ${response.status}`);
            
            const result = await response.json();
            if (result.aiText) {
                let rawText = result.aiText;
                displayMessage(rawText, 'ai');
                const textToSpeak = rawText
                    .replace(/\[LINK:.*?\](.*?)\[\/LINK\]/g, "$1")
                    .replace(/\[PILIHAN:.*?\]/g, "")
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/[\*\_#]/g, '')
                    .replace(/^\s*[\-\*]\s+/gm, '');
                await speakAsync(textToSpeak, true);
            } else { throw new Error("Respon tidak valid."); }
        } catch (error) {
            if (error.name !== 'AbortError') displayMessage(`Maaf, terjadi gangguan: ${error.message}`, 'ai-system');
        } finally {
            statusDiv.textContent = "";
        }
    }

    function loadVoices() {
        if (!('speechSynthesis' in window)) return;
        speechVoices = window.speechSynthesis.getVoices();
        if (speechVoices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => { speechVoices = window.speechSynthesis.getVoices(); };
        }
    }
    
    function speakAsync(text, isAIResponse = false) {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window) || isTesting) { // Don't speak during the test for faster flow
                resolve();
                return;
            }
            updateButtonVisibility();
            const cleanedText = text.replace(/[\*\_#]/g, '');
            const utterance = new SpeechSynthesisUtterance(cleanedText);
            utterance.lang = 'id-ID';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            if (isAIResponse) {
                let maleVoice = speechVoices.find(v => v.lang === 'id-ID' && (v.name.includes('Google') || v.name.includes('Rizwan') || v.name.toLowerCase().includes('male')));
                if (maleVoice) {
                    utterance.voice = maleVoice;
                    utterance.pitch = 0.8;
                    utterance.rate = 0.85;
                }
            }
            const onSpeechEnd = () => {
                updateButtonVisibility();
                resolve();
            };
            utterance.onend = onSpeechEnd;
            utterance.onerror = (e) => { console.error("Speech synthesis error:", e); onSpeechEnd(); reject(e); };
            window.speechSynthesis.speak(utterance);
        });
    }

    function playSound(type) {
        if (!audioContext) return;
        function beep(startTime, freq, duration) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'sine';
            oscillator.frequency.value = freq;
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
            oscillator.start(startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
            oscillator.stop(startTime + duration);
        }
        const now = audioContext.currentTime;
        if (type === 'start') { beep(now, 1000, 0.1); } 
        else if (type === 'stop') { beep(now, 800, 0.08); beep(now + 0.12, 800, 0.08); }
    }

    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        conversationHistory = [];
        const initialMessage = "Pilih layanan di layar awal untuk memulai...";
        displayMessage(initialMessage, 'ai-system');
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
            // Process markdown-like formatting for AI messages
            let processedHTML = message
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/###\s*(.*)/g, '<h3>$1</h3>')
                .replace(/\n\s*-\s/g, '<li>');

            processedHTML = processedHTML.split('\n').map(line => {
                if (line.startsWith('<li>')) {
                    return line;
                }
                return line;
            }).join('<br>').replace(/<br><li>/g, '<li>').replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
            
            processedHTML = processedHTML.replace(/<\/li><br>/g, '</li>');
            processedHTML = processedHTML.replace(/<br><ul>/g, '<ul>');
            processedHTML = processedHTML.replace(/<\/ul><br>/g, '</ul>');
            
            const choiceRegex = /\[PILIHAN:(.*?)\]/g;
            processedHTML = processedHTML.replace(choiceRegex, (match, optionsString) => {
                const options = optionsString.split('|');
                let buttonsHTML = '<div class="choice-container">';
                options.forEach(option => {
                    const trimmedOption = option.trim();
                    buttonsHTML += `<button class="choice-button" data-choice="${trimmedOption}">${trimmedOption}</button>`;
                });
                buttonsHTML += '</div>';
                return buttonsHTML;
            });

            const linkRegex = /\[LINK:(.*?)\](.*?)\[\/LINK\]/g;
            processedHTML = processedHTML.replace(linkRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$2</a>');
            
            messageContainer.innerHTML = processedHTML;

            messageContainer.querySelectorAll('.choice-button').forEach(button => {
                button.addEventListener('click', () => {
                    const choiceText = button.dataset.choice;
                    // Disable all buttons in this group
                    button.parentElement.querySelectorAll('.choice-button').forEach(btn => {
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                    });
                    button.classList.add('selected');
                    handleSendMessageWithChoice(choiceText);
                });
            });
        }
        chatContainer.appendChild(messageContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});
