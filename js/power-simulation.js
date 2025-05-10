// Power Consumption Simulation
import { supabase } from './config.js';

// Simulation settings
const SIMULATION_INTERVAL = 2000; // Update every 2 seconds 
let SIMULATION_ENABLED = true;   // Global toggle for simulation
let simulationRunning = false;   // Flag to prevent multiple simulation loops

// Consumption rates per device type (in kW per hour)
// These represent typical values for each type of device
const CONSUMPTION_RATES = {
    'default': { min: 0.05, max: 0.2 },
    'tv': { min: 0.1, max: 0.3 },
    'refrigerator': { min: 0.05, max: 0.15 },
    'air conditioner': { min: 0.8, max: 1.5 },
    'computer': { min: 0.1, max: 0.4 },
    'lamp': { min: 0.01, max: 0.06 },
    'washing machine': { min: 0.4, max: 0.8 },
    'heater': { min: 1.0, max: 2.0 },
    'water heater': { min: 1.0, max: 1.5 },
    'fan': { min: 0.03, max: 0.07 },
    'kitchen': { min: 0.2, max: 0.5 }
};

/**
 * Analyzes a device name and determines its type based on keywords
 * @param {string} deviceName - The name of the device to analyze
 * @returns {string} - The determined device type or 'default' if no match
 */
function determineDeviceType(deviceName) {
    // Convert device name to lowercase for case-insensitive matching
    const nameLower = deviceName.toLowerCase();
    
    // Iterate through all device types in CONSUMPTION_RATES
    for (const type in CONSUMPTION_RATES) {
        // Skip the default type in the matching process
        if (type !== 'default' && nameLower.includes(type)) {
            return type; // Return matched device type
        }
    }
    
    // Return 'default' if no specific type is matched
    return 'default';
}

/**
 * Generates a random power consumption value for a device
 * @param {string} deviceName - Name of the device to generate consumption for
 * @returns {number} - Generated consumption value rounded to 3 decimal places
 */
function generateConsumptionValue(deviceName) {
    // Get the device type and its consumption range
    const deviceType = determineDeviceType(deviceName);
    const { min, max } = CONSUMPTION_RATES[deviceType] || CONSUMPTION_RATES.default;
    
    // Calculate base hourly consumption rate within device's range
    const baseHourlyRate = min + Math.random() * (max - min);
    
    // Add randomness factor (±20%) to simulate real-world variations
    const randomFactor = 0.8 + (Math.random() * 0.4);
    
    // Convert hourly rate to interval rate and scale for visibility
    const intervalRate = (baseHourlyRate * randomFactor) / (3600 * 1000 / SIMULATION_INTERVAL) * 50;
    
    // Round to 3 decimal places for consistent precision
    return Math.round(intervalRate * 1000) / 1000;
}

/**
 * Updates the power consumption data for a single device
 * @param {Object} device - The device object to update
 */
async function updateDeviceConsumption(device) {
    // Log the update operation start
    console.log(`Updating device ${device.name} (ID: ${device.id}), power status: ${device.power_status}`);
    
    // Skip update if device is powered off
    if (!device.power_status) {
        console.log(`Device ${device.name} is OFF, skipping consumption update`);
        return;
    }
    try {
        // Variable to store the consumption increment
        let consumptionIncrement;   
        // Check if device is new (has minimal usage history)
        const isNewDevice = (device.daily_usage || 0) < 0.01 && (device.monthly_usage || 0) < 0.01;
        if (isNewDevice) {
            // Initialize new device with smaller, visible consumption
            const deviceType = determineDeviceType(device.name);
            const { min } = CONSUMPTION_RATES[deviceType] || CONSUMPTION_RATES.default;
            // Calculate initial consumption for new device
            consumptionIncrement = (min * (0.15 + Math.random() * 0.05)) / (3600 * 1000 / SIMULATION_INTERVAL) * 5;
            console.log(`New device detected (${device.name}): Starting with initial consumption`);
        } else {
            // Generate normal consumption for existing devices
            consumptionIncrement = generateConsumptionValue(device.name);
        }
        // Round increment to 3 decimal places
        consumptionIncrement = Math.round(consumptionIncrement * 1000) / 1000;
        // Calculate realistic current consumption based on device type
        const deviceType = determineDeviceType(device.name);
        const { min, max } = CONSUMPTION_RATES[deviceType] || CONSUMPTION_RATES.default;
        // Set current consumption based on device status (new vs. established)
        let currentConsumption;
        if (isNewDevice) {
            // New devices use 20-40% of their range
            currentConsumption = min + (max - min) * (0.2 + Math.random() * 0.2);
        } else {
            // Established devices use 40-80% of their range
            currentConsumption = min + (max - min) * (0.4 + Math.random() * 0.4);
        }
        // Round current consumption for UI display
        currentConsumption = Math.round(currentConsumption * 100) / 100;
        // Calculate new usage totals, ensuring values are numeric
        const dailyUsage = typeof device.daily_usage === 'number' ? device.daily_usage : 0;
        const monthlyUsage = typeof device.monthly_usage === 'number' ? device.monthly_usage : 0;
        // Add increment to totals
        const newDailyTotal = dailyUsage + consumptionIncrement;
        const newMonthlyTotal = monthlyUsage + consumptionIncrement;
        // Update device data in Supabase database
        const { error } = await supabase
            .from('devices')
            .update({
                current_consumption: currentConsumption, // Current power draw
                daily_usage: newDailyTotal,             // Accumulated daily usage
                monthly_usage: newMonthlyTotal,         // Accumulated monthly usage
                updated_at: new Date().toISOString()    // Update timestamp
            })
            .eq('id', device.id);
        // Handle database update results
        if (error) {
            console.error('Error updating device consumption:', error);
        } else {
            // Log successful update
            console.log(`Updated ${device.name}: Current: ${currentConsumption.toFixed(2)} kW, +${consumptionIncrement.toFixed(3)} 
            kW (Daily: ${newDailyTotal.toFixed(3)}, Monthly: ${newMonthlyTotal.toFixed(3)})`);
            // Refresh device details page if currently viewing this device
            if (window.location.pathname.includes('device-details.html') && 
                window.location.search.includes(device.id)) {
                if (typeof window.loadDeviceDetails === 'function') {
                    window.loadDeviceDetails();
                }
            }
        }
    } catch (error) {
        console.error('Error in consumption simulation:', error);
    }
}

