// Import the Supabase client from the config file to interact with the database
import { supabase } from './config.js'
// Import the showPopup utility function to display notifications to users
import { showPopup } from './utils.js'

// Function to create a realistic-looking IP address for virtual devices
function generateRandomIp() {
    // Randomly select one of four IP address types (0-3)
    const ipType = Math.floor(Math.random() * 4);
    
    // For type 0, generate a 192.168.x.x private network IP
    if (ipType === 0) return `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    // For type 1, generate a 10.x.x.x private network IP
    else if (ipType === 1) return `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    // For type 2, generate a 172.16-31.x.x private network IP (172.16.0.0/12 range)
    else if (ipType === 2) return `172.${16 + Math.floor(Math.random() * 16)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    // For type 3, generate a public IP address using valid first octets
    else {
        // This array contains valid first octets for public IP addresses (excluding reserved ranges)
        const firstOctet = [1, 2, 3, 5, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223];
        // Randomly select one value from the array of valid first octets
        const selectedFirstOctet = firstOctet[Math.floor(Math.random() * firstOctet.length)];
        // Return a complete IP address with the selected first octet and random values for the remaining octets
        return `${selectedFirstOctet}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    }
}

// Function to switch between different tabs in the UI
function showTab(tabId) {
    // Find all elements with class 'tab-content' and hide them by setting display to 'none'
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    // Find all tab buttons and remove the 'active' class to make them appear unselected
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    // Find the specific tab content element with the matching ID and make it visible
    document.getElementById(tabId).style.display = 'block';
    // Find the specific tab button that corresponds to this tab and add the 'active' class to highlight it
    document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`).classList.add('active');
}

// Function to quickly set up a pre-configured device based on type and location
function selectDemoDevice(deviceType, location) {
    // Create a device name by combining the location and type
    const deviceName = `${location} ${deviceType}`;
    // Get the status element from the DOM to show feedback
    const statusElement = document.getElementById('status');
    // Update the status element to show a spinner and setup message
    statusElement.innerHTML = `<div class="spinner"></div> Setting up ${deviceName}...`;
    // Generate a random 6-digit serial number
    const demoSerial = `${Math.floor(100000 + Math.random() * 900000)}`;
    // Call the function to add this device to the database
    addVirtualDevice(deviceName, demoSerial);
}

// Main function to add a new device to the user's account
async function addVirtualDevice(deviceName, serialNumber = null) {
    // Get the status element to show feedback during the process
    const statusElement = document.getElementById('status');
    
    try {
        // Get the current user session to verify authentication
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        // If there's no session or an error, the user isn't logged in
        if (sessionError || !sessionData.session) {
            // Update the status message to indicate authentication issue
            statusElement.textContent = "You must be logged in to add a device";
            statusElement.style.color = "red";
            // Show a popup notification about the login requirement
            showPopup("You must be logged in to add a device", false);
            // Redirect to login page after a short delay
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }
        
        // Extract the user object from the session data
        const user = sessionData.session.user;
        // Log the authenticated user ID for debugging
        console.log("User authenticated:", user.id);
        
        // Generate a serial number if none was provided, or use the one given
        const deviceSerialNumber = serialNumber || `${Math.floor(100000 + Math.random() * 900000)}`;
        // Get the device type from the form select element
        const deviceTypeSelect = document.getElementById('deviceType');
        // Use the selected device type or default to 'other' if not available
        const deviceType = deviceTypeSelect ? deviceTypeSelect.value : 'other';
        
        // Log the database insertion attempt
        console.log("Attempting to insert device into database");
        // Insert a new device record into the 'devices' table
        const { data, error } = await supabase
            .from('devices')
            .insert([{
                user_id: user.id,                      // Associate device with current user
                name: deviceName,                      // Use the provided device name
                serial_number: parseInt(deviceSerialNumber), // Convert serial to integer
                ip_address: generateRandomIp(),        // Generate a random IP address
                power_status: true,                    // New devices are on by default
                current_consumption: 0,                // Initialize consumption at zero
                daily_usage: 0,                        // Initialize daily usage at zero
                monthly_usage: 0,                      // Initialize monthly usage at zero
                electricity_rate: 0.18,                // Set default electricity rate
                device_type: deviceType,               // Store the device type
                created_at: new Date().toISOString(),  // Set creation timestamp
                updated_at: new Date().toISOString()   // Set update timestamp (same as creation)
            }])
            .select();
        
        // If there was an error inserting the device
        if (error) {
            // Log the error details to console
            console.error('Supabase insertion error:', error);
            // Update the status message to show the error
            statusElement.textContent = "Error: " + error.message;
            statusElement.style.color = "red";
            // Show a popup with the error message
            showPopup('Error adding device: ' + error.message, false);
            return;
        }
        
        // Log successful device addition
        console.log("Device added successfully:", data);
        // Update status message with success
        statusElement.textContent = `${deviceName} connected successfully!`;
        statusElement.style.color = "green";
        // Show success popup with additional information
        showPopup(`${deviceName} connected successfully! Consumption will start at 0 and increase naturally over time.`, true);
        
        try {
            // Try to import the power simulation module to trigger consumption simulation
            import('./power-simulation.js')
                .then(module => {
                    // If the module exists and has the simulation function
                    if (module && module.simulateConsumption) {
                        // Log that we're triggering the simulation
                        console.log('Triggering initial consumption simulation for new device');
                        // Call the simulation function to start device consumption
                        module.simulateConsumption();
                    }
                })
                .catch(err => console.error('Error importing power simulation module:', err));
            
            // If the global PowerSimulation object exists, use it to force an immediate update
            if (window.PowerSimulation && window.PowerSimulation.forceUpdate) {
                console.log('Forcing immediate update via global PowerSimulation');
                window.PowerSimulation.forceUpdate();
            }
        } catch (simError) {
            // Log any errors during simulation setup, but continue (non-critical)
            console.warn('Could not trigger immediate consumption update:', simError);
        }
        
        // Redirect to dashboard after a short delay to see all devices
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
    } catch (error) {
        // Handle any unexpected errors in the overall process
        console.error('Error adding device:', error);
        // Update status with error information
        statusElement.textContent = "Error: " + (error.message || "Unknown error");
        statusElement.style.color = "red";
        // Show popup with error details
        showPopup('Error adding device: ' + (error.message || 'Unknown error'), false);
    }
}

// Function to update the UI with information about the selected device type
function updateDeviceTypeInfo(selectElement) {
    // Get the selected device type from the dropdown
    const deviceType = selectElement.value;
    // Try to find an existing info container element
    const infoContainer = document.getElementById('deviceTypeInfo');
    
    // If the info container doesn't exist, create it
    if (!infoContainer) {
        // Find the parent form group of the select element
        const formGroup = selectElement.closest('.form-group');
        // Create a new div for the device info
        const newInfoContainer = document.createElement('div');
        // Set ID for future reference
        newInfoContainer.id = 'deviceTypeInfo';
        // Add a CSS class for styling
        newInfoContainer.className = 'device-type-info';
        // Add the new container to the form group
        formGroup.appendChild(newInfoContainer);
    }
    
    // Get the info container (either existing or newly created)
    const container = document.getElementById('deviceTypeInfo');
    
    // Object containing information about different device types
    const deviceInfo = {
        'light': {
            icon: '💡',
            avgWattage: '60W',
            description: 'Lighting devices typically consume between 5-100W depending on type and brightness.'
        },
        'tv': {
            icon: '📺',
            avgWattage: '120W',
            description: 'TVs consume between 80-400W depending on screen size and technology.'
        },
        'ac': {
            icon: '❄️',
            avgWattage: '1500W',
            description: 'Air conditioners are high-consumption devices using 1000-3500W depending on size and efficiency.'
        },
        'refrigerator': {
            icon: '🧊',
            avgWattage: '150W',
            description: 'Refrigerators use 100-400W depending on size and age, running in cycles throughout the day.'
        },
        'other': {
            icon: '🔌',
            avgWattage: 'Varies',
            description: 'Select this for any device not in the list. You can monitor its consumption regardless of type.'
        }
    };
    
    // Clear the container's existing content
    container.innerHTML = '';
    
    // If a valid device type is selected, show its information
    if (deviceType && deviceInfo[deviceType]) {
        // Get the info for the selected device type
        const info = deviceInfo[deviceType];
        // Create HTML with the device information
        container.innerHTML = `
            <div class="device-icon">${info.icon}</div>
            <div class="device-details">
                <div class="device-wattage"><strong>Avg. Power:</strong> ${info.avgWattage}</div>
                <div class="device-description">${info.description}</div>
            </div>
        `;
        // Show the container
        container.style.display = 'flex';
    } else {
        // If no valid type is selected, hide the container
        container.style.display = 'none';
    }
}

// Main initialization function that runs when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Log that the script has loaded
    console.log("AddDevice script loaded");
    
    // Make functions available globally for use in HTML event attributes
    window.showTab = showTab;
    window.selectDemoDevice = selectDemoDevice;
    window.updateDeviceTypeInfo = updateDeviceTypeInfo;
    
    // Check if the user is logged in
    supabase.auth.getSession().then(({ data, error }) => {
        // If there's an error or no session, the user isn't logged in
        if (error || !data.session) {
            console.error("Not logged in, redirecting to login page");
            window.location.href = 'login.html';
            return;
        }
        
        // Extract the user object and log authentication status
        const user = data.session.user;
        console.log("User authenticated:", user.id);
        
        // Find the device addition form
        const deviceForm = document.getElementById('deviceForm');
        if (deviceForm) {
            // Add a submit event handler to the form
            deviceForm.addEventListener('submit', function(event) {
                // Prevent the default form submission behavior
                event.preventDefault();
                // Get the device name from the input field
                const deviceName = document.getElementById('deviceName').value;
                // Get the device code from the input field
                const deviceCode = document.getElementById('deviceCode').value;
                
                // Validate that the device code is a 5-digit number
                if (!deviceCode || deviceCode.length !== 5) {
                    showPopup("Please enter a valid 5-digit device code", false);
                    return;
                }
                
                // Find or create a status element to show feedback
                const statusElement = document.getElementById('status') || document.createElement('div');
                if (!statusElement.id) {
                    statusElement.id = 'status';
                    deviceForm.appendChild(statusElement);
                }
                
                // Update status to show pairing is in progress
                statusElement.innerHTML = `<div class="spinner"></div> Pairing with device ${deviceCode}...`;
                
                // Call function to add the device to the database
                addVirtualDevice(deviceName);
            });
        }
        
        // If a device type selector exists, update the info display based on its value
        const deviceTypeSelect = document.getElementById('deviceType');
        if (deviceTypeSelect && deviceTypeSelect.value) {
            updateDeviceTypeInfo(deviceTypeSelect);
        }
    });
});