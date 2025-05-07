// report_generator.js

function generateReportHTML(reportData) {
    if (!reportData || reportData.length === 0) {
        return "<p>No extensions found or analysis incomplete. Ensure analysis is enabled and try again.</p>";
    }

    let html = '<h2>Comprehensive Privacy Risk Report</h2>';
    reportData.forEach(extReport => {
        html += `<div class="extension-report">`;
        html += `<h3>${extReport.name} (ID: <small>${extReport.id}</small>)</h3>`;
        if (extReport.risks && extReport.risks.length > 0) {
            html += `<p><strong>Identified Permission Risks:</strong></p>`;
            html += `<ul>`;
            extReport.risks.forEach(risk => {
                html += `<li>`;
                html += `<strong>Permission:</strong> <code>${risk.permission}</code><br>`;
                html += `<strong>Potential Risk:</strong> ${risk.description}<br>`;
                // Ensure severity is lowercased for CSS class matching
                html += `<strong>Severity:</strong> <span class="severity-${String(risk.severity).toLowerCase()}">${risk.severity} (Score: ${risk.score.toFixed(1)})</span><br>`;
                html += `<strong>Recommendation:</strong> ${risk.recommendation}`;
                html += `</li>`;
            });
            html += `</ul>`;
        } else if (extReport.noPermissionsFound) { // Added this condition from my previous background.js suggestion
             html += `<p>This extension does not declare any specific permissions in its manifest. This is typical for very simple extensions (e.g., themes) or might indicate it uses only very basic browser APIs that don't require explicit permission declarations.</p>`;
        }
         else {
            html += `<p>No high-risk permissions identified or manifest permissions were not available for analysis for this extension.</p>`;
        }
        html += `</div>`;
    });
    return html;
}

// Export the function so it can be imported by popup.js
export { generateReportHTML };