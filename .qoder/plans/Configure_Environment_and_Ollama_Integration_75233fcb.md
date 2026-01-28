# Configure Environment and Ollama Integration Plan

## Objective
Configure the UAS Admin Panel with correct environment variables and proper Ollama integration to make all pages dynamic and functional.

## Current State Analysis
- Ollama is running with qwen2.5:1.5b model on port 11434
- Frontend is running on port 3002 (due to ports 3000, 3001 being in use)
- Backend is running on port 8000
- Database user is 'u-root' with password 'p-105585' and database 'uas_admin'
- Current environment variables need correction

## Tasks to Complete

### 1. Update Backend Environment Variables
- Modify `/home/sahon/admin/server/.env` to use correct database credentials
- Ensure Ollama configuration points to the correct URL and model
- Set proper CORS origin for the frontend

### 2. Update Frontend Environment Variables  
- Modify `/home/sahon/admin/.env.local` to use correct API URL
- Ensure frontend can communicate with backend API

### 3. Verify Ollama Service Integration
- Confirm Ollama service is properly connecting to the running instance
- Test that API endpoints can communicate with Ollama

### 4. Make Pages Dynamic
- Update frontend components to properly fetch and display dynamic data
- Ensure all API proxy routes are working correctly
- Test all dashboard cards and components for dynamic behavior

### 5. Test All Functionality
- Verify all pages load with dynamic data
- Test agent, model, provider, and other specific pages
- Validate Ollama integration works throughout the application

## Implementation Steps

### Step 1: Update Backend Environment
```bash
# In /home/sahon/admin/server/.env
DB_USER=u-root
DB_PASSWORD=p-105585
DB_NAME=uas_admin
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen2.5:1.5b
CORS_ORIGIN=http://localhost:3002  # Since frontend is running on 3002
```

### Step 2: Update Frontend Environment
```bash
# In /home/sahon/admin/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3002
UAS_API_URL=http://localhost:8000
UAS_API_KEY=your_uas_api_key_here
```

### Step 3: Restart Services
- Restart backend server to pick up new environment variables
- Restart frontend to use updated configuration

### Step 4: Verify All Endpoints
- Test all API proxy routes
- Verify dynamic data loading on all pages
- Test Ollama integration functionality