import { useCallback, useEffect } from 'react';
import { loggingService } from '../services/loggingService';
import { LogAction, LogCategory, LogSeverity, LogDetails } from '../types/logs';

interface UseLoggingReturn {
  logAction: (
    action: LogAction,
    category: LogCategory,
    entity: string,
    details: LogDetails,
    options?: {
      entityId?: string;
      severity?: LogSeverity;
      success?: boolean;
      errorMessage?: string;
      metadata?: Record<string, any>;
    }
  ) => Promise<void>;
  
  logUserAction: (
    action: LogAction,
    details: LogDetails,
    success?: boolean
  ) => Promise<void>;
  
  logAnomalyAction: (
    action: LogAction,
    anomalyId: string,
    details: LogDetails,
    success?: boolean
  ) => Promise<void>;
  
  logMaintenanceAction: (
    action: LogAction,
    windowId: string,
    details: LogDetails,
    success?: boolean
  ) => Promise<void>;
  
  logError: (
    error: Error,
    context: string,
    additionalInfo?: Record<string, any>
  ) => Promise<void>;
  
  logPageView: (pageName: string) => Promise<void>;
}

export const useLogging = (): UseLoggingReturn => {
  // Initialize logging service when hook is first used
  useEffect(() => {
    loggingService.initialize();
  }, []);

  const logAction = useCallback(async (
    action: LogAction,
    category: LogCategory,
    entity: string,
    details: LogDetails,
    options: {
      entityId?: string;
      severity?: LogSeverity;
      success?: boolean;
      errorMessage?: string;
      metadata?: Record<string, any>;
    } = {}
  ) => {
    try {
      await loggingService.logAction({
        action,
        category,
        entity,
        entityId: options.entityId,
        details,
        severity: options.severity || (options.success !== false ? 'success' : 'error'),
        success: options.success !== false,
        errorMessage: options.errorMessage,
        metadata: options.metadata
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }, []);

  const logUserAction = useCallback(async (
    action: LogAction,
    details: LogDetails,
    success: boolean = true
  ) => {
    await loggingService.logUserAction(action, details, success);
  }, []);

  const logAnomalyAction = useCallback(async (
    action: LogAction,
    anomalyId: string,
    details: LogDetails,
    success: boolean = true
  ) => {
    await loggingService.logAnomalyAction(action, anomalyId, details, success);
  }, []);

  const logMaintenanceAction = useCallback(async (
    action: LogAction,
    windowId: string,
    details: LogDetails,
    success: boolean = true
  ) => {
    await loggingService.logMaintenanceAction(action, windowId, details, success);
  }, []);

  const logError = useCallback(async (
    error: Error,
    context: string,
    additionalInfo?: Record<string, any>
  ) => {
    await loggingService.logError(error, context, additionalInfo);
  }, []);

  const logPageView = useCallback(async (pageName: string) => {
    await logUserAction(
      'view_page',
      {
        description: `User viewed ${pageName} page`,
        additionalInfo: {
          page: pageName,
          timestamp: new Date().toISOString(),
          url: window.location.href
        }
      },
      true
    );
  }, [logUserAction]);

  return {
    logAction,
    logUserAction,
    logAnomalyAction,
    logMaintenanceAction,
    logError,
    logPageView
  };
};

// Convenience hooks for specific use cases
export const useAnomalyLogging = () => {
  const { logAnomalyAction, logError } = useLogging();
  
  return {
    logAnomalyCreated: (anomalyId: string, anomalyData: any) =>
      logAnomalyAction('create_anomaly', anomalyId, {
        description: 'New anomaly created',
        newValue: anomalyData
      }),
    
    logAnomalyUpdated: (anomalyId: string, oldData: any, newData: any) =>
      logAnomalyAction('update_anomaly', anomalyId, {
        description: 'Anomaly updated',
        oldValue: oldData,
        newValue: newData
      }),
    
    logAnomalyStatusChanged: (anomalyId: string, oldStatus: string, newStatus: string) =>
      logAnomalyAction('change_anomaly_status', anomalyId, {
        description: `Anomaly status changed from ${oldStatus} to ${newStatus}`,
        oldValue: oldStatus,
        newValue: newStatus
      }),
    
    logAnomalyAssigned: (anomalyId: string, windowId: string) =>
      logAnomalyAction('assign_anomaly_to_window', anomalyId, {
        description: 'Anomaly assigned to maintenance window',
        additionalInfo: { windowId }
      }),
    
    logError
  };
};

export const usePlanningLogging = () => {
  const { logMaintenanceAction, logAction, logError } = useLogging();
  
  return {
    logWindowCreated: (windowId: string, windowData: any) =>
      logMaintenanceAction('create_maintenance_window', windowId, {
        description: 'New maintenance window created',
        newValue: windowData
      }),
    
    logWindowUpdated: (windowId: string, oldData: any, newData: any) =>
      logMaintenanceAction('update_maintenance_window', windowId, {
        description: 'Maintenance window updated',
        oldValue: oldData,
        newValue: newData
      }),
    
    logAutoScheduling: (affectedCount: number, duration: number) =>
      logAction('auto_schedule_anomalies', 'maintenance_planning', 'planning', {
        description: `Auto-scheduled ${affectedCount} anomalies`,
        affectedRecords: affectedCount,
        duration
      }),
    
    logManualScheduling: (anomalyId: string, windowId: string) =>
      logAction('manual_schedule_anomaly', 'maintenance_planning', 'planning', {
        description: 'Manually scheduled anomaly',
        additionalInfo: { anomalyId, windowId }
      }),
    
    logError
  };
};

export const useChatLogging = () => {
  const { logAction, logError } = useLogging();
  
  return {
    logMessageSent: (message: string, messageLength: number) =>
      logAction('chat_message_sent', 'chat_interaction', 'chat', {
        description: 'User sent chat message',
        additionalInfo: { messageLength, preview: message.substring(0, 100) }
      }),
    
    logAIResponse: (responseLength: number, duration: number) =>
      logAction('ai_response_generated', 'chat_interaction', 'chat', {
        description: 'AI response generated',
        duration,
        additionalInfo: { responseLength }
      }),
    
    logChatHistoryViewed: () =>
      logAction('chat_history_viewed', 'chat_interaction', 'chat', {
        description: 'User viewed chat history'
      }),
    
    logError
  };
};

export const useActionPlanLogging = () => {
  const { logAction, logError } = useLogging();
  
  return {
    logActionPlanCreated: (planId: string, planData: any, anomalyId?: string) =>
      logAction('create_action_plan', 'action_plan_management', 'action_plan', {
        description: `New action plan created${anomalyId ? ' for anomaly ' + anomalyId : ''}`,
        newValue: planData,
        additionalInfo: { 
          anomalyId,
          planType: planData.type,
          priority: planData.priority,
          estimatedDuration: planData.estimatedDuration,
          assignedTo: planData.assignedTo,
          resources: planData.resources
        }
      }, { entityId: planId }),
    
    logActionPlanUpdated: (planId: string, oldData: any, newData: any) =>
      logAction('update_action_plan', 'action_plan_management', 'action_plan', {
        description: 'Action plan updated',
        oldValue: oldData,
        newValue: newData,
        additionalInfo: {
          changedFields: Object.keys(newData).filter(key => 
            JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
          ),
          updateReason: newData.updateReason
        }
      }, { entityId: planId }),
    
    logActionPlanAssignedToAnomaly: (planId: string, anomalyId: string, assignmentDetails: any) =>
      logAction('assign_action_plan_to_anomaly', 'action_plan_management', 'action_plan', {
        description: `Action plan assigned to anomaly ${anomalyId}`,
        additionalInfo: {
          anomalyId,
          assignmentDate: new Date().toISOString(),
          assignedBy: assignmentDetails.assignedBy,
          reason: assignmentDetails.reason,
          expectedCompletion: assignmentDetails.expectedCompletion,
          anomalyDetails: assignmentDetails.anomalyDetails
        }
      }, { entityId: planId }),
    
    logActionPlanExecutionStarted: (planId: string, anomalyId: string, executionDetails: any) =>
      logAction('execute_action_plan', 'action_plan_management', 'action_plan', {
        description: `Action plan execution started for anomaly ${anomalyId}`,
        additionalInfo: {
          anomalyId,
          executionStartTime: new Date().toISOString(),
          executedBy: executionDetails.executedBy,
          executionLocation: executionDetails.location,
          toolsUsed: executionDetails.toolsUsed,
          teamMembers: executionDetails.teamMembers,
          safetyPrecautions: executionDetails.safetyPrecautions
        }
      }, { entityId: planId }),
    
    logActionPlanCompleted: (planId: string, anomalyId: string, completionDetails: any) =>
      logAction('complete_action_plan', 'action_plan_management', 'action_plan', {
        description: `Action plan completed for anomaly ${anomalyId}`,
        additionalInfo: {
          anomalyId,
          completionTime: new Date().toISOString(),
          completedBy: completionDetails.completedBy,
          actualDuration: completionDetails.actualDuration,
          outcome: completionDetails.outcome,
          issuesEncountered: completionDetails.issuesEncountered,
          resourcesUsed: completionDetails.resourcesUsed,
          qualityCheck: completionDetails.qualityCheck,
          followUpRequired: completionDetails.followUpRequired
        }
      }, { entityId: planId }),
    
    logActionPlanReviewed: (planId: string, anomalyId: string, reviewDetails: any) =>
      logAction('review_action_plan', 'action_plan_management', 'action_plan', {
        description: `Action plan reviewed for anomaly ${anomalyId}`,
        additionalInfo: {
          anomalyId,
          reviewDate: new Date().toISOString(),
          reviewedBy: reviewDetails.reviewedBy,
          reviewResult: reviewDetails.result,
          reviewComments: reviewDetails.comments,
          recommendations: reviewDetails.recommendations,
          efficacyRating: reviewDetails.efficacyRating,
          timeEfficiency: reviewDetails.timeEfficiency,
          costEfficiency: reviewDetails.costEfficiency
        }
      }, { entityId: planId }),
    
    logActionPlanApproved: (planId: string, anomalyId: string, approvalDetails: any) =>
      logAction('approve_action_plan', 'action_plan_management', 'action_plan', {
        description: `Action plan approved for anomaly ${anomalyId}`,
        additionalInfo: {
          anomalyId,
          approvalDate: new Date().toISOString(),
          approvedBy: approvalDetails.approvedBy,
          approverRole: approvalDetails.approverRole,
          approvalLevel: approvalDetails.approvalLevel,
          conditions: approvalDetails.conditions,
          budgetApproved: approvalDetails.budgetApproved,
          timeframeApproved: approvalDetails.timeframeApproved
        }
      }, { entityId: planId }),
    
    logError
  };
};

export const useAuthLogging = () => {
  const { logUserAction, logError } = useLogging();
  
  return {
    logLogin: (username: string) =>
      logUserAction('user_login', {
        description: `User ${username} logged in`,
        additionalInfo: { username }
      }),
    
    logLogout: (username: string) =>
      logUserAction('user_logout', {
        description: `User ${username} logged out`,
        additionalInfo: { username }
      }),
    
    logRegister: (username: string) =>
      logUserAction('user_register', {
        description: `New user ${username} registered`,
        additionalInfo: { username }
      }),
    
    logProfileUpdate: (changes: Record<string, any>) =>
      logUserAction('user_profile_update', {
        description: 'User profile updated',
        newValue: changes
      }),
    
    logError
  };
};
