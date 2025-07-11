import { LogEntry, LogAction, LogCategory, LogSeverity, LogDetails, LogFilter } from '../types/logs';
import { supabase } from '../lib/supabase';

export class LoggingService {
	private static instance: LoggingService;
	private isInitialized = false;

	private constructor() { }

	static getInstance(): LoggingService {
		if (!LoggingService.instance) {
			LoggingService.instance = new LoggingService();
		}
		return LoggingService.instance;
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			// Create logs table if it doesn't exist
			await this.createLogsTable();
			this.isInitialized = true;

			// Log system startup
			await this.logAction({
				action: 'system_startup',
				category: 'system_operation',
				entity: 'system',
				details: {
					description: 'Logging system initialized',
					additionalInfo: {
						timestamp: new Date().toISOString(),
						userAgent: navigator.userAgent
					}
				},
				severity: 'info',
				success: true
			});
		} catch (error) {
			console.error('Failed to initialize logging service:', error);
		}
	}

	private async createLogsTable(): Promise<void> {
		const { error } = await supabase.rpc('create_logs_table_if_not_exists');
		if (error) {
			console.error('Error creating logs table:', error);
		}
	}

	async logAction(params: {
		action: LogAction;
		category: LogCategory;
		entity: string;
		entityId?: string;
		details: LogDetails;
		severity: LogSeverity;
		success: boolean;
		errorMessage?: string;
		metadata?: Record<string, any>;
	}): Promise<void> {
		try {
			const logEntry: Omit<LogEntry, 'id'> = {
				timestamp: new Date(),
				userId: await this.getCurrentUserId(),
				username: await this.getCurrentUsername(),
				action: params.action,
				category: params.category,
				entity: params.entity,
				entityId: params.entityId,
				details: params.details,
				severity: params.severity,
				ipAddress: await this.getClientIP(),
				userAgent: navigator.userAgent,
				sessionId: this.getSessionId(),
				success: params.success,
				errorMessage: params.errorMessage,
				metadata: params.metadata
			};

			// Store in Supabase with proper column mapping
			const { error } = await supabase
				.from('logs')
				.insert([{
					timestamp: logEntry.timestamp.toISOString(),
					user_id: logEntry.userId,
					username: logEntry.username,
					action: logEntry.action,
					category: logEntry.category,
					entity: logEntry.entity,
					entity_id: logEntry.entityId,
					details: logEntry.details,
					severity: logEntry.severity,
					ip_address: logEntry.ipAddress,
					user_agent: logEntry.userAgent,
					session_id: logEntry.sessionId,
					success: logEntry.success,
					error_message: logEntry.errorMessage,
					metadata: logEntry.metadata
				}]);

			if (error) {
				console.error('Failed to log action:', error);
				// Fallback to local storage
				this.logToLocalStorage(logEntry);
			}
		} catch (error) {
			console.error('Error in logAction:', error);
			// Fallback to local storage
			this.logToLocalStorage(params);
		}
	}

	private logToLocalStorage(logEntry: any): void {
		try {
			const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
			logs.push({
				...logEntry,
				id: Date.now().toString(),
				timestamp: new Date().toISOString()
			});

			// Keep only last 1000 logs in localStorage
			if (logs.length > 1000) {
				logs.splice(0, logs.length - 1000);
			}

			localStorage.setItem('app_logs', JSON.stringify(logs));
		} catch (error) {
			console.error('Failed to log to localStorage:', error);
		}
	}

	async getLogs(filter?: LogFilter, limit: number = 100, offset: number = 0): Promise<LogEntry[]> {
		try {
			let query = supabase
				.from('logs')
				.select('*')
				.order('timestamp', { ascending: false })
				.limit(limit)
				.range(offset, offset + limit - 1);

			if (filter) {
				if (filter.startDate) {
					query = query.gte('timestamp', filter.startDate.toISOString());
				}
				if (filter.endDate) {
					query = query.lte('timestamp', filter.endDate.toISOString());
				}
				if (filter.userId) {
					query = query.eq('user_id', filter.userId);
				}
				if (filter.action) {
					query = query.eq('action', filter.action);
				}
				if (filter.category) {
					query = query.eq('category', filter.category);
				}
				if (filter.severity) {
					query = query.eq('severity', filter.severity);
				}
				if (filter.entity) {
					query = query.eq('entity', filter.entity);
				}
				if (filter.success !== undefined) {
					query = query.eq('success', filter.success);
				}
			}

			const { data, error } = await query;

			if (error) {
				console.error('Failed to fetch logs:', error);
				return this.getLogsFromLocalStorage(filter, limit, offset);
			}

			// Convert Supabase data to LogEntry format
			return (data || []).map(row => ({
				id: row.id,
				timestamp: new Date(row.timestamp),
				userId: row.user_id,
				username: row.username,
				action: row.action,
				category: row.category,
				entity: row.entity,
				entityId: row.entity_id,
				details: row.details,
				severity: row.severity,
				ipAddress: row.ip_address,
				userAgent: row.user_agent,
				sessionId: row.session_id,
				success: row.success,
				errorMessage: row.error_message,
				metadata: row.metadata
			}));
		} catch (error) {
			console.error('Error fetching logs:', error);
			return this.getLogsFromLocalStorage(filter, limit, offset);
		}
	}

	private getLogsFromLocalStorage(filter?: LogFilter, limit: number = 100, offset: number = 0): LogEntry[] {
		try {
			const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');

			let filteredLogs = logs;

			if (filter) {
				filteredLogs = logs.filter((log: any) => {
					const logDate = new Date(log.timestamp);

					if (filter.startDate && logDate < filter.startDate) return false;
					if (filter.endDate && logDate > filter.endDate) return false;
					if (filter.userId && log.userId !== filter.userId) return false;
					if (filter.action && log.action !== filter.action) return false;
					if (filter.category && log.category !== filter.category) return false;
					if (filter.severity && log.severity !== filter.severity) return false;
					if (filter.entity && log.entity !== filter.entity) return false;
					if (filter.success !== undefined && log.success !== filter.success) return false;

					return true;
				});
			}

			return filteredLogs.slice(offset, offset + limit);
		} catch (error) {
			console.error('Failed to get logs from localStorage:', error);
			return [];
		}
	}

	async getLogStats(): Promise<{
		total: number;
		byCategory: Record<LogCategory, number>;
		bySeverity: Record<LogSeverity, number>;
		successRate: number;
		recentActivity: number;
	}> {
		try {
			const { data, error } = await supabase
				.from('logs')
				.select('category, severity, success, timestamp');

			if (error) {
				console.error('Failed to fetch log stats:', error);
				return this.getStatsFromLocalStorage();
			}

			const logs = data || [];
			const now = new Date();
			const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

			const byCategory: Record<LogCategory, number> = {
				anomaly_management: 0,
				action_plan_management: 0,
				maintenance_planning: 0,
				user_activity: 0,
				system_operation: 0,
				chat_interaction: 0,
				data_operation: 0,
				security: 0,
				error: 0
			};

			const bySeverity: Record<LogSeverity, number> = {
				info: 0,
				success: 0,
				warning: 0,
				error: 0,
				critical: 0
			};

			let successCount = 0;
			let recentActivity = 0;

			logs.forEach(log => {
				byCategory[log.category as LogCategory]++;
				bySeverity[log.severity as LogSeverity]++;

				if (log.success) successCount++;

				const logDate = new Date(log.timestamp);
				if (logDate > last24Hours) recentActivity++;
			});

			return {
				total: logs.length,
				byCategory,
				bySeverity,
				successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
				recentActivity
			};
		} catch (error) {
			console.error('Error fetching log stats:', error);
			return this.getStatsFromLocalStorage();
		}
	}

	private getStatsFromLocalStorage() {
		try {
			const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
			// Similar logic as above but for localStorage
			return {
				total: logs.length,
				byCategory: {
					anomaly_management: 0,
					action_plan_management: 0,
					maintenance_planning: 0,
					user_activity: 0,
					system_operation: 0,
					chat_interaction: 0,
					data_operation: 0,
					security: 0,
					error: 0
				} as Record<LogCategory, number>,
				bySeverity: {} as Record<LogSeverity, number>,
				successRate: 0,
				recentActivity: 0
			};
		} catch (error) {
			return {
				total: 0,
				byCategory: {} as Record<LogCategory, number>,
				bySeverity: {} as Record<LogSeverity, number>,
				successRate: 0,
				recentActivity: 0
			};
		}
	}

	async exportLogs(filter?: LogFilter): Promise<string> {
		const logs = await this.getLogs(filter, 10000, 0);
		return JSON.stringify(logs, null, 2);
	}

	async clearLogs(olderThan?: Date): Promise<void> {
		try {
			let query = supabase.from('logs').delete();

			if (olderThan) {
				query = query.lt('timestamp', olderThan.toISOString());
			} else {
				query = query.neq('id', ''); // Delete all
			}

			const { error } = await query;

			if (error) {
				console.error('Failed to clear logs:', error);
			}
		} catch (error) {
			console.error('Error clearing logs:', error);
		}
	}

	private async getCurrentUserId(): Promise<string | undefined> {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			return user?.id;
		} catch (error) {
			return undefined;
		}
	}

	private async getCurrentUsername(): Promise<string | undefined> {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			return user?.email || user?.user_metadata?.username;
		} catch (error) {
			return undefined;
		}
	}

	private async getClientIP(): Promise<string | undefined> {
		try {
			const response = await fetch('https://api.ipify.org?format=json');
			const data = await response.json();
			return data.ip;
		} catch (error) {
			return undefined;
		}
	}

	private getSessionId(): string {
		let sessionId = sessionStorage.getItem('app_session_id');
		if (!sessionId) {
			sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
			sessionStorage.setItem('app_session_id', sessionId);
		}
		return sessionId;
	}

	// Convenience methods for common log types
	async logUserAction(action: LogAction, details: LogDetails, success: boolean = true): Promise<void> {
		await this.logAction({
			action,
			category: 'user_activity',
			entity: 'user',
			details,
			severity: success ? 'success' : 'error',
			success
		});
	}

	async logAnomalyAction(action: LogAction, anomalyId: string, details: LogDetails, success: boolean = true): Promise<void> {
		await this.logAction({
			action,
			category: 'anomaly_management',
			entity: 'anomaly',
			entityId: anomalyId,
			details,
			severity: success ? 'success' : 'error',
			success
		});
	}

	async logMaintenanceAction(action: LogAction, windowId: string, details: LogDetails, success: boolean = true): Promise<void> {
		await this.logAction({
			action,
			category: 'maintenance_planning',
			entity: 'maintenance_window',
			entityId: windowId,
			details,
			severity: success ? 'success' : 'error',
			success
		});
	}

	async logError(error: Error, context: string, additionalInfo?: Record<string, any>): Promise<void> {
		await this.logAction({
			action: 'system_startup', // This should be a more specific error action
			category: 'error',
			entity: 'system',
			details: {
				description: `Error in ${context}: ${error.message}`,
				additionalInfo: {
					stack: error.stack,
					...additionalInfo
				}
			},
			severity: 'error',
			success: false,
			errorMessage: error.message
		});
	}
}

export const loggingService = LoggingService.getInstance();
