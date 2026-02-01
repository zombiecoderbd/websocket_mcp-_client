#!/bin/bash

echo "Testing Enhanced Cloud Provider and CLI Integration Features"
echo "=========================================================="

# Test 1: Check if providers endpoint works
echo "1. Testing providers endpoint..."
curl -s http://localhost:8000/providers | jq '.success, .total' || echo "Failed to get providers"

# Test 2: Test Google Cloud provider initialization
echo -e "\n2. Testing Google Cloud provider initialization..."
curl -X POST http://localhost:8000/providers/google \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "test-key", "projectId": "test-project"}' | jq '.success, .message' || echo "Failed to initialize Google provider"

# Test 3: Check Google Cloud models
echo -e "\n3. Testing Google Cloud models endpoint..."
curl -s http://localhost:8000/providers/google/models | jq '.success, .total' || echo "Failed to get Google models"

# Test 4: Test model with provider
echo -e "\n4. Testing model testing with provider..."
curl -X POST http://localhost:8000/providers/models/gemini-pro/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "testPrompt": "Hello, world!"}' | jq '.success, .testResult.success' || echo "Failed to test model"

# Test 5: Test message sending
echo -e "\n5. Testing message sending to model..."
curl -X POST http://localhost:8000/providers/models/gemini-pro/message \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "prompt": "What is 2+2?"}' | jq '.success, .response.content' || echo "Failed to send message"

# Test 6: Check performance metrics
echo -e "\n6. Testing performance metrics..."
curl -s http://localhost:8000/providers/models/gemini-pro/performance | jq '.success, .metrics.responseTime' || echo "Failed to get performance metrics"

# Test 7: Test CLI process management
echo -e "\n7. Testing CLI process management..."
curl -X POST http://localhost:8000/providers/models/gemini-pro/start \
  -H "Content-Type: application/json" \
  -d '{"provider": "google"}' | jq '.success, .processInfo' || echo "Failed to start model process"

# Test 8: Check process status
echo -e "\n8. Testing process status..."
curl -s http://localhost:8000/providers/models/gemini-pro/status | jq '.success, .status' || echo "Failed to get process status"

# Test 9: Test dependency installation
echo -e "\n9. Testing dependency installation..."
curl -X POST http://localhost:8000/providers/install/ollama | jq '.success, .message' || echo "Failed to install Ollama"

# Test 10: Verify model installation
echo -e "\n10. Testing model verification..."
curl -s http://localhost:8000/providers/models/gemini-pro/verify | jq '.success, .isInstalled' || echo "Failed to verify model"

echo -e "\nAll tests completed!"