// Supabase Edge Function for Chat GPT integration
// This function handles chat requests from the Plug&Save energy monitoring application

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers to allow browser requests from all origins
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Initialize Supabase client for database access
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Extract message and token from request
    const { message } = await req.json();
    
    // Get authorization header for authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { headers: corsHeaders, status: 401 }
      );
    }
    
    // Extract token from Authorization header
    const token = authHeader.replace("Bearer ", "");
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: corsHeaders, status: 401 }
      );
    }
    
    // Fetch user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, created_at, total_savings, monthly_savings')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }
    
    // Fetch user devices
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id);
      
    if (devicesError) {
      console.error("Error fetching devices:", devicesError);
    }
    
    // Process device data for context
    const userName = profile?.full_name || user.email || "User";
    
    // Sort devices by monthly usage to find top consumers
    const sortedDevices = devices ? 
      [...devices].sort((a, b) => (b.monthly_usage || 0) - (a.monthly_usage || 0)) : 
      [];
    
    // Get top 3 devices for context
    const topDevices = sortedDevices.slice(0, 3).map(device => ({
      name: device.name,
      usage: `${device.monthly_usage || 0} kWh/month`,
      type: device.type || device.device_type || "Unknown",
      location: device.location || "Unknown"
    }));
    
    // Find if any device has weekly limit set
    const deviceWithWeeklyLimit = sortedDevices.find(d => d.weekly_limit);
    const weeklyLimit = deviceWithWeeklyLimit ? 
      `${deviceWithWeeklyLimit.weekly_limit} kWh` : 
      "not set";
    
    // Calculate total energy usage stats
    const totalDevices = sortedDevices.length;
    const activeDevices = sortedDevices.filter(d => d.power_status).length;
    const totalMonthlyUsage = sortedDevices.reduce((sum, device) => 
      sum + (device.monthly_usage || 0), 0).toFixed(2);
    
    // Generate device list for context
    const deviceList = topDevices.length > 0
      ? topDevices.map((d) => `- ${d.name} (${d.type}): ${d.usage} in ${d.location}`).join("\n")
      : "No device data available.";

    // Calculate savings data
    const totalSavings = profile?.total_savings || 0;
    const monthlySavings = profile?.monthly_savings || 0;
    const annualSavings = monthlySavings * 12;

    // Create enhanced system prompt with rich user data
    const systemPrompt = `
You are a smart assistant for the Plug&Save app.
Help the user manage their electricity consumption and give personalized tips.

USER INFORMATION:
- Name: ${userName}
- Member since: ${profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "Unknown"}
- Weekly Energy Limit: ${weeklyLimit}
- Total Devices: ${totalDevices}
- Active Devices: ${activeDevices}
- Total Monthly Usage: ${totalMonthlyUsage} kWh
- Monthly Savings: ${monthlySavings} SAR
- Total Savings: ${totalSavings} SAR
- Annual Projected Savings: ${annualSavings} SAR

TOP CONSUMING DEVICES:
${deviceList}

Always give clear, practical answers based on the above data.
Use the user's name and reference specific devices when relevant.
Keep responses concise and action-oriented.
    `.trim();

    // Send message to OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    // Handle OpenAI errors directly - no fallbacks
    if (!openaiRes.ok) {
      const errorData = await openaiRes.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData.error || errorData)}`);
    }

    const data = await openaiRes.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI");
    }

    const reply = data.choices[0].message.content;

    // Save conversation to database
    try {
      const { error: saveError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          user_message: message,
          ai_response: reply,
          created_at: new Date().toISOString()
        });
        
      if (saveError) {
        console.error("Error saving conversation:", saveError);
      }
    } catch (logError) {
      console.error("Error logging conversation:", logError);
    }

    return new Response(JSON.stringify({ reply }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error("Error in Edge Function:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
