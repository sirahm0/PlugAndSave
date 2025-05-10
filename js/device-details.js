// Device details functionality
import { supabase } from './config.js'
import { calculateElectricityRate, calculateElectricityCost } from './electricity-rates.js'
import { showPopup } from './utils.js'

// Get device ID from URL
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id');

// Common utility functions
/**
 * Format date to locale string or return 'N/A' if invalid
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) { return date ? new Date(date).toLocaleString() : 'N/A'; }

/**
 * Format number with specified decimal places
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
function formatNumber(value, decimals = 2) { return value ? parseFloat(value).toFixed(decimals) : '0.00'; }

// Device deletion functions
/**
 * Show the device deletion confirmation modal
 */
function showDeleteConfirmation() { document.getElementById('deleteConfirmation').classList.add('active'); }

/**
 * Hide the device deletion confirmation modal
 */
function hideDeleteConfirmation() { document.getElementById('deleteConfirmation').classList.remove('active'); }

/**
 * Delete device from database after confirmation
 */
async function confirmDelete() {
    try {
        const { error } = await supabase.from('devices').delete().eq('id', deviceId);
        if (error) throw error;
        
        showPopup('Device deleted successfully', true);
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
    } catch (error) {
        console.error('Error deleting device:', error);
        showPopup('Error deleting device', false);
    }
}

// Function to confirm and delete device
/**
 * Show deletion confirmation dialog
 */
function confirmDeleteDevice() {
    showDeleteConfirmation();
}

// Device details loading
/**
 * Load and display device details from database
 */
async function loadDeviceDetails() {
    try {
        // Check if device ID is valid
        if (!deviceId) {
            console.error('Invalid device ID');
            return;
        }
        
        // Check if user is logged in
        const { data, error: userError } = await supabase.auth.getSession();
        if (!data.session || userError) {
            console.error('User not logged in or session error');
            return;
        }
        
        const user = data.session.user;

        // Get device data
        const { data: device, error } = await supabase
            .from('devices')
            .select('*')
            .eq('id', deviceId)
            // ensure only one device is returned
            // Expect exactly ONE record to be returned
            .single();
        
        if (error) {
            console.error('Database error:', error);
            return;
        }
        
        if (!device) {
            console.error('Device not found');
            return;
        }

        // Check if the device belongs to the current user
        if (device.user_id !== user.id) {
            console.error('User does not have permission to view this device');
            return;
        }

        // Update UI with device details
        updateDeviceUI(device);
        
        // Hide loading and show content
        const loadingElement = document.getElementById('loading');
        const deviceContentElement = document.getElementById('deviceContent');
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (deviceContentElement) deviceContentElement.style.display = 'block';
    } catch (error) {
        console.error('Error loading device details:', error);
    }
}

// Load device details when the page is loaded
window.loadDeviceDetails = loadDeviceDetails;

/**
 * Update UI elements with device information
 * @param {Object} device - Device data object
 */
function updateDeviceUI(device) {
    console.log("Updating UI with device data:", device);
    
    // Set device name and status
    document.getElementById('deviceName').textContent = device.name;
    document.getElementById('deviceNickname').value = device.name || '';
    document.getElementById('deviceIp').textContent = device.ip_address || 'Not available';
    
    // Set device status
    const statusElement = document.getElementById('deviceStatus');
    const toggleButton = document.getElementById('powerToggle');
    
    if (device.power_status) {
        // Device is ON
        if (statusElement) {
            statusElement.textContent = 'ON';
            statusElement.className = 'status-on';
        }
        
        // Update power toggle button
        if (toggleButton) {
            toggleButton.className = 'power-button on';
            toggleButton.title = 'Turn Off';
        }
    } else {
        // Device is OFF
        if (statusElement) {
            statusElement.textContent = 'OFF';
            statusElement.className = 'status-off';
        }
        
        // Update power toggle button
        if (toggleButton) {
            toggleButton.className = 'power-button off';
            toggleButton.title = 'Turn On';
        }
    }
    
    // Set consumption data
    const currentConsumption = device.current_consumption || 0;
    const dailyUsage = device.daily_usage || 0;
    const monthlyUsage = device.monthly_usage || 0;
    
    console.log(`Consumption data - Current: ${currentConsumption}W, Daily: ${dailyUsage}kWh, Monthly: ${monthlyUsage}kWh`);
    
    // Calculate the appropriate electricity rate based on monthly usage
    const calculatedRate = calculateElectricityRate(monthlyUsage);
    
    // Calculate estimated cost
    const estimatedCost = calculateElectricityCost(monthlyUsage);
    
    // Update UI with consumption data
    document.getElementById('currentConsumption').textContent = `${formatNumber(currentConsumption)} W`;
    document.getElementById('dailyUsage').textContent = `${formatNumber(dailyUsage)} kWh`;
    document.getElementById('monthlyUsage').textContent = `${formatNumber(monthlyUsage)} kWh`;
    
    // Update UI with rate and cost
    document.getElementById('electricityRate').value = formatNumber(calculatedRate);
    document.getElementById('calculatedRate').textContent = `${formatNumber(calculatedRate)} SAR/kWh`;
    document.getElementById('estimatedCost').textContent = `${formatNumber(estimatedCost)} SAR`;
    
    // Display current limits
    ['daily', 'weekly', 'monthly'].forEach(period => {
        const limitValue = device[`${period}_limit`];
        document.getElementById(`${period}LimitDisplay`).style.display = 'block';
        document.getElementById(`${period}Limit`).textContent = limitValue ? 
            `${formatNumber(limitValue)} SAR` : 'No limit';
    });
    
    // Set timestamps
    document.getElementById('createdAt').textContent = formatDate(device.created_at);
    document.getElementById('updatedAt').textContent = formatDate(device.updated_at);
}

