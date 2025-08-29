// Test for financial fields agent
import { financialFieldsAgent } from './financial-fields-agent'

// Simple test to validate agent functionality
async function testAgent() {
  console.log('🧪 Testing Financial Fields Agent...')
  
  try {
    // Test 1: English query
    console.log('\n📊 Test 1: English Query - "Apple profitability"')
    const result1 = await financialFieldsAgent.execute({
      query: 'Apple profitability',
      symbols: ['AAPL']
    })
    console.log('✅ Result:', JSON.stringify(result1, null, 2))
    
    // Test 2: Chinese query
    console.log('\n📊 Test 2: Chinese Query - "营收增长"')
    const result2 = await financialFieldsAgent.execute({
      query: '营收增长',
      context: '分析收入趋势'
    })
    console.log('✅ Result:', JSON.stringify(result2, null, 2))
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Uncomment to run test
testAgent()