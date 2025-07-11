import { supabase } from '../lib/supabase';
import { Anomaly } from '../types';
import { vectorSearchService } from './vectorSearchService';

// Supabase anomaly interface that matches the actual schema
export interface SupabaseAnomaly {
  id: string;
  equipement_id: string;
  description: string;
  service: string;
  responsable: string;
  status: 'nouvelle' | 'en_cours' | 'traite' | 'cloture';
  source_origine: string;
  created_at: string;
  updated_at: string;
  
  // AI scores (1-5 scale)
  ai_fiabilite_integrite_score: number;
  ai_disponibilite_score: number;
  ai_process_safety_score: number;
  ai_criticality_level: number;
  
  // Human overrides (1-5 scale)
  human_fiabilite_integrite_score?: number;
  human_disponibilite_score?: number;
  human_process_safety_score?: number;
  human_criticality_level?: number;
  
  // Final scores (computed columns)
  final_fiabilite_integrite_score: number;
  final_disponibilite_score: number;
  final_process_safety_score: number;
  final_criticality_level: number;
  
  // Optional fields
  estimated_hours?: number;
  priority?: number;
  maintenance_window_id?: string;
  import_batch_id?: string;
  system_id?: string;
  
  // Archive fields
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
}

export interface CreateAnomalyData {
  equipement_id: string;
  description: string;
  service: string;
  responsable: string;
  source_origine: string;
  status?: 'nouvelle' | 'en_cours' | 'traite' | 'cloture';
  estimated_hours?: number;
  priority?: number;
  
  // AI scores (optional for create)
  ai_fiabilite_integrite_score?: number;
  ai_disponibilite_score?: number;
  ai_process_safety_score?: number;
  ai_criticality_level?: number;
  
  // Human overrides (optional)
  human_fiabilite_integrite_score?: number;
  human_disponibilite_score?: number;
  human_process_safety_score?: number;
  human_criticality_level?: number;
}

export interface UpdateAnomalyData extends Partial<CreateAnomalyData> {
  maintenance_window_id?: string;
}

export interface AnomalyFilters {
  status?: string;
  service?: string;
  criticality_level?: string;
  search?: string;
  page?: number;
  per_page?: number;
  archived?: boolean; // To filter for archived (status=cloture) or non-archived records
}

export class AnomalyService {
  // Map Supabase status to frontend status
  private mapStatusToFrontend(status: string): 'new' | 'in_progress' | 'treated' | 'closed' {
    switch (status) {
      case 'nouvelle': return 'new';
      case 'en_cours': return 'in_progress';
      case 'traite': return 'treated';
      case 'cloture': return 'closed';
      default: return 'new';
    }
  }

  // Map frontend status to Supabase status
  private mapStatusToSupabase(status: 'new' | 'in_progress' | 'treated' | 'closed'): 'nouvelle' | 'en_cours' | 'traite' | 'cloture' {
    switch (status) {
      case 'new': return 'nouvelle';
      case 'in_progress': return 'en_cours';
      case 'treated': return 'traite';
      case 'closed': return 'cloture';
      default: return 'nouvelle';
    }
  }

  // Calculate criticality level based on the sum of the three scores
  private calculateCriticalityLevel(totalScore: number): 'low' | 'medium' | 'high' | 'critical' {
    // Total score ranges from 0 to 15
    if (totalScore > 9) return 'critical';   // > 9: Anomalies critiques
    if (totalScore >= 7) return 'high';     // 7-8: Anomalies à criticité élevée
    if (totalScore >= 3) return 'medium';   // 3-6: Anomalies à criticité normale
    return 'low';                           // 0-2: Anomalies à criticité faible
  }

