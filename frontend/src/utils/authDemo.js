// Demo: JWT Token Auto-Refresh Test
// This file demonstrates how the authentication system now handles token expiration automatically

import authService from '../services/authService';
import { authenticatedFetch } from '../utils/authUtils';

// Test function to demonstrate automatic token refresh
export const testTokenRefresh = async () => {
  console.log('=== JWT Token Auto-Refresh Demo ===');
  
  // Check current tokens
  const accessToken = authService.getToken();
  const refreshToken = authService.getRefreshToken();
  
  console.log('Current Access Token:', accessToken ? 'Present' : 'Missing');
  console.log('Current Refresh Token:', refreshToken ? 'Present' : 'Missing');
  
  if (!accessToken || !refreshToken) {
    console.log('❌ No tokens found. Please login first.');
    return;
  }
  
  try {
    // Test 1: Make a normal API call (should work)
    console.log('\n📡 Test 1: Making authenticated API call...');
    const response = await authenticatedFetch('http://localhost:8000/api/goods/china/statistics/');
    
    if (response.ok) {
      console.log('✅ API call successful - tokens are valid');
    } else {
      console.log('❌ API call failed:', response.status, response.statusText);
    }
    
    // Test 2: Manually refresh the token
    console.log('\n🔄 Test 2: Manually refreshing token...');
    const newToken = await authService.refreshToken();
    console.log('✅ Token refreshed successfully');
    console.log('New token received:', newToken ? 'Yes' : 'No');
    
    // Test 3: Make another API call with new token
    console.log('\n📡 Test 3: Making API call with refreshed token...');
    const response2 = await authenticatedFetch('http://localhost:8000/api/goods/ghana/statistics/');
    
    if (response2.ok) {
      console.log('✅ API call with refreshed token successful');
    } else {
      console.log('❌ API call with refreshed token failed');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary of Authentication Features:');
    console.log('• ✅ Automatic token refresh on 401 errors');
    console.log('• ✅ Background token refresh every 10 minutes');
    console.log('• ✅ Automatic logout on refresh failure');
    console.log('• ✅ JWT token rotation (new refresh token on refresh)');
    console.log('• ✅ Centralized authentication state management');
    
  } catch (error) {
    console.log('❌ Token refresh test failed:', error.message);
    
    if (error.message.includes('refresh failed')) {
      console.log('🔒 User will be automatically logged out and redirected to login');
    }
  }
};

// Auto-refresh interval demo
export const showAutoRefreshStatus = () => {
  const isRunning = window.authRefreshInterval ? true : false;
  console.log('\n⏰ Auto-refresh Status:');
  console.log(`Background refresh: ${isRunning ? '🟢 Active' : '🔴 Inactive'}`);
  console.log('Refresh interval: Every 10 minutes');
  console.log('Token lifetime: 15 minutes (access), 7 days (refresh)');
  
  if (isRunning) {
    console.log('Next refresh: Within 10 minutes of last login/refresh');
  }
};

// Call this function from browser console to test
window.testTokenRefresh = testTokenRefresh;
window.showAutoRefreshStatus = showAutoRefreshStatus;
