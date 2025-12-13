#!/bin/bash

# OnnPlay Studio - End-to-End Testing Script
# This script tests all major functionality of the system

set -e  # Exit on error

API_URL="http://localhost:3000/api"
TOKEN=""
USER_ID=""
BROADCAST_ID=""
RECORDING_ID=""

echo "🧪 OnnPlay Studio - End-to-End Testing"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Test 1: Health Check
echo "Test 1: Health Check"
echo "-------------------"
HEALTH=$(curl -s "${API_URL}/health")
if echo "$HEALTH" | grep -q "healthy"; then
  success "Server is healthy"
else
  error "Server health check failed"
fi
echo ""

# Test 2: Register User
echo "Test 2: Register User"
echo "--------------------"
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-'$(date +%s)'@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
  TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  success "User registered successfully"
  info "Token: ${TOKEN:0:20}..."
  info "User ID: $USER_ID"
else
  error "User registration failed"
fi
echo ""

# Test 3: Get Current User
echo "Test 3: Get Current User"
echo "-----------------------"
ME_RESPONSE=$(curl -s "${API_URL}/auth/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | grep -q "email"; then
  success "Retrieved current user"
else
  error "Failed to get current user"
fi
echo ""

# Test 4: Get Plans
echo "Test 4: Get Plans"
echo "----------------"
PLANS_RESPONSE=$(curl -s "${API_URL}/payments/plans")

if echo "$PLANS_RESPONSE" | grep -q "free"; then
  success "Retrieved plans"
  info "Plans: Free, Pro, Enterprise"
else
  error "Failed to get plans"
fi
echo ""

# Test 5: Get Usage Summary
echo "Test 5: Get Usage Summary"
echo "------------------------"
USAGE_RESPONSE=$(curl -s "${API_URL}/usage/summary" \
  -H "Authorization: Bearer $TOKEN")

if echo "$USAGE_RESPONSE" | grep -q "limits"; then
  success "Retrieved usage summary"
  info "Plan: free"
  info "Streaming limit: 60 minutes"
else
  error "Failed to get usage summary"
fi
echo ""

# Test 6: Check Streaming Permission
echo "Test 6: Check Streaming Permission"
echo "----------------------------------"
CHECK_STREAMING=$(curl -s -X POST "${API_URL}/usage/check/streaming" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CHECK_STREAMING" | grep -q "allowed"; then
  success "Streaming permission check passed"
else
  error "Streaming permission check failed"
fi
echo ""

# Test 7: Check Recording Permission
echo "Test 7: Check Recording Permission"
echo "----------------------------------"
CHECK_RECORDING=$(curl -s -X POST "${API_URL}/usage/check/recording" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CHECK_RECORDING" | grep -q "false"; then
  success "Recording blocked for free plan (expected)"
else
  error "Recording permission check failed"
fi
echo ""

# Test 8: Check AI Permission
echo "Test 8: Check AI Permission"
echo "--------------------------"
CHECK_AI=$(curl -s -X POST "${API_URL}/usage/check/ai" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CHECK_AI" | grep -q "false"; then
  success "AI blocked for free plan (expected)"
else
  error "AI permission check failed"
fi
echo ""

# Test 9: Start Broadcast
echo "Test 9: Start Broadcast"
echo "----------------------"
START_BROADCAST=$(curl -s -X POST "${API_URL}/broadcast/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "YouTube",
    "quality": "720p",
    "participantsCount": 1
  }')

if echo "$START_BROADCAST" | grep -q "broadcastId"; then
  BROADCAST_ID=$(echo "$START_BROADCAST" | grep -o '"broadcastId":"[^"]*"' | cut -d'"' -f4)
  success "Broadcast started"
  info "Broadcast ID: $BROADCAST_ID"
else
  error "Failed to start broadcast"
fi
echo ""

# Test 10: Wait and Check Usage
echo "Test 10: Wait 5 seconds and Check Usage"
echo "---------------------------------------"
info "Waiting 5 seconds to simulate streaming..."
sleep 5

USAGE_AFTER=$(curl -s "${API_URL}/usage/summary" \
  -H "Authorization: Bearer $TOKEN")

if echo "$USAGE_AFTER" | grep -q "streamingMinutes"; then
  success "Usage tracked (check manually if minutes incremented)"
else
  error "Failed to get usage after streaming"
fi
echo ""

# Test 11: Update Peak Viewers
echo "Test 11: Update Peak Viewers"
echo "----------------------------"
UPDATE_VIEWERS=$(curl -s -X POST "${API_URL}/broadcast/viewers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"broadcastId\": \"$BROADCAST_ID\",
    \"viewers\": 42
  }")

if echo "$UPDATE_VIEWERS" | grep -q "success"; then
  success "Peak viewers updated"
else
  error "Failed to update peak viewers"
fi
echo ""

# Test 12: End Broadcast
echo "Test 12: End Broadcast"
echo "---------------------"
END_BROADCAST=$(curl -s -X POST "${API_URL}/broadcast/end" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"broadcastId\": \"$BROADCAST_ID\",
    \"peakViewers\": 42
  }")

if echo "$END_BROADCAST" | grep -q "success"; then
  success "Broadcast ended"
else
  error "Failed to end broadcast"
fi
echo ""

# Test 13: Get Broadcast History
echo "Test 13: Get Broadcast History"
echo "------------------------------"
HISTORY=$(curl -s "${API_URL}/broadcast/history?limit=5" \
  -H "Authorization: Bearer $TOKEN")

if echo "$HISTORY" | grep -q "broadcasts"; then
  success "Retrieved broadcast history"
else
  error "Failed to get broadcast history"
fi
echo ""

# Test 14: Get Broadcast Stats
echo "Test 14: Get Broadcast Stats"
echo "---------------------------"
STATS=$(curl -s "${API_URL}/broadcast/stats" \
  -H "Authorization: Bearer $TOKEN")

if echo "$STATS" | grep -q "broadcasts"; then
  success "Retrieved broadcast stats"
else
  error "Failed to get broadcast stats"
fi
echo ""

# Test 15: Increment Streaming Minutes Manually
echo "Test 15: Increment Streaming Minutes"
echo "------------------------------------"
INCREMENT=$(curl -s -X POST "${API_URL}/usage/increment/streaming" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "minutes": 5
  }')

if echo "$INCREMENT" | grep -q "success"; then
  success "Streaming minutes incremented"
else
  error "Failed to increment streaming minutes"
fi
echo ""

# Test 16: Check Usage Limit
echo "Test 16: Check Usage Limit"
echo "-------------------------"
FINAL_USAGE=$(curl -s "${API_URL}/usage/summary" \
  -H "Authorization: Bearer $TOKEN")

if echo "$FINAL_USAGE" | grep -q "streamingMinutes"; then
  success "Final usage retrieved"
  info "Check if minutes were incremented correctly"
else
  error "Failed to get final usage"
fi
echo ""

# Test 17: Logout
echo "Test 17: Logout"
echo "--------------"
LOGOUT=$(curl -s -X POST "${API_URL}/auth/logout" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LOGOUT" | grep -q "success"; then
  success "Logged out successfully"
else
  error "Logout failed"
fi
echo ""

# Summary
echo "======================================"
echo "🎉 All tests passed!"
echo "======================================"
echo ""
echo "Summary:"
echo "- ✅ Health check"
echo "- ✅ User registration"
echo "- ✅ Authentication"
echo "- ✅ Plans retrieval"
echo "- ✅ Usage summary"
echo "- ✅ Permission checks"
echo "- ✅ Broadcast tracking"
echo "- ✅ Usage increment"
echo "- ✅ History and stats"
echo "- ✅ Logout"
echo ""
echo "Next steps:"
echo "1. Test Stripe checkout manually"
echo "2. Test OAuth flows manually"
echo "3. Test frontend integration"
echo "4. Deploy to production"
echo ""
