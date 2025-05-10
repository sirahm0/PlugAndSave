import { supabase } from './supabase-client.js';
import { checkAuth, redirectToLogin } from './auth.js';
import { formatCurrency, formatEnergy } from './utils.js';

// Initialize chat functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Wait for chat-standalone.js to initialize
    console.log('Checking for chat-standalone functions...');
    const maxWaitTime = 2000; // 2 seconds max wait time
    const startTime = Date.now();
    
    // Wait for chat-standalone functions to be available
    while (!window.chatStandalone && (Date.now() - startTime < maxWaitTime)) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (window.chatStandalone) {
        console.log('chat-standalone functions found, using them');
    } else {
        console.warn('chat-standalone functions not found after waiting');
    }
    
    // Check if user is authenticated
    const user = await checkAuth();
    if (!user) {
        redirectToLogin();
        return;
    }

    // Initialize the chat interface
    initChatInterface();
    
    // Set up the FAQ accordion functionality
    setupFaqAccordion();
    
    // Load user data to personalize the chat experience
    loadUserData(user.id);

    // Listen for the custom sendMessage event from the direct script
    document.addEventListener('sendMessage', function(e) {
        console.log('Custom sendMessage event received:', e.detail.message);
        const message = e.detail.message;
        
        // Use chat-standalone functions if available
        if (window.chatStandalone) {
            window.chatStandalone.sendMessage(message);
        } else {
            // Add user message to chat
            addMessageToChat('user', message);
            
            // Show typing indicator
            showTypingIndicator();
            
            // Process the message and get AI response
            processMessage(message);
        }
    });

    // Debug log to check initialization
    console.log('Chat assistant initialized successfully');
});

// Global variables for chat elements
let chatInput;
let sendButton;
let chatMessages;
let suggestedQuestions;

/**
 * Initialize the chat interface and event listeners
 */
function initChatInterface() {
    // Get DOM elements
    chatInput = document.getElementById('chatInput');
    sendButton = document.getElementById('sendMessage');
    chatMessages = document.getElementById('chatMessages');
    suggestedQuestions = document.getElementById('suggestedQuestions');
    
    // Check if elements exist
    if (!chatInput || !sendButton || !chatMessages || !suggestedQuestions) {
        console.error('Chat elements not found:', { 
            chatInput: !!chatInput, 
            sendButton: !!sendButton, 
            chatMessages: !!chatMessages, 
            suggestedQuestions: !!suggestedQuestions 
        });
        return;
    }
    
    console.log('Chat elements initialized successfully');
    
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
        console.log('Send button clicked');
        sendMessage();
    });
    
    // Send message when Enter key is pressed (without Shift)
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            console.log('Enter key pressed');
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Handle suggested question clicks
    suggestedQuestions.addEventListener('click', function(e) {
        if (e.target.classList.contains('suggested-question')) {
            console.log('Suggested question clicked:', e.target.textContent);
            const questionText = e.target.textContent;
            chatInput.value = questionText;
            sendMessage();
        }
    });
}

/**
 * Send the user's message and get a response
 */
function sendMessage() {
    if (!chatInput) {
        console.error('Chat input element not found');
        return;
    }
    
    const message = chatInput.value.trim();
    console.log('Sending message:', message);
    
    if (message.length === 0) return;
    
    // Use chat-standalone functions if available
    if (window.chatStandalone) {
        console.log('Using chat-standalone.sendMessage');
        
        // Clear input field in this script first
        chatInput.value = '';
        chatInput.style.height = 'auto';
        if (sendButton) sendButton.classList.remove('active');
        
        // Use the external function for the rest
        window.chatStandalone.sendMessage(message);
        return;
    }
    
    // If standalone functions aren't available, use local implementation
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Clear input field
    chatInput.value = '';
    chatInput.style.height = 'auto';
    if (sendButton) sendButton.classList.remove('active');
    
    // Show typing indicator
    showTypingIndicator();
    
    // Process the message and get AI response
    processMessage(message);
}

/**
 * Add a message to the chat interface
 * @param {string} sender - 'user' or 'assistant'
 * @param {string} text - The message text
 */
