// extension-dashboard.js

function initializeDashboardView() {
    const rootElement = document.getElementById('root');

    if (rootElement) {
        // Clear any previous content in #root (if any)
        rootElement.innerHTML = '';

        // Create and append new dashboard elements
        const title = document.createElement('h2');
        title.textContent = 'Main Dashboard Area';
        rootElement.appendChild(title);

        const welcomeMessage = document.createElement('p');
        welcomeMessage.textContent = 'The dashboard is now active. ';
        rootElement.appendChild(welcomeMessage);

        const infoMessage = document.createElement('p');
        infoMessage.innerHTML = `
            The primary "Extension Privacy Analyzer" controls (toggle, analyze button, report area)
            are currently managed by <code>popup.js</code> and located outside of this
            <code>#dashboard-wrapper</code> and <code>#root</code> element in <code>popup.html</code>.
            This <code>#root</code> area can be used for other dashboard-specific features or information.
        `;
        rootElement.appendChild(infoMessage);

        console.log('extension-dashboard.js: Dashboard view initialized and content rendered in #root.');

    } else {
        console.error('extension-dashboard.js: Critical error - #root element not found in the DOM. Dashboard cannot be rendered.');
    }
}

// --- Script Execution ---

// Log that the script has been loaded
console.log('extension-dashboard.js script loaded and executing.');

// Initialize the dashboard view.
// This script is loaded dynamically by auth.js after the #dashboard-wrapper (which contains #root)
// is made visible, so #root should be available in the DOM.
initializeDashboardView();

// You can add more functions and logic here for your dashboard as needed.
// For example, fetching data, setting up charts, handling user interactions specific to this dashboard view.

/*
Example of adding an event listener if you add interactive elements here:
const myDashboardButton = document.createElement('button');
myDashboardButton.textContent = 'Dashboard Action';
myDashboardButton.addEventListener('click', () => {
    alert('Dashboard action button clicked!');
});
if (document.getElementById('root')) { // Check if root exists before appending
    document.getElementById('root').appendChild(myDashboardButton);
}
*/