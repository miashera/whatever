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

const mainAppContent = document.getElementById('main-app-content');
const lockExtensionButton = document.getElementById('lock-extension-button');
const changePasswordNavButton = document.getElementById('change-password-nav-button');
const openInTabButton = document.getElementById('open-in-tab-button');

const changePasswordContainer = document.getElementById('change-password-container');
const currentPasswordInput = document.getElementById('current-password-input');
const newPasswordInput = document.getElementById('new-password-input');
const confirmNewPasswordInput = document.getElementById('confirm-new-password-input');
const submitChangePasswordButton = document.getElementById('submit-change-password-button');
const cancelChangePasswordButton = document.getElementById('cancel-change-password-button');
const changePasswordError = document.getElementById('change-password-error');
const changePasswordSuccess = document.getElementById('change-password-success');

// Theme Elements
const themeLightButton = document.getElementById('theme-light-button');
const themeDarkButton = document.getElementById('theme-dark-button');
const themeSystemButton = document.getElementById('theme-system-button');


// --- Constants ---
const PASSWORD_HASH_KEY = 'extension_password_hash';
const IS_LOCKED_KEY = 'extension_is_locked';
const INACTIVITY_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute in milliseconds
const LAST_ACTIVE_TIME_KEY = 'extension_last_active_time';

const MAX_UNLOCK_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes
const UNLOCK_ATTEMPTS_KEY = 'extension_unlock_attempts';
const LOCKOUT_END_TIME_KEY = 'extension_lockout_end_time';

const THEME_KEY = 'extension_current_theme'; // 'light', 'dark', 'system'


// --- Inactivity Timer Variable ---
let inactivityTimer = null;

// --- Utility Functions ---
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.classList.remove('hidden');
    } else {
        console.error("Attempted to show error on a null element:", message);
    }
}

function hideError(element) {
    if (element) {
        element.classList.add('hidden');
        element.textContent = '';
    }
}


// --- Activity and Timer Functions ---
function recordActivity() {
    if (mainAppContent && !mainAppContent.classList.contains('hidden')) {
        const now = Date.now();
        chrome.storage.local.set({ [LAST_ACTIVE_TIME_KEY]: now });
        resetInactivityTimer();
    }
}

function resetInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    if (mainAppContent && !mainAppContent.classList.contains('hidden')) {
        inactivityTimer = setTimeout(() => {
            console.log('Inactivity timeout reached. Locking extension.');
            handleLockExtension();
        }, INACTIVITY_TIMEOUT_MS);
    }
}

function stopInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
}

// --- Theme Functions ---
function applyTheme(theme) {
    const body = document.body;
    body.classList.remove('light-theme', 'dark-theme'); // Clear existing theme classes

    let actualTheme = theme;
    if (theme === 'system') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Add the appropriate theme class
    body.classList.add(actualTheme === 'dark' ? 'dark-theme' : 'light-theme');

    // Update button active states
    if (themeLightButton) themeLightButton.classList.toggle('active', theme === 'light');
    if (themeDarkButton) themeDarkButton.classList.toggle('active', theme === 'dark');
    if (themeSystemButton) themeSystemButton.classList.toggle('active', theme === 'system');

    // Store the theme preference
    chrome.storage.local.set({ [THEME_KEY]: theme });
    console.log(`Applied theme: ${theme} (resolved to: ${actualTheme})`);
}

function setThemePreference(theme) {
    applyTheme(theme);
}

function initializeTheme() {
    chrome.storage.local.get([THEME_KEY], (result) => {
        const preferredTheme = result[THEME_KEY] || 'system';
        applyTheme(preferredTheme);
    });

    // Listen for system theme changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    function handleSystemThemeChange(event) {
        chrome.storage.local.get([THEME_KEY], (result) => {
            if ((result[THEME_KEY] || 'system') === 'system') {
                applyTheme('system');
            }
        });
    }
    
    if (darkModeMediaQuery.addEventListener) {
        darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (darkModeMediaQuery.addListener) {
        darkModeMediaQuery.addListener(handleSystemThemeChange);
    }
}


