// Profile page functionality
import { supabase } from './config.js';

// Utility function to show popup messages
// @param {string} message - The message to display
// @param {boolean} isSuccess - If true, shows green success popup, if false shows red error popup
const showPopup = (message, isSuccess = true) => {
    // Create popup element
    const popup = document.createElement('div');
    // Set CSS classes for styling
    popup.className = `popup ${isSuccess ? 'success' : 'error'}`;
    // Set message text
    popup.textContent = message;
    // Add popup to page
    document.body.appendChild(popup);
    // Remove popup after delay
    setTimeout(() => {
        // Start fade out animation
        popup.style.animation = 'fadeOut 0.5s forwards';
        // Remove element after animation completes
        setTimeout(() => document.body.removeChild(popup), 500);
    }, 3000);
};

// Format date for display
// @param {string} dateString - ISO date string to format
// @returns {string} Formatted date string or 'N/A' if no date provided
const formatDate = dateString => !dateString ? 'N/A' : new Date(dateString).toLocaleString();

// DOM helper functions
const $ = id => document.getElementById(id);
const setDisplay = (id, display) => {
    const element = $(id);
    if (element) element.style.display = display;
};
const setValue = (id, value) => {
    const element = $(id);
    if (element) element.value = value || '';
};
const setReadOnly = (ids, readOnly) => ids.forEach(id => {
    const element = $(id);
    if (element) element.readOnly = readOnly;
});

// Load user profile data
/**
 * Load and display user profile data from Supabase
 * Handles loading states and authentication checks
 */
async function loadUserProfile() {
    try {
        // load profile data from supabase before showing profile page
        setDisplay('profileLoading', 'block');
        setDisplay('profileContent', 'none');
        // Get current user's session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error('Not authenticated. Please log in.');
        // Set user ID and email
        const userId = session.user.id;
        
        // Use the email from auth.users via the session object
        setValue('email', session.user.email || '');
        
        // Fetch user's profile data
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (profileError) {
            console.error('Error fetching profile:', profileError);
        }
        // Update form with profile data and show content
        // show profile page after loading data
        updateProfileForm(profile);
        setDisplay('profileLoading', 'none');
        setDisplay('profileContent', 'block');
        
    } catch (error) {
        // Handle and display errors
        console.error('Profile loading error:', error);
        showPopup(error.message || 'Failed to load profile', false);
        
        // Redirect to login if not authenticated
        if (error.message.includes('authenticated')) {
            setTimeout(() => window.location.href = 'login.html', 2000);
        }
    }
}

// Update form with profile data
/**
 * Update profile form fields with user data
 * @param {Object} profile - User profile data object
 */
function updateProfileForm(profile) {
    if (!profile) return;
    
    // Set form field values
    setValue('fullName', profile.full_name);
    setValue('phone', profile.phone || '');
    
    // Update Member Since field using created_at from profiles table
    if (profile.created_at) {
        const createdDate = new Date(profile.created_at);
        setValue('joinDate', createdDate.toLocaleDateString());
    } else {
        setValue('joinDate', 'Not available');
    }
    
    // Update timestamps
    const createdAt = $('createdAt');
    if (createdAt) createdAt.textContent = formatDate(profile.created_at);
    
    const updatedAt = $('updatedAt');
    if (updatedAt) updatedAt.textContent = formatDate(profile.updated_at);
}

// Toggle edit mode functions
/**
 * Enable profile editing mode
 * Makes form fields editable and shows save/cancel buttons
 */
function enableEditMode() {
    // Make name and phone fields editable
    setReadOnly(['fullName', 'phone'], false);
    // Show save and cancel buttons
    setDisplay('saveProfileBtn', 'inline-block');
    setDisplay('cancelEditBtn', 'inline-block');
    // Hide edit button
    setDisplay('editProfileBtn', 'none');
}

/**
 * Disable profile editing mode
 * Makes form fields readonly and hides save/cancel buttons
 */
function disableEditMode() {
    // Make fields readonly
    setReadOnly(['fullName', 'phone'], true);
    // Hide save and cancel buttons
    setDisplay('saveProfileBtn', 'none');
    setDisplay('cancelEditBtn', 'none');
    // Show edit button
    setDisplay('editProfileBtn', 'inline-block');
}

// Cancel edit and restore original values
/**
 * Cancel profile editing and restore original values
 */
async function cancelEdit() {
    try {
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        
        // Fetch original profile data
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
        if (error) throw error;
        // Restore original values and disable editing
        updateProfileForm(profile);
        disableEditMode();
    } catch (error) {
        console.error('Error canceling edit:', error);
        showPopup('Failed to restore profile data', false);
    }
}

