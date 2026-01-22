import { createClient } from '@supabase/supabase-js';

// Test Supabase connection
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vuxhfxnsmorvzwcbospl.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

if (!supabaseKey || supabaseKey === 'your_anon_key_here') {
  console.error('❌ Error: Please set VITE_SUPABASE_ANON_KEY in .env file');
  console.log('\nSteps:');
  console.log('1. Go to: https://supabase.com/dashboard/project/vuxhfxnsmorvzwcbospl/settings/api');
  console.log('2. Copy the "anon public" key');
  console.log('3. Update .env file with this key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n🔍 Checking tables...');
    
    // Test leads table
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('count')
      .limit(0);
    
    if (leadsError) {
      console.error('❌ Leads table error:', leadsError.message);
      return false;
    }
    console.log('✅ Leads table accessible');
    
    // Test integrations table
    const { data: integrations, error: intError } = await supabase
      .from('integrations')
      .select('*');
    
    if (intError) {
      console.error('❌ Integrations table error:', intError.message);
      return false;
    }
    console.log('✅ Integrations table accessible');
    console.log('   Found', integrations?.length || 0, 'integrations');
    
    // Test agent_configs table
    const { data: configs, error: configError } = await supabase
      .from('agent_configs')
      .select('*');
    
    if (configError) {
      console.error('❌ Agent configs table error:', configError.message);
      return false;
    }
    console.log('✅ Agent configs table accessible');
    console.log('   Found', configs?.length || 0, 'agent configs');
    
    console.log('\n✨ All tests passed! Supabase is ready to use.');
    return true;
  } catch (err) {
    console.error('❌ Connection test failed:', err);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
