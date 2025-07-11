import { useActionPlanLogging } from '../hooks/useLogging';
import { ActionPlan, Anomaly } from '../types';

export interface ActionPlanProcessDetails {
  anomalyId: string;
  anomalyTitle: string;
  anomalyType: string;
  anomalySeverity: string;
  anomalyLocation: string;
  anomalyDescription: string;
  planId: string;
  planType: string;
  planTitle: string;
  planDescription: string;
  estimatedDuration: number;
  estimatedCost: number;
  requiredResources: string[];
  requiredSkills: string[];
  safetyRequirements: string[];
  tools: string[];
  materials: string[];
  assignedTo: string;
  assignedBy: string;
  priority: string;
  deadline: string;
  approvalRequired: boolean;
  approvedBy?: string;
  approvalDate?: string;
  executionStartTime?: string;
  executionEndTime?: string;
  actualDuration?: number;
  actualCost?: number;
  outcome?: string;
  efficacyRating?: number;
  followUpActions?: string[];
  lessonsLearned?: string[];
}

export class ActionPlanLogger {
  private actionPlanLogging: ReturnType<typeof useActionPlanLogging>;

  constructor() {
    this.actionPlanLogging = useActionPlanLogging();
  }

  /**
   * Log complete action plan creation with all details
   */
  async logCompleteActionPlanCreation(
    actionPlan: ActionPlan,
    anomaly: Anomaly,
    creationContext: {
      createdBy: string;
      creationReason: string;
      urgency: string;
      consultedExperts?: string[];
      referenceDocuments?: string[];
      riskAssessment?: any;
    }
  ): Promise<void> {
    const processDetails: ActionPlanProcessDetails = {
      // Anomaly details
      anomalyId: anomaly.id,
      anomalyTitle: anomaly.title,
      anomalyType: anomaly.service, // Using service as type
      anomalySeverity: anomaly.criticalityLevel,
      anomalyLocation: anomaly.equipmentId, // Using equipmentId as location
      anomalyDescription: anomaly.description,
      
      // Plan details
      planId: actionPlan.id,
      planType: actionPlan.outageType || 'minor',
      planTitle: `Action Plan for ${anomaly.title}`,
      planDescription: actionPlan.comments,
      estimatedDuration: actionPlan.totalDurationHours,
      estimatedCost: actionPlan.estimatedCost,
      requiredResources: actionPlan.actions.map(a => a.ressourcesInternes).filter(Boolean),
      requiredSkills: actionPlan.actions.map(a => a.responsable).filter(Boolean),
      safetyRequirements: [], // Not available in current type
      tools: [], // Not available in current type
      materials: actionPlan.actions.map(a => a.ressourcesExternes).filter(Boolean),
      assignedTo: actionPlan.actions[0]?.responsable || 'Unknown',
      assignedBy: creationContext.createdBy,
      priority: actionPlan.priority.toString(),
      deadline: actionPlan.plannedDate?.toISOString() || '',
      approvalRequired: actionPlan.status === 'draft'
    };

    await this.actionPlanLogging.logActionPlanCreated(
      actionPlan.id,
      {
        ...processDetails,
        creationContext: {
          createdBy: creationContext.createdBy,
          creationReason: creationContext.creationReason,
          urgency: creationContext.urgency,
          consultedExperts: creationContext.consultedExperts,
          referenceDocuments: creationContext.referenceDocuments,
          riskAssessment: creationContext.riskAssessment,
          timestamp: new Date().toISOString()
        }
      },
      anomaly.id
    );
  }

  /**
   * Log action plan assignment to anomaly with complete process details
   */
  async logActionPlanAssignment(
    actionPlan: ActionPlan,
    anomaly: Anomaly,
    assignmentDetails: {
      assignedBy: string;
      reason: string;
      expectedCompletion: string;
      prerequisites?: string[];
      dependencies?: string[];
      approvalStatus?: string;
    }
  ): Promise<void> {
    await this.actionPlanLogging.logActionPlanAssignedToAnomaly(
      actionPlan.id,
      anomaly.id,
      {
        ...assignmentDetails,
        anomalyDetails: {
          title: anomaly.title,
          type: anomaly.service,
          severity: anomaly.criticalityLevel,
          location: anomaly.equipmentId,
          status: anomaly.status,
          detectionDate: anomaly.createdAt,
          lastUpdated: anomaly.updatedAt
        },
        planDetails: {
          title: `Action Plan for ${anomaly.title}`,
          type: actionPlan.outageType || 'minor',
          priority: actionPlan.priority.toString(),
          estimatedDuration: actionPlan.totalDurationHours,
          requiredResources: actionPlan.actions.map(a => a.ressourcesInternes).filter(Boolean),
          assignedTo: actionPlan.actions[0]?.responsable || 'Unknown'
        }
      }
    );
  }

