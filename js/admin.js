import { supabase } from './config.js';

// Object containing all DOM element references used throughout the admin panel
const el = {
  // Reference to loading spinner element
  loading: document.getElementById('loading'),
  
  // Reference to main admin content container
  adminContent: document.getElementById('admin-content'),
  
  // Reference to table body where user list will be displayed
  usersTableBody: document.getElementById('users-table-body'),
  
  // Reference to logout button
  logoutBtn: document.getElementById('logoutBtn'),
  
  // Reference to button that opens create user modal
  createBtn: document.getElementById('createUserBtn'),
  
  // Reference to create user modal dialog
  createModal: document.getElementById('createUserModal'),
  
  // Reference to form within create user modal
  createForm: document.getElementById('createUserForm'),
  
  // Reference to delete user confirmation modal
  deleteModal: document.getElementById('deleteUserModal'),
  
  // Hidden input storing ID of user to be deleted
  deleteId: document.getElementById('deleteUserId'),
  
  // Button to confirm user deletion
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  
  // Button to cancel user deletion
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  
  // Reference to edit user modal dialog
  editModal: document.getElementById('editUserModal'),
  
  // Reference to form within edit user modal
  editForm: document.getElementById('editUserForm'),
  
  // Hidden input storing ID of user being edited
  editId: document.getElementById('editUserId'),
  
  // Input field for editing user email
  editEmail: document.getElementById('editEmail'),
  
  // Input field for editing user full name
  editName: document.getElementById('editFullName'),
  
  // Input field for editing user phone number
  editPhone: document.getElementById('editPhone'),
  
  // Collection of all modal close buttons
  closeButtons: document.querySelectorAll('.close')
};

// Utility Functions

// Formats date string to locale format or returns 'N/A' if null
const formatDate = dateString => !dateString ? 'N/A' : new Date(dateString).toLocaleString();

// Sets display style of an HTML element
const setDisplay = (element, display) => element.style.display = display;

// Shows a modal by setting display to 'block'
const showModal = modal => setDisplay(modal, 'block');

// Hides a modal by setting display to 'none'
const hideModal = modal => setDisplay(modal, 'none');

// Function to display notification popups
function showPopup(message, isSuccess = true) {
  // Find existing popup or create new one
  let popup = document.getElementById('notification-popup');
  if (!popup) {
    // Create new popup element
    popup = document.createElement('div');
    popup.id = 'notification-popup';
    // Set popup styling
    popup.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 25px;border-radius:5px;color:white;z-index:1000;';
    // Add to document body
    document.body.appendChild(popup);
  }
  
  // Set popup message
  popup.textContent = message;
  // Set color based on success/failure
  popup.style.backgroundColor = isSuccess ? '#4CAF50' : '#F44336';
  // Show popup
  popup.style.display = 'block';
  
  // Auto-hide popup after delay
  setTimeout(() => {
    // Fade out animation
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.5s';
    // Hide after fade
    setTimeout(() => {
      popup.style.display = 'none';
      popup.style.opacity = '1';
    }, 500);
  }, 3000);
}

// Function to handle errors and optionally redirect
function handleError(error, context, redirect = false) {
  // Log error to console
  console.error(`Error ${context}:`, error);
  // Show error popup to user
  showPopup(`Error ${context}: ${error.message || 'Unknown error'}`, false);
  // Redirect if URL provided
  if (redirect) setTimeout(() => window.location.href = redirect, 3000);
}

// Function to verify admin status of current user
async function checkAdminStatus() {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    // Redirect to login if no session
    if (!session) {
      window.location.href = '/login.html';
      return;
    }
    
    // Verify user data
    const { error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    // Check admin status in profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) throw profileError;
    
    // Redirect non-admin users
    if (!profileData || profileData.is_admin !== true) {
      showPopup('Access denied. Admin privileges required.', false);
      setTimeout(() => window.location.href = '/dashboard.html', 2000);
      return;
    }
    
    // Show admin interface
    setDisplay(el.loading, 'none');
    setDisplay(el.adminContent, 'block');
    showPopup('Welcome, Administrator!', true);
    
    // Load user list
    loadUsers();
  } catch (error) {
    handleError(error, 'verifying admin status', '/dashboard.html');
  }
}

// Function to load and display all users
async function loadUsers() {
  try {
    // Verify active session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session found');
    
    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.rpc('get_users_with_emails');
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      // Fall back to getting just profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, created_at, updated_at')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      
      // Generate table HTML with no emails
      el.usersTableBody.innerHTML = !profiles || profiles.length === 0 
        ? '<tr><td colspan="7" style="text-align:center;">No users found</td></tr>'
        : profiles.map(user => `
            <tr>
              <td>${user.id}</td>
              <td>${user.full_name || 'N/A'}</td>
              <td>Email not available</td>
              <td>${user.phone || 'N/A'}</td>
              <td>${formatDate(user.created_at)}</td>
              <td>${formatDate(user.updated_at)}</td>
              <td>
                <button class="btn btn-primary edit-user-btn" data-id="${user.id}">Edit</button>
                <button class="btn btn-danger delete-user-btn" data-id="${user.id}">Delete</button>
              </td>
            </tr>
          `).join('');
    } else {
      // Map auth users to a user-friendly format
      const usersWithEmails = authUsers.map(user => ({
        id: user.id,
        full_name: user.raw_user_meta_data?.full_name || 'N/A',
        email: user.email,
        phone: user.raw_user_meta_data?.phone || 'N/A',
        created_at: user.created_at,
        updated_at: user.updated_at
      }));
      
      // Generate table HTML with emails
      el.usersTableBody.innerHTML = !usersWithEmails || usersWithEmails.length === 0 
        ? '<tr><td colspan="7" style="text-align:center;">No users found</td></tr>'
        : usersWithEmails.map(user => `
            <tr>
              <td>${user.id}</td>
              <td>${user.full_name || 'N/A'}</td>
              <td>${user.email || 'N/A'}</td>
              <td>${user.phone || 'N/A'}</td>
              <td>${formatDate(user.created_at)}</td>
              <td>${formatDate(user.updated_at)}</td>
              <td>
                <button class="btn btn-primary edit-user-btn" data-id="${user.id}">Edit</button>
                <button class="btn btn-danger delete-user-btn" data-id="${user.id}">Delete</button>
              </td>
            </tr>
          `).join('');
    }
    
    // Add click handlers to edit buttons
    document.querySelectorAll('.edit-user-btn').forEach(btn => 
      btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')))
    );
    
    // Add click handlers to delete buttons
    document.querySelectorAll('.delete-user-btn').forEach(btn => 
      btn.addEventListener('click', () => openDeleteModal(btn.getAttribute('data-id')))
    );
  } catch (error) {
    handleError(error, 'loading users');
  }
}

