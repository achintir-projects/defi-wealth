#!/usr/bin/env node

// Test script to verify Netlify functions are working
const functions = [
  '/api/health',
  '/api/init-db',
  '/api/wallet?address=0x1234567890123456789012345678901234567890',
  '/api/trending'
];

const baseUrl = 'https://defi-wealth.netlify.app';

console.log('Testing Netlify functions...\n');

functions.forEach(async (endpoint) => {
  try {
    const url = `${baseUrl}${endpoint}`;
    console.log(`Testing: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${data.substring(0, 200)}...\n`);
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }
});