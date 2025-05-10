# Plug&Save Application

A web application for monitoring and controlling power consumption of devices.

## Features

- **User Authentication**: Secure login and signup using Supabase authentication
- **Device Management**: Add, edit, and delete devices
- **Power Monitoring**: Track real-time and historical power consumption
- **Cost Calculation**: Automatic electricity rate calculation based on Saudi Electricity Company rates
- **Power Limits**: Set daily or monthly power consumption limits
- **Auto Cutoff**: Automatically turn off devices when they exceed power or cost limits

## Recent Improvements

### Security Enhancements
- Removed hardcoded API keys and moved to environment variables
- Added .gitignore to prevent sensitive information from being committed

### Code Quality
- Reduced code redundancy by creating utility functions
- Improved input validation across the application
- Added popup notifications for better user feedback

### Electricity Rate Calculation
- Implemented automatic electricity rate calculation based on Saudi Electricity Company's tiered pricing
- Rates are calculated based on monthly consumption levels
- Removed manual electricity rate input

### Power Limit Features
- Added ability to set power consumption limits (kW)
- Added ability to specify limit type (daily or monthly)
- Implemented auto cutoff functionality when limits are reached
- Added UI elements to display and manage limits

## Technical Details

### Database Schema

The application uses Supabase as the backend. The main tables are:

- **profiles**: Stores user profile information
- **devices**: Stores device information with the following key fields:
  - `id`: Unique identifier for the device
  - `name`: Device name/nickname
  - `ip_address`: IP address of the device
  - `is_on`: Boolean indicating if the device is powered on
  - `current_consumption`: Current power consumption in watts
  - `daily_usage`: Daily power consumption in kWh
  - `monthly_usage`: Monthly power consumption in kWh
  - `consumption_limit`: Daily cost limit in SAR
  - `power_limit`: Power consumption limit in kW
  - `power_limit_type`: Type of power limit ('daily' or 'monthly')
  - `auto_cutoff`: Boolean indicating if device should automatically turn off when limits are reached

### File Structure

- **css/**: Contains styling files
- **js/**: Contains JavaScript files
  - `config.js`: Supabase configuration
  - `env.js`: Environment variable handling
  - `utils.js`: Utility functions
  - `electricity-rates.js`: Electricity rate calculation
  - `device-details.js`: Device details page functionality
  - `dashboard.js`: Dashboard page functionality
  - Other JS files for various pages

## Getting Started

1. Clone the repository
2. Create a `.env` file with the following variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```
3. Run a local server:
   ```
   npx http-server
   ```
4. Open the application in your browser

## Future Improvements

- Implement a proper build process to inject environment variables
- Add more robust error handling
- Improve mobile responsiveness
- Add data visualization for power consumption trends
