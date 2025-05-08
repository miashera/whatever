// Handle popup sizing and full-screen mode
document.addEventListener('DOMContentLoaded', () => {
    const isFullScreen = window.location.search.includes('context=tab');
    
    if (isFullScreen) {
        document.body.classList.add('full-tab-mode');
        // Center the content in full-screen mode
        const mainContent = document.getElementById('main-app-content');
        const lockScreen = document.getElementById('lock-screen-container');
        const changePassword = document.getElementById('change-password-container');
        
        [mainContent, lockScreen, changePassword].forEach(container => {
            if (container) {
                container.style.maxWidth = '1000px';
                container.style.margin = '32px auto';
                container.style.width = '100%';
            }
        });
    } else {
        // Set popup size for normal mode
        document.body.style.width = '800px';
        document.body.style.height = '600px';
    }
}); 