// --- Core Logic ---
function showMainApp() {
    if (lockError && lockError.dataset.isLockoutMessage === 'true') {
        hideError(lockError);
        delete lockError.dataset.isLockoutMessage;
    }
    if (passwordInput) passwordInput.disabled = false;
    if (unlockButton) unlockButton.disabled = false;
    if (setPasswordButton) setPasswordButton.disabled = false;

    hideError(lockError);
    if (lockScreenContainer) lockScreenContainer.classList.add('hidden');
    if (changePasswordContainer) changePasswordContainer.classList.add('hidden');
    if (mainAppContent) mainAppContent.classList.remove('hidden');
    if (initialLoader) initialLoader.classList.add('hidden');

    console.log('Showing main application content.');
    resetInactivityTimer();
}

function showLockScreen(isInitialSetup = false) {
    if (mainAppContent) mainAppContent.classList.add('hidden');
    if (changePasswordContainer) changePasswordContainer.classList.add('hidden');
    if (lockScreenContainer) lockScreenContainer.classList.remove('hidden');
    if (initialLoader) initialLoader.classList.add('hidden');

    if (passwordInput) passwordInput.value = '';
    if (confirmPasswordInput) confirmPasswordInput.value = '';

    if (passwordInput) passwordInput.disabled = false;
    if (unlockButton) unlockButton.disabled = false;
    if (setPasswordButton) setPasswordButton.disabled = false;

    if (isInitialSetup) {
        if (lockTitle) lockTitle.textContent = 'Set Password';
        if (lockSubtitle) lockSubtitle.classList.remove('hidden');
        if (unlockButton) unlockButton.classList.add('hidden');
        if (setPasswordButton) setPasswordButton.classList.remove('hidden');
        if (confirmPasswordInput) confirmPasswordInput.classList.remove('hidden');
        hideError(lockError);
    } else {
        if (lockTitle) lockTitle.textContent = 'Unlock Extension';
        if (lockSubtitle) lockSubtitle.classList.add('hidden');
        if (unlockButton) unlockButton.classList.remove('hidden');
        if (setPasswordButton) setPasswordButton.classList.add('hidden');
        if (confirmPasswordInput) confirmPasswordInput.classList.add('hidden');

        chrome.storage.local.get([LOCKOUT_END_TIME_KEY, UNLOCK_ATTEMPTS_KEY], (result) => {
            const lockoutEndTime = result[LOCKOUT_END_TIME_KEY] || 0;
            const attempts = result[UNLOCK_ATTEMPTS_KEY] || 0;
            const currentTime = Date.now();

            if (lockoutEndTime > currentTime) {
                const timeLeftMs = lockoutEndTime - currentTime;
                const minutesLeft = Math.ceil(timeLeftMs / (1000 * 60));
                const secondsLeft = Math.ceil(timeLeftMs / 1000);
                let timeString = (minutesLeft > 0) ? `about ${minutesLeft} minute(s)` : `${secondsLeft} second(s)`;

                showError(lockError, `Too many incorrect attempts. Please try again in ${timeString}.`);
                if (lockError) lockError.dataset.isLockoutMessage = 'true'; // Ensure lockError exists
                if (passwordInput) passwordInput.disabled = true;
                if (unlockButton) unlockButton.disabled = true;
                if (setPasswordButton) setPasswordButton.disabled = true;

                setTimeout(() => showLockScreen(false), Math.min(timeLeftMs + 500, 1000));
            } else {
                if (lockError && lockError.dataset.isLockoutMessage === 'true') {
                    hideError(lockError);
                    delete lockError.dataset.isLockoutMessage;
                }
                if (passwordInput) passwordInput.disabled = false;
                if (unlockButton) unlockButton.disabled = false;
                if (setPasswordButton) setPasswordButton.disabled = false;
                if (result.hasOwnProperty(LOCKOUT_END_TIME_KEY) && attempts >= MAX_UNLOCK_ATTEMPTS) {
                    chrome.storage.local.remove([UNLOCK_ATTEMPTS_KEY, LOCKOUT_END_TIME_KEY]);
                }
            }
        });
    }
    stopInactivityTimer();
}