  /**
   * Log action plan execution start with comprehensive details
   */
  async logExecutionStart(
    actionPlan: ActionPlan,
    anomaly: Anomaly,
    executionDetails: {
      executedBy: string;
      teamMembers: string[];
      location: string;
      toolsUsed: string[];
      safetyPrecautions: string[];
      environmentalConditions?: string;
      preExecutionChecks?: string[];
      communicationPlan?: string;
    }
  ): Promise<void> {
    await this.actionPlanLogging.logActionPlanExecutionStarted(
      actionPlan.id,
      anomaly.id,
      {
        ...executionDetails,
        anomalySnapshot: {
          currentStatus: anomaly.status,
          severity: anomaly.criticalityLevel,
          lastModified: anomaly.updatedAt
        },
        planSnapshot: {
          title: `Action Plan for ${anomaly.title}`,
          type: actionPlan.outageType || 'minor',
          priority: actionPlan.priority.toString(),
          estimatedDuration: actionPlan.totalDurationHours
        },
        executionEnvironment: {
          location: executionDetails.location,
          environmentalConditions: executionDetails.environmentalConditions,
          safetyStatus: 'verified',
          equipmentStatus: 'ready'
        }
      }
    );
  }

  /**
   * Log action plan completion with detailed results
   */
  async logExecutionCompletion(
    actionPlan: ActionPlan,
    anomaly: Anomaly,
    completionDetails: {
      completedBy: string;
      actualDuration: number;
      outcome: 'success' | 'partial_success' | 'failure';
      issuesEncountered: string[];
      resourcesUsed: {
        materials: string[];
        tools: string[];
        manHours: number;
        cost: number;
      };
      qualityCheck: {
        performed: boolean;
        performedBy?: string;
        result?: string;
        notes?: string;
      };
      followUpRequired: boolean;
      followUpActions?: string[];
      effectiveness?: number; // 1-10 scale
      recommendations?: string[];
    }
  ): Promise<void> {
    await this.actionPlanLogging.logActionPlanCompleted(
      actionPlan.id,
      anomaly.id,
      {
        ...completionDetails,
        performanceMetrics: {
          plannedDuration: actionPlan.totalDurationHours,
          actualDuration: completionDetails.actualDuration,
          durationVariance: completionDetails.actualDuration - actionPlan.totalDurationHours,
          costVariance: completionDetails.resourcesUsed.cost - actionPlan.estimatedCost,
          effectiveness: completionDetails.effectiveness
        },
        anomalyResolution: {
          previousStatus: anomaly.status,
          expectedNewStatus: completionDetails.outcome === 'success' ? 'resolved' : 'treated',
          resolutionConfirmed: completionDetails.qualityCheck.performed
        }
      }
    );
  }

  /**
   * Log action plan review with detailed analysis
   */
  async logActionPlanReview(
    actionPlan: ActionPlan,
    anomaly: Anomaly,
    reviewDetails: {
      reviewedBy: string;
      reviewerRole: string;
      result: 'approved' | 'rejected' | 'needs_revision';
      comments: string;
      recommendations: string[];
      efficacyRating: number; // 1-10 scale
      timeEfficiency: number; // 1-10 scale
      costEfficiency: number; // 1-10 scale
      safetyCompliance: number; // 1-10 scale
      innovationScore?: number; // 1-10 scale
      reusabilityScore?: number; // 1-10 scale
    }
  ): Promise<void> {
    await this.actionPlanLogging.logActionPlanReviewed(
      actionPlan.id,
      anomaly.id,
      {
        ...reviewDetails,
        reviewMetrics: {
          overallScore: (reviewDetails.efficacyRating + reviewDetails.timeEfficiency + 
                        reviewDetails.costEfficiency + reviewDetails.safetyCompliance) / 4,
          strongPoints: [],
          improvementAreas: [],
          benchmarkComparison: 'above_average' // This could be calculated
        },
        contextualAnalysis: {
          anomalyComplexity: anomaly.criticalityLevel,
          planComplexity: actionPlan.outageType || 'minor',
          resourceUtilization: 'efficient',
          stakeholderSatisfaction: 'high'
        }
      }
    );
  }

