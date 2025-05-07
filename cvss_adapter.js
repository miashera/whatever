// cvss_adapter.js

// This is a simplified model. A true CVSS has many more factors.
// We're focusing on the *potential impact* of a permission.
const PERMISSION_RISK_PROFILES = {
    // ... (your existing profiles here) ...
    "<all_urls>": { baseScore: 9.0, description: "Can access and modify data on ALL websites you visit. This is highly sensitive.", severity: "Critical" },
    "nativeMessaging": { baseScore: 9.5, description: "Can communicate with native applications on your computer, bypassing browser sandbox.", severity: "Critical" },
    "proxy": { baseScore: 9.0, description: "Can intercept and modify all your network traffic.", severity: "Critical" },
    "debugger": { baseScore: 10.0, description: "Can attach to browser processes, inspect and modify network traffic, and inject scripts. Extreme risk.", severity: "Critical" },
    "tabs": { baseScore: 7.5, description: "Can access URLs, titles, and favicons of all open tabs. Can open, close, and manipulate tabs.", severity: "High" },
    "history": { baseScore: 7.0, description: "Can read and modify your browsing history.", severity: "High" },
    "cookies": { baseScore: 8.0, description: "Can access and modify cookies for any site it has host permissions for (potentially all sites if combined with <all_urls>).", severity: "High" },
    "webRequest": { baseScore: 8.5, description: "Can observe and analyze network traffic. Can block or modify requests.", severity: "High" },
    "webRequestBlocking": { baseScore: 8.8, description: "Can block or modify network requests, potentially redirecting or altering content.", severity: "High" },
    "declarativeNetRequest": { baseScore: 7.0, description: "Can block or redirect network requests based on rules.", severity: "High" },
    "scripting": { baseScore: 8.0, description: "Can inject scripts into web pages, potentially stealing data or modifying content.", severity: "High" },
    "storage": { baseScore: 5.0, description: "Can store and retrieve data locally. Risk depends on what data is stored.", severity: "Medium" },
    "unlimitedStorage": { baseScore: 5.5, description: "Can store large amounts of data locally.", severity: "Medium" },
    "notifications": { baseScore: 4.0, description: "Can display system notifications, potentially used for phishing or annoyance.", severity: "Medium" },
    "activeTab": { baseScore: 5.0, description: "Can access the currently active tab *when the user invokes the extension*. Less risky than 'tabs' or '<all_urls>'.", severity: "Medium" },
    "geolocation": { baseScore: 6.0, description: "Can access your precise physical location.", severity: "Medium" },
    "identity": { baseScore: 6.5, description: "Can access your email address (with user consent).", severity: "Medium" },
    "downloads": { baseScore: 6.0, description: "Can initiate and manage file downloads.", severity: "Medium" },
    "management": { baseScore: 6.5, description: "Can get information about other installed extensions, enable/disable them. (This extension itself uses it).", severity: "Medium" },
    "alarms": { baseScore: 2.0, description: "Can schedule code to run periodically or at a specific time.", severity: "Low" },
    "contextMenus": { baseScore: 2.5, description: "Can add items to the browser's context menu.", severity: "Low" },
    "unknown": { baseScore: 1.0, description: "Standard or less common permission. Review its purpose if concerned.", severity: "Informational" }
};

// THIS IS THE IMPORTANT CHANGE: Add "export"
export function getPermissionRisk(permissionString) {
    let riskProfile = PERMISSION_RISK_PROFILES[permissionString];

    if (!riskProfile && (permissionString.startsWith("http://") || permissionString.startsWith("https://") || permissionString.startsWith("*://") || permissionString.startsWith("file://"))) {
        if (permissionString === "<all_urls>" || permissionString === "*://*/*") {
            riskProfile = PERMISSION_RISK_PROFILES["<all_urls>"];
        } else {
            riskProfile = {
                baseScore: 4.0,
                description: `Grants access to data and ability to run scripts on specific domains: ${permissionString}. Review these domains carefully. The risk level increases if the domain is sensitive or broadly defined (e.g., '*.*.com').`,
                severity: "Medium"
            };
        }
    }

    if (riskProfile) {
        return {
            permission: permissionString,
            score: riskProfile.baseScore,
            severity: riskProfile.severity,
            description: riskProfile.description,
            recommendation: `Evaluate if the extension's core functionality genuinely requires the '${permissionString}' permission. If this permission grants broad access (like '${PERMISSION_RISK_PROFILES["<all_urls>"].description} for <all_urls>'), be extra cautious. You can manage extension permissions via your browser's extensions page (usually: Menu > Extensions > Manage Extensions > click on the extension > Details > Permissions). If the risk seems too high for the benefit, consider disabling the feature related to this permission (if the extension allows), disabling the extension, or finding an alternative.`
        };
    }

    const defaultRisk = PERMISSION_RISK_PROFILES["unknown"];
    return {
        permission: permissionString,
        score: defaultRisk.baseScore,
        severity: defaultRisk.severity,
        description: `Permission '${permissionString}'. ${defaultRisk.description}`,
        recommendation: "Understand what this permission allows by checking the extension's documentation or its Chrome Web Store/Add-ons page. Less common permissions might still have privacy implications depending on how the extension uses them."
    };
}

// You might also want to export PERMISSION_RISK_PROFILES if you ever need it directly elsewhere
// export { getPermissionRisk, PERMISSION_RISK_PROFILES }; // Use this if you need both
// For now, just exporting getPermissionRisk is enough based on your current background.js