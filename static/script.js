document.addEventListener('DOMContentLoaded', () => {
    const logTextarea = document.getElementById('logText');
    const submitBtn = document.getElementById('submitBtn');
    const voiceBtn = document.getElementById('voiceBtn'); // Optional voice button
    const structuredOutputPre = document.getElementById('structuredOutput');

    submitBtn.addEventListener('click', async () => {
        const logText = logTextarea.value;
        if (!logText) {
            alert("Please enter your log text.");
            return;
        }

        const formData = new FormData();
        formData.append('log_text', logText);

        try {
            const response = await fetch('/api/process_log', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                structuredOutputPre.textContent = `Error processing log: ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`;
                return;
            }

            const structuredData = await response.json();
            structuredOutputPre.textContent = JSON.stringify(structuredData, null, 2);
            logTextarea.value = ""; // Clear textarea after successful processing

        } catch (error) {
            structuredOutputPre.textContent = `Fetch error: ${error}`;
        }
    });

    // **Optional Voice Input (Basic)**
    if ("webkitSpeechRecognition" in window) { // Chrome, Safari
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false; // Only final results
        let isRecording = false;

        voiceBtn.addEventListener('click', () => {
            if (!isRecording) {
                recognition.start();
                voiceBtn.textContent = "Stop Voice Log";
                isRecording = true;
                logTextarea.placeholder = "Speak now...";
                logTextarea.value = ""; // Clear previous text when starting voice input
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
                .map(result => result.transcript)
                .join('');
            logTextarea.value = transcript;
        }

        recognition.onerror = function(event) {
            structuredOutputPre.textContent = `Voice recognition error: ${event.error}`;
            voiceBtn.textContent = "Start Voice Log"; // Reset button in case of error
            isRecording = false;
            logTextarea.placeholder = "Enter your time log here...";
        }

    } else {
        voiceBtn.disabled = true;
        voiceBtn.textContent = "Voice not supported in this browser";
    }

    downloadCsvBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/download_csv'); // Fetch CSV endpoint

            if (!response.ok) {
                const errorData = await response.json();
                alert(`Error downloading CSV: ${response.statusText}\n${errorData.error || errorData.message}`); // Show error
                return;
            }

            // Get the CSV data as a Blob
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob); // Create a URL for the blob
            const a = document.createElement('a'); // Create a temporary link element
            a.href = url;
            a.download = 'time_logs_export.csv'; // Set filename for download
            document.body.appendChild(a); // Append to body (required for Firefox)
            a.click(); // Programmatically click the link to trigger download
            a.remove(); // Clean up by removing the link
            window.URL.revokeObjectURL(url); // Revoke the URL

        } catch (error) {
            alert(`Error initiating CSV download: ${error}`);
        }
    });
});