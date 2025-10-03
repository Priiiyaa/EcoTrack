# EcoTrack: Carbon Footprint Tracker 🌍

A comprehensive environmental impact monitoring platform that empowers users to track, analyze, and reduce their carbon footprint through data-driven insights and personalized recommendations.

## Overview

EcoTrack helps individuals make informed decisions about their environmental impact by converting daily activities into measurable carbon emissions. Monitor your transportation choices, energy consumption, and lifestyle patterns while receiving actionable insights to support sustainable living and long-term behavioral change.

## Features

### Core Functionality
- **Activity Logging**: Track daily activities across multiple categories
  - Transportation (car, public transit, flights, cycling)
  - Energy usage (electricity, heating, cooling)
  - Consumption patterns (food, shopping, waste)
- **Carbon Calculation**: Automatic conversion of activities to CO2 equivalent values
- **Visual Reports**: Interactive charts and graphs displaying emission trends
- **Personalized Insights**: Custom recommendations based on your usage patterns
- **Progress Tracking**: Monitor improvements and milestones over time
- **Goal Setting**: Set and track sustainability targets

### User Experience
- **Secure Authentication**: JWT-based user authentication and session management
- **Profile Management**: Customize settings and preferences
- **Data Privacy**: Encrypted storage of personal activity data
- **Multi-device Access**: Track emissions from anywhere
- **File Uploads**: Attach receipts or documentation using Multer

## Tech Stack

### Backend
- **Node.js & Express**: Server framework for RESTful API
- **MongoDB & Mongoose**: Database and ODM for data persistence
- **Pug**: Template engine for server-side rendering
- **Authentication**: JWT tokens with bcryptjs password hashing
- **File Handling**: Multer for file uploads
- **Middleware**: Body-parser for request parsing, cookie-parser for session management

### Architecture
- MVC (Model-View-Controller) design pattern
- RESTful API architecture
- Session-based authentication
- Modular route handling

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm package manager

### Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ecotrack.git
cd ecotrack
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ecotrack
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

4. Start MongoDB:
```bash
# On macOS/Linux
sudo systemctl start mongodb

# On Windows
net start MongoDB
```

5. Run the application:
```bash
npm start
```

6. Access the application:
```
http://localhost:3000
```

