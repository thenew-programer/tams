// Action Plan API Diagnostic Tool
// Copy and paste this code into your browser console to diagnose and fix action plan API issues

const actionPlanDiagnosticTool = {
  // Configuration
  config: {
    debug: true,
    fixHeaders: true,
    testCreate: true,
    testFetch: true,
  },
  
  // Log with prefix
  log: function(message, data) {
    console.log(`[ACTION PLAN DIAGNOSTIC]: ${message}`, data || '');
  },
  
  // Error logging
  error: function(message, error) {
    console.error(`[ACTION PLAN DIAGNOSTIC ERROR]: ${message}`, error || '');
  },
  
  // Get auth token
  getAuthToken: function() {
    try {
      // Try to get from localStorage
      const supabaseAuthData = JSON.parse(localStorage.getItem('sb-zhljmjqhfsvdmgyhbebw-auth-token') || '{}');
      return supabaseAuthData?.access_token || '';
    } catch (e) {
      this.error('Error getting auth token', e);
      return '';
    }
  },
  
  // Test direct API fetch with different headers
  testDirectFetch: async function(anomalyId) {
    this.log(`Testing direct fetch for anomaly ${anomalyId}`);
    const authToken = this.getAuthToken();
    
    if (!authToken) {
      this.error('No auth token found! Please log in first.');
      return;
    }
    
    const headers = {
      'apikey': import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
      'Authorization': `Bearer ${authToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Client-Info': 'supabase-js/2.x',
    };
    
    this.log('Using headers:', headers);
    
    try {
      const response = await fetch(
        `https://zhljmjqhfsvdmgyhbebw.supabase.co/rest/v1/action_plans?select=*&anomaly_id=eq.${anomalyId}`,
        { method: 'GET', headers }
      );
      
      this.log(`Response status: ${response.status} ${response.statusText}`);
      this.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
      
      if (response.ok) {
        const data = await response.json();
        this.log('Fetch successful! Data:', data);
        return data;
      } else {
        const errorText = await response.text();
        this.error(`Fetch failed with status ${response.status}`, errorText);
        return null;
      }
    } catch (e) {
      this.error('Fetch exception:', e);
      return null;
    }
  },
  
  // Fix Supabase client
  patchSupabaseClient: function() {
    if (!window.supabase) {
      this.error('Supabase client not found in global scope');
      return false;
    }
    
    try {
      // Backup original fetch method
      const originalFetch = window.supabase.rest.headers;
      
      // Add necessary headers
      window.supabase.rest.headers = function() {
        const originalHeaders = originalFetch.apply(this, arguments);
        return {
          ...originalHeaders,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Client-Info': 'supabase-js/2.x',
          'Prefer': 'return=representation'
        };
      };
      
      this.log('Successfully patched Supabase client headers');
      return true;
    } catch (e) {
      this.error('Error patching Supabase client:', e);
      return false;
    }
  },
  
  // Test creating a new action plan
  testCreateActionPlan: async function(anomalyId) {
    this.log(`Testing action plan creation for anomaly ${anomalyId}`);
    
    if (!window.supabase) {
      this.error('Supabase client not found in global scope');
      return null;
    }
    
    try {
      // Create a test action plan
      const { data, error } = await window.supabase
        .from('action_plans')
        .insert([{
          anomaly_id: anomalyId,
          needs_outage: false,
          priority: 3,
          comments: 'Test action plan created by diagnostic tool',
          status: 'draft',
          completion_percentage: 0,
          total_duration_hours: 0,
          total_duration_days: 0
        }])
        .select('*');
      
      if (error) {
        this.error('Error creating test action plan:', error);
        return null;
      }
      
      this.log('Successfully created test action plan:', data);
      return data[0];
    } catch (e) {
      this.error('Exception creating test action plan:', e);
      return null;
    }
  },
  
  // Run all diagnostic tests
  runDiagnostics: async function(anomalyId) {
    this.log('Starting action plan API diagnostics...');
    
    if (!anomalyId) {
      anomalyId = prompt('Please enter an anomaly ID to test:');
      if (!anomalyId) {
        this.error('No anomaly ID provided, aborting.');
        return;
      }
    }
    
    // Step 1: Patch Supabase client if needed
    if (this.config.fixHeaders) {
      const patched = this.patchSupabaseClient();
      if (!patched) {
        this.log('Could not patch Supabase client, continuing with original client');
      }
    }
    
    // Step 2: Test direct API fetch
    if (this.config.testFetch) {
      const fetchResult = await this.testDirectFetch(anomalyId);
      
      if (fetchResult && fetchResult.length > 0) {
        this.log('Existing action plan found:', fetchResult);
      } else {
        this.log('No existing action plan found for this anomaly');
        
        // Step 3: Test creating a new action plan
        if (this.config.testCreate) {
          const createResult = await this.testCreateActionPlan(anomalyId);
          
          if (createResult) {
            // Step 4: Test fetching the newly created plan
            this.log('Testing fetch of newly created plan...');
            const refetchResult = await this.testDirectFetch(anomalyId);
            
            if (refetchResult && refetchResult.length > 0) {
              this.log('DIAGNOSTIC SUCCESSFUL! Full action plan workflow is working.');
            } else {
              this.error('DIAGNOSTIC FAILED: Could not fetch newly created action plan.');
            }
          }
        }
      }
    }
    
    this.log('Diagnostics completed!');
    
    return {
      message: 'Diagnostics completed. Check console logs for results.',
      anomalyId
    };
  }
};

// Run the diagnostics automatically
actionPlanDiagnosticTool.runDiagnostics();
