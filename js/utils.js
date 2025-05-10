/**
 * Plug&Save Utilities
 * 
 * This file contains common utility functions used throughout the application.
 * These functions handle common tasks like formatting, validation, and UI interactions.
 * Each function is documented with JSDoc comments for better IDE support and documentation.
 */

/**
 * Shows a temporary popup notification to the user
 * Creates or reuses a popup element to display messages
 * 
 * @param {string} message - The message to show to the user
 * @param {boolean} isSuccess - True for success (green), false for error (red)
 */
export function showPopup(message, isSuccess = true) {
    // Find existing popup or create new one
    let popup = document.getElementById('notification-popup');
    if (!popup) {
        // Create new popup element if none exists
        popup = document.createElement('div');
        popup.id = 'notification-popup';
        popup.className = 'popup';
        document.body.appendChild(popup);
    }

    // Set the message and style based on success/error
    popup.textContent = message;
    popup.className = 'popup ' + (isSuccess ? 'success' : 'error');
    popup.style.display = 'block';

    // Automatically hide popup after delay
    setTimeout(() => {
        // Start fade out animation
        popup.style.animation = 'fadeOut 0.5s ease-in-out';
        // Remove popup after animation
        setTimeout(() => {
            popup.style.display = 'none';
            popup.style.animation = '';
        }, 500);  // Animation duration
    }, 3000);    // Show duration
}

/**
 * Formats a date into a user-friendly string
 * Handles both Date objects and date strings
 * 
 * @param {string|Date} date - Date to format
 * @param {object} options - Custom formatting options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
    // Return placeholder if no date provided
    if (!date) return 'N/A';
    
    // Default formatting options
    const defaultOptions = { 
        year: 'numeric',      // Full year (e.g., 2024)
        month: 'short',       // Abbreviated month (e.g., Jan)
        day: 'numeric',       // Day of month
        hour: '2-digit',      // 2-digit hours
        minute: '2-digit'     // 2-digit minutes
    };
    
    // Merge default options with custom options
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
        // Convert string to Date if needed
        const dateObj = date instanceof Date ? date : new Date(date);
        // Format using browser's locale settings
        return dateObj.toLocaleString(undefined, mergedOptions);
    } catch (error) {
        // Log error and return original value if formatting fails
        console.error('Error formatting date:', error);
        return String(date);
    }
}

/**
 * Formats a number with specified decimal places
 * Handles null/undefined values safely
 * 
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export function formatNumber(value, decimals = 2) {
    // Return default for null/undefined
    if (value === null || value === undefined) return '0.00';
    
    try {
        // Convert to float and fix decimal places
        return parseFloat(value).toFixed(decimals);
    } catch (error) {
        // Return default value if formatting fails
        console.error('Error formatting number:', error);
        return '0.00';
    }
}

/**
 * Formats a currency amount with currency code
 * Uses SAR (Saudi Riyal) as default currency
 * 
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'SAR') {
    // Handle null/undefined values
    if (amount === null || amount === undefined) return '0.00 ' + currency;
    
    try {
        // Format number and add currency code
        return `${formatNumber(amount)} ${currency}`;
    } catch (error) {
        // Return default if formatting fails
        console.error('Error formatting currency:', error);
        return '0.00 ' + currency;
    }
}

/**
 * Formats power consumption values in kilowatt-hours
 * 
 * @param {number} kWh - Power value to format
 * @returns {string} Formatted power string with unit
 */
export function formatPower(kWh) {
    return `${formatNumber(kWh)} kWh`;
}

/**
 * Handles user logout process
 * Signs out user and redirects to login page
 * 
 * @returns {Promise<void>}
 */
export async function logout() {
    try {
        // Import Supabase client dynamically to avoid circular dependencies
        const { supabase } = await import('./config.js');
        
        // Sign out user from Supabase
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Show success message
        showPopup('Logged out successfully!');
        
        // Redirect to login page after brief delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } catch (error) {
        // Handle any logout errors
        console.error('Error during logout:', error);
        showPopup('Error during logout. Please try again.', false);
    }
}

