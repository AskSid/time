document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const logTextarea = document.getElementById('logText');
    const submitBtn = document.getElementById('submitBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const structuredOutputPre = document.getElementById('structuredOutput');
    const emptyState = document.getElementById('emptyState');
    const recordingIndicator = document.getElementById('recordingIndicator');

    // Function to toggle between empty state and output display
    const toggleOutputDisplay = (hasOutput) => {
        if (hasOutput) {
            structuredOutputPre.classList.remove('hidden');
            emptyState.classList.add('hidden');
        } else {
            structuredOutputPre.classList.add('hidden');
            emptyState.classList.remove('hidden');
        }
    };

    // Initialize with empty state
    toggleOutputDisplay(false);

    // Process log submission
    submitBtn.addEventListener('click', async () => {
        const logText = logTextarea.value.trim();
        
        if (!logText) {
            // Simple validation with a subtle animation
            logTextarea.classList.add('error-shake');
            setTimeout(() => logTextarea.classList.remove('error-shake'), 600);
            return;
        }

        // Disable button and show loading state
        submitBtn.disabled = true;
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = `
            <svg class="icon spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            Processing...
        `;

        const formData = new FormData();
        formData.append('log_text', logText);

        try {
            const response = await fetch('/api/process_log', {
                method: 'POST',
                body: formData
            });

            // Handle API response
            if (!response.ok) {
                const errorData = await response.json();
                structuredOutputPre.textContent = JSON.stringify({
                    error: `Error processing log: ${response.statusText}`,
                    details: errorData
                }, null, 2);
                toggleOutputDisplay(true);
                return;
            }

            // Process successful response
            const structuredData = await response.json();
            structuredOutputPre.textContent = JSON.stringify(structuredData, null, 2);
            toggleOutputDisplay(true);
            
            // Clear textarea only on successful processing
            logTextarea.value = "";
            
            // Add a subtle success indicator
            const outputContent = document.querySelector('.output-content');
            outputContent.classList.add('success-flash');
            setTimeout(() => outputContent.classList.remove('success-flash'), 1000);

        } catch (error) {
            structuredOutputPre.textContent = JSON.stringify({
                error: "Connection error",
                details: error.message
            }, null, 2);
            toggleOutputDisplay(true);
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Voice recognition functionality
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        let isRecording = false;
        let finalTranscript = '';

        voiceBtn.addEventListener('click', () => {
            if (!isRecording) {
                // Start recording
                finalTranscript = '';
                recognition.start();
                voiceBtn.innerHTML = `
                    <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    Stop Recording
                `;
                voiceBtn.classList.remove('secondary-button');
                voiceBtn.classList.add('primary-button');
                recordingIndicator.classList.remove('hidden');
                logTextarea.placeholder = "Listening...";
            } else {
                // Stop recording
                recognition.stop();
                resetVoiceUI();
            }
            isRecording = !isRecording;
        });

        // Handle recognition results
        recognition.onresult = (event) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update textarea with transcription
            logTextarea.value = finalTranscript + interimTranscript;
        };

        // Handle recognition end (can happen automatically)
        recognition.onend = () => {
            if (isRecording) {
                // If we're still in recording mode but recognition ended
                resetVoiceUI();
                isRecording = false;
            }
        };

        // Handle errors
        recognition.onerror = (event) => {
            console.error('Speech Recognition Error:', event.error);
            
            // Show error message in output area
            structuredOutputPre.textContent = JSON.stringify({
                error: "Voice Recognition Error",
                details: event.error
            }, null, 2);
            toggleOutputDisplay(true);
            
            resetVoiceUI();
            isRecording = false;
        };

        function resetVoiceUI() {
            voiceBtn.innerHTML = `
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" x2="12" y1="19" y2="22"></line>
                </svg>
                Start Voice Log
            `;
            voiceBtn.classList.remove('primary-button');
            voiceBtn.classList.add('secondary-button');
            recordingIndicator.classList.add('hidden');
            logTextarea.placeholder = "Enter your time log in natural language...";
        }

    } else {
        // Voice recognition not supported
        voiceBtn.disabled = true;
        voiceBtn.innerHTML = `
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
            Voice not supported
        `;
        voiceBtn.classList.add('disabled-button');
    }

    // Handle CSV download
    downloadCsvBtn.addEventListener('click', async () => {
        // Show loading state
        downloadCsvBtn.disabled = true;
        const originalBtnText = downloadCsvBtn.innerHTML;
        downloadCsvBtn.innerHTML = `
            <svg class="icon spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            Downloading...
        `;

        try {
            const response = await fetch('/api/download_csv');

            if (!response.ok) {
                const errorData = await response.json();
                // Display error in output area
                structuredOutputPre.textContent = JSON.stringify({
                    error: `Error downloading CSV: ${response.statusText}`,
                    details: errorData
                }, null, 2);
                toggleOutputDisplay(true);
                return;
            }

            // Process and trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().slice(0, 10);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `time_logs_${timestamp}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            // Show error message
            structuredOutputPre.textContent = JSON.stringify({
                error: "Download Error",
                details: error.message
            }, null, 2);
            toggleOutputDisplay(true);
        } finally {
            // Reset button state
            downloadCsvBtn.disabled = false;
            downloadCsvBtn.innerHTML = originalBtnText;
        }
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (document.activeElement === logTextarea && !submitBtn.disabled) {
                submitBtn.click();
            }
        }
    });

    // Add visual feedback on focus
    logTextarea.addEventListener('focus', () => {
        logTextarea.classList.add('focused');
    });

    logTextarea.addEventListener('blur', () => {
        logTextarea.classList.remove('focused');
    });

    // Add these additional styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .error-shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
            border-color: var(--error) !important;
        }
        
        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
            40%, 60% { transform: translate3d(3px, 0, 0); }
        }
        
        .success-flash {
            animation: flashSuccess 1s ease-out;
        }
        
        @keyframes flashSuccess {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.3); }
            70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        
        .focused {
            border-color: var(--primary) !important;
            box-shadow: 0 0 0 3px rgba(121, 99, 178, 0.2);
        }
        
        .spin {
            animation: spin 1.5s linear infinite;
        }
        
        @keyframes spin {
            100% { transform: rotate(360deg); }
        }
        
        .disabled-button {
            opacity: 0.6;
            cursor: not-allowed;
            background-color: var(--neutral-200);
        }
    `;
    document.head.appendChild(style);
});