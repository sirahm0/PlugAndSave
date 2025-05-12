import { supabase } from './config.js';

// DOM Elements
const el = {
  loading: document.getElementById('loading'),
  adminContent: document.getElementById('admin-content'),
  usersTableBody: document.getElementById('users-table-body'),
  logoutBtn: document.getElementById('logoutBtn'),
  createBtn: document.getElementById('createUserBtn'),
  createModal: document.getElementById('createUserModal'),
  createForm: document.getElementById('createUserForm'),
  deleteModal: document.getElementById('deleteUserModal'),
  deleteId: document.getElementById('deleteUserId'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  editModal: document.getElementById('editUserModal'),
  editForm: document.getElementById('editUserForm'),
  editId: document.getElementById('editUserId'),
  editEmail: document.getElementById('editEmail'),
  editName: document.getElementById('editFullName'),
  editPhone: document.getElementById('editPhone'),
  closeButtons: document.querySelectorAll('.close')
};

// Utility functions
const formatDate = dateString => !dateString ? 'N/A' : new Date(dateString).toLocaleString();
const setDisplay = (element, display) => element.style.display = display;
const showModal = modal => setDisplay(modal, 'block');
const hideModal = modal => setDisplay(modal, 'none');

// Function to show popup notification
function showPopup(message, isSuccess = true) {
  let popup = document.getElementById('notification-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'notification-popup';
    popup.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 25px;border-radius:5px;color:white;z-index:1000;';
    document.body.appendChild(popup);
  }
  popup.textContent = message;
  popup.style.backgroundColor = isSuccess ? '#4CAF50' : '#F44336';
  popup.style.display = 'block';
  
  setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      popup.style.display = 'none';
      popup.style.opacity = '1';
    }, 500);
  }, 3000);
}

// Handle API errors
function handleError(error, context, redirect = false) {
  console.error(`Error ${context}:`, error);
  showPopup(`Error ${context}: ${error.message || 'Unknown error'}`, false);
  if (redirect) setTimeout(() => window.location.href = redirect, 3000);
}

// Function to check if user is admin
async function checkAdminStatus() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    if (!session) {
      window.location.href = '/login.html';
      return;
    }
    
    // Get user data
    const { error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    // Check if user is an admin by querying the profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) throw profileError;
    
    // If user is not an admin, redirect to dashboard
    if (!profileData || profileData.is_admin !== true) {
      showPopup('Access denied. Admin privileges required.', false);
      setTimeout(() => window.location.href = '/dashboard.html', 2000);
      return;
    }
    
    // User is an admin, show admin content
    setDisplay(el.loading, 'none');
    setDisplay(el.adminContent, 'block');
    showPopup('Welcome, Administrator!', true);
    
    loadUsers();
  } catch (error) {
    handleError(error, 'verifying admin status', '/dashboard.html');
  }
}

