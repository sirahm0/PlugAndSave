// Data service for the chat assistant
// This file handles fetching real user and device data from Supabase

// Initialize Supabase client
const supabaseUrl = 'https://fzrxktbxjbcmbudiouqa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6cnhrdGJ4amJjbWJ1ZGlvdXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODM2NjE4MDYsImV4cCI6MTk5OTIzNzgwNn0.hCjfVhMBcuQNuoy6HVLBjJmvMKTqOqV8q9q9pBcxvOE';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

/**
 * Get the current user's profile data
 * @returns {Promise<Object>} User profile data
 */
async function getUserProfile() {
    try {
        // Get the current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.error('No active session:', sessionError);
            return null;
        }
        
        // Get the user's profile data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return null;
        }
        
        return profile;
    } catch (error) {
        console.error('Error in getUserProfile:', error);
        return null;
    }
}

/**
 * Get the current user's devices
 * @returns {Promise<Array>} Array of user devices
 */
async function getUserDevices() {
    try {
        // Get the current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.error('No active session:', sessionError);
            return [];
        }
        
        // Get the user's devices
        const { data: devices, error: devicesError } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', session.user.id);
            
        if (devicesError) {
            console.error('Error fetching devices:', devicesError);
            return [];
        }
        
        return devices || [];
    } catch (error) {
        console.error('Error in getUserDevices:', error);
        return [];
    }
}

/**
 * Get the user's energy usage data
 * @returns {Promise<Object>} Energy usage data
 */
async function getEnergyUsageData() {
    try {
        // Get the current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.error('No active session:', sessionError);
            return null;
        }
        
        // Get the user's usage data
        const { data: usageData, error: usageError } = await supabase
            .from('usage_data')
            .select('*')
            .eq('user_id', session.user.id)
            .order('timestamp', { ascending: false })
            .limit(30); // Get last 30 days
            
        if (usageError) {
            console.error('Error fetching usage data:', usageError);
            return null;
        }
        
        // Calculate daily, weekly, and monthly averages
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        
        const dailyData = usageData?.filter(item => {
            const itemDate = new Date(item.timestamp);
            return (now - itemDate) < oneDay;
        }) || [];
        
        const weeklyData = usageData?.filter(item => {
            const itemDate = new Date(item.timestamp);
            return (now - itemDate) < oneWeek;
        }) || [];
        
        const monthlyData = usageData || [];
        
        // Calculate averages
        const dailyAverage = dailyData.reduce((sum, item) => sum + item.usage_kwh, 0);
        const weeklyAverage = weeklyData.reduce((sum, item) => sum + item.usage_kwh, 0) / 7;
        const monthlyAverage = monthlyData.reduce((sum, item) => sum + item.usage_kwh, 0) / 30;
        
        return {
            dailyAverage,
            weeklyAverage,
            monthlyAverage,
            usageData
        };
    } catch (error) {
        console.error('Error in getEnergyUsageData:', error);
        return null;
    }
}

/**
 * Get the user's savings data
 * @returns {Promise<Object>} Savings data
 */
async function getSavingsData() {
    try {
        // Get the current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.error('No active session:', sessionError);
            return null;
        }
        
        // Get the user's profile for savings data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('total_savings, monthly_savings')
            .eq('id', session.user.id)
            .single();
            
        if (profileError) {
            console.error('Error fetching savings data:', profileError);
            return null;
        }
        
        // Calculate projected annual savings
        const projectedAnnual = (profile.monthly_savings || 0) * 12;
        
        return {
            totalSavings: profile.total_savings || 0,
            monthlySavings: profile.monthly_savings || 0,
            projectedAnnual
        };
    } catch (error) {
        console.error('Error in getSavingsData:', error);
        return null;
    }
}

// Export all functions
export {
    getUserProfile,
    getUserDevices,
    getEnergyUsageData,
    getSavingsData
};