function showChangePasswordScreen() {
    if (mainAppContent) mainAppContent.classList.add('hidden');
    if (lockScreenContainer) lockScreenContainer.classList.add('hidden');
    if (changePasswordContainer) changePasswordContainer.classList.remove('hidden');

    if (currentPasswordInput) currentPasswordInput.value = '';
    if (newPasswordInput) newPasswordInput.value = '';
    if (confirmNewPasswordInput) confirmNewPasswordInput.value = '';
    hideError(changePasswordError);
    if (changePasswordSuccess) { // Ensure element exists
      changePasswordSuccess.classList.add('hidden'); // Hide success message on screen show
      changePasswordSuccess.textContent = '';
    }
    stopInactivityTimer();
}

// --- Function to handle opening in new tab ---
function handleOpenInTab() {
    const urlParams = new URLSearchParams(window.location.search);
    const isAlreadyTab = urlParams.get('context') === 'tab';

    if (isAlreadyTab && openInTabButton) {
        openInTabButton.disabled = true;
        openInTabButton.textContent = "Already in Tab";
        return;
    }
    
    const extensionPageUrl = chrome.runtime.getURL('popup.html?context=tab');
    chrome.tabs.create({ url: extensionPageUrl }, (newTab) => {
        console.log('Extension opened in new tab:', newTab.id);
        if (!isAlreadyTab) {
            window.close(); // Close the popup only if it's not already a tab
        }
    });
}


async function handleSetPassword() {
    if (!passwordInput || !confirmPasswordInput) return;
    const pass = passwordInput.value;
    const confirmPass = confirmPasswordInput.value;

    hideError(lockError); // Hide previous errors

    if (!pass) return showError(lockError, 'Password cannot be empty.');
    if (pass !== confirmPass) return showError(lockError, 'Passwords do not match.');
    if (pass.length < 6) return showError(lockError, 'Password must be at least 6 characters.');

    const hashedPassword = await hashPassword(pass);
    chrome.storage.local.remove([UNLOCK_ATTEMPTS_KEY, LOCKOUT_END_TIME_KEY], () => {
        chrome.storage.local.set({ [PASSWORD_HASH_KEY]: hashedPassword, [IS_LOCKED_KEY]: false, [LAST_ACTIVE_TIME_KEY]: Date.now() }, () => {
            console.log('Password set and extension unlocked.');
            showMainApp();
        });
    });
}

async function handleUnlock() {
    if (!passwordInput || passwordInput.disabled) return;
    const pass = passwordInput.value;
    
    hideError(lockError); // Hide previous errors
    if (!pass) return showError(lockError, 'Please enter your password.');

    chrome.storage.local.get([PASSWORD_HASH_KEY, UNLOCK_ATTEMPTS_KEY, LOCKOUT_END_TIME_KEY], async (result) => {
        const storedHash = result[PASSWORD_HASH_KEY];
        let attempts = result[UNLOCK_ATTEMPTS_KEY] || 0;
        const lockoutEndTime = result[LOCKOUT_END_TIME_KEY] || 0;
        const currentTime = Date.now();

        if (lockoutEndTime > currentTime) {
            const timeLeftMs = lockoutEndTime - currentTime;
            const minutesLeft = Math.ceil(timeLeftMs / (1000 * 60));
            showError(lockError, `Too many incorrect attempts. Please try again in about ${minutesLeft} minute(s).`);
            if (lockError) lockError.dataset.isLockoutMessage = 'true';
            return;
        }
        if (!storedHash) { // Should ideally not happen if setup flow is correct
            showError(lockError, 'Error: Password not set. Please set up a password.');
            // Potentially force to set password screen if this state is reached improperly
            // showLockScreen(true); 
            return;
        }


        const inputHash = await hashPassword(pass);
        if (inputHash === storedHash) {
            chrome.storage.local.remove([UNLOCK_ATTEMPTS_KEY, LOCKOUT_END_TIME_KEY], () => {
                chrome.storage.local.set({ [IS_LOCKED_KEY]: false, [LAST_ACTIVE_TIME_KEY]: Date.now() }, () => {
                    console.log('Extension unlocked.');
                    showMainApp();
                });
            });
        } else {
            attempts++;
            if (passwordInput) passwordInput.value = ''; // Clear password field
            if (attempts >= MAX_UNLOCK_ATTEMPTS) {
                const newLockoutEndTime = Date.now() + LOCKOUT_DURATION_MS;
                showError(lockError, `Too many incorrect attempts. Please try again in about ${Math.ceil(LOCKOUT_DURATION_MS / (1000 * 60))} minutes.`);
                if (lockError) lockError.dataset.isLockoutMessage = 'true';
                chrome.storage.local.set({ [UNLOCK_ATTEMPTS_KEY]: attempts, [LOCKOUT_END_TIME_KEY]: newLockoutEndTime }, () => {
                    console.log(`Max attempts reached. Locked out until ${new Date(newLockoutEndTime).toLocaleTimeString()}`);
                    showLockScreen(false); // Re-render lock screen to show lockout
                });
            } else {
                showError(lockError, `Incorrect password. ${MAX_UNLOCK_ATTEMPTS - attempts} attempt(s) remaining.`);
                chrome.storage.local.set({ [UNLOCK_ATTEMPTS_KEY]: attempts });
            }
        }
    });
}

