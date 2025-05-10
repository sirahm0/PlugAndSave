// Supabase Authentication Module
import { supabase } from './config.js'

// Function to display notification messages to users
function showPopup(message, isSuccess = true) {
    // Find existing popup or create a new one if it doesn't exist
    let popup = document.getElementById('notification-popup');
    if (!popup) {
        // Create new popup element
        popup = document.createElement('div');
        // Set unique identifier
        popup.id = 'notification-popup';
        // Add CSS class for styling
        popup.className = 'popup';
        // Add popup to the page
        document.body.appendChild(popup);
    }

    // Set the message text and apply success/error styling
    popup.textContent = message;
    popup.className = 'popup ' + (isSuccess ? 'success' : 'error');
    // Make popup visible
    popup.style.display = 'block';

    // Automatically hide popup after delay
    setTimeout(() => {
        // Start fade out animation
        popup.style.animation = 'fadeOut 0.5s ease-in-out';
        // Remove popup after animation
        setTimeout(() => {
            popup.style.display = 'none';
            popup.style.animation = '';
        }, 500);
    }, 3000);
}

// Function to convert technical error messages into user-friendly messages
function getErrorMessage(error) {
    // Get the error message or use default if none provided
    const errorMessage = error.message || 'An error occurred';
    
    // Convert common technical errors into user-friendly messages
    if (errorMessage.includes('Invalid login credentials')) {
        return 'Invalid email or password.';
    } else if (errorMessage.includes('Email not confirmed')) {
        return 'Please confirm your email before logging in.';
    } else if (errorMessage.includes('User already registered')) {
        return 'This email is already registered.';
    } else if (errorMessage.includes('network')) {
        return 'Network error. Please check your connection.';
    }
    
    // Return original message if no specific translation exists
    return errorMessage;
}

// Function to handle new user registration
async function signUp(username, email, password) {
    try {
        // Validate that all required fields are provided
        if (!username || !email || !password) {
            showPopup('Please fill in all fields', false);
            return;
        }
        // Attempt to create new user account in Supabase
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                // Store username in user metadata
                data: {
                    username: username
                }
            }
        });
        // Handle any signup errors
        if (error) throw error;
        // Extract user data and log success
        const user = data.user;
        console.log("Registration successful:", user.email);
        showPopup('Registration successful!');
        
        // Redirect to dashboard after brief delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (error) {
        // Log and display any errors that occur
        console.error("Registration error:", error);
        showPopup(error.message, false);
    }
}

// Function to handle user login
async function signIn(email, password) {
    try {
        // Attempt to sign in with provided credentials
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        // Handle any login errors
        if (error) throw error;
        
        // Extract user data and log success
        const user = data.user;
        console.log("Login successful:", user.email);
        showPopup('Login successful!');
        
        // Check if the user has admin privileges
        try {
            // Query the profiles table for admin status
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();
                
            if (profileError) throw profileError;
            
            // Redirect user based on their admin status
            setTimeout(() => {
                if (profileData && profileData.is_admin === true) {
                    // Redirect admins to admin panel
                    window.location.href = 'admin.html';
                } else {
                    // Redirect regular users to dashboard
                    window.location.href = 'dashboard.html';
                }
            }, 1500);
        } catch (profileError) {
            // Log admin check errors and default to dashboard
            console.error('Error checking admin status:', profileError);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        }
    } catch (error) {
        // Log and display any login errors
        console.error("Login error:", error);
        const errorMessage = getErrorMessage(error);
        showPopup(errorMessage, false);
    }
}

// Make authentication functions available globally for use in HTML
// Allows these functions to be called directly from HTML elements
// Without this, the functions would be scoped only to the auth.js 
// file and not accessible from HTML
window.signUp = signUp;
window.signIn = signIn;

// Initialize authentication handling when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Log current page for debugging
    const currentPage = window.location.pathname;
    console.log("Current page:", currentPage);

    // Check user's authentication status
    supabase.auth.getSession().then(({ data, error }) => {
        console.log("Auth state checked:", data.session ? "User logged in" : "No user");
        
        // Get user data if session exists
        const user = data.session?.user;
        
        // Handle homepage routing
        // If user is logged in → Send to dashboard
        // If not logged in → Stay on homepage
        if (currentPage.includes('index.html')) {
            if (user) {
                // Redirect logged-in users to dashboard
                window.location.href = 'dashboard.html';
            }
            return;
        }

        // Handle dashboard page access
        if (currentPage.includes('dashboard.html')) {
            if (user) {
                // Show dashboard content for logged-in users
                // Hiding a "Loading..." spinner after the page finishes 
                // checking if the user is logged in.
                document.getElementById('loading').style.display = 'none';
                document.getElementById('userContent').style.display = 'block';
                
                // Display user information
                const username = user.user_metadata?.username || user.email;
                document.getElementById('userEmail').textContent = username;
                document.getElementById("welcomeUser").innerText = `Welcome, ${username}!`;
            } else {
                // Redirect to login if not authenticated
                window.location.href = 'login.html';
            }
            return;
        }

        // Handle device details page access
        if (currentPage.includes('device-details.html')) {
            if (!user) {
                // Redirect to login if not authenticated
                window.location.href = 'login.html';
                return;
            }
            return;
        }

        // Handle login page access
        if (currentPage.includes('login.html')) {
            if (user) {
                // Redirect to dashboard if already logged in
                window.location.href = 'dashboard.html';
                return;
            }

            // Set up login form submission handler
            const loginForm = document.getElementById('loginForm');
            // Makes sure the login form exists before trying to use it
            if (loginForm) {
                //Watches for when user submits the form (clicks login button or hits enter)
                //(e) => is the function that runs when form is submitted
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