/**
 * Main simulation function that updates all devices
 * Runs periodically based on SIMULATION_INTERVAL
 */
async function simulateConsumption() {
    // Skip if simulation is disabled or already running
    if (!SIMULATION_ENABLED || simulationRunning) return;
    // Set running flag to prevent concurrent simulations
    simulationRunning = true;
    try {
        console.log("Running consumption simulation cycle...");
        // Get current user session
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
            console.log("No active session, skipping simulation");
            return;
        }
        // Extract user information
        const user = sessionData.session.user;
        // Fetch all devices for current user
        const { data: devices, error } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', user.id);
        // Handle database errors
        if (error) {
            console.error('Error fetching devices:', error);
            return;
        }
        // Skip if no devices found
        if (!devices || devices.length === 0) {
            console.log("No devices found for simulation");
            return;
        }
        console.log(`Simulating consumption for ${devices.length} devices`);
        // Update each device's consumption
        for (const device of devices) {
            await updateDeviceConsumption(device);
        }
    } catch (error) {
        console.error('Error in consumption simulation:', error);
    } finally {
        // Reset running flag
        simulationRunning = false;
        
        // Schedule next simulation cycle if enabled
        if (SIMULATION_ENABLED) {
            setTimeout(simulateConsumption, SIMULATION_INTERVAL);
        }
    }
}

/**
 * Initializes the power consumption simulation
 */
function initSimulation() {
    // Display simulation mode indicator
    console.log('%c⚡ SIMULATION MODE ⚡ - Power consumption is being simulated', 
        'background: #FFC107; color: #000; padding: 4px; border-radius: 4px; font-weight: bold');
    
    // Start first simulation cycle
    simulateConsumption();
}

// Start simulation when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Starting power consumption simulation...');
    
    // Initialize simulation after brief delay
    setTimeout(initSimulation, 2000);
});

// Export simulation controls to global scope
window.PowerSimulation = {
    // Start the simulation
    start: () => {
        if (!SIMULATION_ENABLED) {
            SIMULATION_ENABLED = true;
            simulateConsumption();
            console.log('Simulation started');
            return "Simulation started";
        }
        return "Simulation already running";
    },
    // Stop the simulation
    stop: () => {
        SIMULATION_ENABLED = false;
        console.log('Simulation stopped');
        return "Simulation stopped";
    },
    // Get current simulation status
    getStatus: () => ({ 
        enabled: SIMULATION_ENABLED, 
        running: simulationRunning,
        interval: SIMULATION_INTERVAL
    }),
    // Force an immediate update
    forceUpdate: async () => {
        // Get UI elements
        const updateIcon = document.getElementById('updateIcon');
        const updateBtn = document.getElementById('updateUsageBtn');
        
        // Add spinning animation to update button
        if (updateIcon && updateBtn) {
            updateIcon.classList.add('icon-spin');
            updateBtn.disabled = true;
        }
        
        // Execute simulation if not already running
        if (!simulationRunning) {
            await simulateConsumption();
            
            // Update dashboard if currently viewing it
            if (window.location.pathname.includes('dashboard.html')) {
                // Fetch current user session
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData.session) {
                    const user = sessionData.session.user;
                    // Refresh devices list on dashboard
                    if (typeof window.loadDevices === 'function') {
                        window.loadDevices(user.id);
                    }
                }
            }
            
            // Reset UI elements after update
            if (updateIcon && updateBtn) {
                updateIcon.classList.remove('icon-spin');
                updateBtn.disabled = false;
            }
            
            return "Forced update initiated";
        }
        
        // Reset UI if simulation was already running
        if (updateIcon && updateBtn) {
            updateIcon.classList.remove('icon-spin');
            updateBtn.disabled = false;
        }
        
        return "Simulation already in progress";
    }
};

// Export main simulation function for use in other modules
export { simulateConsumption };