/**
 * Converts technical error messages to user-friendly versions
 * Maps common error codes to readable messages
 * 
 * @param {Error} error - Error object to process
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
    const errorMessage = error.message || 'An error occurred';
    
    // Map common error messages to user-friendly versions
    if (errorMessage.includes('Invalid login credentials')) {
        return 'Invalid email or password.';
    } else if (errorMessage.includes('Email not confirmed')) {
        return 'Please confirm your email before logging in.';
    } else if (errorMessage.includes('User already registered')) {
        return 'This email is already registered.';
    } else if (errorMessage.includes('network')) {
        return 'Network error. Please check your connection.';
    }
    
    return errorMessage;
}

/**
 * Navigation helper to change pages
 * 
 * @param {string} page - URL of page to navigate to
 */
export function navigateTo(page) {
    window.location.href = page;
}

/**
 * Validates numeric input with optional constraints
 * 
 * @param {any} value - Value to validate
 * @param {object} options - Validation options
 * @param {number} [options.min] - Minimum allowed value
 * @param {number} [options.max] - Maximum allowed value
 * @param {boolean} [options.allowEmpty] - Whether empty values are valid
 * @returns {object} Validation result with isValid and message
 */
export function validateNumber(value, options = {}) {
    const { min, max, allowEmpty = false } = options;
    
    // Handle empty values based on allowEmpty option
    if (!value && value !== 0) {
        return {
            isValid: allowEmpty,
            message: allowEmpty ? '' : 'Value is required'
        };
    }
    
    // Convert to number and validate
    const num = parseFloat(value);
    
    if (isNaN(num)) {
        return {
            isValid: false,
            message: 'Must be a valid number'
        };
    }
    
    if (min !== undefined && num < min) {
        return {
            isValid: false,
            message: `Must be at least ${min}`
        };
    }
    
    if (max !== undefined && num > max) {
        return {
            isValid: false,
            message: `Must be no more than ${max}`
        };
    }
    
    return {
        isValid: true,
        message: ''
    };
}

/**
 * Formats a string with specified constraints
 * @param {string} value - The string to validate
 * @param {object} options - Validation options
 * @param {number} [options.minLength] - Minimum allowed length
 * @param {number} [options.maxLength] - Maximum allowed length
 * @param {RegExp} [options.pattern] - Regular expression pattern to match
 * @param {boolean} [options.allowEmpty=false] - Whether empty strings are considered valid
 * @returns {object} Validation result { isValid, message }
 */
export function validateString(value, options = {}) {
    const { minLength, maxLength, pattern, allowEmpty = false } = options;
    
    // Handle empty values
    if ((value === '' || value === null || value === undefined) && allowEmpty) {
        return { isValid: true, message: '' };
    }
    
    // Convert to string
    const strValue = String(value || '');
    
    // Check minimum length if specified
    if (minLength !== undefined && strValue.length < minLength) {
        return { isValid: false, message: `Must be at least ${minLength} characters` };
    }
    
    // Check maximum length if specified
    if (maxLength !== undefined && strValue.length > maxLength) {
        return { isValid: false, message: `Must be no more than ${maxLength} characters` };
    }
    
    // Check pattern if specified
    if (pattern instanceof RegExp && !pattern.test(strValue)) {
        return { isValid: false, message: 'Invalid format' };
    }
    
    return { isValid: true, message: '' };
}

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @param {boolean} [allowEmpty=false] - Whether empty emails are considered valid
 * @returns {object} Validation result { isValid, message }
 */
export function validateEmail(email, allowEmpty = false) {
    // Handle empty values
    if ((email === '' || email === null || email === undefined) && allowEmpty) {
        return { isValid: true, message: '' };
    }
    
    // Basic email validation pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(String(email || ''))) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }
    
    return { isValid: true, message: '' };
}