// Save profile changes
/**
 * Save profile changes to database
 * @param {Event} event - Form submission event
 */
async function saveProfileChanges(event) {
    event.preventDefault();
    try {
        // Get save button and disable it
        const submitButton = $('saveProfileBtn');
        // if save button is not found, return
        if (!submitButton) return;
        submitButton.textContent = 'Saving...';
        submitButton.disabled = true;
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        // Get form values
        const fullNameInput = $('fullName');
        const phoneInput = $('phone');
        if (!fullNameInput || !phoneInput) {
            throw new Error('Required form fields are missing');
        }
        // Update profile in database
        const { data, error } = await supabase
            .from('profiles')
            .update({
                full_name: fullNameInput.value,
                phone: phoneInput.value,
                updated_at: new Date().toISOString()
            })
            .eq('id', session.user.id)
            // get the updated profile data
            .select()
            .single();
        if (error) throw error;
        // Update form and disable editing
        updateProfileForm(data);
        disableEditMode();
        showPopup('Profile updated successfully');
    } catch (error) {
        console.error('Profile update error:', error);
        showPopup(error.message || 'Failed to update profile', false);
    } finally {
        // Re-enable save button
        const submitButton = $('saveProfileBtn');
        if (submitButton) {
            submitButton.textContent = 'Save Changes';
            submitButton.disabled = false;
        }
    }
}

// Validate password strength
/**
 * Validate password strength against security requirements
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with valid flag and message
 */
function validatePassword(password) {
    if (!password) return { valid: false, message: 'Password is required' };
    
    // Check password requirements
    const checks = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    // Check if all requirements are met
    const isValid = Object.values(checks).every(Boolean);
    
    if (!isValid) {
        // Build error message for failed requirements
        let message = 'Password must:';
        if (!checks.minLength) message += ' be at least 8 characters long;';
        if (!checks.hasUppercase) message += ' include at least one uppercase letter;';
        if (!checks.hasLowercase) message += ' include at least one lowercase letter;';
        if (!checks.hasNumber) message += ' include at least one number;';
        if (!checks.hasSpecial) message += ' include at least one special character;';
        return { valid: false, message };
    }
    
    return { valid: true };
}

// Update password policy indicators in real-time
/**
 * Initialize real-time password validation feedback
 */
function initPasswordValidation() {
    const passwordInput = $('newPassword');
    
    // Get policy check elements
    const lengthCheck = $('lengthCheck');
    const uppercaseCheck = $('uppercaseCheck');
    const lowercaseCheck = $('lowercaseCheck');
    const numberCheck = $('numberCheck');
    const specialCheck = $('specialCheck');

    // Update indicators when password changes
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        // Check minimum length
        if (password.length >= 8) {
            lengthCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            lengthCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check uppercase letter
        if (/[A-Z]/.test(password)) {
            uppercaseCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            uppercaseCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check lowercase letter
        if (/[a-z]/.test(password)) {
            lowercaseCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            lowercaseCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check number
        if (/[0-9]/.test(password)) {
            numberCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            numberCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check special character
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            specialCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            specialCheck.querySelector('.policy-icon').textContent = '❌';
        }
    });
}

// Change user password
/**
 * Handle password change request
 * @param {Event} event - Form submission event
 */
async function changePassword(event) {
    event.preventDefault();
    try {
        // Get password values
        const currentPassword = $('currentPassword').value;
        const newPassword = $('newPassword').value;
        const confirmPassword = $('confirmNewPassword').value;
        // Validate current password
        if (!currentPassword) {
            showPopup('Current password is required', false);
            return;
        }
        // Validate new password strength
        const validation = validatePassword(newPassword);
        if (!validation.valid) {
            showPopup(validation.message, false);
            return;
        }
        // Check password confirmation
        if (newPassword !== confirmPassword) {
            showPopup('New passwords do not match', false);
            return;
        }
        // Verify current password
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: session.user.email,
            password: currentPassword
        });
        if (signInError) {
            showPopup('Current password is incorrect', false);
            return;
        }
        // Update password in Supabase
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;
        // Clear password fields
        ['currentPassword', 'newPassword', 'confirmNewPassword'].forEach(id => setValue(id, ''));
        showPopup('Password updated successfully');
    } catch (error) {
        console.error('Password change error:', error);
        showPopup(error.message || 'Failed to change password', false);
    }
}

