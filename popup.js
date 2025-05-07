// popup.js
import { generateReportHTML } from './report_generator.js';

const analysisToggle = document.getElementById('analysisToggle');
const analyzeButton = document.getElementById('analyzeButton');
const reportContainer = document.getElementById('reportContainer');
const downloadFullReportButton = document.getElementById('downloadFullReportButton'); // <<< NEW

let currentReportData = null; // To store the last generated report data

// --- Helper function to trigger download ---
function downloadFile(filename, content, contentType = 'text/plain;charset=utf-8') {
    const element = document.createElement('a');
    element.setAttribute('href', `data:${contentType},` + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// --- Function to generate plain text report ---
function generatePlainTextReport(reportData) {
    if (!reportData || reportData.length === 0) {
        return "No extensions found or analysis incomplete.";
    }

    let text = "Comprehensive Privacy Risk Report\n";
    text += "===================================\n\n";

    reportData.forEach(extReport => {
        text += `Extension: ${extReport.name} (ID: ${extReport.id})\n`;
        text += `--------------------------------------------------\n`;
        if (extReport.risks && extReport.risks.length > 0) {
            text += "Identified Permission Risks:\n";
            extReport.risks.forEach(risk => {
                text += `  - Permission: ${risk.permission}\n`;
                text += `    Potential Risk: ${risk.description}\n`;
                text += `    Severity: ${risk.severity} (Score: ${risk.score.toFixed(1)})\n`;
                text += `    Recommendation: ${risk.recommendation}\n\n`;
            });
        } else if (extReport.noPermissionsFound) {
            text += "  This extension does not declare any specific permissions in its manifest.\n\n";
        } else {
            text += "  No high-risk permissions identified or manifest permissions not available.\n\n";
        }
    });
    return text;
}


// Load toggle state on popup open
chrome.storage.local.get(['analysisEnabled'], (result) => {
    analysisToggle.checked = !!result.analysisEnabled;
    analyzeButton.disabled = !analysisToggle.checked;
});

analysisToggle.addEventListener('change', () => {
    const enabled = analysisToggle.checked;
    chrome.storage.local.set({ analysisEnabled: enabled });
    analyzeButton.disabled = !enabled;
    if (!enabled) {
        reportContainer.innerHTML = "<p>Privacy analysis is disabled.</p>";
        if (downloadFullReportButton) downloadFullReportButton.classList.add('hidden'); // Hide download if disabled
        currentReportData = null;
    }
});

analyzeButton.addEventListener('click', async () => {
    if (!analysisToggle.checked) {
        reportContainer.innerHTML = "<p>Please enable privacy analysis first.</p>";
        if (downloadFullReportButton) downloadFullReportButton.classList.add('hidden');
        currentReportData = null;
        return;
    }
    reportContainer.innerHTML = "<p>Analyzing...</p>";
    if (downloadFullReportButton) downloadFullReportButton.classList.add('hidden'); // Hide while analyzing
    currentReportData = null;

    try {
        const report = await chrome.runtime.sendMessage({ action: "analyzeExtensions" });
        if (report && report.error) {
            console.error("Error from background script:", report.error);
            reportContainer.innerHTML = `<p>Error analyzing extensions: ${report.error}</p>`;
        } else {
            currentReportData = report; // Store the data
            displayReport(report);
            if (report && report.length > 0 && downloadFullReportButton) {
                downloadFullReportButton.classList.remove('hidden'); // Show download button
            }
        }
    } catch (error) {
        console.error("Error sending message or receiving report:", error);
        reportContainer.innerHTML = `<p>Error analyzing extensions: ${error.message}. Check background script.</p>`;
    }
});

function displayReport(reportData) {
    reportContainer.innerHTML = generateReportHTML(reportData); // Uses your existing report_generator.js
    // After displaying, you could add individual download buttons here if desired
    addIndividualDownloadButtons(reportData);
}

// --- Download Full Report Event Listener ---
if (downloadFullReportButton) {
    downloadFullReportButton.addEventListener('click', () => {
        if (currentReportData) {
            const plainTextContent = generatePlainTextReport(currentReportData);
            downloadFile('extension_privacy_report.txt', plainTextContent);

            // To download as HTML:
            // const htmlContent = `<!DOCTYPE html><html><head><title>Extension Report</title><style>/* Basic styles for HTML report */ body{font-family:sans-serif;margin:20px;} .extension-report{border:1px solid #ccc; padding:10px; margin-bottom:10px;} h2,h3{color:#333;} code{background:#f4f4f4;padding:2px 4px;border-radius:3px;} .severity-critical{color:red;font-weight:bold;} .severity-high{color:orange;} .severity-medium{color:goldenrod;} .severity-low{color:green;} .severity-informational{color:blue;} </style></head><body>${generateReportHTML(currentReportData)}</body></html>`;
            // downloadFile('extension_privacy_report.html', htmlContent, 'text/html;charset=utf-8');
        } else {
            alert('No report data available to download. Please analyze first.');
        }
    });
}

// --- FOR INDIVIDUAL DOWNLOADS (More Advanced) ---
function addIndividualDownloadButtons(reportData) {
    const reportElements = reportContainer.querySelectorAll('.extension-report');
    reportElements.forEach((reportDiv, index) => {
        const extData = reportData[index];
        if (!extData) return;

        const individualDownloadButton = document.createElement('button');
        individualDownloadButton.textContent = 'Download This Report (TXT)';
        individualDownloadButton.classList.add('individual-download-btn'); // For styling
        individualDownloadButton.style.marginLeft = '10px'; // Basic styling
        individualDownloadButton.style.fontSize = '12px';
        individualDownloadButton.style.padding = '4px 8px';


        individualDownloadButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent any parent click listeners
            const singleExtReportData = [extData]; // generatePlainTextReport expects an array
            const plainTextContent = generatePlainTextReport(singleExtReportData);
            const safeFilename = extData.name.replace(/[^a-z0-9_]/gi, '_').toLowerCase(); // Sanitize filename
            downloadFile(`${safeFilename}_report.txt`, plainTextContent);
        });

        // Find a place to append it, e.g., after the h3 title
        const titleElement = reportDiv.querySelector('h3');
        if (titleElement) {
            titleElement.insertAdjacentElement('afterend', individualDownloadButton);
        }
    });
}