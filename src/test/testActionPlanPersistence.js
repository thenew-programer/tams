// Test to verify action plan persistence
// You can run this in the browser console to test the action plan functionality

const testActionPlanPersistence = async () => {
  console.log('🧪 Testing Action Plan Persistence...');
  
  try {
    // Test 1: Create a test anomaly ID
    const testAnomalyId = 'test-anomaly-' + Date.now();
    console.log('📝 Using test anomaly ID:', testAnomalyId);
    
    // Test 2: Create an action plan
    const testActionPlan = {
      anomalyId: testAnomalyId,
      needsOutage: true,
      outageType: 'minor',
      priority: 3,
      estimatedCost: 5000,
      comments: 'Test action plan for persistence testing',
      actions: [
        {
          action: 'Check equipment status',
          responsable: 'MC',
          pdrsDisponible: 'OUI',
          ressourcesInternes: 'Internal team',
          ressourcesExternes: 'External contractor',
          dureeHeures: 4,
          dureeJours: 1,
          dateDebut: new Date(),
          dateFin: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        },
        {
          action: 'Replace faulty component',
          responsable: 'EXT',
          pdrsDisponible: 'NON',
          ressourcesInternes: 'Spare parts',
          ressourcesExternes: 'Specialized contractor',
          dureeHeures: 8,
          dureeJours: 2
        }
      ]
    };
    
    console.log('📋 Test action plan data:', testActionPlan);
    
    // Test 3: Import services
    const { supabaseActionPlanService } = await import('./src/services/supabaseActionPlanService');
    
    // Test 4: Create action plan
    console.log('🔄 Creating action plan...');
    const createdPlan = await supabaseActionPlanService.createActionPlan(testActionPlan);
    
    if (createdPlan) {
      console.log('✅ Action plan created successfully:', createdPlan);
      
      // Test 5: Retrieve action plan
      console.log('🔍 Retrieving action plan...');
      const retrievedPlan = await supabaseActionPlanService.getActionPlan(testAnomalyId);
      
      if (retrievedPlan) {
        console.log('✅ Action plan retrieved successfully:', retrievedPlan);
        
        // Test 6: Update action plan
        console.log('🔄 Updating action plan...');
        const updatedPlan = await supabaseActionPlanService.updateActionPlan(retrievedPlan.id, {
          comments: 'Updated test action plan - persistence verified!',
          estimatedCost: 7500,
          priority: 2
        });
        
        if (updatedPlan) {
          console.log('✅ Action plan updated successfully:', updatedPlan);
          
          // Test 7: Delete action plan (cleanup)
          console.log('🗑️ Cleaning up test data...');
          const deleted = await supabaseActionPlanService.deleteActionPlan(retrievedPlan.id);
          
          if (deleted) {
            console.log('✅ Test cleanup successful');
            console.log('🎉 All tests passed! Action plan persistence is working correctly.');
          } else {
            console.log('⚠️ Cleanup failed, but main functionality works');
          }
        } else {
          console.log('❌ Action plan update failed');
        }
      } else {
        console.log('❌ Action plan retrieval failed');
      }
    } else {
      console.log('❌ Action plan creation failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    // Additional debugging
    console.log('🔍 Debugging information:');
    console.log('- Check if Supabase tables exist');
    console.log('- Verify environment variables are set');
    console.log('- Check network connectivity');
    console.log('- Look at browser network tab for failed requests');
  }
};

// Instructions for running the test
console.log(`
🧪 ACTION PLAN PERSISTENCE TEST
==============================

To test if action plan persistence is working:

1. Run the manual SQL script in your Supabase dashboard first:
   - Copy content from supabase/manual_create_action_plans.sql
   - Paste and run in Supabase SQL Editor

2. Run this test in the browser console:
   testActionPlanPersistence()

3. Check the console output for success/failure messages

The test will:
- Create a test action plan
- Save it to the database
- Retrieve it back
- Update it
- Delete it (cleanup)

If all steps pass, your action plan persistence is working correctly!
`);

// Export for use
window.testActionPlanPersistence = testActionPlanPersistence;