  // Convert SupabaseAnomaly to frontend Anomaly format
  private convertToFrontendAnomaly(supabaseAnomaly: SupabaseAnomaly): Anomaly {
    const criticalityLevel = this.calculateCriticalityLevel(supabaseAnomaly.final_criticality_level);
    
    return {
      id: String(supabaseAnomaly.id), // Ensure ID is always a string
      title: supabaseAnomaly.description.substring(0, 50) + (supabaseAnomaly.description.length > 50 ? '...' : ''),
      description: supabaseAnomaly.description,
      equipmentId: supabaseAnomaly.equipement_id,
      service: supabaseAnomaly.service,
      responsiblePerson: supabaseAnomaly.responsable,
      status: this.mapStatusToFrontend(supabaseAnomaly.status),
      originSource: supabaseAnomaly.source_origine,
      createdAt: new Date(supabaseAnomaly.created_at),
      updatedAt: new Date(supabaseAnomaly.updated_at),
      
      // Use final scores from database
      fiabiliteIntegriteScore: supabaseAnomaly.final_fiabilite_integrite_score,
      disponibiliteScore: supabaseAnomaly.final_disponibilite_score,
      processSafetyScore: supabaseAnomaly.final_process_safety_score,
      criticalityLevel: criticalityLevel,
      
      // User overrides
      userFiabiliteIntegriteScore: supabaseAnomaly.human_fiabilite_integrite_score,
      userDisponibiliteScore: supabaseAnomaly.human_disponibilite_score,
      userProcessSafetyScore: supabaseAnomaly.human_process_safety_score,
      userCriticalityLevel: supabaseAnomaly.human_criticality_level ? 
        this.calculateCriticalityLevel(supabaseAnomaly.human_criticality_level) : undefined,
      useUserScores: !!(supabaseAnomaly.human_fiabilite_integrite_score || 
                        supabaseAnomaly.human_disponibilite_score || 
                        supabaseAnomaly.human_process_safety_score),
      
      // Optional fields
      estimatedHours: supabaseAnomaly.estimated_hours,
      priority: supabaseAnomaly.priority,
      maintenanceWindowId: supabaseAnomaly.maintenance_window_id,
      
      // Archive fields
      archivedAt: supabaseAnomaly.archived_at ? new Date(supabaseAnomaly.archived_at) : undefined,
      archivedBy: supabaseAnomaly.archived_by,
      archiveReason: supabaseAnomaly.archive_reason,
    };
  }