function addMessageToChat(sender, text) {
    const chatMessages = document.getElementById('chatMessages');
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
    const chatMessages = document.getElementById('chatMessages');
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
 * Process the user's message and generate an AI response
 * @param {string} message - The user's message
 */
async function processMessage(message) {
    try {
        console.log('Processing message:', message);
        
        // Get user data and device information for context
        const userData = await getUserData();
        const deviceData = await getDeviceData();
        
        // Prepare context for the AI
        const context = {
            user: userData ? {
                name: userData.first_name || 'User',
                email: userData.email,
                total_savings: userData.total_savings || 0
            } : null,
            devices: deviceData ? deviceData.map(device => ({
                name: device.name,
                type: device.type,
                monthly_usage: device.monthly_usage || 0,
                status: device.status || 'active'
            })) : [],
            total_devices: deviceData ? deviceData.length : 0,
            active_devices: deviceData ? deviceData.filter(d => d.status === 'active').length : 0,
            total_monthly_usage: deviceData ? deviceData.reduce((sum, device) => sum + (device.monthly_usage || 0), 0) : 0
        };
        
        // Try to call the Edge Function first
        let response;
        try {
            console.log('Calling Edge Function...');
            response = await callChatGPTFunction(message, context);
            console.log('Edge Function response received');
        } catch (apiError) {
            console.error('Edge Function error:', apiError);
            // Fall back to local response generation if API call fails
            console.log('Falling back to local response generation');
            response = generateResponse(message, userData, deviceData);
        }
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add AI response to chat
        addMessageToChat('assistant', response);
        
        // Save conversation to database for future reference
        try {
            await saveConversation(message, response);
        } catch (saveError) {
            console.error('Error saving conversation:', saveError);
            // Continue even if saving fails
        }
        
        // Update suggested questions based on the conversation
        updateSuggestedQuestions(message, response);
        
    } catch (error) {
        console.error('Error processing message:', error);
        removeTypingIndicator();
        addMessageToChat('assistant', 'Sorry, I encountered an error while processing your request. Please try again later.');
    }
}

/**
 * Call the Supabase Edge Function to get AI response
 * @param {string} message - The user's message
 * @param {object} context - Context information about the user and devices
 * @returns {Promise<string>} - The AI response
 */
async function callChatGPTFunction(message, context) {
    try {
        // Get the user's authentication token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) {
            throw new Error('Authentication token not available');
        }
        
        // Call the Supabase Edge Function
        const response = await fetch('https://fzrxktbxjbcmbudiouqa.supabase.co/functions/v1/chat-gpt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: message,
                context: context
            })
        });
        
        if (!response.ok) {
            throw new Error(`Edge function error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response || 'Sorry, I couldn\'t generate a response at this time.';
    } catch (error) {
        console.error('Error calling ChatGPT function:', error);
        return 'I\'m having trouble connecting to my AI service. Please try again later.';
    }
}

/**
 * Generate AI response based on user message and context
 * @param {string} message - The user's message
 * @param {object} userData - User profile data
 * @param {array} deviceData - User's device data
 * @returns {string} - The AI response
 */
function generateResponse(message, userData, deviceData) {
    // Convert message to lowercase for easier matching
    const lowerMessage = message.toLowerCase();
    
    // Check for greetings
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage === 'hey') {
        return `Hello ${userData?.first_name || 'there'}! How can I help you with your energy management today?`;
    }
    
    // Check for questions about energy usage
    if (lowerMessage.includes('energy usage') || lowerMessage.includes('power usage') || lowerMessage.includes('how much energy')) {
        if (deviceData && deviceData.length > 0) {
            const totalUsage = deviceData.reduce((sum, device) => sum + (device.monthly_usage || 0), 0);
            return `Based on your connected devices, your estimated monthly energy usage is ${formatEnergy(totalUsage)}. This is calculated from the usage patterns of your ${deviceData.length} connected devices.`;
        } else {
            return "I don't see any devices connected to your account yet. To get insights about your energy usage, please add your devices from the 'Add Device' page.";
        }
    }
    
    // Check for questions about saving energy
    if (lowerMessage.includes('save energy') || lowerMessage.includes('reduce usage') || lowerMessage.includes('energy saving') || lowerMessage.includes('reduce my energy bill')) {
        return "Here are some tips to save energy:\n\n1. Unplug devices when not in use to avoid phantom power draw\n2. Use smart power strips for electronics\n3. Switch to LED lighting\n4. Set your thermostat to optimal temperatures\n5. Run full loads in dishwashers and washing machines\n\nWould you like more specific recommendations based on your devices?";
    }
    
    // Check for questions about highest energy device
    if (lowerMessage.includes('most energy') || lowerMessage.includes('highest usage') || lowerMessage.includes('which device uses')) {
        if (deviceData && deviceData.length > 0) {
            // Sort devices by usage and get the highest
            const sortedDevices = [...deviceData].sort((a, b) => (b.monthly_usage || 0) - (a.monthly_usage || 0));
            const highestDevice = sortedDevices[0];
            
            return `Your ${highestDevice.name} uses the most energy at approximately ${formatEnergy(highestDevice.monthly_usage)} per month. This accounts for about ${Math.round((highestDevice.monthly_usage / sortedDevices.reduce((sum, device) => sum + (device.monthly_usage || 0), 0)) * 100)}% of your total energy usage.`;
        } else {
            return "I don't have any device data to analyze yet. Please add your devices from the 'Add Device' page to get insights about energy usage.";
        }
    }
    
    // Check for questions about savings
    if (lowerMessage.includes('savings') || lowerMessage.includes('saved') || lowerMessage.includes('save money')) {
        if (userData && userData.total_savings) {
            return `Based on your optimized device usage, you've saved approximately ${formatCurrency(userData.total_savings)} so far. You can view more detailed savings information in the Reports section.`;
        } else {
            return "I don't have enough data yet to calculate your savings. As you continue to use Plug&Save and optimize your device usage, I'll be able to provide you with savings estimates.";
        }
    }
    
    // Default response if no specific pattern is matched
    return "I'm here to help you understand your energy usage and save money. You can ask me about your devices, energy consumption, or ways to reduce your electricity bill. Is there something specific you'd like to know?";
}

