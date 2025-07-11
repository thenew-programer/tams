import { supabase } from '../lib/supabase';
import { vectorSearchService } from './vectorSearchService';

export class EmbeddingService {
  /**
   * Generate and store embeddings for all existing anomalies
   */
  async generateAnomalyEmbeddings(): Promise<void> {
    try {
      console.log('Starting anomaly embeddings generation...');
      
      const { data: anomalies, error } = await supabase
        .from('anomalies')
        .select('*');

      if (error) throw error;

      for (const anomaly of anomalies || []) {
        const content = this.buildAnomalyContent(anomaly);
        await vectorSearchService.storeAnomalyEmbedding(anomaly.id, content);
        console.log(`Generated embedding for anomaly: ${anomaly.num_equipement}`);
      }

      console.log('Anomaly embeddings generation completed');
    } catch (error) {
      console.error('Error generating anomaly embeddings:', error);
    }
  }

  /**
   * Generate and store embeddings for maintenance windows
   */
  async generateMaintenanceEmbeddings(): Promise<void> {
    try {
      console.log('Starting maintenance embeddings generation...');
      
      const { data: maintenanceWindows, error } = await supabase
        .from('maintenance_windows')
        .select('*');

      if (error) throw error;

      for (const maintenance of maintenanceWindows || []) {
        const content = this.buildMaintenanceContent(maintenance);
        await vectorSearchService.storeMaintenanceEmbedding(maintenance.id, content);
        console.log(`Generated embedding for maintenance: ${maintenance.name}`);
      }

      console.log('Maintenance embeddings generation completed');
    } catch (error) {
      console.error('Error generating maintenance embeddings:', error);
    }
  }

  /**
   * Add some sample knowledge base entries
   */
  async seedKnowledgeBase(): Promise<void> {
    try {
      console.log('Seeding knowledge base...');
      
      const knowledgeEntries = [
        {
          title: "Procédure de maintenance préventive",
          content: "La maintenance préventive doit être effectuée selon un calendrier régulier pour éviter les pannes. Les équipements critiques nécessitent une inspection mensuelle, tandis que les équipements standards peuvent être inspectés trimestriellement.",
          metadata: { category: "maintenance", type: "procedure" }
        },
        {
          title: "Classification des anomalies par criticité",
          content: "Les anomalies sont classées de 1 à 15 selon leur criticité. Niveaux 1-5: Faible impact, résolution sous 7 jours. Niveaux 6-10: Impact modéré, résolution sous 3 jours. Niveaux 11-15: Impact critique, résolution immédiate requise.",
          metadata: { category: "anomalies", type: "classification" }
        },
        {
          title: "Sécurité des processus industriels",
          content: "La sécurité des processus est primordiale. Tout équipement présentant un score de sécurité inférieur à 3 doit être arrêté immédiatement. Les interventions sur les équipements haute pression nécessitent un permis de travail spécial.",
          metadata: { category: "safety", type: "procedure" }
        },
        {
          title: "Gestion des arrêts de maintenance",
          content: "Les arrêts de maintenance sont planifiés selon trois types: Arrêt mineur (1-2 jours), Arrêt majeur (1-2 semaines), Arrêt forcé (urgence). La coordination avec la production est essentielle pour minimiser l'impact.",
          metadata: { category: "maintenance", type: "planning" }
        }
      ];

      for (const entry of knowledgeEntries) {
        await vectorSearchService.storeKnowledgeEmbedding(
          entry.title,
          entry.content,
          entry.metadata
        );
        console.log(`Added knowledge entry: ${entry.title}`);
      }

      console.log('Knowledge base seeding completed');
    } catch (error) {
      console.error('Error seeding knowledge base:', error);
    }
  }

  /**
   * Generate embedding when a new anomaly is created
   */
  async onAnomalyCreated(anomaly: any): Promise<void> {
    try {
      const content = this.buildAnomalyContent(anomaly);
      await vectorSearchService.storeAnomalyEmbedding(anomaly.id, content);
    } catch (error) {
      console.error('Error generating embedding for new anomaly:', error);
    }
  }

  /**
   * Generate embedding when a new maintenance window is created
   */
  async onMaintenanceCreated(maintenance: any): Promise<void> {
    try {
      const content = this.buildMaintenanceContent(maintenance);
      await vectorSearchService.storeMaintenanceEmbedding(maintenance.id, content);
    } catch (error) {
      console.error('Error generating embedding for new maintenance:', error);
    }
  }

  /**
   * Build searchable content from anomaly data
   */
  private buildAnomalyContent(anomaly: any): string {
    return `Équipement: ${anomaly.num_equipement}
Description: ${anomaly.description}
Service: ${anomaly.service}
Responsable: ${anomaly.responsable}
Status: ${anomaly.status}
Source: ${anomaly.source_origine}
Criticité: ${anomaly.final_criticality_level || 'N/A'}
Scores - Fiabilité/Intégrité: ${anomaly.final_fiabilite_integrite_score || 'N/A'}, Disponibilité: ${anomaly.final_disponibilite_score || 'N/A'}, Sécurité: ${anomaly.final_process_safety_score || 'N/A'}
Heures estimées: ${anomaly.estimated_hours || 'N/A'}
Priorité: ${anomaly.priority || 'N/A'}`;
  }

  /**
   * Build searchable content from maintenance data
   */
  private buildMaintenanceContent(maintenance: any): string {
    return `Maintenance: ${maintenance.name}
Date début: ${maintenance.start_time}
Date fin: ${maintenance.end_time}
Description: ${maintenance.description || 'N/A'}
Statut: ${maintenance.status || 'N/A'}`;
  }
}

export const embeddingService = new EmbeddingService();
