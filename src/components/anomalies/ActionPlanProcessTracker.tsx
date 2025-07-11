import React, { useState } from 'react';
import { Plus, Play, CheckCircle, Eye, ThumbsUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { actionPlanLogger } from '../../services/actionPlanLogger';
import { useData } from '../../contexts/DataContext';
import { ActionPlan, Anomaly } from '../../types';
import toast from 'react-hot-toast';

interface ActionPlanProcessTrackerProps {
  anomaly: Anomaly;
  onActionPlanCreated?: (actionPlan: ActionPlan) => void;
}

export const ActionPlanProcessTracker: React.FC<ActionPlanProcessTrackerProps> = ({ 
  anomaly, 
  onActionPlanCreated 
}) => {
  const { actionPlans, addActionPlan, updateActionPlan } = useData();
  const [isCreating, setIsCreating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [processStep, setProcessStep] = useState<'create' | 'assign' | 'execute' | 'complete' | 'review' | 'approve'>('create');

  const currentActionPlan = actionPlans.find(plan => plan.anomalyId === anomaly.id);

  const handleCreateActionPlan = async () => {
    setIsCreating(true);
    try {
      const createdPlan: ActionPlan = {
        id: `plan-${Date.now()}`,
        anomalyId: anomaly.id,
        needsOutage: true,
        outageType: 'minor',
        outageDuration: 8,
        plannedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        actions: [
          {
            id: '1',
            action: 'Inspect equipment for damage',
            responsable: 'John Doe',
            pdrsDisponible: 'Available',
            ressourcesInternes: 'Inspection tools, Safety equipment',
            ressourcesExternes: 'External consultant if needed',
            statut: 'planifie',
            dureeHeures: 2,
            dureeJours: 0,
            progression: 0
          },
          {
            id: '2',
            action: 'Replace defective components',
            responsable: 'Jane Smith',
            pdrsDisponible: 'Available',
            ressourcesInternes: 'Replacement parts, Tools',
            ressourcesExternes: 'Supplier delivery',
            statut: 'planifie',
            dureeHeures: 4,
            dureeJours: 0,
            progression: 0
          }
        ],
        totalDurationHours: 6,
        totalDurationDays: 1,
        estimatedCost: 1500,
        priority: 3,
        comments: `Action plan created for ${anomaly.title}`,
        status: 'draft',
        completionPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      addActionPlan(createdPlan);

      // Log the comprehensive action plan creation
      await actionPlanLogger.logCompleteActionPlanCreation(
        createdPlan,
        anomaly,
        {
          createdBy: 'current_user', // Get from auth context
          creationReason: 'Anomaly requires immediate attention',
          urgency: 'high',
          consultedExperts: ['Expert A', 'Expert B'],
          referenceDocuments: ['Manual v2.1', 'Safety Protocol SP-001'],
          riskAssessment: {
            riskLevel: 'medium',
            safetyImpact: 'low',
            operationalImpact: 'medium',
            mitigationMeasures: ['Safety lockout', 'Backup system activation']
          }
        }
      );

      setProcessStep('assign');
      onActionPlanCreated?.(createdPlan);
      toast.success('Action plan created and logged successfully');
    } catch (error) {
      console.error('Error creating action plan:', error);
      toast.error('Failed to create action plan');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignActionPlan = async () => {
    if (!currentActionPlan) return;

    try {
      // Log the action plan assignment
      await actionPlanLogger.logActionPlanAssignment(
        currentActionPlan,
        anomaly,
        {
          assignedBy: 'current_user',
          reason: 'Anomaly requires specialized intervention',
          expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          prerequisites: ['Safety briefing', 'Equipment checkout'],
          dependencies: ['Parts availability', 'Maintenance window approval'],
          approvalStatus: 'pending'
        }
      );

      setProcessStep('execute');
      toast.success('Action plan assigned and logged');
    } catch (error) {
      console.error('Error assigning action plan:', error);
      toast.error('Failed to assign action plan');
    }
  };

  const handleExecuteActionPlan = async () => {
    if (!currentActionPlan) return;

    setIsExecuting(true);
    try {
      // Log execution start
      await actionPlanLogger.logExecutionStart(
        currentActionPlan,
        anomaly,
        {
          executedBy: 'current_user',
          teamMembers: ['John Doe', 'Jane Smith', 'Mike Johnson'],
          location: anomaly.equipmentId,
          toolsUsed: ['Inspection camera', 'Torque wrench', 'Multimeter'],
          safetyPrecautions: ['Safety lockout applied', 'PPE verified', 'Emergency stops checked'],
          environmentalConditions: 'Normal temperature, dry conditions',
          preExecutionChecks: ['Tool calibration verified', 'Safety permits obtained'],
          communicationPlan: 'Radio contact every 30 minutes'
        }
      );

      // Update action plan status
      const updatedPlan = {
        ...currentActionPlan,
        status: 'in_progress' as const,
        completionPercentage: 25
      };
      updateActionPlan(currentActionPlan.id, updatedPlan);

      setProcessStep('complete');
      toast.success('Action plan execution started and logged');
    } catch (error) {
      console.error('Error executing action plan:', error);
      toast.error('Failed to start action plan execution');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCompleteActionPlan = async () => {
    if (!currentActionPlan) return;

    try {
      // Log completion
      await actionPlanLogger.logExecutionCompletion(
        currentActionPlan,
        anomaly,
        {
          completedBy: 'current_user',
          actualDuration: 5.5, // hours
          outcome: 'success',
          issuesEncountered: ['Minor delay due to weather', 'Additional inspection required'],
          resourcesUsed: {
            materials: ['Replacement valve', 'Sealing compound', 'Bolts x8'],
            tools: ['Torque wrench', 'Leak detector', 'Pressure gauge'],
            manHours: 11, // total team hours
            cost: 1450
          },
          qualityCheck: {
            performed: true,
            performedBy: 'Quality Inspector',
            result: 'Passed',
            notes: 'All specifications met, no leaks detected'
          },
          followUpRequired: true,
          followUpActions: ['Schedule follow-up inspection in 30 days', 'Update maintenance schedule'],
          effectiveness: 9, // 1-10 scale
          recommendations: ['Consider upgrading to newer valve model', 'Implement predictive maintenance']
        }
      );

      // Update action plan status
      const updatedPlan = {
        ...currentActionPlan,
        status: 'completed' as const,
        completionPercentage: 100
      };
      updateActionPlan(currentActionPlan.id, updatedPlan);

      setProcessStep('review');
      toast.success('Action plan completed and logged');
    } catch (error) {
      console.error('Error completing action plan:', error);
      toast.error('Failed to complete action plan');
    }
  };

  const handleReviewActionPlan = async () => {
    if (!currentActionPlan) return;

    try {
      // Log review
      await actionPlanLogger.logActionPlanReview(
        currentActionPlan,
        anomaly,
        {
          reviewedBy: 'Senior Engineer',
          reviewerRole: 'Technical Lead',
          result: 'approved',
          comments: 'Excellent execution, all objectives met efficiently',
          recommendations: ['Document process improvements', 'Share best practices with team'],
          efficacyRating: 9,
          timeEfficiency: 8,
          costEfficiency: 9,
          safetyCompliance: 10,
          innovationScore: 7,
          reusabilityScore: 8
        }
      );

      setProcessStep('approve');
      toast.success('Action plan reviewed and logged');
    } catch (error) {
      console.error('Error reviewing action plan:', error);
      toast.error('Failed to review action plan');
    }
  };

  const handleApproveActionPlan = async () => {
    if (!currentActionPlan) return;

    try {
      // Log approval
      await actionPlanLogger.logActionPlanApproval(
        currentActionPlan,
        anomaly,
        {
          approvedBy: 'Operations Manager',
          approverRole: 'Operations Manager',
          approvalLevel: 'manager',
          conditions: ['Follow-up inspection required', 'Document lessons learned'],
          budgetApproved: 1450,
          timeframeApproved: 'Within approved maintenance window',
          restrictions: ['No work during peak hours'],
          specialInstructions: ['Coordinate with production team', 'Ensure backup systems ready']
        }
      );

      // Log comprehensive process summary
      await actionPlanLogger.logProcessSummary(
        currentActionPlan,
        anomaly,
        [] // Process history would be populated from actual logs
      );

      toast.success('Action plan approved and process summary logged');
    } catch (error) {
      console.error('Error approving action plan:', error);
      toast.error('Failed to approve action plan');
    }
  };

  const getStepStatus = (step: string) => {
    const steps = ['create', 'assign', 'execute', 'complete', 'review', 'approve'];
    const currentIndex = steps.indexOf(processStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Action Plan Process Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Process Steps */}
          <div className="flex items-center gap-2 mb-6">
            {[
              { key: 'create', label: 'Create', icon: Plus },
              { key: 'assign', label: 'Assign', icon: Play },
              { key: 'execute', label: 'Execute', icon: Play },
              { key: 'complete', label: 'Complete', icon: CheckCircle },
              { key: 'review', label: 'Review', icon: Eye },
              { key: 'approve', label: 'Approve', icon: ThumbsUp }
            ].map((step, index) => {
              const Icon = step.icon;
              const status = getStepStatus(step.key);
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                    ${status === 'completed' ? 'bg-green-500 text-white' : 
                      status === 'current' ? 'bg-blue-500 text-white' : 
                      'bg-gray-200 text-gray-500'}
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="ml-2 text-sm font-medium">{step.label}</span>
                  {index < 5 && <div className="w-8 h-0.5 bg-gray-200 mx-2" />}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {processStep === 'create' && (
              <Button 
                onClick={handleCreateActionPlan}
                disabled={isCreating}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {isCreating ? 'Creating...' : 'Create Action Plan'}
              </Button>
            )}

            {processStep === 'assign' && currentActionPlan && (
              <Button 
                onClick={handleAssignActionPlan}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Assign Action Plan
              </Button>
            )}

            {processStep === 'execute' && currentActionPlan && (
              <Button 
                onClick={handleExecuteActionPlan}
                disabled={isExecuting}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {isExecuting ? 'Starting...' : 'Execute Action Plan'}
              </Button>
            )}

            {processStep === 'complete' && currentActionPlan && (
              <Button 
                onClick={handleCompleteActionPlan}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Complete Action Plan
              </Button>
            )}

            {processStep === 'review' && currentActionPlan && (
              <Button 
                onClick={handleReviewActionPlan}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Review Action Plan
              </Button>
            )}

            {processStep === 'approve' && currentActionPlan && (
              <Button 
                onClick={handleApproveActionPlan}
                className="flex items-center gap-2"
              >
                <ThumbsUp className="w-4 h-4" />
                Approve Action Plan
              </Button>
            )}
          </div>

          {/* Current Action Plan Info */}
          {currentActionPlan && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Current Action Plan</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span> {currentActionPlan.status}
                </div>
                <div>
                  <span className="font-medium">Progress:</span> {currentActionPlan.completionPercentage}%
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {currentActionPlan.totalDurationHours}h
                </div>
                <div>
                  <span className="font-medium">Cost:</span> ${currentActionPlan.estimatedCost}
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-4">
            ℹ️ All action plan activities are automatically logged with comprehensive details for audit and analysis.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionPlanProcessTracker;
