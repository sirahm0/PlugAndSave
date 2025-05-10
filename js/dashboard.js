// Import required dependencies
import { supabase } from './config.js'           // Import Supabase client for database operations
import { showPopup, formatDate } from './utils.js' // Import utility functions for notifications and date formatting

// Backup popup notification function in case the imported one fails
function _showPopup(message, isSuccess = true) {
    // Create a new popup element
    const popup = document.createElement('div');
    // Set classes for styling (success=green, error=red)
    popup.className = 'popup ' + (isSuccess ? 'success' : 'error');
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
            document.body.removeChild(popup);
        }, 500);
    }, 3000); // Show popup for 3 seconds
}

// Wrapper function that tries to use imported showPopup first, falls back to local version if needed
function showLocalPopup(message, isSuccess = true) {
    try {
        // Try to use the imported showPopup function
        showPopup(message, isSuccess);
    } catch (error) {
        // If imported function fails, use local backup
        console.warn('Error using utility showPopup, falling back to local implementation', error);
        _showPopup(message, isSuccess);
    }
}

// Function to display devices in the dashboard
function displayDevices(devices) {
    // Get the container where devices will be displayed
    // retrieves an existing HTML element from html file
    const devicesList = document.getElementById('devicesList');
    // Clear existing content
    devicesList.innerHTML = '';
  
    // Handle case when no devices exist
    if (devices.length === 0) {
        // Try to use template for empty state
        const emptyTemplate = document.getElementById('emptyDevicesTemplate');
        if (emptyTemplate) {
            // Clone the template content
            // used to show a "no devices" message when the user has no devices. 
            const emptyContent = emptyTemplate.content.cloneNode(true);
            devicesList.appendChild(emptyContent);
        } else {
            // Fallback HTML if template doesn't exist
            devicesList.innerHTML = `
                <div class="empty-devices">
                    <div class="empty-devices-text">No devices found. Add your first device!</div>
                    <a href="addDevice.html" class="add-device-btn">Add Device</a>
                </div>
            `;
        }
        return;
    }
  
    // Create and display card for each device
    devices.forEach(device => {
        // Create container for device card
        const deviceElement = document.createElement('div');
        deviceElement.className = 'device-card';
        // Add click handler to view device details
        deviceElement.onclick = () => viewDeviceDetails(device.id);
        
        // Format usage numbers to 2 decimal places
        const monthlyUsage = parseFloat(device.monthly_usage || 0).toFixed(2);
        const dailyUsage = parseFloat(device.daily_usage || 0).toFixed(2);
        
        // Get IP address or fallback text
        const ipAddress = device.ip_address || "Not available";
        
        // Generate HTML for device card
        deviceElement.innerHTML = `
            <div class="device-status ${device.power_status ? 'status-on' : 'status-off'}"></div>
            <h3 class="device-name">${device.name || 'Unnamed Device'}</h3>
            <table class="device-info-table">
                <tr>
                    <td><span class="detail-label">Daily Usage</span></td>
                    <td><span class="detail-value">${dailyUsage} kWh</span></td>
                </tr>
                <tr>
                    <td><span class="detail-label">Monthly Usage</span></td>
                    <td><span class="detail-value">${monthlyUsage} kWh</span></td>
                </tr>
                <tr>
                    <td><span class="detail-label">IP Address</span></td>
                    <td><span class="detail-value">${ipAddress}</span></td>
                </tr>
                <tr>
                    <td><span class="detail-label">Status</span></td>
                    <td><span class="detail-value ${device.power_status ? 'status-on' : 'status-off'}">${device.power_status ? 'On' : 'Off'}</span></td>
                </tr>
            </table>
        `;
        
        // Add the device card to the list
        devicesList.appendChild(deviceElement);
    });
}

// Function to show message when no devices are found
function showNoDevicesMessage() {
    const devicesList = document.getElementById('devicesList');
    devicesList.innerHTML = `
        <p>No devices found. Add your first device!</p>
        <button class="primary-button" onclick="window.location.href='addDevice.html'">Add Device</button>
    `;
}

// Function to load user's devices from database
async function loadDevices(userId) {
    try {
        // Query devices table for all devices belonging to user
        const { data: devices, error } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', userId);
        
        if (error) {
            throw error;
        }
  
        // Display devices or show empty message
        if (!devices || devices.length === 0) {
            showNoDevicesMessage();
        } else {
            displayDevices(devices);
        }
    } catch (error) {
        console.error('Error loading devices:', error);
        showLocalPopup('Error loading devices. Please try again later.', false);
    }
}
  
// Function to navigate to device details page
function viewDeviceDetails(deviceId) {
    window.location.href = `device-details.html?id=${deviceId}`;
}

// Make functions available globally for use in HTML and other scripts
window.viewDeviceDetails = viewDeviceDetails;
window.loadDevices = loadDevices;

// Setup function for the update usage button
function setupUpdateButton() {
    // Get button and icon elements
    const updateBtn = document.getElementById('updateUsageBtn');
    const updateIcon = document.getElementById('updateIcon');
    
    if (updateBtn && updateIcon) {
        // Add click handler to update button 
        // "listener" that waits for the user to click
        updateBtn.addEventListener('click', async function() {
            // Show loading state
            updateIcon.classList.add('icon-spin');
            updateBtn.disabled = true;
            
            try {
                // Try to use PowerSimulation if available
                if (window.PowerSimulation && typeof window.PowerSimulation.forceUpdate === 'function') {
                    await window.PowerSimulation.forceUpdate();
                } else {
                    // Manual refresh fallback
                    const { data: sessionData } = await supabase.auth.getSession();
                    if (sessionData && sessionData.session) {
                        const user = sessionData.session.user;
                        await loadDevices(user.id);
                    }
                    
                    // Show loading animation for minimum time
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error('Error updating device usage:', error);
                showLocalPopup('Error updating device usage. Please try again.', false);
            } finally {
                // Reset button state
                updateIcon.classList.remove('icon-spin');
                updateBtn.disabled = false;
            }
        });
        
        console.log('Update usage button initialized');
    }
}
  
// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verify user authentication
        const { data, error } = await supabase.auth.getSession();
        
        if (data.session) {
            const user = data.session.user;
            console.log("User data:", user); // Debug log
            
            // Show main content, hide loading
            document.getElementById('loading').style.display = 'none';
            document.getElementById('userContent').style.display = 'block';
            
            // Get user's profile data
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            console.log("Profile data:", profileData); // Debug log
            console.log("Profile error:", profileError); // Debug log

            // Handle profile loading errors
            if (profileError) {
                console.error("Error fetching user profile:", profileError);
                document.getElementById("welcomeUser").innerText = `Welcome, ${user.email}!`;
                showLocalPopup('Could not load user profile data.', false);
            } else if (profileData) {
                // Get user's name from available fields
                const userName = profileData.full_name || profileData.name || profileData.username || profileData.display_name;
                
                if (userName) {
                    console.log("User name found:", userName);
                    document.getElementById("welcomeUser").innerText = `Welcome, ${userName}!`;
                } else {
                    console.log("No name found in profile data, using email");
                    document.getElementById("welcomeUser").innerText = `Welcome, ${user.email}!`;
                }
            } else {
                console.log("No profile data found, using email");
                document.getElementById("welcomeUser").innerText = `Welcome, ${user.email}!`;
            }
            
            loadDevices(user.id);
            setupUpdateButton();
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error("Error initializing dashboard:", error);
        showLocalPopup('Error loading dashboard. Please try again later.', false);
    }
});