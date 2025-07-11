import { loggingService } from '../services/loggingService';
import { supabaseActionPlanService } from '../services/supabaseActionPlanService';

// Simple test to verify logging service is working
export const testLoggingService = async () => {
  console.log('Testing logging service...');
  
  try {
    await loggingService.initialize();
    console.log('✓ Logging service initialized successfully');
    
    // Test a simple log entry
    await loggingService.logAction({
      action: 'system_startup',
      category: 'system_operation',
      entity: 'test',
      details: {
        description: 'Test log entry from logging service test',
        additionalInfo: {
          testTimestamp: new Date().toISOString()
        }
      },
      severity: 'info',
      success: true
    });
    console.log('✓ Test log entry created successfully');
    
    // Test fetching logs
    const logs = await loggingService.getLogs(undefined, 5, 0);
    console.log(`✓ Fetched ${logs.length} logs successfully`);
    
  } catch (error) {
    console.error('✗ Logging service test failed:', error);
  }
};

// Simple test to verify action plan service is working
export const testActionPlanService = async () => {
  console.log('Testing action plan service...');
  
  try {
    // Test fetching all action plans
    const actionPlans = await supabaseActionPlanService.getAllActionPlans();
    console.log(`✓ Fetched ${actionPlans.length} action plans successfully`);
    
    // Test creating a simple action plan
    const testData = {
      anomalyId: 'test-anomaly-id',
      needsOutage: false,
      priority: 3 as const,
      estimatedCost: 100,
      comments: 'Test action plan',
      actions: [
        {
          action: 'Test action',
          responsable: 'Test person',
          dureeHeures: 2,
          dureeJours: 0
        }
      ]
    };
    
    const createdPlan = await supabaseActionPlanService.createActionPlan(testData);
    if (createdPlan) {
      console.log(`✓ Created test action plan: ${createdPlan.id}`);
      
      // Test updating the action plan
      const updatedPlan = await supabaseActionPlanService.updateActionPlan(createdPlan.id, {
        comments: 'Updated test action plan',
        estimatedCost: 150
      });
      
      if (updatedPlan) {
        console.log(`✓ Updated action plan: ${updatedPlan.id}`);
      }
      
      // Test deleting the action plan
      const deleted = await supabaseActionPlanService.deleteActionPlan(createdPlan.id);
      if (deleted) {
        console.log(`✓ Deleted test action plan: ${createdPlan.id}`);
      }
    }
    
  } catch (error) {
    console.error('✗ Action plan service test failed:', error);
  }
};

// Run tests
export const runTests = async () => {
  console.log('🧪 Running service tests...');
  
  await testLoggingService();
  console.log('');
  await testActionPlanService();
  
  console.log('🧪 Service tests completed!');
};
