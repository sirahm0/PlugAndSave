// This file handles the password reset functionality, allowing users to request a password reset link

// Import the configured Supabase client for authentication
import supabaseClient from './supabase-client.js';

// Get references to the HTML elements we'll need
// The form that contains the email input and submit button
const resetForm = document.getElementById('resetForm');
// The div where we'll display success/error messages to the user
const messageDiv = document.getElementById('message');

// Add an event listener for when the form is submitted
// Using async because we'll be making API calls to Supabase
resetForm.addEventListener('submit', async (event) => {
  // Prevent the form from submitting normally (which would refresh the page)
  event.preventDefault();
  
  // Get the email address entered by the user
  // This should be an input field with id="email" in the HTML
  const email = document.getElementById('email').value;
  
  try {
    // Show a loading message to let the user know something is happening
    messageDiv.textContent = 'Sending reset link...';
    
    // Call Supabase's password reset function
    // This will send an email to the user with a password reset link
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      // When user clicks the link in their email, they'll be redirected to this URL
      // Uses the current site's URL as the base to ensure it works in all environments
      redirectTo: `${window.location.origin}/update-password.html`
    });
    
    // Handle the response from Supabase
    if (error) {
      // If there was an error, show it to the user in red
      messageDiv.textContent = `Error: ${error.message}`;
      messageDiv.style.color = 'red';
      // Also log it to the console for debugging
      console.error(error);
    } else {
      // If successful, show a success message in green
      messageDiv.textContent = 'Password reset link sent! Please check your email.';
      messageDiv.style.color = 'green';
      // Clear the form
      resetForm.reset();
    }
  } catch (err) {
    // Handle any unexpected errors that weren't caught by Supabase
    // This is a fallback for network errors, etc.
    messageDiv.textContent = `Unexpected error: ${err.message}`;
    messageDiv.style.color = 'red';
    // Log the full error for debugging
    console.error(err);
  }
});
