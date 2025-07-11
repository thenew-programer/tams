import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, Wrench, AlertTriangle, Save, Calendar, CheckCircle, Loader } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Anomaly, ActionPlan, ActionItem } from '../../types';
import { calculateActionPlanProgress } from '../../lib/planningUtils';
import toast from 'react-hot-toast';
import { supabaseActionPlanService } from '../../services/supabaseActionPlanService';

interface ActionPlanModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (actionPlan: ActionPlan) => void;
	onUpdatePlanning?: (actionPlan: ActionPlan) => void;
	anomaly: Anomaly;
	existingActionPlan?: ActionPlan;
}

export const ActionPlanModal: React.FC<ActionPlanModalProps> = ({
	isOpen,
	onClose,
	onSave,
	onUpdatePlanning,
	anomaly,
	existingActionPlan
}) => {
	const [actionPlan, setActionPlan] = useState<ActionPlan>(
		existingActionPlan || {
			id: `plan-${Date.now()}`,
			anomalyId: anomaly.id,
			needsOutage: false,
			actions: [],
			totalDurationHours: 0,
			totalDurationDays: 0,
			estimatedCost: 0,
			priority: 3,
			comments: '',
			createdAt: new Date(),
			updatedAt: new Date(),
			status: 'draft',
			completionPercentage: 0
		}
	);
	const [isSaving, setIsSaving] = useState(false);
	const [locallyAddedActions, setLocallyAddedActions] = useState<string[]>([]);
	const [locallyRemovedActions, setLocallyRemovedActions] = useState<string[]>([]);

	const [newAction, setNewAction] = useState<Partial<ActionItem>>({
		action: '',
		responsable: '',
		pdrsDisponible: 'OUI',
		ressourcesInternes: '',
		ressourcesExternes: '',
		statut: 'planifie',
		dureeHeures: 0,
		dureeJours: 0
	});

	const responsableOptions = [
		{ value: 'MC', label: 'MC - Maintenance Centrale' },
		{ value: 'MP', label: 'MP - Maintenance Préventive' },
		{ value: 'OP', label: 'OP - Opérateur' },
		{ value: 'EXT', label: 'EXT - Prestataire Externe' },
		{ value: 'ING', label: 'ING - Ingénieur' }
	];


	const statutOptions = [
		{ value: 'planifie', label: 'Planifié' },
		{ value: 'en_cours', label: 'En cours' },
		{ value: 'termine', label: 'Terminé' },
		{ value: 'reporte', label: 'Reporté' }
	];

	const outageTypeOptions = [
		{ value: 'force', label: 'Arrêt Forcé (1-3 jours)' },
		{ value: 'minor', label: 'Arrêt Mineur (3-7 jours)' },
		{ value: 'major', label: 'Arrêt Majeur (14-42 jours)' }
	];

	useEffect(() => {
		calculateTotalDuration();
		updateCompletionPercentage();
	}, [actionPlan.actions]);

	const calculateTotalDuration = () => {
		const totalHours = actionPlan.actions.reduce((sum, action) => sum + action.dureeHeures, 0);
		const totalDays = actionPlan.actions.reduce((sum, action) => sum + action.dureeJours, 0);

		setActionPlan(prev => ({
			...prev,
			totalDurationHours: totalHours,
			totalDurationDays: totalDays,
			updatedAt: new Date()
		}));
	};

	const updateCompletionPercentage = () => {
		const percentage = calculateActionPlanProgress(actionPlan);
		setActionPlan(prev => ({
			...prev,
			completionPercentage: percentage
		}));
	};

	const addAction = () => {
		if (!newAction.action || !newAction.responsable) return;

		const actionId = `action-${Date.now()}`;
		const action: ActionItem = {
			id: actionId,
			action: newAction.action || '',
			responsable: newAction.responsable || '',
			pdrsDisponible: newAction.pdrsDisponible || 'OUI',
			ressourcesInternes: newAction.ressourcesInternes || '',
			ressourcesExternes: newAction.ressourcesExternes || '',
			statut: newAction.statut || 'planifie',
			dureeHeures: newAction.dureeHeures || 0,
			dureeJours: newAction.dureeJours || 0
		};

		setActionPlan(prev => ({
			...prev,
			actions: [...prev.actions, action]
		}));

		// Track this as a locally added action
		setLocallyAddedActions(prev => [...prev, actionId]);

		setNewAction({
			action: '',
			responsable: '',
			ressourcesInternes: '',
			ressourcesExternes: '',
			statut: 'planifie',
			dureeHeures: 0,
			dureeJours: 0,
		});
	};

	const removeAction = (actionId: string) => {
		// If this is a locally added action (not yet in DB), just remove it from the list
		if (locallyAddedActions.includes(actionId)) {
			setActionPlan(prev => ({
				...prev,
				actions: prev.actions.filter(a => a.id !== actionId)
			}));
			
			// Remove from locally added actions tracking
			setLocallyAddedActions(locallyAddedActions.filter(id => id !== actionId));
		} else {
			// This is an action that exists in the DB, mark it for removal
			setLocallyRemovedActions([...locallyRemovedActions, actionId]);
			
			// Remove from UI
			setActionPlan(prev => ({
				...prev,
				actions: prev.actions.filter(a => a.id !== actionId)
			}));
		}
	};

	const updateAction = (actionId: string, field: keyof ActionItem, value: any) => {
		setActionPlan(prev => ({
			...prev,
			actions: prev.actions.map(action => {
				if (action.id === actionId) {
					return { ...action, [field]: value };
				}
				return action;
			}),
			updatedAt: new Date()
		}));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			// Update status based on completion
			let status: ActionPlan['status'] = 'draft';
			if (actionPlan.completionPercentage === 100) {
				status = 'completed';
			} else if (actionPlan.completionPercentage > 0) {
				status = 'in_progress';
			} else if (actionPlan.actions.length > 0) {
				status = 'approved';
			}

			actionPlan.status = status;
			actionPlan.updatedAt = new Date();

			let dbActionPlanId = actionPlan.id;
			let isNewPlan = dbActionPlanId.startsWith('plan-');
			let updatedPlan: ActionPlan | null = null;

			// 1. First create or update the base action plan
			if (isNewPlan) {
				// Create a new action plan with all actions
				updatedPlan = await supabaseActionPlanService.createActionPlan({
					anomalyId: actionPlan.anomalyId,
					needsOutage: actionPlan.needsOutage,
					outageType: actionPlan.outageType as any,
					outageDuration: actionPlan.outageDuration,
					plannedDate: actionPlan.plannedDate,
					estimatedCost: actionPlan.estimatedCost,
					priority: actionPlan.priority,
					comments: actionPlan.comments || '',
					actions: actionPlan.actions.map(action => ({
						action: action.action,
						responsable: action.responsable,
						pdrsDisponible: action.pdrsDisponible || '',
						ressourcesInternes: action.ressourcesInternes || '',
						ressourcesExternes: action.ressourcesExternes || '',
						dureeHeures: action.dureeHeures,
						dureeJours: action.dureeJours,
						dateDebut: action.dateDebut,
						dateFin: action.dateFin,
					}))
				});
			} else {
				// Update existing action plan
				updatedPlan = await supabaseActionPlanService.updateActionPlan(
					actionPlan.id,
					{
						needsOutage: actionPlan.needsOutage,
						outageType: actionPlan.outageType as any,
						outageDuration: actionPlan.outageDuration,
						plannedDate: actionPlan.plannedDate,
						estimatedCost: actionPlan.estimatedCost,
						priority: actionPlan.priority,
						comments: actionPlan.comments,
						status: status
					}
				);
			}

			if (!updatedPlan) {
				throw new Error("Failed to create/update action plan");
			}

			dbActionPlanId = updatedPlan.id;
			
			// 2. For existing plans, add any new actions to the database
			if (!isNewPlan) {
				for (const action of actionPlan.actions) {
					// If this is a local action that hasn't been saved yet
					if (action.id.startsWith('action-') && locallyAddedActions.includes(action.id)) {
						await supabaseActionPlanService.addActionItem(dbActionPlanId, {
							action: action.action,
							responsable: action.responsable,
							pdrsDisponible: action.pdrsDisponible || '',
							ressourcesInternes: action.ressourcesInternes || '',
							ressourcesExternes: action.ressourcesExternes || '',
							statut: action.statut,
							dureeHeures: action.dureeHeures,
							dureeJours: action.dureeJours,
							dateDebut: action.dateDebut,
							dateFin: action.dateFin,
						});
					}
				}
			}
			
			// 3. Delete any actions that were removed
			for (const actionId of locallyRemovedActions) {
				if (!actionId.startsWith('action-')) {
					await supabaseActionPlanService.deleteActionItem(dbActionPlanId, actionId);
				}
			}
			
			// 4. Get the final updated plan
			const finalPlan = await supabaseActionPlanService.getActionPlan(anomaly.id);
			if (finalPlan) {
				onSave(finalPlan);
				
				// Reset tracking arrays
				setLocallyAddedActions([]);
				setLocallyRemovedActions([]);
				
				// Auto-update planning if outage is required
				if (finalPlan.needsOutage && onUpdatePlanning) {
					onUpdatePlanning(finalPlan);
					
					if (finalPlan.outageType === 'force') {
						toast.success('Plan d\'action sauvegardé et arrêt d\'urgence créé automatiquement');
					} else {
						toast.success('Plan d\'action sauvegardé et intégré au planning');
					}
				} else {
					toast.success('Plan d\'action sauvegardé avec succès');
				}
				
				onClose();
			}
		} catch (error) {
			console.error('Error saving action plan:', error);
			toast.error('Erreur lors de la sauvegarde du plan d\'action');
		} finally {
			setIsSaving(false);
		}
	};

	const getOutageDurationRange = (type: string) => {
		switch (type) {
			case 'force': return '1-3 jours';
			case 'minor': return '3-7 jours';
			case 'major': return '14-42 jours';
			default: return '';
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
			<div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-gray-200">
				{/* Header */}
				<div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
					<div className="flex items-center space-x-4">
						<div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
							<Wrench className="w-8 h-8 text-white" />
						</div>
						<div>
							<h2 className="text-3xl font-bold text-gray-900 tracking-tight">Plan d'Action</h2>
							<p className="text-sm text-gray-600 mt-1 font-medium">
								Anomalie #{anomaly.id.substring(0, 8)} • {anomaly.equipmentId}
							</p>
						</div>
					</div>
					<div className="flex items-center space-x-4">
						{actionPlan.actions.length > 0 && (
							<div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
								<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
								<span className="text-sm font-semibold text-gray-700">{actionPlan.completionPercentage}% terminé</span>
							</div>
						)}
						<Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700 hover:bg-white/80 rounded-full p-2">
							<X className="w-6 h-6" />
						</Button>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto">
					<div className="p-8 space-y-8">
						{/* Planning Section */}
						<div className="bg-gradient-to-br from-white to-blue-50/30 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
							<div className="p-8">
								<div className="flex items-center space-x-4 mb-6">
									<div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
										<Calendar className="w-6 h-6 text-white" />
									</div>
									<div>
										<h3 className="text-xl font-bold text-gray-900">Planification d'Arrêt</h3>
										<p className="text-sm text-gray-600">Configuration de l'arrêt de production nécessaire</p>
									</div>
								</div>

								<div className="space-y-6">
									<div className="flex items-center space-x-4">
										<label className="flex items-center space-x-4 cursor-pointer group">
											<div className="relative">
												<input
													type="checkbox"
													checked={actionPlan.needsOutage}
													onChange={(e) => setActionPlan(prev => ({ ...prev, needsOutage: e.target.checked }))}
													className="sr-only"
												/>
												<div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
													actionPlan.needsOutage 
														? 'bg-blue-600 border-blue-600 shadow-md' 
														: 'border-gray-300 group-hover:border-blue-400 group-hover:bg-blue-50'
												}`}>
													{actionPlan.needsOutage && (
														<CheckCircle className="w-4 h-4 text-white" />
													)}
												</div>
											</div>
											<span className="text-base font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
												Nécessite un arrêt de production
											</span>
										</label>
									</div>

									{actionPlan.needsOutage && (
										<div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8 space-y-6 shadow-inner">
											<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
												<div>
													<label className="block text-sm font-semibold text-gray-800 mb-3">
														Type d'Arrêt
													</label>
													<Select
														options={outageTypeOptions}
														value={actionPlan.outageType || ''}
														onChange={(e) => setActionPlan(prev => ({ ...prev, outageType: e.target.value as any }))}
														className="w-full"
													/>
												</div>

												<div>
													<label className="block text-sm font-semibold text-gray-800 mb-3">
														Durée Estimée (jours)
													</label>
													<Input
														type="number"
														min="1"
														max={actionPlan.outageType === 'force' ? '3' : actionPlan.outageType === 'minor' ? '7' : '42'}
														value={actionPlan.outageDuration || ''}
														onChange={(e) => setActionPlan(prev => ({ ...prev, outageDuration: parseInt(e.target.value) }))}
														className="w-full"
													/>
													{actionPlan.outageType && (
														<p className="text-xs text-blue-700 mt-2 font-semibold bg-blue-100 rounded-full px-3 py-1 inline-block">
															Plage: {getOutageDurationRange(actionPlan.outageType)}
														</p>
													)}
												</div>

												<div>
													<label className="block text-sm font-semibold text-gray-800 mb-3">
														Date Planifiée
													</label>
													<Input
														type="date"
														value={actionPlan.plannedDate ? actionPlan.plannedDate.toISOString().slice(0, 10) : ''}
														onChange={(e) => setActionPlan(prev => ({
															...prev,
															plannedDate: e.target.value ? new Date(e.target.value) : undefined
														}))}
														className="w-full"
													/>
												</div>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Actions Section */}
						<div className="bg-gradient-to-br from-white to-green-50/30 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
							<div className="p-8">
								<div className="flex items-center justify-between mb-8">
									<div className="flex items-center space-x-4">
										<div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
											<CheckCircle className="w-6 h-6 text-white" />
										</div>
										<div>
											<h3 className="text-xl font-bold text-gray-900">Actions à Réaliser</h3>
											<p className="text-sm text-gray-600">
												{actionPlan.actions.length} action{actionPlan.actions.length !== 1 ? 's' : ''} définie{actionPlan.actions.length !== 1 ? 's' : ''}
											</p>
										</div>
									</div>
									
									{actionPlan.actions.length > 0 && (
										<div className="flex items-center space-x-2">
											<div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm font-semibold">
												{actionPlan.actions.filter(a => a.statut === 'planifie').length} Planifiées
											</div>
											<div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-full text-sm font-semibold">
												{actionPlan.actions.filter(a => a.statut === 'en_cours').length} En cours
											</div>
											<div className="bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm font-semibold">
												{actionPlan.actions.filter(a => a.statut === 'termine').length} Terminées
											</div>
										</div>
									)}
								</div>

								{/* Actions List */}
								{actionPlan.actions.length > 0 && (
									<div className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
										<div className="overflow-x-auto">
											<table className="min-w-full divide-y divide-gray-200">
												<thead className="bg-gray-50">
													<tr>
														<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Action
														</th>
														<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Responsable
														</th>
														<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Ressources Int.
														</th>
														<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Ressources Ext.
														</th>
														<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Durée
														</th>
														<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Statut
														</th>
														<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Actions
														</th>
													</tr>
												</thead>
												<tbody className="bg-white divide-y divide-gray-200">
													{actionPlan.actions.map((action) => (
														<tr key={action.id} className="hover:bg-gray-50 transition-colors">
															<td className="px-6 py-4">
																<input
																	type="text"
																	value={action.action}
																	onChange={(e) => updateAction(action.id, 'action', e.target.value)}
																	className="w-full text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg px-3 py-2"
																	placeholder="Description de l'action"
																/>
															</td>
															<td className="px-6 py-4">
																<select
																	value={action.responsable}
																	onChange={(e) => updateAction(action.id, 'responsable', e.target.value)}
																	className="text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg px-3 py-2 w-full"
																>
																	{responsableOptions.map(opt => (
																		<option key={opt.value} value={opt.value}>{opt.value}</option>
																	))}
																</select>
															</td>
															<td className="px-6 py-4">
																<input
																	type="text"
																	value={action.ressourcesInternes}
																	onChange={(e) => updateAction(action.id, 'ressourcesInternes', e.target.value)}
																	className="w-full text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg px-3 py-2"
																	placeholder="Ex: 1 mécanicien"
																/>
															</td>
															<td className="px-6 py-4">
																<input
																	type="text"
																	value={action.ressourcesExternes}
																	onChange={(e) => updateAction(action.id, 'ressourcesExternes', e.target.value)}
																	className="w-full text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg px-3 py-2"
																	placeholder="Ex: 1 chaudronnier"
																/>
															</td>
															<td className="px-6 py-4">
																<div className="flex space-x-2">
																	<input
																		type="number"
																		min="0"
																		value={action.dureeJours}
																		onChange={(e) => updateAction(action.id, 'dureeJours', parseInt(e.target.value) || 0)}
																		className="w-16 text-xs border border-gray-300 rounded-lg px-2 py-1 text-center"
																		placeholder="J"
																	/>
																	<input
																		type="number"
																		min="0"
																		max="23"
																		value={action.dureeHeures}
																		onChange={(e) => updateAction(action.id, 'dureeHeures', parseInt(e.target.value) || 0)}
																		className="w-16 text-xs border border-gray-300 rounded-lg px-2 py-1 text-center"
																		placeholder="H"
																	/>
																</div>
															</td>
															<td className="px-6 py-4">
																<select
																	value={action.statut}
																	onChange={(e) => updateAction(action.id, 'statut', e.target.value)}
																	className="text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg px-3 py-2 w-full"
																>
																	{statutOptions.map(opt => (
																		<option key={opt.value} value={opt.value}>{opt.label}</option>
																	))}
																</select>
															</td>
															<td className="px-6 py-4">
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => removeAction(action.id)}
																	className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-2"
																>
																	<Trash2 className="w-4 h-4" />
																</Button>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								)}

								{/* Add New Action */}
								<div className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-dashed border-blue-300 rounded-2xl p-8 hover:border-blue-400 transition-colors">
									<div className="flex items-center space-x-4 mb-6">
										<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
											<Plus className="w-5 h-5 text-white" />
										</div>
										<h4 className="text-lg font-bold text-gray-900">Ajouter une nouvelle action</h4>
									</div>
									
									<div className="space-y-6">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											<div>
												<label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
												<Input
													placeholder="Description de l'action"
													value={newAction.action || ''}
													onChange={(e) => setNewAction(prev => ({ ...prev, action: e.target.value }))}
													className="w-full"
												/>
											</div>
											<div>
												<label className="block text-sm font-semibold text-gray-800 mb-2">Responsable</label>
												<Select
													options={responsableOptions}
													value={newAction.responsable || ''}
													onChange={(e) => setNewAction(prev => ({ ...prev, responsable: e.target.value }))}
													className="w-full"
												/>
											</div>
										</div>
										
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											<div>
												<label className="block text-sm font-semibold text-gray-800 mb-2">Ressources internes</label>
												<Input
													placeholder="Ex: 1 mécanicien, 2h"
													value={newAction.ressourcesInternes || ''}
													onChange={(e) => setNewAction(prev => ({ ...prev, ressourcesInternes: e.target.value }))}
													className="w-full"
												/>
											</div>
											<div>
												<label className="block text-sm font-semibold text-gray-800 mb-2">Ressources externes</label>
												<Input
													placeholder="Ex: 1 chaudronnier, 4h"
													value={newAction.ressourcesExternes || ''}
													onChange={(e) => setNewAction(prev => ({ ...prev, ressourcesExternes: e.target.value }))}
													className="w-full"
												/>
											</div>
										</div>
										
										<div className="flex items-end space-x-4">
											<div className="flex space-x-3">
												<div>
													<label className="block text-sm font-semibold text-gray-800 mb-2">Jours</label>
													<Input
														type="number"
														min="0"
														placeholder="0"
														value={newAction.dureeJours || ''}
														onChange={(e) => setNewAction(prev => ({ ...prev, dureeJours: parseInt(e.target.value) || 0 }))}
														className="w-20"
													/>
												</div>
												<div>
													<label className="block text-sm font-semibold text-gray-800 mb-2">Heures</label>
													<Input
														type="number"
														min="0"
														max="23"
														placeholder="0"
														value={newAction.dureeHeures || ''}
														onChange={(e) => setNewAction(prev => ({ ...prev, dureeHeures: parseInt(e.target.value) || 0 }))}
														className="w-20"
													/>
												</div>
											</div>
											<Button 
												onClick={addAction} 
												disabled={!newAction.action || !newAction.responsable}
												className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200"
											>
												<Plus className="w-5 h-5 mr-2" />
												Ajouter l'action
											</Button>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Summary and Comments */}
						<div className="bg-gradient-to-br from-white to-purple-50/30 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
							<div className="p-8">
								<div className="flex items-center space-x-4 mb-6">
									<div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
										<Clock className="w-6 h-6 text-white" />
									</div>
									<div>
										<h3 className="text-xl font-bold text-gray-900">Résumé et Commentaires</h3>
										<p className="text-sm text-gray-600">Informations supplémentaires et notes importantes</p>
									</div>
								</div>

								<div className="space-y-6">
									<div>
										<label className="block text-sm font-semibold text-gray-800 mb-3">
											Commentaires additionnels
										</label>
										<textarea
											value={actionPlan.comments}
											onChange={(e) => setActionPlan(prev => ({ ...prev, comments: e.target.value }))}
											rows={4}
											className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm resize-none"
											placeholder="Ajoutez des commentaires, instructions spéciales, ou notes importantes sur ce plan d'action..."
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Planning Integration Alert */}
						{actionPlan.needsOutage && (
							<div className={`rounded-2xl border-2 p-8 shadow-md ${
								actionPlan.outageType === 'force'
									? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
									: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
							}`}>
								<div className="flex items-start space-x-4">
									<div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
										actionPlan.outageType === 'force' 
											? 'bg-gradient-to-br from-red-500 to-red-600' 
											: 'bg-gradient-to-br from-blue-500 to-blue-600'
									}`}>
										<AlertTriangle className="w-6 h-6 text-white" />
									</div>
									<div>
										<h4 className={`text-lg font-bold ${
											actionPlan.outageType === 'force' ? 'text-red-900' : 'text-blue-900'
										}`}>
											{actionPlan.outageType === 'force'
												? 'Arrêt d\'urgence - Création automatique'
												: 'Intégration au planning de maintenance'
											}
										</h4>
										<p className={`text-sm mt-2 ${
											actionPlan.outageType === 'force' ? 'text-red-700' : 'text-blue-700'
										}`}>
											{actionPlan.outageType === 'force'
												? 'Un arrêt d\'urgence sera automatiquement ajouté au planning lors de la sauvegarde. Les équipes seront notifiées immédiatement.'
												: 'Le système recherchera automatiquement un créneau compatible dans le planning existant ou créera un nouvel arrêt si nécessaire.'
											}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="flex justify-between items-center p-8 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
					<div className="text-sm text-gray-700 font-medium">
						{actionPlan.actions.length > 0 && (
							<div className="flex items-center space-x-4">
								<span className="bg-white px-4 py-2 rounded-full shadow-sm">
									Durée totale: {actionPlan.totalDurationDays} jour{actionPlan.totalDurationDays !== 1 ? 's' : ''} et {actionPlan.totalDurationHours} heure{actionPlan.totalDurationHours !== 1 ? 's' : ''}
								</span>
							</div>
						)}
					</div>
					<div className="flex space-x-4">
						<Button 
							variant="outline" 
							onClick={onClose} 
							className="px-8 py-3 rounded-xl font-semibold border-2 hover:bg-gray-50"
						>
							Annuler
						</Button>
						<Button 
							onClick={handleSave} 
							disabled={isSaving || actionPlan.actions.length === 0}
							className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200"
						>
							{isSaving ? (
								<>
									<Loader className="w-5 h-5 mr-2 animate-spin" />
									Sauvegarde...
								</>
							) : (
								<>
									<Save className="w-5 h-5 mr-2" />
									Sauvegarder le Plan
								</>
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
