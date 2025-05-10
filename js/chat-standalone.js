// Chat assistant script with real user data integration
// This script fetches actual user data from Supabase for more accurate responses

// Import Supabase client from config
import { supabase } from './config.js';

// User data cache
let userData = null;
let userDevices = null;
let energyUsage = null;
let savingsData = null;

// Conversation history to maintain context
const conversationHistory = [];

// Initialize when the document is fully loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Chat assistant script loaded');
    
    // Try to fetch user data
    try {
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            console.log('No active session. User is not logged in.');
        } else {
            console.log('User authenticated. User ID:', session.user.id);
        
        // Fetch user data in parallel
        const dataPromises = [
            fetchUserProfile(),
            fetchUserDevices(),
            fetchEnergyUsage(),
            fetchSavingsData()
        ];
        
        await Promise.allSettled(dataPromises);
        console.log('User data loaded:', { 
            profile: !!userData, 
            devices: userDevices?.length || 0,
            energyUsage: !!energyUsage,
            savings: !!savingsData
        });
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
    
    // Get DOM elements
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');
    const suggestedQuestions = document.getElementById('suggestedQuestions');
    
    // Check if elements exist
    if (!chatInput || !sendButton || !chatMessages || !suggestedQuestions) {
        console.error('Chat elements not found in standalone script');
        return;
    }
    
    console.log('Chat elements found in standalone script');
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up FAQ accordion if it exists
    setupFaqAccordion();
    
    // Add initial welcome message with personalized data if available
    setTimeout(async () => {
        try {
            // Generate welcome message using Edge Function
            console.log('Generating welcome message via Edge Function');
            
            const welcomeMessage = "Generate a friendly, personalized welcome message. Introduce yourself as the Plug&Save Energy Assistant. Mention you can help with understanding energy usage, saving energy, and answering questions about connected devices.";
            
            // Use Edge Function for the welcome message
            const welcomeResponse = await callChatGPTEdgeFunction(welcomeMessage);
                
                // Add the welcome message to the chat
            addMessageToChat('assistant', welcomeResponse);
                
                // Add to conversation history
            conversationHistory.push({ role: 'assistant', content: welcomeResponse });
                
                // Update suggested questions based on user data
            updateSuggestedQuestions('', welcomeResponse);
            
        } catch (error) {
            console.error('Error generating welcome message with Edge Function:', error);
            
            // Don't show any message if Edge Function fails - wait for user to initiate
            console.log('No fallback message - waiting for user input');
            
            // Update empty suggested questions
            updateSuggestedQuestions('', '');
        }
    }, 500); // Small delay to ensure everything is loaded
    
    /**
     * Fetch with timeout to prevent hanging on slow connections
     * @param {string} url - The URL to fetch
     * @param {object} options - Fetch options
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} - Promise that resolves to fetch response or rejects with timeout
     */
    function fetchWithTimeout(url, options, timeout = 8000) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timed out')), timeout)
            )
        ]);
    }
    
    /**
     * Fetch user profile data from Supabase
     */
    async function fetchUserProfile() {
        try {
            // Get the current user session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                console.error('No active session:', sessionError);
                return null;
            }
            
            // Get the user's profile data with all available fields
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
                
            if (profileError) {
                console.error('Error fetching profile:', profileError);
                return null;
            }
            
            userData = profile;
            return profile;
        } catch (error) {
            console.error('Error in fetchUserProfile:', error);
            return null;
        }
    }
    
    /**
     * Fetch user devices from Supabase
     */
    async function fetchUserDevices() {
        try {
            // Get the current user session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                console.error('No active session:', sessionError);
                return [];
            }
            
            // Get the user's devices with all available fields
            const { data: devices, error: devicesError } = await supabase
                .from('devices')
                .select('*')
                .eq('user_id', session.user.id);
                
            if (devicesError) {
                console.error('Error fetching devices:', devicesError);
                return [];
            }
            
            userDevices = devices || [];
            console.log('Fetched user devices:', userDevices);
            return devices || [];
        } catch (error) {
            console.error('Error in fetchUserDevices:', error);
            return [];
        }
    }
    
    /**
     * Fetch energy usage data from Supabase
     */
    async function fetchEnergyUsage() {
        try {
            // Get the current user session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                console.error('No active session:', sessionError);
                return null;
            }
            
            try {
                // Try to get the user's usage data
            const { data: usageData, error: usageError } = await supabase
                .from('usage_data')
                .select('*')
                .eq('user_id', session.user.id)
                .order('timestamp', { ascending: false })
                .limit(30); // Get last 30 days
                
            if (usageError) {
                console.error('Error fetching usage data:', usageError);
                    // Instead of returning null, return a default structure
                    return {
                        dailyAverage: 0,
                        weeklyAverage: 0,
                        monthlyTotal: 0,
                        peakHour: null,
                        lowestHour: null,
                        hourlyUsage: {}
                    };
                }
                
                // Process usage data if available
            const processedData = processUsageData(usageData || []);
            energyUsage = processedData;
            return processedData;
            } catch (tableError) {
                // Handle table not found error gracefully
                console.warn('Usage data table may not exist:', tableError);
                return {
                    dailyAverage: 0,
                    weeklyAverage: 0,
                    monthlyTotal: 0,
                    peakHour: null,
                    lowestHour: null,
                    hourlyUsage: {}
                };
            }
        } catch (error) {
            console.error('Error in fetchEnergyUsage:', error);
            return {
                dailyAverage: 0,
                weeklyAverage: 0,
                monthlyTotal: 0,
                peakHour: null,
                lowestHour: null,
                hourlyUsage: {}
            };
        }
    }
    
    /**
     * Process raw usage data into useful metrics
     * @param {Array} usageData - Raw usage data from Supabase
     * @returns {Object} Processed usage data
     */
    function processUsageData(usageData) {
        if (!usageData || usageData.length === 0) {
            return {
                dailyAverage: 0,
                weeklyAverage: 0,
                monthlyTotal: 0,
                peakHour: null,
                lowestHour: null
            };
        }
        
        // Calculate daily average
        const dailyUsage = {};
        usageData.forEach(item => {
            const date = new Date(item.timestamp).toDateString();
            if (!dailyUsage[date]) dailyUsage[date] = 0;
            dailyUsage[date] += item.usage_kwh || 0;
        });
        
        const dailyValues = Object.values(dailyUsage);
        const dailyAverage = dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length;
        
        // Calculate weekly average
        const weeklyAverage = dailyAverage * 7;
        
        // Calculate monthly total
        const monthlyTotal = dailyAverage * 30;
        
        // Find peak and lowest hours
        const hourlyUsage = {};
        usageData.forEach(item => {
            const hour = new Date(item.timestamp).getHours();
            if (!hourlyUsage[hour]) hourlyUsage[hour] = 0;
            hourlyUsage[hour] += item.usage_kwh || 0;
        });
        
        let peakHour = 0;
        let peakValue = 0;
        let lowestHour = 0;
        let lowestValue = Infinity;
        
        Object.entries(hourlyUsage).forEach(([hour, value]) => {
            if (value > peakValue) {
                peakHour = parseInt(hour);
                peakValue = value;
            }
            if (value < lowestValue) {
                lowestHour = parseInt(hour);
                lowestValue = value;
            }
        });
        
        return {
            dailyAverage,
            weeklyAverage,
            monthlyTotal,
            peakHour,
            lowestHour,
            hourlyUsage
        };
    }
    
    /**
     * Fetch savings data from Supabase
     */
    async function fetchSavingsData() {
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
            
            const data = {
                totalSavings: profile.total_savings || 0,
                monthlySavings: profile.monthly_savings || 0,
                projectedAnnual
            };
            
            savingsData = data;
            return data;
        } catch (error) {
            console.error('Error in fetchSavingsData:', error);
            return null;
        }
    }
    
    /**
     * Set up event listeners for the chat interface
     */
    function setupEventListeners() {
        // Auto-resize the input field as the user types
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            
            // Enable/disable send button based on input
            if (this.value.trim().length > 0) {
                sendButton.classList.add('active');
            } else {
                sendButton.classList.remove('active');
            }
        });
        
        // Send message when the send button is clicked
        sendButton.addEventListener('click', function() {
            console.log('Send button clicked in standalone script');
            sendMessage();
        });
        
        // Send message when Enter key is pressed (without Shift)
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                console.log('Enter key pressed in standalone script');
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Handle suggested question clicks
        suggestedQuestions.addEventListener('click', function(e) {
            if (e.target.classList.contains('suggested-question')) {
                console.log('Suggested question clicked in standalone script:', e.target.textContent);
                const questionText = e.target.textContent;
                chatInput.value = questionText;
                sendMessage();
            }
        });
    }
    
    /**
     * Send the user's message and get a response from the Edge Function
     */
    async function sendMessage() {
        console.log('==== SEND MESSAGE START ====');
        const message = chatInput.value.trim();
        console.log('Sending message in standalone script:', message);
        
        if (message.length === 0) return;
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Clear input field
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendButton.classList.remove('active');
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            // First check authentication
            console.log('Checking authentication status...');
            
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            console.log('Auth session result:', session ? 'Session found' : 'No session', 'Error:', authError);
            
            if (authError) {
                console.error('Authentication error details:', authError);
                throw new Error(`Authentication error: ${authError.message}`);
            }
            
            if (!session) {
                console.error('No active session found');
                throw new Error('User not authenticated. Please log in to continue.');
            }
            
            console.log('User authenticated successfully. User ID:', session.user.id);

            // Use the Edge Function for response
            console.log('Calling Edge Function for response');
            const response = await callChatGPTEdgeFunction(message);
            
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add AI response to chat
            addMessageToChat('assistant', response);
            
            // Add to conversation history
            conversationHistory.push({ role: 'user', content: message });
            conversationHistory.push({ role: 'assistant', content: response });
            
            // Update suggested questions
            updateSuggestedQuestions(message, response);
            console.log('==== SEND MESSAGE COMPLETE ====');
        } catch (error) {
            console.error('==== ERROR IN SEND MESSAGE ====');
            console.error('Error in sendMessage:', error);
            
            // Remove typing indicator
            removeTypingIndicator();
            
            // Provide a technical error message - no friendly fallbacks
            let errorMsg = `Error: ${error.message}`;
            
            addMessageToChat('assistant', errorMsg);
            conversationHistory.push({ role: 'user', content: message });
            conversationHistory.push({ role: 'assistant', content: errorMsg });
            
            // Update suggested questions
            updateSuggestedQuestions(message, errorMsg);
            console.log('==== SEND MESSAGE ERROR HANDLED ====');
        }
    }
    
    /**
     * Add a message to the chat interface
     * @param {string} sender - 'user' or 'assistant'
     * @param {string} text - The message text
     */
    function addMessageToChat(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        const avatar = document.createElement('div');
        avatar.classList.add('message-avatar');
        
        const icon = document.createElement('i');
        icon.classList.add('fas', sender === 'user' ? 'fa-user' : 'fa-robot');
        avatar.appendChild(icon);
        
        const content = document.createElement('div');
        content.classList.add('message-content');
        
        const messageText = document.createElement('div');
        messageText.classList.add('message-text');
        messageText.textContent = text;
        
        const messageTime = document.createElement('div');
        messageTime.classList.add('message-time');
        const now = new Date();
        messageTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        content.appendChild(messageText);
        content.appendChild(messageTime);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to the bottom of the chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Show typing indicator while waiting for AI response
     */
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'assistant-message', 'typing-indicator');
        typingDiv.id = 'typingIndicator';
        
        const avatar = document.createElement('div');
        avatar.classList.add('message-avatar');
        
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-robot');
        avatar.appendChild(icon);
        
        const content = document.createElement('div');
        content.classList.add('message-content');
        
        // Create typing dots
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.classList.add('typing-dot');
            content.appendChild(dot);
        }
        
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(content);
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Remove typing indicator when AI response is ready
     */
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    /**
     * Call the Supabase Edge Function to get AI response
     * @param {string} message - The user's message
     * @returns {Promise<string>} - The AI response
     */
    async function callChatGPTEdgeFunction(message) {
        try {
            console.log('Calling ChatGPT Edge Function...');
            
            // Get the user's authentication token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            if (!token) {
                throw new Error('Authentication token not available');
            }
            
            // Call the Supabase Edge Function - token will identify the user
            const response = await fetchWithTimeout('https://fzrxktbxjbcmbudiouqa.supabase.co/functions/v1/chat-gpt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: message
                })
            }, 15000); // 15 second timeout for longer API responses
            
            if (!response.ok) {
                throw new Error(`Edge function error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Edge Function response:', data);
            
            // Extract the response from the data
            return data.reply || data.response || "Could not get a response from the AI service.";
        } catch (error) {
            console.error('Error calling ChatGPT Edge Function:', error);
            // Let the error propagate to be handled by the caller
            throw new Error(`Edge function error: ${error.message}`);
        }
    }
    
    /**
     * Update suggested questions based on the conversation context
     * @param {string} lastMessage - The user's last message
     * @param {string} lastResponse - The AI's last response
     */
    function updateSuggestedQuestions(lastMessage, lastResponse) {
        suggestedQuestions.innerHTML = '';
        
        // Always use these general electricity reduction questions
        const generalQuestions = [
            "How can I reduce my electricity bill?",
            "What are the top 5 energy-saving tips?",
            "Which household appliances use the most power?",
            "How to reduce air conditioning costs?",
            "Easy ways to save energy at home",
            "Do smart plugs actually save money?",
            "What's phantom power consumption?",
            "Best time to run appliances to save energy"
        ];
        
        // Select 3 random questions from the general list
        const selectedQuestions = [];
        const questionCount = Math.min(3, generalQuestions.length);
        
        // Ensure we don't select the same question twice
        while (selectedQuestions.length < questionCount) {
            const randomIndex = Math.floor(Math.random() * generalQuestions.length);
            const question = generalQuestions[randomIndex];
            
            if (!selectedQuestions.includes(question)) {
                selectedQuestions.push(question);
            }
        }
        
        // Add the selected questions to the UI
        selectedQuestions.forEach(question => {
            const button = document.createElement('button');
            button.classList.add('suggested-question');
            button.textContent = question;
            suggestedQuestions.appendChild(button);
        });
    }
    
    /**
     * Set up the FAQ accordion functionality
     */
    function setupFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', () => {
                // Toggle active class on the clicked item
                item.classList.toggle('active');
                
                // Close other items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });
            });
        });
    }

    // Expose chat functions to window object for other scripts to use
    window.chatStandalone = {
        sendMessage,
        addMessageToChat,
        showTypingIndicator,
        removeTypingIndicator,
        updateSuggestedQuestions,
        callChatGPTEdgeFunction
    };
});
