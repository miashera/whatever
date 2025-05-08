// report_generator.js

function generateReportHTML(reportData) {
    if (!reportData || reportData.length === 0) {
        return `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <h3>No Extensions Analyzed</h3>
                <p>Enable analysis and click "Analyze Extensions" to see the report.</p>
            </div>`;
    }

    let html = `
        <div class="report-header">
            <h2>Privacy Risk Analysis</h2>
            <p class="report-summary">Analyzed ${reportData.length} extension${reportData.length === 1 ? '' : 's'}</p>
        </div>`;

    reportData.forEach(extReport => {
        const hasRisks = extReport.risks && extReport.risks.length > 0;
        const riskLevel = hasRisks ? 
            extReport.risks.reduce((max, risk) => Math.max(max, risk.score), 0) : 0;
        
        let riskLevelClass = 'low';
        if (riskLevel >= 7) riskLevelClass = 'critical';
        else if (riskLevel >= 5) riskLevelClass = 'high';
        else if (riskLevel >= 3) riskLevelClass = 'medium';

        html += `
            <div class="extension-report">
                <div class="extension-header">
                    <div class="extension-info">
                        <h3>${extReport.name}</h3>
                        <span class="extension-id">ID: ${extReport.id}</span>
                    </div>
                    <div class="risk-level ${riskLevelClass}">
                        <span class="risk-label">Risk Level</span>
                        <span class="risk-value">${riskLevelClass.toUpperCase()}</span>
                    </div>
                </div>`;
        
        if (hasRisks) {
            html += `
                <div class="permissions-section">
                    <h4>Permission Analysis</h4>
                    <ul class="permissions-list">`;
            
            extReport.risks.forEach(risk => {
                html += `
                    <li class="permission-item severity-${risk.severity.toLowerCase()}">
                        <div class="permission-header">
                            <code>${risk.permission}</code>
                            <span class="severity-badge severity-${risk.severity.toLowerCase()}">
                                ${risk.severity} (${risk.score.toFixed(1)})
                            </span>
                        </div>
                        <div class="permission-details">
                            <div class="detail-item">
                                <span class="detail-label">Potential Risk</span>
                                <p>${risk.description}</p>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Recommendation</span>
                                <p>${risk.recommendation}</p>
                            </div>
                        </div>
                    </li>`;
            });
            
            html += `
                    </ul>
                </div>`;
        } else if (extReport.noPermissionsFound) {
            html += `
                <div class="no-permissions">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <p>This extension does not declare any specific permissions in its manifest. This is typical for very simple extensions (e.g., themes) or might indicate it uses only very basic browser APIs that don't require explicit permission declarations.</p>
                </div>`;
        } else {
            html += `
                <div class="no-risks">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <p>No high-risk permissions identified or manifest permissions were not available for analysis for this extension.</p>
                </div>`;
        }
        
        html += `</div>`;
    });
    return html;
}

// Export the function so it can be imported by popup.js
export { generateReportHTML };