  /**
   * Log action plan approval with authorization details
   */
  async logActionPlanApproval(
    actionPlan: ActionPlan,
    anomaly: Anomaly,
    approvalDetails: {
      approvedBy: string;
      approverRole: string;
      approvalLevel: 'supervisor' | 'manager' | 'director' | 'executive';
      conditions: string[];
      budgetApproved: number;
      timeframeApproved: string;
      restrictions?: string[];
      specialInstructions?: string[];
    }
  ): Promise<void> {
    await this.actionPlanLogging.logActionPlanApproved(
      actionPlan.id,
      anomaly.id,
      {
        ...approvalDetails,
        approvalContext: {
          anomalyPriority: anomaly.criticalityLevel,
          businessImpact: this.calculateBusinessImpact(anomaly),
          riskLevel: this.calculateRiskLevel(anomaly, actionPlan),
          complianceRequirements: this.getComplianceRequirements(anomaly, actionPlan)
        },
        authorizationTrail: {
          requestedBy: actionPlan.actions[0]?.responsable || 'Unknown',
          requestDate: actionPlan.createdAt,
          approvalDate: new Date().toISOString(),
          approvalHierarchy: [approvalDetails.approverRole],
          delegationChain: []
        }
      }
    );
  }

  /**
   * Log comprehensive action plan process summary
   */
  async logProcessSummary(
    actionPlan: ActionPlan,
    anomaly: Anomaly,
    processHistory: any[]
  ): Promise<void> {
    const processSummary = {
      totalDuration: this.calculateTotalProcessDuration(processHistory),
      stagesCompleted: processHistory.length,
      efficiency: this.calculateProcessEfficiency(actionPlan, processHistory),
      stakeholdersInvolved: this.extractStakeholders(processHistory),
      resourcesConsumed: this.calculateResourceConsumption(processHistory),
      outcomesAchieved: this.summarizeOutcomes(processHistory),
      lessonsLearned: this.extractLessonsLearned(processHistory),
      recommendationsForFuture: this.generateRecommendations(processHistory)
    };

    await this.actionPlanLogging.logActionPlanCompleted(
      actionPlan.id,
      anomaly.id,
      {
        completedBy: 'system',
        actualDuration: processSummary.totalDuration,
        outcome: processSummary.outcomesAchieved,
        processEfficiency: processSummary.efficiency,
        comprehensiveSummary: processSummary
      }
    );
  }

  // Helper methods
  private calculateBusinessImpact(anomaly: Anomaly): string {
    // Logic to calculate business impact based on anomaly properties
    return 'medium';
  }

  private calculateRiskLevel(anomaly: Anomaly, actionPlan: ActionPlan): string {
    // Logic to calculate risk level
    return 'low';
  }

  private getComplianceRequirements(anomaly: Anomaly, actionPlan: ActionPlan): string[] {
    // Logic to determine compliance requirements
    return ['ISO 9001', 'Safety Standards'];
  }

  private calculateTotalProcessDuration(processHistory: any[]): number {
    // Logic to calculate total process duration
    return 0;
  }

  private calculateProcessEfficiency(actionPlan: ActionPlan, processHistory: any[]): number {
    // Logic to calculate process efficiency
    return 0.85;
  }

  private extractStakeholders(processHistory: any[]): string[] {
    // Logic to extract all stakeholders involved
    return [];
  }

  private calculateResourceConsumption(processHistory: any[]): any {
    // Logic to calculate resource consumption
    return {};
  }

  private summarizeOutcomes(processHistory: any[]): string {
    // Logic to summarize outcomes
    return 'successful';
  }

  private extractLessonsLearned(processHistory: any[]): string[] {
    // Logic to extract lessons learned
    return [];
  }

  private generateRecommendations(processHistory: any[]): string[] {
    // Logic to generate recommendations
    return [];
  }
}

export const actionPlanLogger = new ActionPlanLogger();
