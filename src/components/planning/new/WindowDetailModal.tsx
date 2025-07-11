import React, { useState, useEffect } from 'react';
import {
	X,
	Calendar,
	Users,
	AlertTriangle,
	Edit,
	Save,
	BarChart3,
	Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { MaintenanceWindow, Anomaly, ActionPlan } from '../../../types';
import { formatDate } from '../../../lib/utils';

interface WindowDetailModalProps {
	isOpen: boolean;
	onClose: () => void;
	window: MaintenanceWindow | null;
	anomalies: Anomaly[];
	actionPlans: ActionPlan[];
	onUpdateWindow: (windowId: string, updates: Partial<MaintenanceWindow>) => void;
	mode: 'view' | 'edit';
	onSwitchMode: (mode: 'view' | 'edit') => void;
}

export const WindowDetailModal: React.FC<WindowDetailModalProps> = ({
	isOpen,
	onClose,
	window,
	anomalies,
	actionPlans,
	onUpdateWindow,
	mode,
	onSwitchMode
}) => {
	const [editData, setEditData] = useState<Partial<MaintenanceWindow>>({});
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (window && mode === 'edit') {
			setEditData({
				type: window.type,
				durationDays: window.durationDays,
				startDate: window.startDate,
				endDate: window.endDate,
				description: window.description,
				status: window.status
			});
		}
	}, [window, mode]);

	if (!isOpen || !window) return null;

	// Get assigned anomalies for this window
	const assignedAnomalies = anomalies.filter(a => a.maintenanceWindowId === window.id);
	const relatedActionPlans = actionPlans.filter(ap =>
		assignedAnomalies.some(anomaly => anomaly.id === ap.anomalyId)
	);

	// Calculate statistics
	const totalEstimatedHours = relatedActionPlans.reduce((sum, plan) =>
		sum + (plan.totalDurationDays * 8), 0); // Assuming 8 hours per day

	const utilization = window.durationDays > 0
		? (totalEstimatedHours / (window.durationDays * 24)) * 100
		: 0;

	const handleSave = async () => {
		if (!window.id) return;

		setIsLoading(true);
		try {
			await onUpdateWindow(window.id, editData);
			onSwitchMode('view');
		} catch (error) {
			console.error('Error updating window:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'planned': return 'bg-blue-100 text-blue-800';
			case 'in_progress': return 'bg-yellow-100 text-yellow-800';
			case 'completed': return 'bg-green-100 text-green-800';
			case 'cancelled': return 'bg-red-100 text-red-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	};

	const getTypeColor = (type: string) => {
		switch (type) {
			case 'force': return 'bg-red-100 text-red-800';
			case 'major': return 'bg-blue-100 text-blue-800';
			case 'minor': return 'bg-yellow-100 text-yellow-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	};

	const getCriticalityColor = (level: string) => {
		switch (level) {
			case 'critical': return 'bg-red-500 text-white';
			case 'high': return 'bg-orange-500 text-white';
			case 'medium': return 'bg-yellow-500 text-white';
			case 'low': return 'bg-green-500 text-white';
			default: return 'bg-gray-500 text-white';
		}
	};

	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div className="flex items-center justify-center min-h-full p-2 sm:p-4">
				<div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
						<div className="flex items-center gap-3 min-w-0 flex-1">
							<div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
								<Calendar className="h-5 w-5 text-blue-600" />
							</div>
							<div className="min-w-0 flex-1">
								<h2 className="text-xl font-semibold text-gray-900 truncate">
									{mode === 'edit' ? 'Modifier' : 'Détails'} - Fenêtre de Maintenance
								</h2>
								<p className="text-sm text-gray-600 mt-1">
									{mode === 'edit' ? 'Modifiez les paramètres de la fenêtre' : 'Informations détaillées de la fenêtre'}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							{mode === 'view' ? (
								<Button
									variant="outline"
									size="md"
									onClick={() => onSwitchMode('edit')}
									className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors px-4 py-2"
								>
									<Edit className="h-4 w-4" />
									Modifier
								</Button>
							) : (
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="md"
										onClick={() => onSwitchMode('view')}
										disabled={isLoading}
										className="hover:bg-gray-50 transition-colors px-4 py-2"
									>
										Annuler
									</Button>
									<Button
										size="md"
										onClick={handleSave}
										disabled={isLoading}
										className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2"
									>
										{isLoading ? (
											<div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
										) : (
											<Save className="h-4 w-4" />
										)}
										Sauvegarder
									</Button>
								</div>
							)}
							<Button
								variant="ghost"
								size="md"
								onClick={onClose}
								className="hover:bg-red-50 hover:text-red-600 transition-colors h-10 w-10 p-0"
							>
								<X className="h-5 w-5" />
							</Button>
						</div>
					</div>

					{/* Only keep the assigned anomalies/planning section */}
					<div className="p-4 space-y-4 bg-gray-50">
						<Card className="shadow-sm hover:shadow-md transition-shadow">
							<CardHeader className="pb-2 px-4 py-3">
								<CardTitle className="text-base flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Users className="h-4 w-4 text-orange-600" />
										Anomalies Assignées
									</div>
									<Badge variant="info" className="bg-orange-100 text-orange-800 text-sm px-2 py-1">
										{assignedAnomalies.length}
									</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent className="px-4 pb-3">
								{assignedAnomalies.length === 0 ? (
									<div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg">
										<AlertTriangle className="h-16 w-16 mx-auto mb-6 opacity-30" />
										<p className="font-medium text-xl">Aucune anomalie assignée</p>
										<p className="text-base mt-2">Cette fenêtre de maintenance est disponible pour de nouvelles assignations</p>
									</div>
								) : (
									<div className="space-y-4">
										{assignedAnomalies.map((anomaly, index) => {
											const actionPlan = relatedActionPlans.find(ap => ap.anomalyId === anomaly.id);
											return (
												<div
													key={anomaly.id}
													className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all duration-200 bg-white"
													style={{ animationDelay: `${index * 100}ms` }}
												>
													<div className="flex items-start justify-between">
														<div className="flex-1 min-w-0">
															<div className="flex items-start gap-4">
																<div className="flex-shrink-0">
																	<div className={`w-4 h-4 rounded-full ${getCriticalityColor(anomaly.criticalityLevel).replace('text-white', '').split(' ')[0]} mt-2`} />
																</div>
																<div className="flex-1">
																	<h4 className="font-semibold text-gray-900 mb-2 text-base">
																		{anomaly.title}
																	</h4>
																	<div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
																		<span className="bg-gray-100 px-2 py-1 rounded text-xs">{anomaly.equipmentId}</span>
																		<span>•</span>
																		<span>{anomaly.service}</span>
																	</div>
																	<div className="flex items-center gap-3">
																		<Badge className={getCriticalityColor(anomaly.criticalityLevel)} variant="default">
																			{anomaly.criticalityLevel}
																		</Badge>
																		{actionPlan && (
																			<div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
																				<Clock className="h-3 w-3" />
																				<span>{actionPlan.totalDurationDays} jours</span>
																				<span>•</span>
																				<span>Priorité {actionPlan.priority}</span>
																			</div>
																		)}
																	</div>
																</div>
															</div>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
};
