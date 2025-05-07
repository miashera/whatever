// background.js
import { getPermissionRisk } from './cvss_adapter.js'; // Assuming cvss_adapter.js is in the same directory

// --- Main Analysis Logic ---
async function analyzeAllExtensions() {
    return new Promise((resolve) => {
        chrome.management.getAll(async (extensions) => {
            const report = [];
            for (const ext of extensions) {
                if (ext.id === chrome.runtime.id || !ext.enabled) {
                    continue;
                }

                const extReport = {
                    id: ext.id,
                    name: ext.name,
                    description: ext.description,
                    version: ext.version,
                    installType: ext.installType,
                    enabled: ext.enabled,
                    risks: []
                };

                const allPermissions = new Set(); // Use Set to avoid duplicates
                if (ext.permissions) {
                    ext.permissions.forEach(p => allPermissions.add(p));
                }
                if (ext.hostPermissions) {
                    ext.hostPermissions.forEach(p => allPermissions.add(p));
                }


                if (allPermissions.size > 0) {
                    allPermissions.forEach(perm => {
                        // Use the imported getPermissionRisk.
                        // The cvss_adapter version takes only one argument.
                        const riskInfo = getPermissionRisk(perm);
                        extReport.risks.push(riskInfo);
                    });
                    extReport.risks.sort((a, b) => b.score - a.score);
                } else {
                    extReport.noPermissionsFound = true; // For report_generator.js
                }
                report.push(extReport);
            }
            resolve(report);
        });
    });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzeExtensions") {
        // The popup.js already checks analysisEnabled.
        // If you still want the background to gatekeep, you can add the storage.get here.
        analyzeAllExtensions().then(report => {
            sendResponse(report);
        }).catch(error => {
            console.error("Error during analysis in background:", error);
            sendResponse({ error: "Analysis failed in background script." });
        });
        return true; // Indicates that the response is sent asynchronously
    }
});

console.log("Extension Privacy Analyzer background script loaded (module).");