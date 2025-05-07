// auth.js

// --- DOM Elements ---
const initialLoader = document.getElementById('initial-loader');
const lockScreenContainer = document.getElementById('lock-screen-container');
const lockTitle = document.getElementById('lock-title');
const lockSubtitle = document.getElementById('lock-subtitle');
const passwordInput = document.getElementById('password-input');
const confirmPasswordInput = document.getElementById('confirm-password-input');
const unlockButton = document.getElementById('unlock-button');
const setPasswordButton = document.getElementById('set-password-button');
const lockError = document.getElementById('lock-error');

const dashboardWrapper = document.getElementById('dashboard-wrapper');
const lockExtensionButton = document.getElementById('lock-extension-button');
const changePasswordNavButton = document.getElementById('change-password-nav-button');

const changePasswordContainer = document.getElementById('change-password-container');
const currentPasswordInput = document.getElementById('current-password-input');
const newPasswordInput = document.getElementById('new-password-input');
const confirmNewPasswordInput = document.getElementById('confirm-new-password-input');
const submitChangePasswordButton = document.getElementById('submit-change-password-button');
const cancelChangePasswordButton = document.getElementById('cancel-change-password-button');
const changePasswordError = document.getElementById('change-password-error');
const changePasswordSuccess = document.getElementById('change-password-success');

// --- Constants ---
const PASSWORD_HASH_KEY = 'extension_password_hash';
const IS_LOCKED_KEY = 'extension_is_locked';

// --- Utility Functions ---
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideError(element) {
    element.classList.add('hidden');
    element.textContent = '';
}

// --- Core Logic ---
async function loadDashboard() {
    hideError(lockError);
    lockScreenContainer.classList.add('hidden');
    changePasswordContainer.classList.add('hidden');
    dashboardWrapper.classList.remove('hidden');
    initialLoader.classList.add('hidden'); // Hide loader once dashboard is ready

    // Check if dashboard script is already loaded
    if (!document.querySelector('script[src="extension-dashboard.js"]')) {
        const script = document.createElement('script');
        script.src = 'extension-dashboard.js';
        script.type = 'module';
        document.body.appendChild(script);
    }
}

function showLockScreen(isInitialSetup = false) {
    dashboardWrapper.classList.add('hidden');
    changePasswordContainer.classList.add('hidden');
    lockScreenContainer.classList.remove('hidden');
    initialLoader.classList.add('hidden'); // Hide loader, show lock screen

    passwordInput.value = '';
    confirmPasswordInput.value = '';
    hideError(lockError);

    if (isInitialSetup) {
        lockTitle.textContent = 'Set Password';
        lockSubtitle.classList.remove('hidden');
        unlockButton.classList.add('hidden');
        setPasswordButton.classList.remove('hidden');
        confirmPasswordInput.classList.remove('hidden');
    } else {
        lockTitle.textContent = 'Unlock Extension';
        lockSubtitle.classList.add('hidden');
        unlockButton.classList.remove('hidden');
        setPasswordButton.classList.add('hidden');
        confirmPasswordInput.classList.add('hidden');
    }
}

function showChangePasswordScreen() {
    dashboardWrapper.classList.add('hidden');
    lockScreenContainer.classList.add('hidden');
    changePasswordContainer.classList.remove('hidden');
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    confirmNewPasswordInput.value = '';
    hideError(changePasswordError);
    hideError(changePasswordSuccess);
}

async function handleSetPassword() {
    const pass = passwordInput.value;
    const confirmPass = confirmPasswordInput.value;

    if (!pass) {
        showError(lockError, 'Password cannot be empty.');
        return;
    }
    if (pass !== confirmPass) {
        showError(lockError, 'Passwords do not match.');
        return;
    }
    if (pass.length < 6) { // Basic validation
        showError(lockError, 'Password must be at least 6 characters.');
        return;
    }

    const hashedPassword = await hashPassword(pass);
    chrome.storage.local.set({ [PASSWORD_HASH_KEY]: hashedPassword, [IS_LOCKED_KEY]: false }, () => {
        console.log('Password set and extension unlocked.');
        loadDashboard();
    });
}

