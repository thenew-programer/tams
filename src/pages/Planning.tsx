import React, { useState, useEffect } from 'react';
import { Calendar, Settings, Zap, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CalendarView } from '../components/planning/CalendarView';
import { IntelligentPlanning } from '../components/planning/IntelligentPlanning';
import { TreatedAnomaliesStatus } from '../components/planning/TreatedAnomaliesStatus';
import { useData } from '../contexts/DataContext';
import { useIntelligentPlanning } from '../hooks/useIntelligentPlanning';
import { usePlanningLogging } from '../hooks/useLogging';
import { MaintenanceWindow } from '../types';
import { planningIntegration } from '../lib/planningUtils';
import PlanningEnhancer from '../lib/planningEnhancer';
import AutoPlanningService from '../services/autoPlanningService';
import toast from 'react-hot-toast';

export const Planning: React.FC = () => {
  const { 
    anomalies, 
    maintenanceWindows, 
    actionPlans, 
    addMaintenanceWindow, 
    updateMaintenanceWindow,
    updateAnomaly 
  } = useData();

  // Filter only treated anomalies for planning
  const treatedAnomalies = anomalies.filter(anomaly => anomaly.status === 'treated');

  const intelligentPlanning = useIntelligentPlanning();
  const { 
    logAutoScheduling, 
    logManualScheduling, 
    logError 
  } = usePlanningLogging();
  const [activeTab, setActiveTab] = useState<'calendar' | 'intelligent'>('calendar');
  const [autoAssignmentEnabled, setAutoAssignmentEnabled] = useState(true);
  
  // Auto-assignment when treated anomalies or windows change
  useEffect(() => {
    if (autoAssignmentEnabled && treatedAnomalies.length > 0 && maintenanceWindows.length > 0) {
      performAutoAssignment();
    }
  }, [treatedAnomalies, maintenanceWindows, autoAssignmentEnabled]);
  
  // Auto-scheduling status indicator
  useEffect(() => {
    if (intelligentPlanning.schedulingInProgress) {
      toast.loading('Auto-scheduling in progress...', { id: 'auto-schedule' });
    } else {
      toast.dismiss('auto-schedule');
    }
  }, [intelligentPlanning.schedulingInProgress]);

  const performAutoAssignment = async () => {
    const startTime = Date.now();
    
    try {
      const results = AutoPlanningService.autoAssignTreatedAnomalies(
        treatedAnomalies, // Use only treated anomalies
        maintenanceWindows,
        actionPlans
      );

      // Update anomalies with new assignments
      results.updatedAnomalies.forEach(anomaly => {
        const original = anomalies.find(a => a.id === anomaly.id);
        if (original && original.maintenanceWindowId !== anomaly.maintenanceWindowId) {
          updateAnomaly(anomaly.id, { maintenanceWindowId: anomaly.maintenanceWindowId });
        }
      });

      // Update windows with assigned anomalies
      results.updatedWindows.forEach(window => {
        const original = maintenanceWindows.find(w => w.id === window.id);
        if (original && window.assignedAnomalies && 
            window.assignedAnomalies.length !== (original.assignedAnomalies?.length || 0)) {
          updateMaintenanceWindow(window.id, window);
        }
      });

      // Show results if there were assignments
      if (results.assignmentResults.length > 0) {
        AutoPlanningService.showAssignmentResults(results.assignmentResults);
      }

      // Log the auto-scheduling action
      const duration = Date.now() - startTime;
      await logAutoScheduling(results.assignmentResults.length, duration);
      
    } catch (error) {
      await logError(error as Error, 'auto-assignment');
    }
  };
  
  const handleSchedule = async (windowId: string, anomalyId: string) => {
    // Find the anomaly and window
    const anomaly = treatedAnomalies.find(a => a.id === anomalyId);
    const window = maintenanceWindows.find(w => w.id === windowId);
    
    if (!anomaly || !window) {
      toast.error('Anomalie ou fenêtre de maintenance introuvable');
      return;
    }
    
    try {
      // Update the anomaly with the maintenance window assignment
      updateAnomaly(anomalyId, { maintenanceWindowId: windowId });
      
      // Log the manual scheduling action
      await logManualScheduling(anomalyId, windowId);
      
      toast.success(`Anomalie "${anomaly.title}" assignée à la fenêtre de maintenance`);
      console.log('Schedule anomaly:', anomalyId, 'to window:', windowId);
    } catch (error) {
      await logError(error as Error, 'manual-scheduling');
    }
  };
  
  const handleCreateWindow = () => {
    // Navigate to create window modal or open inline form
    // For now, we'll set up a placeholder that shows a toast
    toast('Fonctionnalité en cours de développement - Utilisez le bouton "Nouvel Arrêt" dans l\'interface');
    console.log('Create new maintenance window');
  };

  const handleUpdateWindows = (windowData: MaintenanceWindow) => {
    // Auto-assign compatible anomalies to the new window
    const { updatedWindow, updatedAnomalies } = planningIntegration.assignAnomaliesToWindow(windowData, anomalies);
    
    if (maintenanceWindows.find(w => w.id === windowData.id)) {
      // Update existing window
      updateMaintenanceWindow(windowData.id, updatedWindow);
    } else {
      // Add new window
      addMaintenanceWindow(updatedWindow);
    }
    
    // Update anomalies with window assignments
    updatedAnomalies.forEach(anomaly => {
      if (anomaly.maintenanceWindowId !== anomalies.find(a => a.id === anomaly.id)?.maintenanceWindowId) {
        updateAnomaly(anomaly.id, { maintenanceWindowId: anomaly.maintenanceWindowId });
      }
    });
    
    const assignedCount = updatedWindow.assignedAnomalies?.length || 0;
    if (assignedCount > 0) {
      toast.success(`Fenêtre créée avec ${assignedCount} anomalie(s) assignée(s) automatiquement`);
    } else {
      toast.success('Fenêtre de maintenance créée');
    }
  };

  const handleOptimizeWithAI = () => {
    // Use the enhanced planning logic
    const suggestions = PlanningEnhancer.generateOptimizationSuggestions(anomalies, maintenanceWindows, actionPlans);
    const smartScheduleResults = PlanningEnhancer.smartSchedule(anomalies, maintenanceWindows, actionPlans);
    
    if (suggestions.length > 0) {
      toast.success(`${suggestions.length} suggestions d'optimisation trouvées`);
      console.log('AI Optimization suggestions:', suggestions);
      
      // Show scheduling results
      PlanningEnhancer.showSchedulingResults(smartScheduleResults);
    } else {
      toast('Aucune optimisation possible pour le moment');
    }
    
    // Validate current scheduling
    const validation = PlanningEnhancer.validateScheduling(anomalies, maintenanceWindows);
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast.error(error);
      });
    }
  };

  const handleIntelligentScheduleComplete = (results: any[]) => {
    // Refresh the data context when intelligent scheduling completes
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      // You can add a method to refresh data in DataContext
      console.log('Intelligent scheduling completed:', results);
    }
  };

  const handleWindowCreate = (newWindow: MaintenanceWindow) => {
    addMaintenanceWindow(newWindow);
  };

  const handleCreateAutomaticWindow = () => {
    // Find critical anomalies that need immediate attention
    const criticalAnomalies = anomalies.filter(a => 
      a.criticalityLevel === 'critical' && 
      a.status === 'treated' && 
      !a.maintenanceWindowId
    );

    if (criticalAnomalies.length > 0) {
      const firstCritical = criticalAnomalies[0];
      const actionPlan = actionPlans.find(ap => ap.anomalyId === firstCritical.id);
      const autoWindow = PlanningEnhancer.createAutomaticWindow(firstCritical, actionPlan);
      
      addMaintenanceWindow(autoWindow);
      toast.success(`Fenêtre automatique créée pour anomalie critique: ${firstCritical.title}`);
    } else {
      toast('Aucune anomalie critique en attente de programmation');
    }
  };

  const handleAutoAssignTreated = () => {
    // Find all treated anomalies not yet assigned
    const treatedUnassigned = anomalies.filter(a => 
      a.status === 'treated' && !a.maintenanceWindowId
    );

    if (treatedUnassigned.length === 0) {
      toast('Aucune anomalie traitée en attente d\'assignation');
      return;
    }

    // Check if we have open windows
    const openWindows = maintenanceWindows.filter(w => 
      w.status === 'planned' || w.status === 'in_progress'
    );

    if (openWindows.length === 0) {
      // Create windows for treated anomalies
      const newWindows = AutoPlanningService.createWindowForTreatedAnomalies(treatedUnassigned, actionPlans);
      
      newWindows.forEach(window => {
        addMaintenanceWindow(window);
      });

      toast.success(`${newWindows.length} fenêtres automatiques créées pour ${treatedUnassigned.length} anomalies traitées`);
    } else {
      // Assign to existing windows
      performAutoAssignment();
    }
  };

  const handleToggleAutoAssignment = () => {
    setAutoAssignmentEnabled(!autoAssignmentEnabled);
    toast(autoAssignmentEnabled ? 'Auto-assignation désactivée' : 'Auto-assignation activée');
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Planning Intelligent</h1>
                <p className="text-gray-600 text-lg mt-1">Système interactif de planification avec IA pour l'assignation automatique</p>
              </div>
            </div>
            
            {/* Action Controls Moved Here */}
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={handleOptimizeWithAI}
                className="bg-gradient-to-r from-emerald-50 to-green-50 border-green-200 text-green-700 hover:bg-gradient-to-r hover:from-green-100 hover:to-emerald-100 hover:border-green-300 px-6 py-3 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Settings className="h-5 w-5 mr-2" />
                Optimiser IA
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleAutoAssignTreated}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 px-6 py-3 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-200"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Assigner Traitées
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleCreateAutomaticWindow}
                className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-700 hover:bg-gradient-to-r hover:from-orange-100 hover:to-amber-100 hover:border-orange-300 px-6 py-3 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Zap className="h-5 w-5 mr-2" />
                Arrêt Auto
              </Button>

              {/* Toggle Controls */}
              <div className="flex items-center space-x-3 bg-gray-100 rounded-xl p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => intelligentPlanning.setAutoScheduleEnabled(!intelligentPlanning.autoScheduleEnabled)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    intelligentPlanning.autoScheduleEnabled 
                      ? 'bg-green-600 text-white shadow-md' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Auto-Schedule
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleAutoAssignment}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    autoAssignmentEnabled 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Auto-Assign
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-6 mb-8">
          <div className="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full px-4 py-2">
            <div className={`h-3 w-3 rounded-full ${
              intelligentPlanning.autoScheduleEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-semibold text-gray-700">
              Auto-schedule: {intelligentPlanning.autoScheduleEnabled ? 'Activé' : 'Désactivé'}
            </span>
          </div>
          
          <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full px-4 py-2">
            <div className={`h-3 w-3 rounded-full ${
              autoAssignmentEnabled ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-semibold text-gray-700">
              Auto-assign: {autoAssignmentEnabled ? 'Activé' : 'Désactivé'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs and Controls */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            {/* Tab Navigation */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-2xl p-2">
              <Button
                variant={activeTab === 'calendar' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('calendar')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'calendar' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <Calendar className="h-5 w-5 mr-2" />
                Vue Planning
              </Button>
              <Button
                variant={activeTab === 'intelligent' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('intelligent')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'intelligent' 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <Zap className="h-5 w-5 mr-2" />
                IA Automatique
              </Button>
            </div>


          </div>
        </div>
        
        {/* Treated Anomalies Status */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <TreatedAnomaliesStatus
            anomalies={anomalies}
            maintenanceWindows={maintenanceWindows}
            onAutoAssign={handleAutoAssignTreated}
            onCreateWindow={() => {
              const treatedUnassigned = anomalies.filter(a => 
                a.status === 'treated' && !a.maintenanceWindowId
              );
              const newWindows = AutoPlanningService.createWindowForTreatedAnomalies(treatedUnassigned, actionPlans);
              newWindows.forEach(window => addMaintenanceWindow(window));
              toast.success(`${newWindows.length} fenêtres créées pour anomalies traitées`);
            }}
          />
        </div>
        
        {/* Main Content Area */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden min-h-[800px]">
          {activeTab === 'calendar' ? (
            <div className="p-12 min-h-[700px]">
              <CalendarView 
                anomalies={anomalies}
                maintenanceWindows={maintenanceWindows}
                onScheduleAnomaly={handleSchedule}
                onCreateWindow={handleCreateWindow}
                onUpdateWindows={handleUpdateWindows}
                actionPlans={actionPlans}
              />
            </div>
          ) : (
            <div className="p-12 min-h-[700px]">
              <IntelligentPlanning
                onScheduleComplete={handleIntelligentScheduleComplete}
                onWindowCreate={handleWindowCreate}
                anomalies={anomalies}
                maintenanceWindows={maintenanceWindows}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};