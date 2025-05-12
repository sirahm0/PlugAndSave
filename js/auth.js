// Supabase Authentication Module
import { supabase } from './config.js'

// Function to show popup notification
function showPopup(message, isSuccess = true) {
    // Create popup element if it doesn't exist
    let popup = document.getElementById('notification-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'notification-popup';
        popup.className = 'popup';
        document.body.appendChild(popup);
    }

    // Set popup content and style
    popup.textContent = message;
    popup.className = 'popup ' + (isSuccess ? 'success' : 'error');
    popup.style.display = 'block';

    // Hide popup after 3 seconds
    setTimeout(() => {
        popup.style.animation = 'fadeOut 0.5s ease-in-out';
        setTimeout(() => {
            popup.style.display = 'none';
            popup.style.animation = '';
        }, 500);
    }, 3000);
}

// Function to get user-friendly error message
function getErrorMessage(error) {
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

// Function to sign up a user with username, email and password
async function signUp(username, email, password) {
    try {
        // Validate input
        if (!username || !email || !password) {
            showPopup('Please fill in all fields', false);
            return;
        }
        
        // Create user with email, password, and username as metadata
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        });
        
        if (error) throw error;
        
        // Registration successful
        const user = data.user;
        console.log("Registration successful:", user.email);
        showPopup('Registration successful!');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (error) {
        console.error("Registration error:", error);
        showPopup(error.message, false);
    }
}

// Function to sign in a user with email and password
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Login successful
        const user = data.user;
        console.log("Login successful:", user.email);
        showPopup('Login successful!');
        
        // Check if user is admin
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();
                
            if (profileError) throw profileError;
            
            // Redirect based on admin status
            setTimeout(() => {
                if (profileData && profileData.is_admin === true) {
                    // User is admin, redirect to admin page
                    window.location.href = 'admin.html';
                } else {
                    // User is not admin, redirect to dashboard
                    window.location.href = 'dashboard.html';
                }
            }, 1500);
        } catch (profileError) {
            console.error('Error checking admin status:', profileError);
            // Default to dashboard if there's an error checking admin status
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        }
    } catch (error) {
        console.error("Login error:", error);
        const errorMessage = getErrorMessage(error);
        showPopup(errorMessage, false);
    }
}

// Make auth functions available globally
window.signUp = signUp;
window.signIn = signIn;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Debug: Log current page
    const currentPage = window.location.pathname;
    console.log("Current page:", currentPage);

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data, error }) => {
        console.log("Auth state checked:", data.session ? "User logged in" : "No user");
        
        const user = data.session?.user;
        
        // Handle homepage
        if (currentPage.includes('index.html')) {
            if (user) {
                // User is signed in, redirect to dashboard
                window.location.href = 'dashboard.html';
            }
            return;
        }

        // Handle dashboard page
        if (currentPage.includes('dashboard.html')) {
            if (user) {
                // User is signed in
                document.getElementById('loading').style.display = 'none';
                document.getElementById('userContent').style.display = 'block';
                
                // Get user details - try to use username from metadata if available
                const username = user.user_metadata?.username || user.email;
                document.getElementById('userEmail').textContent = username;
                document.getElementById("welcomeUser").innerText = `Welcome, ${username}!`;
            } else {
                // User is signed out, redirect to login
                window.location.href = 'login.html';
            }
            return;
        }

        // Handle device details page
        if (currentPage.includes('device-details.html')) {
            if (!user) {
                // User is signed out, redirect to login
                window.location.href = 'login.html';
                return;
            }
            return;
        }

        // Handle login page
        if (currentPage.includes('login.html')) {
            if (user) {
                // User is already logged in, redirect to dashboard
                window.location.href = 'dashboard.html';
                return;
            }

            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    console.log("Login form submitted");
                    
                    const email = document.getElementById('loginEmail').value;
                    const password = document.getElementById('loginPassword').value;

                    signIn(email, password);
                });
            }
        }

        // Handle signup page
        if (currentPage.includes('signup.html')) {
            if (user) {
                // User is already logged in, redirect to dashboard
                window.location.href = 'dashboard.html';
                return;
            }

            // The signup form event listener is in the HTML file directly
        }
    });
});
