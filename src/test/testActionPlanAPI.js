// Test script to verify action plan API is working
// Run this in your browser console on your app

async function testActionPlanAPI() {
  const anomalyId = prompt('Enter an anomaly ID to test:', '');
  if (!anomalyId) {
    console.log('No anomaly ID provided. Aborting test.');
    return;
  }
  
  console.log('Testing action plan API with anomaly ID:', anomalyId);
  
  try {
    // First try to fetch with debug info
    const rawResponse = await fetch(`https://zhljmjqhfsvdmgyhbebw.supabase.co/rest/v1/action_plans?select=*&anomaly_id=eq.${anomalyId}`, {
      method: 'GET',
      headers: {
        'apikey': localStorage.getItem('supabase.auth.token')?.split('"')[3] || '',
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')?.split('"')[3] || ''}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Raw response status:', rawResponse.status);
    console.log('Raw response headers:', Object.fromEntries([...rawResponse.headers.entries()]));
    
    if (!rawResponse.ok) {
      console.error('API Error:', rawResponse.status, rawResponse.statusText);
      try {
        const errorText = await rawResponse.text();
        console.error('Error text:', errorText);
      } catch (e) {
        console.error('Could not read error text:', e);
      }
    } else {
      const data = await rawResponse.json();
      console.log('Raw API response:', data);
    }
    
    // Now try through the Supabase client
    const { createClient } = window.supabaseJs;
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://zhljmjqhfsvdmgyhbebw.supabase.co';
    const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase.auth.token')?.split('"')[3];
    
    if (!supabaseAnonKey) {
      console.error('Could not find Supabase anon key');
      return;
    }
    
    console.log('Creating test Supabase client with explicit headers');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }
    });
    
    console.log('Fetching action plan via Supabase client');
    const { data, error } = await supabase
      .from('action_plans')
      .select('*')
      .eq('anomaly_id', anomalyId);
      
    if (error) {
      console.error('Supabase client error:', error);
    } else {
      console.log('Supabase client response:', data);
      if (data.length === 0) {
        console.log('No action plan found for this anomaly ID. Creating test plan...');
        
        // Try to create a test action plan
        const { data: insertData, error: insertError } = await supabase
          .from('action_plans')
          .insert([{
            anomaly_id: anomalyId,
            needs_outage: true,
            priority: 3,
            comments: 'Test action plan created to fix 406 error',
            status: 'draft'
          }])
          .select();
          
        if (insertError) {
          console.error('Could not create test action plan:', insertError);
        } else {
          console.log('Successfully created test action plan:', insertData);
          
          // Now try to fetch it again
          const { data: refetchData, error: refetchError } = await supabase
            .from('action_plans')
            .select('*')
            .eq('anomaly_id', anomalyId);
            
          if (refetchError) {
            console.error('Still getting error after creating plan:', refetchError);
          } else {
            console.log('Successfully fetched newly created plan:', refetchData);
            console.log('API IS WORKING!');
          }
        }
      } else {
        console.log('Found existing action plan. API IS WORKING!');
      }
    }
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

// Run the test
testActionPlanAPI();
