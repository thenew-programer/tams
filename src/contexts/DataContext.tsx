import React, { createContext, useContext, useState, useEffect } from 'react';
import { Anomaly, MaintenanceWindow, ActionPlan } from '../types';
import { mockMaintenanceWindows } from '../data/mockData';
import { anomalyService } from '../services/anomalyService';
import { maintenanceWindowService } from '../services/maintenanceWindowService';
import { loggingService } from '../services/loggingService';
import { supabaseActionPlanService, CreateActionPlanData, UpdateActionPlanData } from '../services/supabaseActionPlanService';
import { generateId } from '../lib/utils';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface DataContextType {
  // Anomalies
  anomalies: Anomaly[];
  addAnomaly: (anomaly: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAnomaly: (id: string, updates: Partial<Anomaly>) => void;
  deleteAnomaly: (id: string) => void;
  archiveAnomaly: (id: string, archivedBy?: string, archiveReason?: string) => Promise<boolean>;
  
  // Maintenance Windows
  maintenanceWindows: MaintenanceWindow[];
  addMaintenanceWindow: (window: Omit<MaintenanceWindow, 'id'>) => void;
  updateMaintenanceWindow: (id: string, updates: Partial<MaintenanceWindow>) => void;
  deleteMaintenanceWindow: (id: string) => void;
  
  // Action Plans
  actionPlans: ActionPlan[];
  addActionPlan: (data: CreateActionPlanData) => Promise<void>;
  updateActionPlan: (id: string, updates: UpdateActionPlanData) => Promise<void>;
  deleteActionPlan: (id: string) => Promise<void>;
  getActionPlanByAnomalyId: (anomalyId: string) => Promise<ActionPlan | null>;
  loadActionPlans: () => Promise<void>;
  
  // Utility functions
  getAnomalyById: (id: string) => Anomaly | undefined;
  getMaintenanceWindowById: (id: string) => MaintenanceWindow | undefined;
  getActionPlanById: (id: string) => ActionPlan | undefined;
  
  // Statistics
  getAnomalyStats: () => Promise<{
    total: number;
    open: number;
    critical: number;
    assigned: number;
    unassigned: number;
  }>;
  
  // Data management
  reloadData: () => Promise<void>;
  
  // Additional properties
  isLoading: boolean;
  useBackend: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useBackend, setUseBackend] = useState(true);
  const { user } = useAuth();

  // Initialize data from Supabase
  const initializeData = async () => {
    setIsLoading(true);
    try {
      // Initialize logging service
      await loggingService.initialize();
      
      // Load non-archived anomalies directly from Supabase
      const anomaliesResponse = await anomalyService.getAllAnomalies({ 
        per_page: 1000,
        archived: false // Only get non-archived records (status != cloture)
      });
      
      setAnomalies(anomaliesResponse);
      
      // Load maintenance windows from backend
      let windowsResponse: MaintenanceWindow[] = [];
      try {
        windowsResponse = await maintenanceWindowService.getMaintenanceWindows();
        setMaintenanceWindows(windowsResponse);
      } catch (windowError) {
        console.warn('Failed to load maintenance windows from backend, using mock data:', windowError);
        setMaintenanceWindows(mockMaintenanceWindows);
      }
      
      // Load action plans from Supabase
      const actionPlansResponse = await supabaseActionPlanService.getAllActionPlans();
      setActionPlans(actionPlansResponse);
      
      setUseBackend(true);
      
      // Log successful data load
      await loggingService.logAction({
        action: 'data_import',
        category: 'data_operation',
        entity: 'system',
        details: {
          description: `Successfully loaded ${anomaliesResponse.length} anomalies from Supabase`,
          additionalInfo: {
            anomaliesCount: anomaliesResponse.length,
            maintenanceWindowsCount: windowsResponse.length
          }
        },
        severity: 'success',
        success: true
      });
    } catch (error) {
      console.error('Failed to load data from Supabase:', error);
      setUseBackend(false);
      setAnomalies([]);
      
      // Log error
      await loggingService.logAction({
        action: 'data_import',
        category: 'data_operation',
        entity: 'system',
        details: {
          description: 'Failed to load data from Supabase',
          additionalInfo: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        severity: 'error',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      setMaintenanceWindows(mockMaintenanceWindows);
      setActionPlans([]);
      
      toast.error('Erreur lors du chargement des données Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  // Reload data function
  const reloadData = async () => {
    await initializeData();
  };

  // Load data on mount and when user changes (login/logout)
  useEffect(() => {
    if (user) {
      initializeData();
    } else {
      // Clear data when user logs out
      setAnomalies([]);
      setMaintenanceWindows([]);
      setActionPlans([]);
      setIsLoading(false);
    }
  }, [user]);

  // Anomaly functions
  const addAnomaly = async (anomalyData: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newAnomaly = await anomalyService.createAnomaly(anomalyData);
      if (newAnomaly) {
        setAnomalies(prev => [newAnomaly, ...prev]);
        toast.success('Anomalie créée avec succès');
        
        // Log successful anomaly creation
        await loggingService.logAnomalyAction(
          'create_anomaly',
          newAnomaly.id,
          {
            description: `Created new anomaly for equipment ${newAnomaly.equipmentId}`,
            additionalInfo: {
              equipmentId: newAnomaly.equipmentId,
              criticalityLevel: newAnomaly.criticalityLevel,
              service: newAnomaly.service,
              description: newAnomaly.description
            }
          },
          true
        );
        return;
      }
    } catch (error) {
      console.error('Failed to create anomaly:', error);
      toast.error('Erreur lors de la création de l\'anomalie');
      
      // Log error
      await loggingService.logAnomalyAction(
        'create_anomaly',
        'unknown',
        {
          description: 'Failed to create anomaly',
          additionalInfo: {
            error: error instanceof Error ? error.message : 'Unknown error',
            equipmentId: anomalyData.equipmentId || 'Unknown'
          }
        },
        false
      );
    }
  };

  const updateAnomaly = async (id: string, updates: Partial<Anomaly>) => {
    try {
      const originalAnomaly = anomalies.find(a => a.id === id);
      const updatedAnomaly = await anomalyService.updateAnomaly(id, updates);
      if (updatedAnomaly) {
        setAnomalies(prev => prev.map(anomaly => 
          anomaly.id === id ? updatedAnomaly : anomaly
        ));
        toast.success('Anomalie mise à jour avec succès');
        
        // Log successful anomaly update
        await loggingService.logAnomalyAction(
          'update_anomaly',
          id,
          {
            description: `Updated anomaly ${id}`,
            oldValue: originalAnomaly,
            newValue: updatedAnomaly,
            additionalInfo: {
              updatedFields: Object.keys(updates),
              equipmentId: updatedAnomaly.equipmentId
            }
          },
          true
        );
        return;
      }
    } catch (error) {
      console.error('Failed to update anomaly:', error);
      toast.error('Erreur lors de la mise à jour de l\'anomalie');
      
      // Log error
      await loggingService.logAnomalyAction(
        'update_anomaly',
        id,
        {
          description: 'Failed to update anomaly',
          additionalInfo: {
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedFields: Object.keys(updates)
          }
        },
        false
      );
    }
  };

  const deleteAnomaly = async (id: string) => {
    try {
      const success = await anomalyService.deleteAnomaly(id);
      if (success) {
        setAnomalies(prev => prev.filter(anomaly => anomaly.id !== id));
        toast.success('Anomalie supprimée avec succès');
        return;
      }
    } catch (error) {
      console.error('Failed to delete anomaly:', error);
      toast.error('Erreur lors de la suppression de l\'anomalie');
    }
  };
  
  // Archive anomaly
  const archiveAnomaly = async (id: string, archivedBy: string = 'User', archiveReason: string = 'Manual archive') => {
    try {
      // Check if anomaly is in 'treated' status
      const anomaly = anomalies.find(a => a.id === id);
      
      if (!anomaly) {
        toast.error('Anomalie introuvable');
        return false;
      }
      
      if (anomaly.status !== 'treated') {
        toast.error('L\'anomalie doit être traitée avant d\'être archivée');
        return false;
      }
      
      const success = await anomalyService.archiveAnomaly(id, archivedBy, archiveReason);
      
      if (success) {
        setAnomalies(prev => prev.filter(anomaly => anomaly.id !== id));
        toast.success('Anomalie archivée avec succès');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to archive anomaly:', error);
      toast.error('Erreur lors de l\'archivage de l\'anomalie');
      return false;
    }
  };

  // Maintenance Window functions - Updated to use backend service
  const addMaintenanceWindow = async (windowData: Omit<MaintenanceWindow, 'id'>) => {
    try {
      if (useBackend) {
        const newWindow = await maintenanceWindowService.createMaintenanceWindow(windowData);
        setMaintenanceWindows(prev => [...prev, newWindow]);
        toast.success('Maintenance window created successfully');
      } else {
        // Fallback to local creation
        const newWindow: MaintenanceWindow = {
          ...windowData,
          id: generateId()
        };
        setMaintenanceWindows(prev => [...prev, newWindow]);
      }
    } catch (error) {
      console.error('Failed to create maintenance window:', error);
      toast.error('Failed to create maintenance window');
    }
  };

  const updateMaintenanceWindow = async (id: string, updates: Partial<MaintenanceWindow>) => {
    try {
      if (useBackend) {
        const updatedWindow = await maintenanceWindowService.updateMaintenanceWindow(id, updates);
        setMaintenanceWindows(prev => prev.map(window => 
          window.id === id ? updatedWindow : window
        ));
        toast.success('Maintenance window updated successfully');
      } else {
        // Fallback to local update
        setMaintenanceWindows(prev => prev.map(window => 
          window.id === id ? { ...window, ...updates } : window
        ));
      }
    } catch (error) {
      console.error('Failed to update maintenance window:', error);
      toast.error('Failed to update maintenance window');
    }
  };

  const deleteMaintenanceWindow = async (id: string) => {
    try {
      if (useBackend) {
        await maintenanceWindowService.deleteMaintenanceWindow(id);
        setMaintenanceWindows(prev => prev.filter(window => window.id !== id));
        // Update anomalies to remove window assignment
        setAnomalies(prev => prev.map(anomaly => 
          anomaly.maintenanceWindowId === id 
            ? { ...anomaly, maintenanceWindowId: undefined }
            : anomaly
        ));
        toast.success('Maintenance window deleted successfully');
      } else {
        // Fallback to local deletion
        setMaintenanceWindows(prev => prev.filter(window => window.id !== id));
        setAnomalies(prev => prev.map(anomaly => 
          anomaly.maintenanceWindowId === id 
            ? { ...anomaly, maintenanceWindowId: undefined }
            : anomaly
        ));
      }
    } catch (error) {
      console.error('Failed to delete maintenance window:', error);
      toast.error('Failed to delete maintenance window');
    }
  };

  // Action Plan functions with better error handling
  const addActionPlan = async (data: CreateActionPlanData) => {
    try {
      // First check if anomaly exists
      const anomalyExists = anomalies.some(anomaly => anomaly.id === data.anomalyId);
      if (!anomalyExists) {
        console.error('Cannot create action plan: Anomaly does not exist:', data.anomalyId);
        toast.error('Erreur: L\'anomalie spécifiée n\'existe pas');
        return;
      }
      
      // Check if action plan already exists
      const existingPlan = await supabaseActionPlanService.getActionPlan(data.anomalyId);
      if (existingPlan) {
        console.log('Action plan already exists, updating instead');
        await updateActionPlan(existingPlan.id, {
          needsOutage: data.needsOutage,
          outageType: data.outageType,
          outageDuration: data.outageDuration,
          plannedDate: data.plannedDate,
          estimatedCost: data.estimatedCost,
          priority: data.priority,
          comments: data.comments
        });
        return;
      }
      
      // Create new action plan
      const newPlan = await supabaseActionPlanService.createActionPlan(data);
      if (newPlan) {
        setActionPlans(prev => [...prev, newPlan]);
        
        try {
          // Update anomaly to indicate it has an action plan
          await updateAnomaly(data.anomalyId, {
            hasActionPlan: true
          });
        } catch (anomalyUpdateError) {
          console.error('Failed to update anomaly after creating action plan:', anomalyUpdateError);
          // Continue anyway as the action plan was created successfully
        }
        
        toast.success('Plan d\'action créé avec succès');
      } else {
        toast.error('Erreur lors de la création du plan d\'action');
      }
    } catch (error) {
      console.error('Failed to create action plan:', error);
      toast.error('Erreur lors de la création du plan d\'action: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const updateActionPlan = async (id: string, updates: UpdateActionPlanData) => {
    try {
      const updatedPlan = await supabaseActionPlanService.updateActionPlan(id, updates);
      if (updatedPlan) {
        setActionPlans(prev => prev.map(p => 
          p.id === id ? updatedPlan : p
        ));
        toast.success('Plan d\'action mis à jour avec succès');
      } else {
        toast.error('Erreur lors de la mise à jour du plan d\'action');
      }
    } catch (error) {
      console.error('Failed to update action plan:', error);
      toast.error('Erreur lors de la mise à jour du plan d\'action');
    }
  };

  const deleteActionPlan = async (id: string) => {
    try {
      const plan = actionPlans.find(p => p.id === id);
      if (!plan) return;
      
      const success = await supabaseActionPlanService.deleteActionPlan(id);
      if (success) {
        setActionPlans(prev => prev.filter(p => p.id !== id));
        
        // Update anomaly to indicate it no longer has an action plan
        await updateAnomaly(plan.anomalyId, {
          hasActionPlan: false
        });
        
        toast.success('Plan d\'action supprimé avec succès');
      } else {
        toast.error('Erreur lors de la suppression du plan d\'action');
      }
    } catch (error) {
      console.error('Failed to delete action plan:', error);
      toast.error('Erreur lors de la suppression du plan d\'action');
    }
  };

  const getActionPlanByAnomalyId = async (anomalyId: string): Promise<ActionPlan | null> => {
    try {
      return await supabaseActionPlanService.getActionPlan(anomalyId);
    } catch (error) {
      console.error('Failed to get action plan:', error);
      return null;
    }
  };

  const loadActionPlans = async () => {
    try {
      const plans = await supabaseActionPlanService.getAllActionPlans();
      setActionPlans(plans);
    } catch (error) {
      console.error('Failed to load action plans:', error);
    }
  };

  // Utility functions
  const getAnomalyById = (id: string) => {
    return anomalies.find(anomaly => anomaly.id === id);
  };

  const getMaintenanceWindowById = (id: string) => {
    return maintenanceWindows.find(window => window.id === id);
  };

  const getActionPlanById = (id: string) => {
    return actionPlans.find(plan => plan.id === id);
  };

  const getAnomalyStats = async () => {
    try {
      const stats = await anomalyService.getAnomalyStats();
      return {
        total: stats.total,
        open: stats.byStatus.new + stats.byStatus.in_progress + stats.byStatus.treated || 0,
        critical: stats.byCriticality.critical || 0,
        assigned: anomalies.filter(a => a.maintenanceWindowId).length,
        unassigned: stats.total - anomalies.filter(a => a.maintenanceWindowId).length
      };
    } catch (error) {
      console.error('Error getting anomaly stats:', error);
      // Fallback to local calculation
      const total = anomalies.length;
      const open = anomalies.filter(a => a.status !== 'closed').length;
      const critical = anomalies.filter(a => a.criticalityLevel === 'critical').length;
      const assigned = anomalies.filter(a => a.maintenanceWindowId).length;
      const unassigned = total - assigned;

      return { total, open, critical, assigned, unassigned };
    }
  };

  const value: DataContextType = {
    // Data
    anomalies,
    maintenanceWindows,
    actionPlans,
    
    // Anomaly functions
    addAnomaly,
    updateAnomaly,
    deleteAnomaly,
    archiveAnomaly,
    
    // Maintenance Window functions
    addMaintenanceWindow,
    updateMaintenanceWindow,
    deleteMaintenanceWindow,
    
    // Action Plan functions
    addActionPlan,
    updateActionPlan,
    deleteActionPlan,
    getActionPlanByAnomalyId,
    loadActionPlans,
    
    // Utility functions
    getAnomalyById,
    getMaintenanceWindowById,
    getActionPlanById,
    getAnomalyStats,
    
    // Data management
    reloadData,
    
    // Additional properties for debugging
    isLoading,
    useBackend
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};