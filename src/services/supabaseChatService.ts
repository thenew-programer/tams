import { supabase } from '../lib/supabase';
import { llmService } from './llmService';

// Database types based on your existing data structure
export interface DatabaseAnomaly {
  id: string;
  title: string;
  description: string;
  equipment_id: string;
  service: string;
  responsible_person: string;
  status: 'new' | 'in_progress' | 'treated' | 'closed';
  origin_source: string;
  created_at: string;
  updated_at: string;
  fiabilite_score: number;
  integrite_score: number;
  disponibilite_score: number;
  process_safety_score: number;
  criticality_level: 'low' | 'medium' | 'high' | 'critical';
  estimated_hours?: number;
  priority?: number;
  maintenance_window_id?: string;
}

export interface DatabaseMaintenanceWindow {
  id: string;
  type: 'force' | 'minor' | 'major';
  duration_days: number;
  start_date: string;
  end_date: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id?: string;
  message: string;
  response: string;
  context_data?: any;
  created_at: string;
}

export class SupabaseChatService {
  
  /**
   * Save chat message to database
   */
  async saveChatMessage(message: string, response: string, contextData?: any): Promise<void> {
    try {
      await supabase
        .from('chat_messages')
        .insert({
          message,
          response,
          context_data: contextData,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(limit: number = 50): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }

  /**
   * Get anomalies data for AI context
   */
  async getAnomaliesForAI(filters?: {
    status?: string;
    criticality?: string;
    equipment?: string;
    limit?: number;
  }): Promise<DatabaseAnomaly[]> {
    try {
      let query = supabase
        .from('anomalies')
        .select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.criticality) {
        query = query.eq('criticality_level', filters.criticality);
      }
      if (filters?.equipment) {
        query = query.eq('equipment_id', filters.equipment);
      }

      query = query.order('created_at', { ascending: false });
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      return [];
    }
  }

  /**
   * Get maintenance windows for AI context
   */
  async getMaintenanceWindowsForAI(): Promise<DatabaseMaintenanceWindow[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_windows')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching maintenance windows:', error);
      return [];
    }
  }

  /**
   * Get statistics for AI responses
   */
  async getStatisticsForAI(): Promise<{
    totalAnomalies: number;
    openAnomalies: number;
    criticalAnomalies: number;
    treatmentRate: number;
    averageResolutionTime: number;
  }> {
    try {
      // Get total anomalies count
      const { count: totalAnomalies } = await supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true });

      // Get open anomalies count
      const { count: openAnomalies } = await supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'in_progress']);

      // Get critical anomalies count
      const { count: criticalAnomalies } = await supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true })
        .eq('criticality_level', 'critical');

      // Get treated anomalies count for treatment rate
      const { count: treatedAnomalies } = await supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true })
        .in('status', ['treated', 'closed']);

      // Calculate treatment rate
      const treatmentRate = totalAnomalies ? (treatedAnomalies || 0) / totalAnomalies * 100 : 0;

      // Get average resolution time (simplified calculation)
      const { data: resolvedAnomalies } = await supabase
        .from('anomalies')
        .select('created_at, updated_at')
        .in('status', ['treated', 'closed'])
        .limit(100);

      let averageResolutionTime = 0;
      if (resolvedAnomalies && resolvedAnomalies.length > 0) {
        const totalDays = resolvedAnomalies.reduce((sum, anomaly) => {
          const created = new Date(anomaly.created_at);
          const updated = new Date(anomaly.updated_at);
          const days = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        averageResolutionTime = totalDays / resolvedAnomalies.length;
      }

      return {
        totalAnomalies: totalAnomalies || 0,
        openAnomalies: openAnomalies || 0,
        criticalAnomalies: criticalAnomalies || 0,
        treatmentRate: Math.round(treatmentRate * 100) / 100,
        averageResolutionTime: Math.round(averageResolutionTime * 100) / 100
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        totalAnomalies: 0,
        openAnomalies: 0,
        criticalAnomalies: 0,
        treatmentRate: 0,
        averageResolutionTime: 0
      };
    }
  }

  /**
   * Search anomalies by text (for semantic search)
   */
  async searchAnomalies(searchQuery: string): Promise<DatabaseAnomaly[]> {
    try {
      const { data, error } = await supabase
        .from('anomalies')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,equipment_id.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching anomalies:', error);
      return [];
    }
  }

  /**
   * Use Supabase Edge Function for AI responses (if available)
   */
  async getAIResponse(message: string, context: any): Promise<string> {
    try {
      // Use LLM service instead of Supabase Edge Function
      return await llmService.getChatCompletion(message, context);
    } catch (error) {
      console.error('Error calling LLM service:', error);
      return this.getFallbackResponse(message, context);
    }
  }

  /**
   * Fallback response when AI service is not available
   */
  private getFallbackResponse(message: string, context: any): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('anomalie') && lowerMessage.includes('critique')) {
      const criticalCount = context?.statistics?.criticalAnomalies || 0;
      return `Actuellement, vous avez ${criticalCount} anomalies critiques en attente. Voulez-vous voir les détails?`;
    }
    
    if (lowerMessage.includes('statistique') || lowerMessage.includes('rapport')) {
      const stats = context?.statistics;
      if (stats) {
        return `Voici un aperçu des statistiques: ${stats.treatmentRate}% de taux de traitement, ${stats.averageResolutionTime} jours de délai moyen de résolution, et ${stats.openAnomalies} anomalies ouvertes.`;
      }
    }
    
    if (lowerMessage.includes('maintenance') || lowerMessage.includes('planning')) {
      const windows = context?.maintenanceWindows;
      if (windows && windows.length > 0) {
        const nextWindow = windows[0];
        return `Le prochain arrêt est prévu le ${new Date(nextWindow.start_date).toLocaleDateString('fr-FR')}. Type: ${nextWindow.type}.`;
      }
    }
    
    if (lowerMessage.includes('équipement')) {
      const equipment = this.extractEquipmentId(message);
      if (equipment && context?.anomalies) {
        const equipmentAnomalies = context.anomalies.filter((a: DatabaseAnomaly) => 
          a.equipment_id.toLowerCase().includes(equipment.toLowerCase())
        );
        if (equipmentAnomalies.length > 0) {
          const anomaly = equipmentAnomalies[0];
          return `L'équipement ${anomaly.equipment_id} a une anomalie: ${anomaly.title}. Statut: ${anomaly.status}. Criticité: ${anomaly.criticality_level}.`;
        }
      }
    }
    
    return 'Je comprends votre question. Puis-je vous aider avec des informations sur les anomalies, les statistiques, la maintenance planifiée, ou des équipements spécifiques?';
  }

  private extractEquipmentId(message: string): string | null {
    // Look for equipment patterns like P-101, R-205, etc.
    const match = message.match(/[A-Z]-\d+/i);
    return match ? match[0] : null;
  }
}

export const supabaseChatService = new SupabaseChatService();
