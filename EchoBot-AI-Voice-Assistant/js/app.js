document.addEventListener('DOMContentLoaded', () => {
    // Check if browser supports speech recognition
    const windowWebSpeech = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!windowWebSpeech) {
        alert("Sorry, your browser doesn't support the Web Speech API. Please try using Google Chrome or Microsoft Edge.");
        return;
    }

    const recognition = new windowWebSpeech();
    
    // UI Elements
    const micBtn = document.getElementById('mic-btn');
    const statusText = document.getElementById('status');
    const transcriptionOutput = document.getElementById('transcription-output');
    const languageSelect = document.getElementById('language-select');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    // Translation Elements
    const translateBtn = document.getElementById('translate-btn');
    const translateLangSelect = document.getElementById('translate-lang-select');
    const translationOutput = document.getElementById('translation-output');

    let isRecording = false;
    let fullTranscript = '';

    // Configuration
    recognition.continuous = true; // Keep recording until stopped
    recognition.interimResults = true; // Show results while speaking
    recognition.lang = languageSelect.value;
    
    // Update language when changed
    languageSelect.addEventListener('change', (e) => {
        recognition.lang = e.target.value;
        if (isRecording) {
            // Restart recording with new language
            recognition.stop();
            setTimeout(() => recognition.start(), 300);
        }
    });

    // Toggle Recording
    micBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    function startRecording() {
        try {
            recognition.start();
        } catch(e) {
            // Already started
        }
    }

    function stopRecording() {
        recognition.stop();
        isRecording = false;
        micBtn.classList.remove('listening');
        statusText.textContent = 'Click to start speaking';
        statusText.classList.remove('active');
    }

    // Recognition Events
    recognition.onstart = function() {
        isRecording = true;
        micBtn.classList.add('listening');
        statusText.textContent = 'Listening... Speak now';
        statusText.classList.add('active');
    };

    recognition.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscriptSegment = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscriptSegment += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }

        if (finalTranscriptSegment) {
            fullTranscript += finalTranscriptSegment;
        }

        // Display transcription: full + current interim
        transcriptionOutput.value = fullTranscript + interimTranscript;
        
        // Auto-scroll to bottom
        transcriptionOutput.scrollTop = transcriptionOutput.scrollHeight;
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            statusText.textContent = 'Microphone access denied';
            stopRecording();
        } else if (event.error === 'no-speech') {
            // ignore network / no-speech timeouts to prevent errors popping up unprompted. 
        }
    };

    recognition.onend = function() {
        // If it stopped due to silence but we still want continuous recording, restart it.
       if (isRecording) {
           try {
               recognition.start();
           } catch(e) {}
       }
    };

    // Actions
    copyBtn.addEventListener('click', () => {
        if (!transcriptionOutput.value) return;
        
        navigator.clipboard.writeText(transcriptionOutput.value).then(() => {
            const icon = copyBtn.querySelector('i');
            icon.classList.remove('fa-regular', 'fa-copy');
            icon.classList.add('fa-solid', 'fa-check');
            
            setTimeout(() => {
                icon.classList.remove('fa-solid', 'fa-check');
                icon.classList.add('fa-regular', 'fa-copy');
            }, 2000);
        });
    });

    clearBtn.addEventListener('click', () => {
        fullTranscript = '';
        transcriptionOutput.value = '';
        if (translationOutput) translationOutput.value = '';
    });

    // Download functionality
    downloadBtn.addEventListener('click', () => {
        if (!transcriptionOutput.value) return;
        const blob = new Blob([transcriptionOutput.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'EchoBot_Transcription.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Translation functionality
    translateBtn.addEventListener('click', async () => {
        const textToTranslate = transcriptionOutput.value.trim();
        if (!textToTranslate) return;

        const sourceLang = recognition.lang.split('-')[0]; // Extract primary language code
        const targetLang = translateLangSelect.value;
        
        translateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Translating...';
        translateBtn.disabled = true;

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            let translatedText = '';
            // Assemble translated segments
            for (let i = 0; i < data[0].length; i++) {
                if (data[0][i][0]) {
                    translatedText += data[0][i][0];
                }
            }
            
            translationOutput.value = translatedText;
        } catch (error) {
            console.error('Translation error:', error);
            translationOutput.value = 'Failed to translate. Please try again.';
        } finally {
            translateBtn.innerHTML = '<i class="fa-solid fa-language"></i> Translate';
            translateBtn.disabled = false;
        }
    });
});
