import { supabase } from './config.js';

// Main login function that handles user authentication
// Takes email and password as parameters
async function login(email, password) {
    // Find the submit button in the form to manage its state during login
    const button = document.querySelector('button[type="submit"]');
    // Store the original button text to restore it later
    const originalText = button.textContent;
    
    try {
        // Basic input validation to ensure both fields are filled
        if (!email || !password) {
            showPopup('Please enter both email and password', false);
            return;
        }
        
        // Update button to show loading state
        // This provides visual feedback to the user
        button.textContent = 'Logging in...';
        button.disabled = true;
        
        // Attempt to sign in using Supabase authentication
        // This sends the credentials to the server and returns a response
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        // If there's an authentication error, throw it to be caught below
        if (error) throw error;
        
        // Show success message to the user
        // showPopup('Login successful! Redirecting...', true);  // Removed to prevent duplicate popup
        
        // After successful login, check if the user is an admin
        try {
            const user = data.user;
            // Query the profiles table to check admin status
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('is_admin')  // Only select the is_admin field
                .eq('id', user.id)   // Match the user's ID
                .single();           // Expect only one result
                
            if (profileError) throw profileError;
            
            // Wait 1.5 seconds before redirecting (allows user to see success message)
            setTimeout(() => {
                if (profileData && profileData.is_admin === true) {
                    // If user is admin, go to admin dashboard
                    window.location.href = 'admin.html';
                } else {
                    // If regular user, go to normal dashboard
                    window.location.href = 'dashboard.html';
                }
            }, 1500);
        } catch (profileError) {
            // Log error for debugging purposes
            console.error('Error checking admin status:', profileError);
            // If we can't check admin status, default to regular dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        }
        
    } catch (error) {
        // Log the full error for debugging
        console.error('Login error:', error);
        
        // Convert technical error messages into user-friendly messages
        let errorMessage = 'Login failed';
        
        if (error.message) {
            // Check for specific error types and provide appropriate messages
            if (error.message.includes('Invalid login credentials') || error.code === 'invalid_credentials') {
                errorMessage = 'Invalid email or password';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Please confirm your email before logging in';
            } else if (error.message.includes('rate limit')) {
                errorMessage = 'Too many login attempts. Please try again later';
            } else {
                // If no specific case matches, use the original error message
                errorMessage = error.message;
            }
        }
        
        // Show the error message to the user
        showPopup(errorMessage, false);
        
    } finally {
        // Always reset the button to its original state
        // This runs whether login succeeds or fails
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Utility function to show temporary popup messages to the user
function showPopup(message, isSuccess = true) {
    // Create a new div element for the popup
    const popup = document.createElement('div');
    // Set classes for styling - different styles for success/error
    popup.className = `popup ${isSuccess ? 'success' : 'error'}`;
    // Set the message text
    popup.textContent = message;
    // Add the popup to the page
    document.body.appendChild(popup);
    
    // Set up automatic popup removal
    setTimeout(() => {
        // Start the fade out animation
        popup.style.animation = 'fadeOut 0.5s forwards';
        // Remove the popup from the DOM after animation
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        }, 500);  // Wait for fade animation to complete
    }, 3000);    // Show popup for 3 seconds
}

// Initialize the page when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Find the login form
    const loginForm = document.getElementById('loginForm');
    
    /* Removing duplicate event listener since auth.js already handles this
    // Set up form submission handler if form exists
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            // Prevent the form from submitting normally
            event.preventDefault();
            // Get the values from the form fields
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // Call the login function with the form values
            login(email, password);
        });
    }
    */
    
    // Check if there's already an active session
    supabase.auth.getSession().then(({ data, error }) => {
        if (data.session) {
            // If user is already logged in, check their admin status
            const user = data.session.user;
            supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single()
                .then(({ data: profileData, error: profileError }) => {
                    // Redirect based on admin status
                    if (!profileError && profileData && profileData.is_admin === true) {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                })
                .catch(() => {
                    // If error checking admin status, go to regular dashboard
                    window.location.href = 'dashboard.html';
                });
        }
    });
});
