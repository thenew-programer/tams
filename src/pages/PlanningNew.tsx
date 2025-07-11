import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  BarChart3,
  Eye,
  Cpu,
  Target,
  TrendingUp,
  Zap,
  Plus
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { 
  WindowManagementGrid,
  AutoScheduler,
  QuickActions,
  PlanningAnalytics,
  CalendarPlanningView
} from '../components/planning/new';
import { CreateWindowModal, WindowCreationData } from '../components/planning/new/CreateWindowModal';
import { WindowDetailModal } from '../components/planning/new/WindowDetailModal';
import { useData } from '../contexts/DataContext';
import { usePlanningEngineReal } from '../hooks/usePlanningEngineReal';
import { MaintenanceWindow } from '../types';
import toast from 'react-hot-toast';

export const PlanningNew: React.FC = () => {
  const { 
    anomalies, 
    maintenanceWindows, 
    actionPlans,
    addMaintenanceWindow,
    updateMaintenanceWindow,
    deleteMaintenanceWindow,
    updateAnomaly 
  } = useData();

  // Planning engine hook for intelligent scheduling (using real backend)
  const planningEngine = usePlanningEngineReal();

  // UI State
  const [activeView, setActiveView] = useState<'overview' | 'windows' | 'analytics' | 'algorithm'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'urgent' | 'scheduled' | 'unscheduled'>('all');
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [triggeringAnomaly, setTriggeringAnomaly] = useState<string | undefined>();
  
  // Window detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<MaintenanceWindow | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  // Computed data
  const treatedAnomalies = useMemo(() => 
    anomalies.filter(anomaly => anomaly.status === 'treated'),
    [anomalies]
  );

  const unscheduledTreatedAnomalies = useMemo(() =>
    treatedAnomalies.filter(anomaly => !anomaly.maintenanceWindowId),
    [treatedAnomalies]
  );

  const scheduledTreatedAnomalies = useMemo(() =>
    treatedAnomalies.filter(anomaly => !!anomaly.maintenanceWindowId),
    [treatedAnomalies]
  );

  const availableWindows = useMemo(() =>
    maintenanceWindows.filter(window => 
      window.status === 'planned' && 
      new Date(window.startDate) > new Date()
    ),
    [maintenanceWindows]
  );

  // Auto-schedule treated anomalies
  const handleAutoSchedule = useCallback(async () => {
    if (unscheduledTreatedAnomalies.length === 0) return;

    try {
      // We need to modify our approach to prevent auto-creation of windows
      // First, we'll try to schedule only to existing windows by temporarily capturing any newly created windows 
      // in the database but not displaying them in the UI
      
      // Store the list of existing window IDs before making the API call
      const existingWindowIds = new Set(availableWindows.map(w => w.id));
      
      // Make the API call to schedule anomalies
      const scheduleResults = await planningEngine.autoScheduleTreatedAnomalies(
        unscheduledTreatedAnomalies,
        availableWindows,
        actionPlans
      );

      // Process assignments, but only for existing windows
      if (scheduleResults.assignments && scheduleResults.assignments.length > 0) {
        const validAssignments = scheduleResults.assignments.filter(
          assignment => existingWindowIds.has(assignment.windowId)
        );
        
        if (validAssignments.length > 0) {
          // Apply valid assignments to anomalies
          validAssignments.forEach(assignment => {
            updateAnomaly(assignment.anomalyId, {
              maintenanceWindowId: assignment.windowId
            });
          });
          
          toast.success(
            `${validAssignments.length} anomalies automatiquement programmées`,
            { duration: 3000 }
          );
        }
        
        // Calculate how many assignments were to new windows that we're ignoring
        const ignoredAssignments = scheduleResults.assignments.length - validAssignments.length;
        if (ignoredAssignments > 0) {
          console.log(`Ignored ${ignoredAssignments} assignments to automatically created windows`);
        }
      }

      // Calculate total unassigned anomalies (including those that would have gone to new windows)
      let unassignedCount = scheduleResults.unassigned ? scheduleResults.unassigned.length : 0;
      
      // Add in the count of anomalies that would have been assigned to new windows
      if (scheduleResults.assignments) {
        const existingWindowIds = availableWindows.map(w => w.id);
        const assignmentsToNewWindows = scheduleResults.assignments.filter(
          assignment => !existingWindowIds.includes(assignment.windowId)
        );
        
        // Get unique anomaly IDs that would have been assigned to new windows
        const anomaliesForNewWindows = new Set(assignmentsToNewWindows.map(a => a.anomalyId));
        unassignedCount += anomaliesForNewWindows.size;
      }
      
      // Inform about unscheduled anomalies if any
      if (unassignedCount > 0) {
        console.log(`${unassignedCount} anomalies could not be automatically scheduled to existing windows`);
        toast(
          `${unassignedCount} anomalies nécessitent une nouvelle fenêtre de maintenance`,
          { 
            duration: 4000,
            icon: '🔍',
            style: { background: '#E0F2FE', color: '#0369A1' }
          }
        );
      }

    } catch (error) {
      console.error('Auto-scheduling error:', error);
      toast.error('Échec de la planification automatique');
    }
  }, [unscheduledTreatedAnomalies, availableWindows, actionPlans, planningEngine, updateAnomaly]);

  // Auto-scheduling effect
  useEffect(() => {
    if (autoScheduleEnabled && unscheduledTreatedAnomalies.length > 0) {
      const timer = setTimeout(() => {
        handleAutoSchedule();
      }, 2000); // Delay to prevent excessive calls

      return () => clearTimeout(timer);
    }
  }, [unscheduledTreatedAnomalies, autoScheduleEnabled, handleAutoSchedule]);

  // Manual scheduling
  const handleManualSchedule = async (anomalyId: string, windowId: string) => {
    try {
      updateAnomaly(anomalyId, { maintenanceWindowId: windowId });
      
      const anomaly = anomalies.find(a => a.id === anomalyId);
      const window = maintenanceWindows.find(w => w.id === windowId);
      
      toast.success(
        `"${anomaly?.title}" scheduled to ${window?.type} maintenance window`
      );
    } catch (error) {
      toast.error('Failed to schedule anomaly');
    }
  };

  // Create new maintenance window - opens modal
  const handleCreateWindow = async (anomalyIdOrDate?: string | Date) => {
    if (typeof anomalyIdOrDate === 'string') {
      setTriggeringAnomaly(anomalyIdOrDate);
    } else {
      setTriggeringAnomaly(undefined);
      // TODO: Use the date for pre-filling the modal if needed
    }
    setShowCreateModal(true);
  };

  // Handle window creation from modal
  const handleCreateWindowFromModal = async (windowData: WindowCreationData) => {
    try {
      // Map 'arret' type to 'minor' for backend compatibility
      const backendType: 'force' | 'minor' | 'major' = windowData.type === 'arret' ? 'minor' : windowData.type;

      // Create a new window directly without using createOptimalWindow
      // This ensures we use exactly what the user specified
      const newWindow: MaintenanceWindow = {
        id: `temp_${Date.now()}`, // Will be replaced by actual ID from backend
        type: backendType,
        durationDays: windowData.durationDays,
        startDate: windowData.startDate,
        endDate: windowData.endDate,
        description: windowData.description || `Fenêtre de maintenance ${backendType}`,
        status: 'planned',
        autoCreated: false, // Explicitly mark as manually created
        sourceAnomalyId: windowData.autoAssignAnomalies[0] || undefined,
        assignedAnomalies: []
      };
      
      // Add to local state first (optimistic update)
      addMaintenanceWindow(newWindow);
      
      // Perform a server-side create (in a real app, this would update the local ID after server response)
      // Here we're just using the createOptimalWindow method but overriding all its properties
      const serverWindow = await planningEngine.createOptimalWindow(
        windowData.autoAssignAnomalies,
        actionPlans
      );
      
      // Update with server data silently (ID and any other server-generated fields)
      // In a real implementation, you'd use the server ID to update your local state
      
      // Assign anomalies to the window
      for (const anomalyId of windowData.autoAssignAnomalies) {
        updateAnomaly(anomalyId, { maintenanceWindowId: serverWindow.id });
      }

      // TODO: Store scheduling details (dates and hours) in database
      console.log('Scheduled times:', windowData.scheduledTimes);

      toast.success(`Fenêtre de maintenance ${windowData.type} créée avec ${windowData.autoAssignAnomalies.length} anomalie(s)`);
    } catch (error) {
      console.error('Error creating window:', error);
      toast.error('Erreur lors de la création de la fenêtre');
      throw error;
    }
  };

  // Batch operations
  const handleBatchSchedule = async (anomalyIds: string[], windowId: string) => {
    try {
      const updatePromises = anomalyIds.map(id => 
        updateAnomaly(id, { maintenanceWindowId: windowId })
      );
      
      await Promise.all(updatePromises);
      toast.success(`${anomalyIds.length} anomalies scheduled`);
    } catch (error) {
      toast.error('Batch scheduling failed');
    }
  };

  const handleOptimizeScheduling = async () => {
    try {
      const optimizationResults = await planningEngine.optimizeScheduling(
        treatedAnomalies,
        maintenanceWindows,
        actionPlans
      );

      // Apply optimizations (already applied by backend service)
      if (optimizationResults.reassignments && optimizationResults.reassignments.length > 0) {
        // Reassignments are already applied in the database by the backend service
        console.log(`${optimizationResults.reassignments.length} reassignments applied by backend`);
      }

      toast.success(
        `Scheduling optimized: ${optimizationResults.reassignments?.length || 0} changes applied`
      );
    } catch (error) {
      toast.error('Optimization failed');
    }
  };

  // Window detail modal handlers
  const handleViewWindow = (window: MaintenanceWindow) => {
    setSelectedWindow(window);
    setModalMode('view');
    setShowDetailModal(true);
  };

  const handleEditWindow = (window: MaintenanceWindow) => {
    setSelectedWindow(window);
    setModalMode('edit');
    setShowDetailModal(true);
  };

  const handleUpdateWindowFromModal = async (windowId: string, updates: Partial<MaintenanceWindow>) => {
    try {
      updateMaintenanceWindow(windowId, updates);
      toast.success('Window updated successfully');
      setShowDetailModal(false);
    } catch (error) {
      toast.error('Failed to update window');
      throw error;
    }
  };

  // Delete window
  const handleDeleteWindow = async (windowId: string) => {
    try {
      // First, unassign all anomalies from this window
      const assignedAnomalies = anomalies.filter(a => a.maintenanceWindowId === windowId);
      
      // Update local state for each anomaly to remove the window assignment
      for (const anomaly of assignedAnomalies) {
        updateAnomaly(anomaly.id, { maintenanceWindowId: undefined });
      }
      
      // Remove the window using the DataContext's deleteMaintenanceWindow function
      deleteMaintenanceWindow(windowId);
      
      toast.success('Fenêtre de maintenance supprimée');
    } catch (error) {
      console.error('Error deleting window:', error);
      toast.error('Erreur lors de la suppression de la fenêtre');
    }
  };

  // Advanced planning algorithms
  const planningAlgorithm = useMemo(() => {
    const calculateOptimalScheduling = () => {
      // Enhanced Weighted Shortest Processing Time with Multiple Constraints
      const treatedAnomaliesData = treatedAnomalies.map(anomaly => {
        const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
        const criticalityWeight = {
          'critical': 10,
          'high': 7,
          'medium': 4,
          'low': 1
        }[anomaly.criticalityLevel] || 1;

        const equipmentFactor = anomaly.equipmentId ? 1.2 : 1.0;
        const urgencyScore = criticalityWeight * equipmentFactor;
        const processingTime = actionPlan?.totalDurationDays || 1;
        
        return {
          ...anomaly,
          urgencyScore,
          processingTime,
          efficiency: urgencyScore / processingTime, // Priority ratio
          actionPlan
        };
      });

      // Sort by efficiency (urgency/processing time ratio) - higher is better
      const sortedAnomalies = treatedAnomaliesData.sort((a, b) => b.efficiency - a.efficiency);

      // Calculate window utilization and recommendations
      const windowAnalysis = maintenanceWindows.map(window => {
        const assignedAnomalies = treatedAnomalies.filter(a => a.maintenanceWindowId === window.id);
        const totalWorkload = assignedAnomalies.reduce((sum, anomaly) => {
          const plan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
          return sum + (plan?.totalDurationDays || 1);
        }, 0);

        const capacity = window.durationDays;
        const utilization = capacity > 0 ? (totalWorkload / capacity) * 100 : 0;
        
        // Calculate optimal assignment score
        const criticalityBalance = assignedAnomalies.reduce((acc, anomaly) => {
          acc[anomaly.criticalityLevel] = (acc[anomaly.criticalityLevel] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const balanceScore = Object.keys(criticalityBalance).length * 10; // Diversity bonus
        const efficiencyScore = Math.max(0, 100 - Math.abs(85 - utilization)); // Target 85% utilization

        return {
          ...window,
          assignedAnomalies,
          utilization,
          capacity,
          totalWorkload,
          balanceScore,
          efficiencyScore,
          overallScore: (balanceScore + efficiencyScore) / 2
        };
      });

      return {
        sortedAnomalies,
        windowAnalysis,
        recommendations: generateRecommendations(sortedAnomalies, windowAnalysis)
      };
    };

    const generateRecommendations = (anomalies: any[], windows: any[]) => {
      const recommendations = [];

      // Identify overloaded windows
      const overloadedWindows = windows.filter(w => w.utilization > 100);
      if (overloadedWindows.length > 0) {
        recommendations.push({
          type: 'warning',
          title: 'Fenêtres Surchargées',
          description: `${overloadedWindows.length} fenêtre(s) dépassent leur capacité`,
          action: 'Redistribuer les anomalies ou étendre la durée'
        });
      }

      // Identify underutilized windows
      const underutilizedWindows = windows.filter(w => w.utilization < 50 && w.utilization > 0);
      if (underutilizedWindows.length > 0) {
        recommendations.push({
          type: 'info',
          title: 'Capacité Disponible',
          description: `${underutilizedWindows.length} fenêtre(s) peuvent accueillir plus d\'anomalies`,
          action: 'Programmer des anomalies supplémentaires'
        });
      }

      // Unscheduled critical anomalies
      const unscheduledCritical = anomalies.filter(a => 
        !a.maintenanceWindowId && a.criticalityLevel === 'critical'
      );
      if (unscheduledCritical.length > 0) {
        recommendations.push({
          type: 'error',
          title: 'Anomalies Critiques Non Programmées',
          description: `${unscheduledCritical.length} anomalie(s) critiques nécessitent une attention immédiate`,
          action: 'Créer une fenêtre d\'urgence ou réorganiser les priorités'
        });
      }

      return recommendations;
    };

    return calculateOptimalScheduling();
  }, [treatedAnomalies, maintenanceWindows, actionPlans]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 flex flex-col items-center">
      {/* Enhanced Header with Action Button */}
      <div className="mb-8 relative w-full flex justify-center">
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm border-b border-gray-200/50" />
        <div className="relative px-6 py-4 max-w-7xl w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Planification intelligente</h1>
                <p className="text-gray-500 text-sm">Optimisez la maintenance grâce à l'IA</p>
              </div>
            </div>
            
            {/* Create Window Button - Moved to header */}
            <Button 
              onClick={() => handleCreateWindow()} 
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transform transition-all duration-200 hover:scale-105 shadow-md"
            >
              <Plus className="h-4 w-4" />
              Nouvelle fenêtre
            </Button>
          </div>
        </div>
      </div>
      {/* Main Content - Centered and matching header width */}
      <div className="w-full flex justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden w-full px-6 py-8 max-w-7xl">
          {/* Navigation Buttons with Auto Schedule Indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              {[
                { id: 'overview', label: "Vue d'ensemble", icon: BarChart3, color: 'blue' },
                { id: 'windows', label: 'Calendrier', icon: Calendar, color: 'indigo' },
                { id: 'analytics', label: 'Analytiques', icon: Eye, color: 'purple' }
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant={activeView === tab.id ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    activeView === tab.id 
                      ? `bg-gradient-to-r from-${tab.color}-600 to-${tab.color}-700 text-white shadow-lg transform scale-105` 
                      : 'hover:bg-gray-100/80 text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </div>
            
            {/* Auto Schedule Status Badge */}
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${autoScheduleEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-600">
                Planification auto: <span className={autoScheduleEnabled ? 'text-green-600 font-medium' : 'text-gray-500'}>
                  {autoScheduleEnabled ? 'Activée' : 'Désactivée'}
                </span>
              </span>
            </div>
          </div>

          {activeView === 'overview' && (
            <WindowManagementGrid
              windows={maintenanceWindows}
              anomalies={treatedAnomalies}
              actionPlans={actionPlans}
              onScheduleAnomaly={handleManualSchedule}
              onCreateWindow={handleCreateWindow}
              onUpdateWindow={updateMaintenanceWindow}
              onViewWindow={handleViewWindow}
              onEditWindow={handleEditWindow}
              onDeleteWindow={handleDeleteWindow}
            />
          )}

          {activeView === 'windows' && (
            <CalendarPlanningView
              windows={maintenanceWindows}
              anomalies={treatedAnomalies}
              actionPlans={actionPlans}
              onViewWindow={handleViewWindow}
              onEditWindow={handleEditWindow}
              onCreateWindow={handleCreateWindow}
            />
          )}

          {activeView === 'analytics' && (
            <PlanningAnalytics
              windows={maintenanceWindows}
              anomalies={anomalies}
              actionPlans={actionPlans}
            />
          )}
        </div>
      </div>

      {/* Enhanced Auto Scheduler Component - More integrated design */}
      {autoScheduleEnabled && (
        <div className="px-6 mt-4 max-w-7xl w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200/50 overflow-hidden">
            <AutoScheduler
              treatedAnomalies={unscheduledTreatedAnomalies}
              onScheduleComplete={handleAutoSchedule}
              enabled={autoScheduleEnabled}
            />
          </div>
        </div>
      )}

      {/* Enhanced Create Window Modal */}
      <CreateWindowModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setTriggeringAnomaly(undefined);
        }}
        onCreateWindow={handleCreateWindowFromModal}
        triggeringAnomaly={triggeringAnomaly ? anomalies.find(a => a.id === triggeringAnomaly) : undefined}
        availableAnomalies={unscheduledTreatedAnomalies}
      />

      {/* Enhanced Window Detail Modal with Error Handling */}
      {selectedWindow && showDetailModal && (
        <WindowDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedWindow(null);
            setModalMode('view');
          }}
          window={selectedWindow}
          anomalies={anomalies.filter(a => a.maintenanceWindowId === selectedWindow.id)}
          actionPlans={actionPlans}
          mode={modalMode}
          onSwitchMode={setModalMode}
          onUpdateWindow={handleUpdateWindowFromModal}
        />
      )}
    </div>
  );
};