/**
 * Load user data for personalized responses
 * @param {string} userId - The user's ID
 */
async function loadUserData(userId) {
    try {
        // Fetch user profile data
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (profileError) throw profileError;
        
        // Store user data in session storage for quick access
        sessionStorage.setItem('chatUserData', JSON.stringify(profileData));
        
        // Fetch user devices
        const { data: deviceData, error: deviceError } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', userId);
            
        if (deviceError) throw deviceError;
        
        // Store device data in session storage
        sessionStorage.setItem('chatDeviceData', JSON.stringify(deviceData));
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

/**
 * Get user data from session storage or database
 * @returns {object} - User profile data
 */
async function getUserData() {
    // Try to get from session storage first
    const cachedData = sessionStorage.getItem('chatUserData');
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    
    // If not in session storage, fetch from database
    try {
        const user = await checkAuth();
        if (!user) return null;
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (error) throw error;
        
        // Cache for future use
        sessionStorage.setItem('chatUserData', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

/**
 * Get device data from session storage or database
 * @returns {array} - Array of user devices
 */
async function getDeviceData() {
    // Try to get from session storage first
    const cachedData = sessionStorage.getItem('chatDeviceData');
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    
    // If not in session storage, fetch from database
    try {
        const user = await checkAuth();
        if (!user) return [];
        
        const { data, error } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', user.id);
            
        if (error) throw error;
        
        // Cache for future use
        sessionStorage.setItem('chatDeviceData', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Error fetching device data:', error);
        return [];
    }
}

/**
 * Save conversation to the database
 * @param {string} userMessage - The user's message
 * @param {string} aiResponse - The AI response
 */
async function saveConversation(userMessage, aiResponse) {
    try {
        const user = await checkAuth();
        if (!user) return;
        
        const { error } = await supabase
            .from('chat_conversations')
            .insert([
                {
                    user_id: user.id,
                    user_message: userMessage,
                    ai_response: aiResponse,
                    timestamp: new Date().toISOString()
                }
            ]);
            
        if (error) throw error;
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

/**
 * Update suggested questions based on the conversation context
 * @param {string} lastMessage - The user's last message
 * @param {string} lastResponse - The AI's last response
 */
function updateSuggestedQuestions(lastMessage, lastResponse) {
    const suggestedQuestions = document.getElementById('suggestedQuestions');
    suggestedQuestions.innerHTML = '';
    
    // Define new suggested questions based on conversation context
    let newQuestions = [];
    
    const lowerMessage = lastMessage.toLowerCase();
    const lowerResponse = lastResponse.toLowerCase();
    
    // If talking about energy usage, suggest related questions
    if (lowerMessage.includes('energy usage') || lowerResponse.includes('energy usage')) {
        newQuestions = [
            "How can I reduce my energy usage?",
            "What time of day is my usage highest?",
            "Compare my usage to last month"
        ];
    } 
    // If talking about devices, suggest device-related questions
    else if (lowerMessage.includes('device') || lowerResponse.includes('device')) {
        newQuestions = [
            "Which device should I upgrade first?",
            "How to optimize my device schedule?",
            "Add a new device"
        ];
    }
    // If talking about savings, suggest savings-related questions
    else if (lowerMessage.includes('save') || lowerMessage.includes('saving') || lowerResponse.includes('save')) {
        newQuestions = [
            "Show my potential savings",
            "Best energy-saving tips",
            "Energy-efficient device recommendations"
        ];
    }
    // Default questions if no specific context
    else {
        newQuestions = [
            "How can I reduce my energy bill?",
            "Which device uses the most energy?",
            "Show my energy usage trends"
        ];
    }
    
    // Add the new suggested questions to the UI
    newQuestions.forEach(question => {
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