function handleLockExtension() {
    chrome.storage.local.set({ [IS_LOCKED_KEY]: true }, () => {
        console.log('Extension locked by user or timeout.');
        showLockScreen();
    });
}

async function handleChangePassword() {
    if (!currentPasswordInput || !newPasswordInput || !confirmNewPasswordInput || !changePasswordError || !changePasswordSuccess) return;
    
    const currentPass = currentPasswordInput.value;
    const newPass = newPasswordInput.value;
    const confirmNewPass = confirmNewPasswordInput.value;

    hideError(changePasswordError);
    changePasswordSuccess.classList.add('hidden'); // Hide success message initially

    if (!currentPass || !newPass || !confirmNewPass) return showError(changePasswordError, 'All fields are required.');
    if (newPass !== confirmNewPass) return showError(changePasswordError, 'New passwords do not match.');
    if (newPass.length < 6) return showError(changePasswordError, 'New password must be at least 6 characters.');

    chrome.storage.local.get([PASSWORD_HASH_KEY], async (result) => {
        const storedHash = result[PASSWORD_HASH_KEY];
        if (!storedHash) { // Should not happen if app is working correctly
            showError(changePasswordError, "Error: No current password is set.");
            return;
        }
        const currentInputHash = await hashPassword(currentPass);

        if (currentInputHash !== storedHash) return showError(changePasswordError, 'Incorrect current password.');
        if (currentPass === newPass) return showError(changePasswordError, 'New password cannot be the same as the current password.');

        const newHashedPassword = await hashPassword(newPass);
        chrome.storage.local.set({ [PASSWORD_HASH_KEY]: newHashedPassword, [LAST_ACTIVE_TIME_KEY]: Date.now() }, () => {
            changePasswordSuccess.textContent = 'Password changed successfully!';
            changePasswordSuccess.classList.remove('hidden');
            // Clear fields
            currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmNewPasswordInput.value = '';
            console.log('Password changed.');
            setTimeout(() => {
                // Check if still on change password screen before navigating
                if (changePasswordContainer && !changePasswordContainer.classList.contains('hidden')) {
                     showMainApp();
                }
            }, 2000);
        });
    });
}