// Function to update current time
/**
 * Update current time display
 * show live time
 */
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    if (currentTimeElement) {
        currentTimeElement.textContent = new Date().toLocaleTimeString();
    }
}

// Function to toggle device power
/**
 * Toggle device power state
 */
async function toggleDevicePower() {
    try {
        // Check if user is logged in
        const { data, error: userError } = await supabase.auth.getSession();
        if (!data.session || userError) {
            window.location.href = 'login.html';
            return;
        }
        const user = data.session.user;
        // Get device data
        const { data: device, error } = await supabase
            .from('devices')
            .select('*')
            .eq('id', deviceId)
            .single();
        if (error || !device) {
            showPopup('Device not found', false);
            return;
        }
        // Check if the device belongs to the current user
        if (device.user_id !== user.id) {
            showPopup('You do not have permission to control this device', false);
            return;
        }
        // Toggle power status
        // if device is on, turn it off, and vice versa
        const newStatus = !device.power_status;
        // Update in Supabase
        const { error: updateError } = await supabase
            .from('devices')
            .update({
                power_status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', deviceId);
        if (updateError) throw updateError;
        // Update UI elements
        // show the opposite action
        const powerStatusText = newStatus ? 'Turn Off' : 'Turn On';
        // Update power status element
        const powerStatusElement = document.getElementById('powerStatus');
        // if power status element is found, update the text content
        if (powerStatusElement) powerStatusElement.textContent = powerStatusText;
        // Update power toggle button
        const toggleButton = document.getElementById('powerToggle');
        if (toggleButton) {
            toggleButton.className = `power-button ${newStatus ? 'on' : 'off'}`;
            toggleButton.title = powerStatusText;
        }
        // Update device status in device information section
        const deviceStatusElement = document.getElementById('deviceStatus');
        if (deviceStatusElement) {
            deviceStatusElement.textContent = newStatus ? 'ON' : 'OFF';
            deviceStatusElement.className = newStatus ? 'status-on' : 'status-off';
        }
        showPopup(`Device turned ${newStatus ? 'on' : 'off'}`, true);
        // Reload device details to ensure all UI elements are updated consistently
        setTimeout(loadDeviceDetails, 1000);
    } catch (error) {
        console.error('Error toggling device power:', error);
        showPopup('Error toggling device power', false);
    }
}

// Function to save device settings
/**
 * Save device settings to database
 */
async function saveDeviceSettings() {
    try {
        // Check if user is logged in
        const { data, error: userError } = await supabase.auth.getSession();
        if (!data.session || userError) {
            window.location.href = 'login.html';
            return;
        }
        
        // Get values from form 
        // .trim()Removes any extra spaces from the beginning and end of the text
        const deviceNickname = document.getElementById('deviceNickname').value.trim();
        
        // Basic validation
        if (!deviceNickname) {
            showPopup('Please enter a valid device name', false);
            return;
        }
        
        // Update the device with new values
        const { error: updateError } = await supabase
            .from('devices')
            .update({
                name: deviceNickname,
                updated_at: new Date().toISOString()
            })
            .eq('id', deviceId);
            
        if (updateError) throw updateError;
        
        // Show success message
        showPopup('Device settings saved successfully', true);
        
        // Update the device name in the UI
        document.getElementById('deviceName').textContent = deviceNickname;
    } catch (error) {
        console.error('Error saving device settings:', error);
        showPopup('Error saving device settings', false);
    }
}

// Function to save cost limit
/**
 * Save consumption cost limit
 */
async function saveCostLimit() {
    try {
        // Get values
        const costLimit = parseFloat(document.getElementById('costLimit').value);
        const limitPeriod = document.getElementById('limitPeriod').value;
        
        // Validate
        if (isNaN(costLimit) || costLimit <= 0) {
            showPopup('Please enter a valid cost limit (must be a positive number)', false);
            return;
        }
        
        // Create empty object
        const updateObj = {};

        // Add a property with dynamic name based on limitPeriod
        updateObj[`${limitPeriod}_limit`] = costLimit;
                
        // Update database
        const { error } = await supabase
            .from('devices')
            .update(updateObj)
            .eq('id', deviceId);
        
        if (error) throw error;
        
        // Update UI
        document.getElementById(`${limitPeriod}LimitDisplay`).style.display = 'block';
        document.getElementById(`${limitPeriod}Limit`).textContent = `${costLimit} SAR`;
        
        // Show success message
        showPopup(`${limitPeriod.charAt(0).toUpperCase() + limitPeriod.slice(1)} limit set to ${costLimit} SAR`, true);
        
        // Clear input
        document.getElementById('costLimit').value = '';
    } catch (err) {
        console.error('Error saving limit:', err);
        showPopup('Failed to save limit. Error: ' + err.message, false);
    }
}

// Simple function to show limits
/**
 * Display consumption limits in UI
 * @param {string} period - Limit period (daily/weekly/monthly)
 * @param {number} value - Limit value
 */
function showLimits(period, value) {
    if (['daily', 'weekly', 'monthly'].includes(period)) {
        document.getElementById(`${period}LimitDisplay`).style.display = 'block';
        document.getElementById(`${period}Limit`).textContent = `${formatNumber(value)} SAR`;
    }
}

// Function to reset selected limit
/**
 * Reset consumption limits
 */
async function resetLimit() {
    const resetType = document.getElementById('resetLimitType').value;
    
    try {
        // Create update object based on reset type
        const updateObj = { updated_at: new Date().toISOString() };
        const periodsToReset = resetType === 'all' ? ['daily', 'weekly', 'monthly'] : [resetType];
        
        // Set limits to null for selected periods
        periodsToReset.forEach(period => {
            updateObj[`${period}_limit`] = null;
        });
        
        // Update the database
        const { error } = await supabase
            .from('devices')
            .update(updateObj)
            .eq('id', deviceId);
            
        if (error) throw error;
        
        // Update the UI for each reset period
        periodsToReset.forEach(period => {
            document.getElementById(`${period}Limit`).textContent = 'Not set';
            document.getElementById(`${period}LimitDisplay`).style.display = 'none';
        });
        
        // Show confirmation
        const resetMsg = resetType === 'all' ? 'All limits' : 
            `${resetType.charAt(0).toUpperCase() + resetType.slice(1)} limit`;
        showPopup('Limit Reset', `${resetMsg} reset successfully`, true);
    } catch (error) {
        console.error('Error resetting limit:', error);
        showPopup('Error resetting limit', false);
    }
}

// Event listeners
// Wait for the HTML document to be fully loaded before running any code
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the device details on page load
    loadDeviceDetails();
    
    // Update the clock display every 1000ms (1 second)
    setInterval(updateCurrentTime, 1000);

    // POWER CONSUMPTION SIMULATION
    // This runs every 5000ms (5 seconds) to simulate power usage
    setInterval(async function() {
        // Exit if no device ID is found (safety check)
        if (!deviceId) return;
        
        try {
            // STEP 1: Get current device data from database
            const { data: device, error } = await supabase
                .from('devices')
                .select('*')                // Get all fields
                .eq('id', deviceId)         // Match the device ID
                .single();                  // Expect one device only
                
            // Exit if there's an error or no device found
            if (error || !device) {
                console.error('Error fetching device for direct update:', error);
                return;
            }
            
            // STEP 2: Check if device is powered on
            // Only update consumption if device is ON (using strict comparison)
            if (device.power_status !== true) {
                console.log('Device is OFF, not updating consumption values');
                return;
            }
            
            console.log('Device is ON, updating consumption values');
            
            // STEP 3: Calculate Power Consumption Rate
            // Start with a default rate
            let consumptionRate = 0.05; // Default rate in kWh
            
            // If device type is stored in database, use that
            if (device.device_type) {
                // Define consumption rates for different device types
                const ratesByType = {
                    'heater': 0.25,   // High consumption
                    'fridge': 0.15,   // Medium-high consumption
                    'tv': 0.08,       // Medium consumption
                    'light': 0.02,    // Low consumption
                    'computer': 0.10  // Medium consumption
                };
                // Get rate for this device type, fallback to default if type unknown
                consumptionRate = ratesByType[device.device_type] || 0.05;
            } else {
                // Fallback: Try to guess device type from its name
                const deviceName = device.name.toLowerCase();
                
                // Check device name for keywords and assign appropriate rate
                if (deviceName.includes('heater') || deviceName.includes('boiler')) {
                    consumptionRate = 0.25;
                } else if (deviceName.includes('fridge') || deviceName.includes('refrigerator')) {
                    consumptionRate = 0.15;
                } else if (deviceName.includes('tv') || deviceName.includes('television')) {
                    consumptionRate = 0.08;
                } else if (deviceName.includes('light') || deviceName.includes('lamp')) {
                    consumptionRate = 0.02;
                } else if (deviceName.includes('pc') || deviceName.includes('computer')) {
                    consumptionRate = 0.10;
                }
            }
            
            // STEP 4: Calculate New Usage Values
            // Add consumption rate to current usage (or start from 0 if no current usage)
            const dailyUsage = (device.daily_usage || 0) + consumptionRate;
            const monthlyUsage = (device.monthly_usage || 0) + consumptionRate;
            
            console.log(`Device type: ${device.device_type || 'unknown'}, Consumption rate: ${consumptionRate} kWh`);
            
            // STEP 5: Calculate Costs
            const estimatedCost = calculateElectricityCost(monthlyUsage);
            const dailyCost = calculateElectricityCost(dailyUsage);
            const weeklyCost = calculateElectricityCost(dailyUsage * 7); // Estimate weekly from daily
            
            // STEP 6: Check Cost Limits
            // If any limit is exceeded, turn off the device
            if ((device.daily_limit && dailyCost >= device.daily_limit) ||
                (device.weekly_limit && weeklyCost >= device.weekly_limit) ||
                (device.monthly_limit && estimatedCost >= device.monthly_limit)) {
                
                // Determine which limit was exceeded
                let period, limit;
                if (device.daily_limit && dailyCost >= device.daily_limit) {
                    period = 'daily';
                    limit = device.daily_limit;
                } else if (device.weekly_limit && weeklyCost >= device.weekly_limit) {
                    period = 'weekly';
                    limit = device.weekly_limit;
                } else {
                    period = 'monthly';
                    limit = device.monthly_limit;
                }
                
                // Turn off device and update UI
                await turnOffDevice(device, dailyUsage, monthlyUsage, period, limit);
                return;
            }
            
            // STEP 7: Update Device Usage in Database
            const { error: updateError } = await supabase
                .from('devices')
                .update({
                    daily_usage: dailyUsage,
                    monthly_usage: monthlyUsage,
                    updated_at: new Date().toISOString()
                })
                .eq('id', deviceId);
                
            // Log success or failure
            if (updateError) {
                console.error('Error updating consumption values:', updateError);
            } else {
                console.log(`Direct update: Daily usage = ${dailyUsage.toFixed(2)} kWh, Monthly usage = ${monthlyUsage.toFixed(2)} kWh`);
            }
        } catch (err) {
            console.error('Error in direct update:', err);
        }
    }, 5000); // Run this simulation every 5 seconds

    /**
     * Helper function to turn off a device when limit is exceeded
     * Updates database and UI elements
     */
    async function turnOffDevice(device, dailyUsage, monthlyUsage, period, limit) {
        // Create object with updated device data
        const updateData = {
            power_status: false,              // Turn device off
            daily_usage: dailyUsage,          // Save current usage
            monthly_usage: monthlyUsage,
            updated_at: new Date().toISOString()
        };
        
        // Reset the limit that was exceeded
        updateData[`${period}_limit`] = null;
        
        // Update device in database
        await supabase
            .from('devices')
            .update(updateData)
            .eq('id', deviceId);
        
        // Update UI elements to show device is off
        const statusElement = document.getElementById('deviceStatus');
        const toggleButton = document.getElementById('powerToggle');
        
        // Update status text and class
        if (statusElement) {
            statusElement.textContent = 'OFF';
            statusElement.className = 'status-off';
        }
        
        // Update power button appearance
        if (toggleButton) {
            toggleButton.className = 'power-button off';
            toggleButton.title = 'Turn On';
        }
        
        // Hide the limit display that was reset
        const limitDisplayElement = document.getElementById(`${period}LimitDisplay`);
        if (limitDisplayElement) {
            limitDisplayElement.style.display = 'none';
        }
        
        // Show popup message about limit being reached
        showPopup(`Device turned off: ${period.charAt(0).toUpperCase() + period.slice(1)} cost limit of ${limit} SAR reached and has been reset`, true);
    }

    // STEP 8: Set up UI Event Handlers
    // Map button IDs to their handler functions
    const elements = {
        'powerToggle': toggleDevicePower,        // Power button
        'deleteDevice': confirmDeleteDevice,      // Delete button
        'confirmDelete': confirmDelete,           // Confirm deletion button
        'cancelDelete': hideDeleteConfirmation,   // Cancel deletion button
        'saveCostLimit': saveCostLimit,          // Save limit button
        'resetLimit': resetLimit,                // Reset limit button
        'saveDeviceSettings': saveDeviceSettings // Save settings button
    };
    
    // Add click event listeners to all buttons
    Object.entries(elements).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener('click', handler);
    });
});