// This file handles the password update process after a user clicks the reset link in their email
// It validates the reset token and allows setting a new password

// Import the configured Supabase client for authentication operations
import supabaseClient from './supabase-client.js';

// Get references to important HTML elements
// The form containing the new password inputs
const updatePasswordForm = document.getElementById('updatePasswordForm');
// The div where we'll show status messages to the user
const messageDiv = document.getElementById('message');

// When the page loads, verify that the user arrived here through a valid reset link
// PKCE (Proof Key for Code Exchange) is the secure flow used for password reset
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check if there's a valid session from the reset link
    // This verifies the reset token is valid and not expired
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    // If there was an error checking the session
    if (error) {
      // Show error message and log details for debugging
      showError(`Authentication error: ${error.message}`, error);
      // Hide the password update form since we can't verify the user
      hideForm();
      return;
    }
    
    // If no valid session found
    if (!session) {
      // Show error about invalid/expired link
      showError('Invalid or expired password reset link. Please request a new one.');
      // Hide the password update form
      hideForm();
      // Show a link to request a new reset email
      addResetLink();
    }
  } catch (err) {
    // Handle any unexpected errors
    showError(`Unexpected error: ${err.message}`, err);
  }
});

// Handle when user submits the new password
updatePasswordForm.addEventListener('submit', async (event) => {
  // Prevent normal form submission (page refresh)
  event.preventDefault();
  
  // Get the passwords entered by the user
  // Both the new password and confirmation password
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  // Make sure the passwords match before proceeding
  if (password !== confirmPassword) {
    showError('Passwords do not match!');
    return;
  }
  
  try {
    // Show loading message while updating
    messageDiv.textContent = 'Updating password...';
    
    // Call Supabase to set the new password
    const { error } = await supabaseClient.auth.updateUser({
      password: password
    });
    
    // Handle the response
    if (error) {
      // If there was an error, show it to the user
      showError(`Error: ${error.message}`, error);
    } else {
      // If successful, show success message and login link
      showSuccess();
    }
  } catch (err) {
    // Handle any unexpected errors
    showError(`Unexpected error: ${err.message}`, err);
  }
});

// Helper function to show error messages
// Takes a message to show to user and optionally an error to log
function showError(message, error = null) {
  // Show the error message in red
  messageDiv.textContent = message;
  messageDiv.style.color = 'red';
  // If an error object was provided, log it for debugging
  if (error) console.error(error);
}

// Helper function to hide the password update form
function hideForm() {
  // Make the form invisible
  updatePasswordForm.style.display = 'none';
}

// Helper function to add a link to request a new reset email
function addResetLink() {
  // Create a new paragraph element
  const resetLink = document.createElement('p');
  // Add the link HTML
  resetLink.innerHTML = '<a href="reset.html">Request a new password reset</a>';
  // Add it to the page
  document.body.appendChild(resetLink);
}

// Helper function to show success message and redirect link
function showSuccess() {
  // Show success message in green
  messageDiv.textContent = 'Password updated successfully!';
  messageDiv.style.color = 'green';
  
  // After a short delay, show a link to return to login
  setTimeout(() => {
    const loginLink = document.createElement('p');
    loginLink.innerHTML = '<a href="index.html">Return to login</a>';
    document.body.appendChild(loginLink);
  }, 1000);  // Wait 1 second before showing the link
}
