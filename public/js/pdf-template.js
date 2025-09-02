const pdfForm = document.getElementById('pdfForm');
const pdfStatusDiv = document.getElementById('pdfStatus');
const generatePdfBtn = document.getElementById('generatePdfBtn');
const pdfProgressDiv = document.getElementById('pdfProgress');
const pdfProgressBar = document.getElementById('pdfProgressBar');
const pdfDownloadLinks = document.getElementById('pdfDownloadLinks');
const pdfDownloadLink = document.getElementById('pdfDownloadLink');

function showPdfStatus(message, type) {
    pdfStatusDiv.textContent = message;
    pdfStatusDiv.className = type;
    pdfStatusDiv.style.display = 'block';
}

function updatePdfProgress(percent) {
    pdfProgressBar.style.width = percent + '%';
}

pdfForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const csvFile = document.getElementById('csvFile').files[0];
    const pdfTemplate = document.getElementById('pdfTemplate').files[0];
    
    if (!csvFile || !pdfTemplate) {
        showPdfStatus('Please select both CSV and PDF files', 'error');
        return;
    }

    generatePdfBtn.disabled = true;
    generatePdfBtn.textContent = 'Generating...';
    pdfProgressDiv.style.display = 'block';
    pdfDownloadLinks.style.display = 'none';
    
    showPdfStatus('Processing files and generating PDF...', 'info');
    updatePdfProgress(0);

    try {
        const formData = new FormData();
        formData.append('csvFile', csvFile);
        formData.append('pdfTemplate', pdfTemplate);

        const response = await fetch('/generate-pdf-template', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('PDF generation failed');
        }

        const result = await response.json();
        showPdfStatus(`Successfully generated PDF with ${result.count} QR codes!`, 'success');
        
        // Update download link
        pdfDownloadLink.href = `/out/${result.filename}`;
        pdfDownloadLinks.style.display = 'block';
        updatePdfProgress(100);
    } catch (error) {
        showPdfStatus('Error generating PDF: ' + error.message, 'error');
    } finally {
        generatePdfBtn.disabled = false;
        generatePdfBtn.textContent = 'Generate PDF with QR Codes';
        setTimeout(() => {
            pdfProgressDiv.style.display = 'none';
            updatePdfProgress(0);
        }, 3000);
    }
});