// Function to create new user
async function createUser(event) {
  // Prevent form submission
  event.preventDefault();
  // Collect form data
  const userData = {
    email: document.getElementById('newEmail').value,
    password: document.getElementById('newPassword').value,
    fullName: document.getElementById('newFullName').value,
    phone: document.getElementById('newPhone').value
  };
  try {
    // Get admin session
    const { data: { session: adminSession } } = await supabase.auth.getSession();
    if (!adminSession) throw new Error('Admin session not found. Please log in again.');
    
    // Destructure the response from Supabase's signUp method
    // 'data' contains the user information if successful
    // 'error: signUpError' renames the error property to signUpError for clarity
    const { data, error: signUpError } = await supabase.auth.signUp({
        // The email address for the new user account
        email: userData.email,
        // The password for the new user account
        password: userData.password,
    });
    // Check if there was an error during sign up
    if (signUpError) throw signUpError;
    // Verify that we got back user data
    // This ensures the account was actually created
    if (!data || !data.user) throw new Error('Failed to create user account');
    // Get current timestamp
    const timestamp = new Date().toISOString();
    // Create user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        full_name: userData.fullName,
        phone: userData.phone,
        is_admin: false,
        created_at: timestamp,
        updated_at: timestamp
      }]);
    
    if (profileError) throw profileError;
    // Restore admin session
    await supabase.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token
    });
    // Reset and close form
    hideModal(el.createModal);
    el.createForm.reset();
    // Show success message and refresh user list
    showPopup('User created successfully!', true);
    loadUsers();
    
  } catch (error) {
    handleError(error, 'creating user');
  }
}

// Function to open delete confirmation modal
function openDeleteModal(userId) {
  // Store user ID and show modal
  el.deleteId.value = userId;
  showModal(el.deleteModal);
}

// Function to delete user
async function deleteUser() {
  try {
    // Get user ID from hidden input
    const userId = el.deleteId.value;
    // Delete user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileError) throw profileError;
    // Delete user auth account
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;
    // Hide modal and show success
    hideModal(el.deleteModal);
    showPopup('User deleted successfully!', true);
    // Refresh user list
    loadUsers();
  } catch (error) {
    handleError(error, 'deleting user');
  }
}

// Function to open edit user modal
async function openEditModal(userId) {
  try {
    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId)
      .single();
      
    if (profileError) throw profileError;
    
    // Try to get user email from auth.users
    const { data: userData, error: userError } = await supabase.rpc('get_user_email', { user_id: userId });
    let email = 'Email not available';
    
    if (!userError && userData && userData.length > 0) {
      email = userData[0].email;
    }
    
    // Populate form fields
    el.editId.value = userId;
    el.editEmail.value = email;
    el.editName.value = profile.full_name || '';
    el.editPhone.value = profile.phone || '';
    
    // Show modal
    showModal(el.editModal);
    
  } catch (error) {
    handleError(error, 'loading user data');
  }
}

// Function to update user details
async function editUser(event) {
  // Prevent form submission
  event.preventDefault();
  
  try {
    // Get user ID and updated data
    const userId = el.editId.value;
    const updates = {
      full_name: el.editName.value,
      phone: el.editPhone.value,
      updated_at: new Date().toISOString()
    };
    
    // Update profile in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
      
    if (updateError) throw updateError;
    
    // Hide modal and show success
    hideModal(el.editModal);
    showPopup('User updated successfully!', true);
    
    // Refresh user list
    loadUsers();
    
  } catch (error) {
    handleError(error, 'updating user');
  }
}

// Function to handle user logout
async function handleLogout() {
  try {
    // Sign out user
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Redirect to login page
    window.location.href = '/login.html';
    
  } catch (error) {
    handleError(error, 'logging out');
  }
}

// Initialize admin panel
(function init() {
  // Check admin status when page loads
  checkAdminStatus();
  
  // Add event listeners
  el.logoutBtn?.addEventListener('click', handleLogout);
  el.createForm?.addEventListener('submit', createUser);
  el.editForm?.addEventListener('submit', editUser);
  el.confirmDeleteBtn?.addEventListener('click', deleteUser);
  el.cancelDeleteBtn?.addEventListener('click', () => hideModal(el.deleteModal));
  el.closeButtons?.forEach(button => {
    button.addEventListener('click', () => {
      hideModal(el.createModal);
      hideModal(el.editModal);
      hideModal(el.deleteModal);
    });
  });
})();