async function handleUnlock() {
    const pass = passwordInput.value;
    if (!pass) {
        showError(lockError, 'Please enter your password.');
        return;
    }

    chrome.storage.local.get([PASSWORD_HASH_KEY], async (result) => {
        const storedHash = result[PASSWORD_HASH_KEY];
        if (!storedHash) { // Should not happen if not initial setup
            showError(lockError, 'Error: Password not set. Please contact support or reset.');
            return;
        }
        const inputHash = await hashPassword(pass);
        if (inputHash === storedHash) {
            chrome.storage.local.set({ [IS_LOCKED_KEY]: false }, () => {
                console.log('Extension unlocked.');
                loadDashboard();
            });
        } else {
            showError(lockError, 'Incorrect password.');
        }
    });
}

function handleLockExtension() {
    chrome.storage.local.set({ [IS_LOCKED_KEY]: true }, () => {
        console.log('Extension locked.');
        showLockScreen();
    });
}

async function handleChangePassword() {
    const currentPass = currentPasswordInput.value;
    const newPass = newPasswordInput.value;
    const confirmNewPass = confirmNewPasswordInput.value;

    hideError(changePasswordError);
    hideError(changePasswordSuccess);

    if (!currentPass || !newPass || !confirmNewPass) {
        showError(changePasswordError, 'All fields are required.');
        return;
    }
    if (newPass !== confirmNewPass) {
        showError(changePasswordError, 'New passwords do not match.');
        return;
    }
    if (newPass.length < 6) {
        showError(changePasswordError, 'New password must be at least 6 characters.');
        return;
    }

    chrome.storage.local.get([PASSWORD_HASH_KEY], async (result) => {
        const storedHash = result[PASSWORD_HASH_KEY];
        const currentInputHash = await hashPassword(currentPass);

        if (currentInputHash !== storedHash) {
            showError(changePasswordError, 'Incorrect current password.');
            return;
        }

        if (currentPass === newPass) {
            showError(changePasswordError, 'New password cannot be the same as the current password.');
            return;
        }

        const newHashedPassword = await hashPassword(newPass);
        chrome.storage.local.set({ [PASSWORD_HASH_KEY]: newHashedPassword }, () => {
            changePasswordSuccess.textContent = 'Password changed successfully!';
            changePasswordSuccess.classList.remove('hidden');
            console.log('Password changed.');
            // Optionally, auto-navigate back or provide a button to go back
            setTimeout(() => {
                // if still on change password screen, go back to dashboard
                if (!changePasswordContainer.classList.contains('hidden')) {
                    loadDashboard();
                }
            }, 2000);
        });
    });
}


// --- Initialization ---
async function initialize() {
    // !!! Add a check here too, right at the start of initialize
    if (!initialLoader) {
        console.error("CRITICAL: initial-loader element NOT FOUND at the start of initialize()!");
        // Display an error or halt
        document.body.innerHTML = "<p style='color:red; font-weight:bold;'>Error: UI components missing (initial-loader). Please report this.</p>";
        return;
    }
    // The init-theme.js runs first, setting the theme.
    // Now we decide what to show based on lock state.
    chrome.storage.local.get([PASSWORD_HASH_KEY, IS_LOCKED_KEY], (result) => {
        const passwordHash = result[PASSWORD_HASH_KEY];
        const isLocked = result.hasOwnProperty(IS_LOCKED_KEY) ? result[IS_LOCKED_KEY] : true; // Default to locked

        if (!passwordHash) {
            // No password set, initial setup
            console.log('No password found. Prompting for setup.');
            showLockScreen(true);
        } else if (isLocked) {
            console.log('Extension is locked. Prompting for password.');
            showLockScreen(false);
        } else {
            // Password set and not locked
            console.log('Extension is unlocked. Loading dashboard.');
            loadDashboard();
        }
        // Once decision is made, hide initial page loader if it wasn't already handled
        initialLoader.classList.add('hidden');
    });
}

// --- Event Listeners ---
setPasswordButton.addEventListener('click', handleSetPassword);
unlockButton.addEventListener('click', handleUnlock);
lockExtensionButton.addEventListener('click', handleLockExtension);

changePasswordNavButton.addEventListener('click', () => {
    showChangePasswordScreen();
});

submitChangePasswordButton.addEventListener('click', handleChangePassword);
cancelChangePasswordButton.addEventListener('click', () => {
    hideError(changePasswordError);
    hideError(changePasswordSuccess);
    loadDashboard(); // Go back to the dashboard view
});

// Allow Enter key submission
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (!unlockButton.classList.contains('hidden')) {
            handleUnlock();
        }
    }
});
confirmPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (!setPasswordButton.classList.contains('hidden')) {
            handleSetPassword();
        }
    }
});


// Start the process
initialize();