// --- Initialization ---
async function initialize() {
    // Added theme buttons to the check
    if (!initialLoader || !lockScreenContainer || !mainAppContent || !changePasswordContainer || !lockError || 
        !passwordInput || !unlockButton || !setPasswordButton || !openInTabButton ||
        !themeLightButton || !themeDarkButton || !themeSystemButton) {
        console.error("Auth.js: One or more critical UI elements are missing from the DOM. Aborting initialization.");
        if (document.body) {
             document.body.innerHTML = "<p style='color:red; font-weight:bold;'>Error: Core UI elements missing. Extension cannot start.</p>";
        }
        return;
    }
    
    initializeTheme(); // Initialize theme first so UI renders with correct theme from start

    const urlParams = new URLSearchParams(window.location.search);
    const isFullTab = urlParams.get('context') === 'tab';
    if (isFullTab) {
        document.body.classList.add('full-tab-mode');
        if (openInTabButton) {
            openInTabButton.style.display = 'none';
        }
    }

    chrome.storage.local.get([
        PASSWORD_HASH_KEY, IS_LOCKED_KEY, LAST_ACTIVE_TIME_KEY, LOCKOUT_END_TIME_KEY
    ], (result) => {
        const passwordHash = result[PASSWORD_HASH_KEY];
        let isLocked = result.hasOwnProperty(IS_LOCKED_KEY) ? result[IS_LOCKED_KEY] : true;
        const lastActiveTime = result[LAST_ACTIVE_TIME_KEY] || 0;
        const lockoutEndTime = result[LOCKOUT_END_TIME_KEY] || 0;
        const currentTime = Date.now();

        if (lockoutEndTime > currentTime) {
            console.log('Extension is currently in password attempt lockout period.');
            isLocked = true; // Ensure it's locked if in lockout
        } else if (passwordHash && !isLocked) { // Only check inactivity if password is set and not already locked
            if ((currentTime - lastActiveTime) > INACTIVITY_TIMEOUT_MS) {
                console.log('Extension was inactive for too long. Forcing lock.');
                isLocked = true;
                chrome.storage.local.set({ [IS_LOCKED_KEY]: true }); // Persist this forced lock
            }
        }


        if (!passwordHash) {
            console.log('No password found. Prompting for setup.');
            showLockScreen(true);
        } else if (isLocked) {
            console.log('Extension is locked. Prompting for password.');
            showLockScreen(false);
        } else {
            console.log('Extension is unlocked. Loading main app.');
            showMainApp();
        }
        if(initialLoader) initialLoader.classList.add('hidden');
    });
}

function setupEventListeners() {
    if (setPasswordButton) setPasswordButton.addEventListener('click', handleSetPassword);
    if (unlockButton) unlockButton.addEventListener('click', handleUnlock);
    if (openInTabButton) openInTabButton.addEventListener('click', handleOpenInTab);
    
    if (lockExtensionButton) lockExtensionButton.addEventListener('click', handleLockExtension);
    else console.warn("Lock Extension button not found for event listener");

    if (changePasswordNavButton) changePasswordNavButton.addEventListener('click', showChangePasswordScreen);
    else console.warn("Change Password Nav button not found for event listener");

    if (submitChangePasswordButton) submitChangePasswordButton.addEventListener('click', handleChangePassword);
    if (cancelChangePasswordButton) cancelChangePasswordButton.addEventListener('click', () => {
        hideError(changePasswordError);
        if(changePasswordSuccess) changePasswordSuccess.classList.add('hidden');
        showMainApp();
    });

    if (passwordInput) passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && unlockButton && !unlockButton.classList.contains('hidden') && !passwordInput.disabled) {
            handleUnlock();
        }
    });
    if (confirmPasswordInput) confirmPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && setPasswordButton && !setPasswordButton.classList.contains('hidden') && !confirmPasswordInput.disabled) {
            handleSetPassword();
        }
    });

    // Theme button listeners
    if (themeLightButton) themeLightButton.addEventListener('click', () => setThemePreference('light'));
    if (themeDarkButton) themeDarkButton.addEventListener('click', () => setThemePreference('dark'));
    if (themeSystemButton) themeSystemButton.addEventListener('click', () => setThemePreference('system'));

    document.body.addEventListener('mousemove', recordActivity);
    document.body.addEventListener('keypress', recordActivity);
    document.body.addEventListener('click', recordActivity, true); // Use capture for broader activity detection

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Re-check theme in case system theme changed while popup was hidden
            chrome.storage.local.get([THEME_KEY], (result) => {
                const preferredTheme = result[THEME_KEY] || 'system';
                applyTheme(preferredTheme); // Re-apply to catch system changes
            });

            if (mainAppContent && !mainAppContent.classList.contains('hidden')) {
                recordActivity(); // If app is visible, record activity
            } else { // If lock screen is visible
                chrome.storage.local.get([LOCKOUT_END_TIME_KEY], (result) => {
                    const lockoutEndTime = result[LOCKOUT_END_TIME_KEY] || 0;
                    if (lockoutEndTime <= Date.now() && passwordInput && passwordInput.disabled) {
                         console.log("Popup became visible, lockout expired, re-rendering lock screen.");
                         showLockScreen(false); // Refresh lock screen state
                    }
                });
            }
        } else { // Popup became hidden
            // No specific action needed here for theme, but good for other logic if necessary
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    initialize().then(() => {
        setupEventListeners();
    }).catch(error => {
        console.error("Initialization promise rejected:", error);
        if (document.body && initialLoader && initialLoader.parentElement) {
            initialLoader.classList.add('hidden');
            document.body.innerHTML = "<p style='color:red;'>Critical error during extension startup. Please try again.</p>";
        } else if (document.body) {
            document.body.innerHTML = "<p style='color:red;'>Critical error during extension startup (elements missing). Please try again.</p>";
        }
    });
});

