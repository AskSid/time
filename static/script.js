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

    // **Standard SpeechRecognition API (More Cross-Browser Compatible)**
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) { // Check for both standard and webkit (for wider browser support)
        const Recognition = window.SpeechRecognition || webkitSpeechRecognition; // Use standard if available, fallback to webkit
        const recognition = new Recognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        let isRecording = false;

        voiceBtn.addEventListener('click', () => {
            if (!isRecording) {
                recognition.start();
                voiceBtn.textContent = "Stop Voice Log";
                isRecording = true;
                logTextarea.placeholder = "Speak now...";
                logTextarea.value = "";
            } else {
                recognition.stop();
                voiceBtn.textContent = "Start Voice Log";
                isRecording = false;
                logTextarea.placeholder = "Enter your time log here...";
            }
        });

        recognition.onresult = function(event) {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result[0].transcript) // Access transcript slightly differently in standard API
                .join('');
            logTextarea.value = transcript;
        }

        recognition.onerror = function(event) {
            structuredOutputPre.textContent = `Voice recognition error: ${event.error}, code: ${event.code}`; // Standard API has 'code'
            voiceBtn.textContent = "Start Voice Log";
            isRecording = false;
            logTextarea.placeholder = "Enter your time log here...";
        }
    } else {
        voiceBtn.disabled = true;
        voiceBtn.textContent = "Voice not supported in this browser";
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