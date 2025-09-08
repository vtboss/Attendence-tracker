# ECE Attendance Tracker

## Google Authentication Setup

To enable Google Authentication in this application, follow these steps:

1. **Create a Google Cloud Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to "APIs & Services" > "Credentials"

2. **Configure OAuth Consent Screen**:
   - Click on "OAuth consent screen" in the left sidebar
   - Select the appropriate user type (External or Internal)
   - Fill in the required information (App name, user support email, etc.)
   - Add the necessary scopes (email, profile)
   - Save and continue

3. **Create OAuth Client ID**:
   - Click on "Credentials" in the left sidebar
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add a name for your client ID
   - Add authorized JavaScript origins: `https://attendence-tracker-ynql.onrender.com`
   - Add authorized redirect URIs if needed
   - Click "Create"
   
   > **Note**: The application is currently hosted at: `https://attendence-tracker-ynql.onrender.com`

4. **Update the Application**:
   - Copy your Client ID from the Google Cloud Console
   - Open `attendance_trackerh.html`
   - Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID in the following section:
   ```html
   <div id="g_id_onload"
       data-client_id="1064570000268-ev09m92e8bihn4knhbsft31ln1o0es1a.apps.googleusercontent.com"
       data-context="signin"
       data-ux_mode="popup"
       data-callback="handleCredentialResponse"
       data-auto_prompt="true">
   </div>
   ```
   
   > **Note**: The current application is configured with Client ID: `1064570000268-ev09m92e8bihn4knhbsft31ln1o0es1a.apps.googleusercontent.com`

5. **Test the Authentication**:
   - Open the application in your browser
   - You should see the Google Sign-In button
   - Click on it and sign in with your Google account
   - After successful authentication, you should be redirected to the main application

## Features

- Google Authentication for secure access
- Semester configuration with start/end dates
- Subject management
- Weekly timetable setup
- Attendance marking and tracking
- Dashboard with attendance statistics
- Data export options (CSV, JSON)

## Data Storage

This application uses browser localStorage to store:
- User authentication data
- Semester information
- Subject list
- Timetable configuration
- Attendance records

Note: Data is stored locally in the browser and is not synchronized across devices.