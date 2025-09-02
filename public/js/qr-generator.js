const form = document.getElementById('qrForm');
const statusDiv = document.getElementById('status');
const generateBtn = document.getElementById('generateBtn');
const progressDiv = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const downloadLinks = document.getElementById('downloadLinks');

function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
}

function updateProgress(percent) {
    progressBar.style.width = percent + '%';
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const count = parseInt(document.getElementById('count').value);
    
    if (count < 1 || count > 10000) {
        showStatus('Please enter a number between 1 and 10000', 'error');
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    progressDiv.style.display = 'block';
    downloadLinks.style.display = 'none';
    
    showStatus('Starting QR code generation...', 'info');
    updateProgress(0);

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ count }),
        });

        if (!response.ok) {
            throw new Error('Generation failed');
        }

        const result = await response.json();
        showStatus(`Successfully generated ${result.count} QR codes in ${result.duration}ms!`, 'success');
        downloadLinks.style.display = 'block';
        updateProgress(100);
    } catch (error) {
        showStatus('Error generating QR codes: ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate QR Codes';
        setTimeout(() => {
            progressDiv.style.display = 'none';
            updateProgress(0);
        }, 3000);
    }
});