  // Get all anomalies from Supabase
  async getAllAnomalies(filters: AnomalyFilters = {}): Promise<Anomaly[]> {
    try {
      let query = supabase
        .from('anomalies')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter for archived or non-archived records
      if (filters.archived !== undefined) {
        if (filters.archived) {
          // Get only archived records (status = cloture/closed)
          query = query.eq('status', 'cloture');
        } else {
          // Get only non-archived records (status != cloture/closed)
          query = query.neq('status', 'cloture');
        }
      }

      // Apply other filters
      if (filters.status && filters.status !== 'all') {
        const supabaseStatus = this.mapStatusToSupabase(filters.status as any);
        query = query.eq('status', supabaseStatus);
      }

      if (filters.service && filters.service !== 'all') {
        query = query.eq('service', filters.service);
      }

      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,equipement_id.ilike.%${filters.search}%,responsable.ilike.%${filters.search}%`);
      }

      // Apply pagination
      if (filters.page && filters.per_page) {
        const from = (filters.page - 1) * filters.per_page;
        const to = from + filters.per_page - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching anomalies:', error);
        throw error;
      }

      return (data || []).map(this.convertToFrontendAnomaly.bind(this));
    } catch (error) {
      console.error('Error in getAllAnomalies:', error);
      throw error;
    }
  }

  // Get anomaly by ID
  async getAnomalyById(id: string): Promise<Anomaly | null> {
    try {
      const { data, error } = await supabase
        .from('anomalies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching anomaly:', error);
        throw error;
      }

      return data ? this.convertToFrontendAnomaly(data) : null;
    } catch (error) {
      console.error('Error in getAnomalyById:', error);
      throw error;
    }
  }

  // Create new anomaly
  async createAnomaly(anomalyData: Partial<Anomaly>): Promise<Anomaly | null> {
    try {
      const supabaseData = {
        equipement_id: anomalyData.equipmentId || '',
        description: anomalyData.description || '',
        service: anomalyData.service || '',
        responsable: anomalyData.responsiblePerson || '',
        source_origine: anomalyData.originSource || 'Manual',
        status: anomalyData.status ? this.mapStatusToSupabase(anomalyData.status) : 'nouvelle',
        estimated_hours: anomalyData.estimatedHours,
        priority: anomalyData.priority || 1,
        
        // Set AI scores with defaults
        ai_fiabilite_integrite_score: anomalyData.fiabiliteIntegriteScore || 3,
        ai_disponibilite_score: anomalyData.disponibiliteScore || 3,
        ai_process_safety_score: anomalyData.processSafetyScore || 3,
        ai_criticality_level: (anomalyData.fiabiliteIntegriteScore || 3) + 
                             (anomalyData.disponibiliteScore || 3) + 
                             (anomalyData.processSafetyScore || 3),
        
        // Set human scores if provided
        human_fiabilite_integrite_score: anomalyData.userFiabiliteIntegriteScore,
        human_disponibilite_score: anomalyData.userDisponibiliteScore,
        human_process_safety_score: anomalyData.userProcessSafetyScore,
        human_criticality_level: anomalyData.userFiabiliteIntegriteScore && 
                                anomalyData.userDisponibiliteScore && 
                                anomalyData.userProcessSafetyScore ?
                                anomalyData.userFiabiliteIntegriteScore + 
                                anomalyData.userDisponibiliteScore + 
                                anomalyData.userProcessSafetyScore : undefined,
      };

      const { data, error } = await supabase
        .from('anomalies')
        .insert([supabaseData])
        .select()
        .single();

      if (error) {
        console.error('Error creating anomaly:', error);
        throw error;
      }

      const createdAnomaly = data ? this.convertToFrontendAnomaly(data) : null;
      
      // Index the new anomaly for vector search
      if (createdAnomaly) {
        try {
          await vectorSearchService.indexAnomaly(createdAnomaly);
        } catch (indexError) {
          console.error('Error indexing new anomaly for vector search:', indexError);
          // Don't fail the creation if indexing fails
        }
      }

      return createdAnomaly;
    } catch (error) {
      console.error('Error in createAnomaly:', error);
      throw error;
    }
  }

  // Update anomaly
  async updateAnomaly(id: string, updates: Partial<Anomaly>): Promise<Anomaly | null> {
    try {
      const supabaseUpdates: any = {};

      if (updates.equipmentId !== undefined) supabaseUpdates.equipement_id = updates.equipmentId;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.service !== undefined) supabaseUpdates.service = updates.service;
      if (updates.responsiblePerson !== undefined) supabaseUpdates.responsable = updates.responsiblePerson;
      if (updates.originSource !== undefined) supabaseUpdates.source_origine = updates.originSource;
      if (updates.status !== undefined) supabaseUpdates.status = this.mapStatusToSupabase(updates.status);
      if (updates.estimatedHours !== undefined) supabaseUpdates.estimated_hours = updates.estimatedHours;
      if (updates.priority !== undefined) supabaseUpdates.priority = updates.priority;
      if (updates.maintenanceWindowId !== undefined) supabaseUpdates.maintenance_window_id = updates.maintenanceWindowId;

      // Handle user score updates
      if (updates.userFiabiliteIntegriteScore !== undefined) {
        supabaseUpdates.human_fiabilite_integrite_score = updates.userFiabiliteIntegriteScore;
      }
      if (updates.userDisponibiliteScore !== undefined) {
        supabaseUpdates.human_disponibilite_score = updates.userDisponibiliteScore;
      }
      if (updates.userProcessSafetyScore !== undefined) {
        supabaseUpdates.human_process_safety_score = updates.userProcessSafetyScore;
      }

      // Recalculate human criticality level if any user scores are provided
      if (updates.userFiabiliteIntegriteScore || updates.userDisponibiliteScore || updates.userProcessSafetyScore) {
        // Get current data to calculate new criticality
        const current = await this.getAnomalyById(id);
        if (current) {
          const newFiabilite = updates.userFiabiliteIntegriteScore ?? current.userFiabiliteIntegriteScore ?? current.fiabiliteIntegriteScore;
          const newDisponibilite = updates.userDisponibiliteScore ?? current.userDisponibiliteScore ?? current.disponibiliteScore;
          const newProcessSafety = updates.userProcessSafetyScore ?? current.userProcessSafetyScore ?? current.processSafetyScore;
          
          supabaseUpdates.human_criticality_level = newFiabilite + newDisponibilite + newProcessSafety;
        }
      }

      // First verify the anomaly exists to prevent PGRST116 errors
      const { data: checkData, error: checkError } = await supabase
        .from('anomalies')
        .select('id')
        .eq('id', id);
        
      if (checkError || !checkData || checkData.length === 0) {
        console.error('Error: Anomaly with ID does not exist:', id);
        return null;
      }
      
      const { data, error } = await supabase
        .from('anomalies')
        .update(supabaseUpdates)
        .eq('id', id)
        .select('*');
        
      if (error) {
        console.error('Error updating anomaly:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error('No anomaly data returned after update');
        return null;
      }

      // Convert the first item from array to frontend anomaly
      const updatedAnomaly = this.convertToFrontendAnomaly(data[0]);
      
      // Re-index the updated anomaly for vector search
      try {
        await vectorSearchService.indexAnomaly(updatedAnomaly);
      } catch (indexError) {
        console.error('Error re-indexing updated anomaly for vector search:', indexError);
        // Don't fail the update if indexing fails
      }
      
      return updatedAnomaly;
    } catch (error) {
      console.error('Error in updateAnomaly:', error);
      throw error;
    }
  }

  // Delete anomaly
  async deleteAnomaly(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('anomalies')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting anomaly:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAnomaly:', error);
      throw error;
    }
  }

  // Get anomaly statistics
  async getAnomalyStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byService: Record<string, number>;
    byCriticality: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('anomalies')
        .select('status, service, final_criticality_level');

      if (error) {
        console.error('Error fetching anomaly stats:', error);
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        byStatus: {} as Record<string, number>,
        byService: {} as Record<string, number>,
        byCriticality: {} as Record<string, number>,
      };

      data?.forEach(anomaly => {
        // Count by status
        const frontendStatus = this.mapStatusToFrontend(anomaly.status);
        stats.byStatus[frontendStatus] = (stats.byStatus[frontendStatus] || 0) + 1;

        // Count by service
        stats.byService[anomaly.service] = (stats.byService[anomaly.service] || 0) + 1;

        // Count by criticality
        const criticalityLevel = this.calculateCriticalityLevel(anomaly.final_criticality_level);
        stats.byCriticality[criticalityLevel] = (stats.byCriticality[criticalityLevel] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error in getAnomalyStats:', error);
      throw error;
    }
  }

  // Batch create anomalies
  async batchCreateAnomalies(anomalies: CreateAnomalyData[]): Promise<Anomaly[]> {
    try {
      const supabaseData = anomalies.map(anomaly => ({
        equipement_id: anomaly.equipement_id,
        description: anomaly.description,
        service: anomaly.service,
        responsable: anomaly.responsable,
        source_origine: anomaly.source_origine,
        status: anomaly.status || 'nouvelle',
        estimated_hours: anomaly.estimated_hours,
        priority: anomaly.priority || 1,
        ai_fiabilite_integrite_score: anomaly.ai_fiabilite_integrite_score || 3,
        ai_disponibilite_score: anomaly.ai_disponibilite_score || 3,
        ai_process_safety_score: anomaly.ai_process_safety_score || 3,
        ai_criticality_level: (anomaly.ai_fiabilite_integrite_score || 3) + 
                             (anomaly.ai_disponibilite_score || 3) + 
                             (anomaly.ai_process_safety_score || 3),
        human_fiabilite_integrite_score: anomaly.human_fiabilite_integrite_score,
        human_disponibilite_score: anomaly.human_disponibilite_score,
        human_process_safety_score: anomaly.human_process_safety_score,
        human_criticality_level: anomaly.human_fiabilite_integrite_score && 
                                anomaly.human_disponibilite_score && 
                                anomaly.human_process_safety_score ?
                                anomaly.human_fiabilite_integrite_score + 
                                anomaly.human_disponibilite_score + 
                                anomaly.human_process_safety_score : undefined,
      }));

      const { data, error } = await supabase
        .from('anomalies')
        .insert(supabaseData)
        .select();

      if (error) {
        console.error('Error batch creating anomalies:', error);
        throw error;
      }

      return (data || []).map(this.convertToFrontendAnomaly.bind(this));
    } catch (error) {
      console.error('Error in batchCreateAnomalies:', error);
      throw error;
    }
  }

  // Bulk update anomaly status
  async bulkUpdateStatus(anomalyIds: string[], status: 'new' | 'in_progress' | 'treated' | 'closed'): Promise<boolean> {
    try {
      const supabaseStatus = this.mapStatusToSupabase(status);
      
      const { error } = await supabase
        .from('anomalies')
        .update({ status: supabaseStatus })
        .in('id', anomalyIds);

      if (error) {
        console.error('Error bulk updating status:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in bulkUpdateStatus:', error);
      throw error;
    }
  }

  // Archive an anomaly (set status to cloture/closed)
  async archiveAnomaly(anomalyId: string, archivedBy: string = 'System', archiveReason: string = 'Manual archive'): Promise<boolean> {
    try {
      // First, get the anomaly to archive
      const { data: anomaly, error: fetchError } = await supabase
        .from('anomalies')
        .select('*')
        .eq('id', anomalyId)
        .single();

      if (fetchError || !anomaly) {
        console.error('Error fetching anomaly for archive:', fetchError);
        throw fetchError || new Error('Anomaly not found');
      }

      // Check if anomaly is in 'traite' status
      if (anomaly.status !== 'traite') {
        throw new Error('Anomaly must be in treated status to be archived');
      }

      // Update the anomaly status to 'cloture'
      const { error } = await supabase
        .from('anomalies')
        .update({
          status: 'cloture', // Set to closed/cloture when archived
          updated_at: new Date().toISOString(),
          archived_at: new Date().toISOString(),
          archived_by: archivedBy,
          archive_reason: archiveReason
        })
        .eq('id', anomalyId);
        
      if (error) {
        console.error('Error archiving anomaly:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in archiveAnomaly:', error);
      throw error;
    }
  }
}

export const anomalyService = new AnomalyService();