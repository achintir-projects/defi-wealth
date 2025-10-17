#!/usr/bin/env node

// Test script to debug token injection issues
const fetch = require('node-fetch');

async function testTokenInjection() {
  console.log('🧪 Testing Token Injection System...\n');

  // Test wallet address
  const testWallet = '0x1234567890123456789012345678901234567890';
  
  try {
    // Step 1: Check current wallet balance
    console.log('1️⃣ Checking current wallet balance...');
    const walletResponse = await fetch(`http://localhost:3000/api/wallet?address=${testWallet}`);
    const walletData = await walletResponse.json();
    
    console.log('Current wallet data:', JSON.stringify(walletData, null, 2));
    
    // Step 2: Perform token injection
    console.log('\n2️⃣ Performing token injection...');
    const injectionPayload = {
      walletAddress: testWallet,
      tokenSymbol: 'BTC',
      amount: 1.5,
      message: 'Test injection'
    };
    
    const injectionResponse = await fetch('http://localhost:3000/api/admin/inject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': 'admin-user-id'
      },
      body: JSON.stringify(injectionPayload)
    });
    
    const injectionResult = await injectionResponse.json();
    console.log('Injection result:', JSON.stringify(injectionResult, null, 2));
    
    if (injectionResponse.ok) {
      console.log('\n✅ Injection successful!');
      
      // Step 3: Check wallet balance after injection
      console.log('\n3️⃣ Checking wallet balance after injection...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DB to update
      
      const updatedWalletResponse = await fetch(`http://localhost:3000/api/wallet?address=${testWallet}`);
      const updatedWalletData = await updatedWalletResponse.json();
      
      console.log('Updated wallet data:', JSON.stringify(updatedWalletData, null, 2));
      
      // Compare before and after
      const beforeBtc = walletData.tokens?.find(t => t.symbol === 'BTC')?.balance || 0;
      const afterBtc = updatedWalletData.tokens?.find(t => t.symbol === 'BTC')?.balance || 0;
      
      console.log('\n📊 Comparison:');
      console.log(`Before injection: ${beforeBtc} BTC`);
      console.log(`After injection: ${afterBtc} BTC`);
      console.log(`Expected increase: 1.5 BTC`);
      console.log(`Actual increase: ${afterBtc - beforeBtc} BTC`);
      
      if (afterBtc - beforeBtc === 1.5) {
        console.log('\n✅ Token injection working correctly!');
      } else {
        console.log('\n❌ Token injection NOT working correctly!');
      }
    } else {
      console.log('\n❌ Injection failed:', injectionResult);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testTokenInjection();