// Handle account deletion
/**
 * Show account deletion confirmation modal
 */
function showDeleteModal() {
    // Display deletion confirmation section
    document.getElementById('deleteModal').style.display = 'block';
    
    // Scroll modal into view
    document.getElementById('deleteModal').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Hide account deletion confirmation modal
 */
function hideDeleteModal() {
    // Hide deletion confirmation section
    document.getElementById('deleteModal').style.display = 'none';
    
    // Clear password field
    setValue('deleteConfirmPassword', '');
}

/**
 * Handle account deletion process
 */
async function deleteAccount() {
    try {
        // Get confirmation password
        const password = $('deleteConfirmPassword').value;
        if (!password) {
            showPopup('Please enter your password to confirm deletion', false);
            return;
        }
        // Verify authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error('Not authenticated. Please log in.');
        const userId = session.user.id;
        // Verify password is correct
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
            email: session.user.email, 
            password 
        });
        if (signInError) throw new Error('Incorrect password');
        // Delete user's data from database
        await Promise.allSettled([
            supabase.from('devices').delete().eq('user_id', userId),
            supabase.from('profiles').delete().eq('id', userId)
        ]);
        // Delete user account using Edge Function
        try {
            const token = session.access_token;
            if (!token) throw new Error('No access token available. Please log in again.'); 
            // Call Edge Function to delete user
            const response = await fetch("https://fzrxktbxjbcmbudiouqa.functions.supabase.co/delete-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ user_id: userId })
            });
            if (!response.ok) {
                const errorText = await response.text(); 
                // Handle "User not allowed" error with fallback approach
                if (errorText.includes("User not allowed")) {
                    // Mark user as deleted in metadata
                    const { error: updateError } = await supabase.auth.updateUser({
                        data: { deleted: true, deleted_at: new Date().toISOString() }
                    });
                    if (updateError) throw updateError;
                    await supabase.auth.signOut();
                    showPopup('Your account has been marked as deleted and all your data has been removed.');
                    setTimeout(() => window.location.href = 'index.html', 2000);
                    return;
                }
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }
            
            // Process successful deletion
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error deleting account from auth.users');
            await supabase.auth.signOut();
            showPopup('Your account has been completely deleted from the system.');
            setTimeout(() => window.location.href = 'index.html', 2000);
        } catch (fetchError) {
            throw new Error('Failed to delete account: ' + fetchError.message);
        }
    } catch (error) {
        console.error('Account deletion error:', error);
        showPopup(error.message || 'Failed to delete account', false);
        hideDeleteModal();
    }
}

// Handle user logout
/**
 * Handle user logout process
 */
async function handleLogout() {
    try {
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        showPopup('Successfully logged out');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } catch (error) {
        console.error('Logout error:', error);
        showPopup(error.message || 'Failed to logout', false);
    }
}

// Set up event listeners
// Wait for the HTML document to be fully loaded before running any code
document.addEventListener('DOMContentLoaded', () => {
    // First load the user's profile data from the database
    loadUserProfile();
    
    // Set up password validation rules and checks
    initPasswordValidation();
    
    // Define all interactive elements and their event handlers
    const elements = {
        // Button to enable editing profile
        'editProfileBtn': { 
            event: 'click',        // Trigger on click
            handler: enableEditMode // Function to run when clicked
        },
        // Button to cancel profile editing
        'cancelEditBtn': { 
            event: 'click', 
            handler: cancelEdit 
        },
        // Form for profile updates
        'profileForm': { 
            event: 'submit',           // Trigger on form submission
            handler: saveProfileChanges // Save the changes
        },
        // Form for password changes
        'changePasswordForm': { 
            event: 'submit', 
            handler: changePassword 
        },
        // Button to show delete account confirmation
        'deleteAccountBtn': { 
            event: 'click', 
            handler: showDeleteModal 
        },
        // Button to hide delete confirmation
        'cancelDeleteBtn': { 
            event: 'click', 
            handler: hideDeleteModal 
        },
        // Button to confirm account deletion
        'confirmDeleteBtn': { 
            event: 'click', 
            handler: deleteAccount 
        },
        // Button to log out
        'logoutBtn': { 
            event: 'click', 
            handler: handleLogout 
        }
    };
    
    // Attach all event listeners to their elements
    Object.entries(elements).forEach(([id, { event, handler }]) => {
        // Uses the $ helper function
        // to find the element in the HTML page by its ID
        const element = $(id);
        // Add event listener if element exists   
        if (element) element.addEventListener(event, handler);  
    });
});