// Change password functionality
function setupChangePassword() {
    const changePasswordButton = document.getElementById('change-password-button');
    const changePasswordContainer = document.getElementById('change-password-container');
    const submitChangePasswordButton = document.getElementById('submit-change-password-button');
    const cancelChangePasswordButton = document.getElementById('cancel-change-password-button');
    const currentPasswordInput = document.getElementById('current-password-input');
    const newPasswordInput = document.getElementById('new-password-input');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password-input');
    const changePasswordError = document.getElementById('change-password-error');
    const changePasswordSuccess = document.getElementById('change-password-success');

    changePasswordButton.addEventListener('click', () => {
        changePasswordContainer.classList.remove('hidden');
        document.getElementById('main-container').classList.add('hidden');
    });

    cancelChangePasswordButton.addEventListener('click', () => {
        changePasswordContainer.classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
        // Clear inputs and messages
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
        changePasswordError.classList.add('hidden');
        changePasswordSuccess.classList.add('hidden');
    });

    submitChangePasswordButton.addEventListener('click', async () => {
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;

        // Clear previous messages
        changePasswordError.classList.add('hidden');
        changePasswordSuccess.classList.add('hidden');

        // Validate inputs
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            changePasswordError.textContent = 'Please fill in all fields';
            changePasswordError.classList.remove('hidden');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            changePasswordError.textContent = 'New passwords do not match';
            changePasswordError.classList.remove('hidden');
            return;
        }

        if (newPassword.length < 8) {
            changePasswordError.textContent = 'New password must be at least 8 characters long';
            changePasswordError.classList.remove('hidden');
            return;
        }

        try {
            // Verify current password
            const isCorrect = await verifyPassword(currentPassword);
            if (!isCorrect) {
                changePasswordError.textContent = 'Current password is incorrect';
                changePasswordError.classList.remove('hidden');
                return;
            }

            // Change password
            await changePassword(newPassword);
            
            // Show success message
            changePasswordSuccess.textContent = 'Password changed successfully';
            changePasswordSuccess.classList.remove('hidden');

            // Clear inputs
            currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmNewPasswordInput.value = '';

            // Return to main screen after a delay
            setTimeout(() => {
                changePasswordContainer.classList.add('hidden');
                document.getElementById('main-container').classList.remove('hidden');
                changePasswordSuccess.classList.add('hidden');
            }, 2000);
        } catch (error) {
            console.error('Error changing password:', error);
            changePasswordError.textContent = 'Failed to change password. Please try again.';
            changePasswordError.classList.remove('hidden');
        }
    });
}