/**
 * Validates an IP address
 * @param {string} ip - The IP address to validate
 * @param {boolean} [allowEmpty=false] - Whether empty values are considered valid
 * @returns {object} Validation result { isValid, message }
 */
export function validateIpAddress(ip, allowEmpty = false) {
    // Handle empty values
    if ((ip === '' || ip === null || ip === undefined) && allowEmpty) {
        return { isValid: true, message: '' };
    }
    
    // IPv4 validation pattern
    const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    if (!ipv4Pattern.test(String(ip || ''))) {
        return { isValid: false, message: 'Please enter a valid IP address' };
    }
    
    return { isValid: true, message: '' };
}

/**
 * Password validation function for signup form
 * @param {string} password - The password to validate
 * @returns {object} Validation results for each policy
 */
export function validatePassword(password) {
    const policies = {
        lengthCheck: { regex: /.{8,}/, message: 'At least 8 characters' },
        uppercaseCheck: { regex: /[A-Z]/, message: 'At least one uppercase letter' },
        lowercaseCheck: { regex: /[a-z]/, message: 'At least one lowercase letter' },
        numberCheck: { regex: /[0-9]/, message: 'At least one number' }
    };
    
    const results = {};
    
    for (const [policy, { regex, message }] of Object.entries(policies)) {
        results[policy] = {
            isValid: regex.test(password),
            message
        };
    }
    
    return results;
}

/**
 * Setup password validation UI for signup form
 * @param {HTMLInputElement} passwordInput - The password input element
 */
export function setupPasswordValidation(passwordInput) {
    if (!passwordInput) return;
    
    // Policy items for password validation
    const policyItems = {
        lengthCheck: /.{8,}/,
        uppercaseCheck: /[A-Z]/,
        lowercaseCheck: /[a-z]/,
        numberCheck: /[0-9]/
    };

    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        Object.entries(policyItems).forEach(([id, regex]) => {
            const element = document.getElementById(id);
            if (element) {
                const icon = element.querySelector('.policy-icon');
                
                if (regex.test(password)) {
                    element.classList.add('valid');
                    element.classList.remove('invalid');
                    if (icon) {
                        icon.textContent = '✓';
                        icon.style.color = '#28a745';
                    }
                } else {
                    element.classList.add('invalid');
                    element.classList.remove('valid');
                    if (icon) {
                        icon.textContent = '❌';
                        icon.style.color = '#dc3545';
                    }
                }
            }
        });
    });
}

/**
 * Setup event listeners for common UI elements
 */
export function setupCommonEventListeners() {
    // Set up logout buttons
    const logoutButtons = document.querySelectorAll('.logout-btn');
    if (logoutButtons) {
        logoutButtons.forEach(button => {
            button.addEventListener('click', logout);
        });
    }
    
    // Set up navigation buttons
    const setupNavButtons = (selector, page) => {
        const buttons = document.querySelectorAll(selector);
        if (buttons) {
            buttons.forEach(button => {
                button.addEventListener('click', () => navigateTo(page));
            });
        }
    };
    
    setupNavButtons('.dashboard-btn', 'dashboard.html');
    setupNavButtons('.add-device-btn', 'addDevice.html');
    setupNavButtons('.reports-btn', 'report.html');
    setupNavButtons('.login-nav-btn', 'login.html');
    setupNavButtons('.signup-nav-btn', 'signup.html');
    
    // Setup password validation if on signup page
    const passwordInput = document.getElementById('signupPassword');
    if (passwordInput) {
        setupPasswordValidation(passwordInput);
    }
}

// Initialize common event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', setupCommonEventListeners);

// Export an object that can be used to revert to original implementations
export const originalImplementations = {
    // This object can be used to store original function implementations
    // if needed for reverting changes
    _enabled: false,
    
    /**
     * Enable original implementations
     */
    enable() {
        this._enabled = true;
        console.log('Reverted to original implementations');
    },
    
    /**
     * Disable original implementations
     */
    disable() {
        this._enabled = false;
        console.log('Using utility implementations');
    }
};
