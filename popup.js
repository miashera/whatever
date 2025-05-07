// popup.js
import { generateReportHTML } from './report_generator.js'; // Correct import

const analysisToggle = document.getElementById('analysisToggle');
const analyzeButton = document.getElementById('analyzeButton');
const reportContainer = document.getElementById('reportContainer');

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
    }
});

analyzeButton.addEventListener('click', async () => {
    if (!analysisToggle.checked) {
        reportContainer.innerHTML = "<p>Please enable privacy analysis first.</p>";
        return;
    }
    reportContainer.innerHTML = "<p>Analyzing...</p>";
    try {
        // Send message to background script to perform analysis
        const report = await chrome.runtime.sendMessage({ action: "analyzeExtensions" });

        // Check if the background script itself sent back an error object
        if (report && report.error) {
            console.error("Error from background script:", report.error);
            reportContainer.innerHTML = `<p>Error analyzing extensions: ${report.error}</p>`;
        } else {
            displayReport(report); // Pass the report data to displayReport
        }
    } catch (error) {
        // This catches errors in sending the message or if the promise from sendMessage rejects
        console.error("Error getting report:", error);
        reportContainer.innerHTML = `<p>Error analyzing extensions: ${error.message}. Check the background script console for more details.</p>`;
    }
});

// Updated displayReport function
function displayReport(reportData) {
    // Now this function simply calls the imported HTML generator
    reportContainer.innerHTML = generateReportHTML(reportData);
}