// Function to load all users
async function loadUsers() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session found');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (profilesError) throw profilesError;
    
    el.usersTableBody.innerHTML = !profiles || profiles.length === 0 
      ? '<tr><td colspan="7" style="text-align:center;">No users found</td></tr>'
      : profiles.map(user => `
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
    
    // Add event listeners to buttons
    document.querySelectorAll('.delete-user-btn').forEach(btn => 
      btn.addEventListener('click', () => openDeleteModal(btn.getAttribute('data-id')))
    );
    
    document.querySelectorAll('.edit-user-btn').forEach(btn => 
      btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')))
    );
  } catch (error) {
    handleError(error, 'loading users');
  }
}

// Function to create a new user
async function createUser(event) {
  event.preventDefault();
  
  const userData = {
    email: document.getElementById('newEmail').value,
    password: document.getElementById('newPassword').value,
    fullName: document.getElementById('newFullName').value,
    phone: document.getElementById('newPhone').value
  };
  
  try {
    // Get the current session to maintain admin's session
    const { data: { session: adminSession } } = await supabase.auth.getSession();
    if (!adminSession) throw new Error('Admin session not found. Please log in again.');
    
    // Create user in Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: { full_name: userData.fullName },
        emailRedirectTo: window.location.origin + '/login.html'
      }
    });
    
    if (signUpError) throw signUpError;
    if (!data || !data.user) throw new Error('Failed to create user account');
    
    const timestamp = new Date().toISOString();
    
    // Insert email into profiles manually without a trigger
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        email: userData.email,
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
    
    // Close modal and reset form
    hideModal(el.createModal);
    el.createForm.reset();
    
    showPopup('User created successfully', true);
    loadUsers();
  } catch (error) {
    handleError(error, 'creating user');
  }
}

// Function to open delete modal
function openDeleteModal(userId) {
  el.deleteId.value = userId;
  showModal(el.deleteModal);
}

// Function to delete user
async function deleteUser() {
  const userId = el.deleteId.value;
  
  try {
    // Get current session to ensure we have admin privileges
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) throw new Error('Not authenticated. Please log in.');
    
    // First delete from profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
      
    if (profileError) throw profileError;
    
    // Delete from auth.users using Edge Function
    try {
      const token = session.access_token;
      if (!token) throw new Error('No access token available. Please log in again.');
      
      const response = await fetch("https://fzrxktbxjbcmbudiouqa.functions.supabase.co/admin-delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Error deleting account from auth.users');
      
      hideModal(el.deleteModal);
      showPopup('User completely deleted from the system', true);
      loadUsers();
    } catch (fetchError) {
      console.error('Error deleting from auth.users:', fetchError);
      
      // Even if auth.users deletion fails, we've already deleted from profiles
      hideModal(el.deleteModal);
      showPopup('User profile deleted, but could not remove from authentication system: ' + fetchError.message, false);
      loadUsers();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    handleError(error, 'deleting user');
  }
}

// Function to open edit modal
async function openEditModal(userId) {
  try {
    // Get user data
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    // Populate form fields
    el.editId.value = user.id;
    el.editEmail.value = user.email || '';
    el.editName.value = user.full_name || '';
    el.editPhone.value = user.phone || '';
    
    showModal(el.editModal);
  } catch (error) {
    handleError(error, 'loading user data');
  }
}

// Function to edit user
async function editUser(event) {
  event.preventDefault();
  
  const userId = el.editId.value;
  const userData = {
    fullName: el.editName.value,
    phone: el.editPhone.value
  };
  
  try {
    // Update profile with the new data
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: userData.fullName,
        phone: userData.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (profileError) throw profileError;
    
    hideModal(el.editModal);
    el.editForm.reset();
    
    showPopup('User updated successfully', true);
    loadUsers();
  } catch (error) {
    console.error('Error updating user:', error);
    handleError(error, 'editing user');
  }
}

// Handle logout
async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    showPopup('Logged out successfully');
    setTimeout(() => window.location.href = '/login.html', 1500);
  } catch (error) {
    handleError(error, 'logging out');
  }
}

// Initialize the app
(function init() {
  // Main functionality
  document.addEventListener('DOMContentLoaded', checkAdminStatus);
  el.logoutBtn.addEventListener('click', handleLogout);
  el.createForm.addEventListener('submit', createUser);
  el.confirmDeleteBtn.addEventListener('click', deleteUser);
  el.editForm.addEventListener('submit', editUser);
  
  // Modal controls
  el.createBtn.addEventListener('click', () => showModal(el.createModal));
  el.cancelDeleteBtn.addEventListener('click', () => hideModal(el.deleteModal));
  
  // Close buttons
  el.closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      hideModal(el.createModal);
      hideModal(el.deleteModal);
      hideModal(el.editModal);
    });
  });
  
  // Close modals when clicking outside
  window.onclick = (event) => {
    if (event.target === el.createModal) hideModal(el.createModal);
    if (event.target === el.deleteModal) hideModal(el.deleteModal);
    if (event.target === el.editModal) hideModal(el.editModal);
  };
})();
