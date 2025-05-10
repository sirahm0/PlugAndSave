import { supabase } from './config.js';

// Function to set up real-time password validation feedback
function initPasswordValidation() {
    // Get references to password input fields
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Get references to all password requirement check elements
    const lengthCheck = document.getElementById('lengthCheck');          // 8+ characters
    const uppercaseCheck = document.getElementById('uppercaseCheck');    // uppercase letter
    const lowercaseCheck = document.getElementById('lowercaseCheck');    // lowercase letter
    const numberCheck = document.getElementById('numberCheck');          // number
    const specialCheck = document.getElementById('specialCheck');        // special character

    // Add real-time validation as user types password
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        // Check if password is at least 8 characters
        if (password.length >= 8) {
            lengthCheck.querySelector('.policy-icon').textContent = '✅';  // Show checkmark
        } else {
            lengthCheck.querySelector('.policy-icon').textContent = '❌';  // Show X
        }
        
        // Check if password contains uppercase letter
        if (/[A-Z]/.test(password)) {
            uppercaseCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            uppercaseCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check if password contains lowercase letter
        if (/[a-z]/.test(password)) {
            lowercaseCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            lowercaseCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check if password contains a number
        if (/[0-9]/.test(password)) {
            numberCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            numberCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check if password contains special character
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            specialCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            specialCheck.querySelector('.policy-icon').textContent = '❌';
        }
    });
}

// Function to display temporary popup messages to the user
function showPopup(message, isSuccess = true) {
    // Create new popup element
    const popup = document.createElement('div');
    // Set class based on success/error status
    popup.className = `popup ${isSuccess ? 'success' : 'error'}`;
    // Set the message text
    popup.textContent = message;
    // Add popup to the page
    document.body.appendChild(popup);
    
    // Set up automatic popup removal
    setTimeout(() => {
        // Start fade out animation
        popup.style.animation = 'fadeOut 0.5s forwards';
        // Remove popup from DOM after animation
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        }, 500);  // Animation duration
    }, 3000);    // Show duration
}

// Function to check if password meets all requirements
function validatePassword(password) {
    // Check all password requirements
    const isLengthValid = password.length >= 8;                         // Min 8 characters
    const hasUppercase = /[A-Z]/.test(password);                       // Has uppercase
    const hasLowercase = /[a-z]/.test(password);                       // Has lowercase
    const hasNumber = /[0-9]/.test(password);                          // Has number
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);  // Has special char
    
    // Check if all requirements are met
    const isValid = isLengthValid && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    
    // If password is invalid, build error message
    if (!isValid) {
        let message = 'Password must:';
        if (!isLengthValid) message += ' be at least 8 characters;';
        if (!hasUppercase) message += ' include uppercase letter;';
        if (!hasLowercase) message += ' include lowercase letter;';
        if (!hasNumber) message += ' include number;';
        if (!hasSpecial) message += ' include special character;';
        
        return { valid: false, message };
    }
    
    return { valid: true };
}

// Function to initialize the registration form
function initRegistrationForm() {
    // Get reference to registration form
    const registrationForm = document.getElementById('registrationForm');
    
    if (registrationForm) {
        // Add submit event handler
        registrationForm.addEventListener('submit', async function(e) {
            // Prevent default form submission
            e.preventDefault();
            console.log("Registration form submitted");
            
            // Get all form field values
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const submitButton = registrationForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            
            try {
                // Validate that all required fields are filled
                if (!fullName || !email || !password) {
                    showPopup('Please fill in all required fields', false);
                    return;
                }
                
                // Check if password meets requirements
                const passwordValidation = validatePassword(password);
                if (!passwordValidation.valid) {
                    showPopup(passwordValidation.message, false);
                    return;
                }
                
                // Verify password confirmation matches
                if (password !== confirmPassword) {
                    showPopup('Passwords do not match!', false);
                    return;
                }
                
                // Update button to show loading state
                submitButton.textContent = 'Creating Account...';
                submitButton.disabled = true;
                
                // Create new user account in Supabase
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName  // Store name in user metadata
                        }
                    }
                });
                
                if (error) throw error;
                
                // Get the new user's ID
                const userId = data.user.id;
                
                // Get current timestamp for created_at/updated_at
                const now = new Date().toISOString();
                
                // Create user profile in profiles table
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: userId,              // Use same ID as auth
                        full_name: fullName,     // Store name in profile
                        phone: '',               // Empty phone by default
                        created_at: now,         // Creation timestamp
                        updated_at: now          // Update timestamp
                    }]);
                
                if (profileError) {
                    console.error('Error creating profile:', profileError);
                    // Continue even if profile creation fails
                }
                
                // Log successful registration
                console.log("Registration successful:", data.user.email);
                
                // Show success message to user
                showPopup('Registration successful! Redirecting to dashboard...', true);
                
                // Redirect to dashboard after brief delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } catch (error) {
                // Log error for debugging
                console.error("Registration error:", error);
                
                // Convert technical error to user-friendly message
                let errorMessage = 'Registration failed';
                
                if (error.message) {
                    // Check for specific error types
                    if (error.message.includes('already registered')) {
                        errorMessage = 'This email is already registered';
                    } else if (error.message.includes('valid email')) {
                        errorMessage = 'Please enter a valid email address';
                    } else if (error.message.includes('weak password')) {
                        errorMessage = 'Password is too weak';
                    } else {
                        errorMessage = error.message;
                    }
                }
                
                // Show error message to user
                showPopup(errorMessage, false);
                
            } finally {
                // Reset button state regardless of outcome
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }
}

// Initialize form when page loads
document.addEventListener('DOMContentLoaded', function() {
    initPasswordValidation();  // Set up password validation
    initRegistrationForm();    // Set up form submission
});
