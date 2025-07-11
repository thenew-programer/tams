export interface LogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  username?: string;
  action: LogAction;
  category: LogCategory;
  entity: string; // e.g., "anomaly", "maintenance_window", "user", "planning"
  entityId?: string;
  details: LogDetails;
  severity: LogSeverity;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export type LogAction = 
  // Anomaly actions
  | 'create_anomaly'
  | 'update_anomaly'
  | 'delete_anomaly'
  | 'change_anomaly_status'
  | 'assign_anomaly_to_window'
  | 'update_anomaly_scores'
  
  // Action Plan actions
  | 'create_action_plan'
  | 'update_action_plan'
  | 'delete_action_plan'
  | 'assign_action_plan_to_anomaly'
  | 'execute_action_plan'
  | 'complete_action_plan'
  | 'review_action_plan'
  | 'approve_action_plan'
  
  // Maintenance window actions
  | 'create_maintenance_window'
  | 'update_maintenance_window'
  | 'delete_maintenance_window'
  | 'assign_anomalies_to_window'
  
  // Planning actions
  | 'auto_schedule_anomalies'
  | 'manual_schedule_anomaly'
  | 'optimize_planning'
  | 'create_auto_window'
  
  // User actions
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'user_profile_update'
  | 'password_change'
  
  // System actions
  | 'system_startup'
  | 'system_shutdown'
  | 'data_export'
  | 'data_import'
  | 'backup_created'
  
  // Chat actions
  | 'chat_message_sent'
  | 'ai_response_generated'
  | 'chat_history_viewed'
  
  // General actions
  | 'view_page'
  | 'filter_data'
  | 'search_performed'
  | 'report_generated';

export type LogCategory = 
  | 'anomaly_management'
  | 'action_plan_management'
  | 'maintenance_planning'
  | 'user_activity'
  | 'system_operation'
  | 'chat_interaction'
  | 'data_operation'
  | 'security'
  | 'error';

export type LogSeverity = 
  | 'info'      // General information
  | 'success'   // Successful operations
  | 'warning'   // Warning conditions
  | 'error'     // Error conditions
  | 'critical'; // Critical system issues

export interface LogDetails {
  description: string;
  oldValue?: any;
  newValue?: any;
  affectedRecords?: number;
  duration?: number; // in milliseconds
  additionalInfo?: Record<string, any>;
}

export interface LogFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: LogAction;
  category?: LogCategory;
  severity?: LogSeverity;
  entity?: string;
  success?: boolean;
  searchText?: string;
}

export interface LogStatistics {
  totalLogs: number;
  logsByCategory: Record<LogCategory, number>;
  logsBySeverity: Record<LogSeverity, number>;
  logsByUser: Record<string, number>;
  recentActivity: LogEntry[];
  errorRate: number;
  averageResponseTime: number;
}
