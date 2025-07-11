import OpenAI from 'openai';
import { vectorSearchService, SearchResult } from './vectorSearchService';

// Initialize OpenAI client with OpenRouter configuration
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_LLM_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const MODEL = 'gpt-4'; // Use GPT-4 model for better performance

export class LLMService {
  async getChatCompletion(message: string, context?: any): Promise<string> {
    try {
      // Get vector-based context
      const vectorContext = await vectorSearchService.getContextForQuery(message);
      
      const systemPrompt = this.buildSystemPrompt(context, vectorContext);
      
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';
    } catch (error) {
      console.error('LLM Service Error:', error);
      throw new Error('Erreur lors de la communication avec le modèle de langage');
    }
  }

  private buildSystemPrompt(context?: any, vectorContext?: {
    anomalies: SearchResult[];
    maintenance: SearchResult[];
    knowledge: SearchResult[];
  }): string {
    let systemPrompt = `Vous êtes un assistant IA spécialisé dans la gestion des anomalies industrielles pour le système TAMS (Maintenance et Anomalies).

Votre rôle :
- Analyser les anomalies industrielles et fournir des recommandations
- Aider à la planification de la maintenance
- Répondre aux questions sur les équipements et les données
- Communiquer en français de manière professionnelle et claire

Instructions :
- Utilisez un ton professionnel mais accessible
- Fournissez des réponses précises et actionables
- Si vous n'avez pas assez d'informations, demandez des clarifications
- Référencez les données contextuelles quand disponibles
- Basez-vous prioritairement sur les informations similaires trouvées dans la base de données
- repondre dans un paragraphe unique et concis, sans répétitions inutiles
- Ne pas inclure de balises HTML ou de formatage complexe
- Ne pas inclure de balises de code ou de formatage Markdown
- Ne pas inclure de balises de citation ou de références externes
- Ne pas inclure de balises de liste ou de points
- Ne pas inclure de balises de titre ou de sous-titre
- Ne pas inclure de balises de paragraphe ou de saut de ligne
- Ne pas inclure de balises de lien ou d'URL`;

    // Add vector search context
    if (vectorContext) {
      if (vectorContext.anomalies.length > 0) {
        systemPrompt += '\n\nAnomalies similaires trouvées:\n';
        vectorContext.anomalies.forEach((result, index) => {
          const anomaly = result.metadata || {};
          systemPrompt += `${index + 1}. ${anomaly.num_equipement || 'N/A'}: ${anomaly.description || 'Sans description'} (Similarité: ${(result.similarity * 100).toFixed(1)}%, Status: ${anomaly.status || 'N/A'}, Criticité: ${anomaly.final_criticality_level || 'N/A'})\n`;
          
          // Always include content if available
          if (result.content) {
            systemPrompt += `   Détails: ${result.content.substring(0, 300)}...\n`;
          }
        });
      }

      if (vectorContext.maintenance.length > 0) {
        systemPrompt += '\n\nMaintenance similaire trouvée:\n';
        vectorContext.maintenance.forEach((result, index) => {
          const maintenance = result.metadata || {};
          systemPrompt += `${index + 1}. ${maintenance.name || 'N/A'}: ${maintenance.start_time ? new Date(maintenance.start_time).toLocaleDateString('fr-FR') : 'Date non spécifiée'} (Similarité: ${(result.similarity * 100).toFixed(1)}%)\n`;
          
          // Always include content if available
          if (result.content) {
            systemPrompt += `   Détails: ${result.content.substring(0, 300)}...\n`;
          }
        });
      }

      if (vectorContext.knowledge.length > 0) {
        systemPrompt += '\n\nDocumentation pertinente:\n';
        vectorContext.knowledge.forEach((result, index) => {
          const title = result.metadata?.title || 'Document sans titre';
          systemPrompt += `${index + 1}. ${title}: `;
          
          // Always include full content for knowledge base items
          if (result.content) {
            systemPrompt += `${result.content.substring(0, 500)}... `;
          } else {
            systemPrompt += `[Contenu non disponible] `;
          }
          
          systemPrompt += `(Similarité: ${(result.similarity * 100).toFixed(1)}%)\n`;
        });
      }
    }

    // Add traditional context if available
    if (context) {
      if (context.statistics) {
        systemPrompt += `\n\nStatistiques actuelles:
- Anomalies ouvertes: ${context.statistics.openAnomalies || 0}
- Anomalies critiques: ${context.statistics.criticalAnomalies || 0}
- Taux de traitement: ${context.statistics.treatmentRate || 0}%
- Temps moyen de résolution: ${context.statistics.averageResolutionTime || 0} jours`;
      }

      if (context.anomalies && context.anomalies.length > 0) {
        systemPrompt += '\n\nAnomalies récentes additionnelles:';
        context.anomalies.forEach((anomaly: any, index: number) => {
          systemPrompt += `\n${index + 1}. ${anomaly.num_equipement}: ${anomaly.description} (Status: ${anomaly.status}, Criticité: ${anomaly.final_criticality_level || 'N/A'})`;
        });
      }
    }

    return systemPrompt;
  }

  async getAnomalyAnalysis(anomaly: any): Promise<string> {
    const prompt = `Analysez cette anomalie et fournissez des recommandations:

Équipement: ${anomaly.num_equipement}
Description: ${anomaly.description}
Service: ${anomaly.service}
Status: ${anomaly.status}
Scores de criticité:
- Fiabilité/Intégrité: ${anomaly.final_fiabilite_integrite_score || 'N/A'}
- Disponibilité: ${anomaly.final_disponibilite_score || 'N/A'}
- Sécurité des processus: ${anomaly.final_process_safety_score || 'N/A'}
- Niveau de criticité: ${anomaly.final_criticality_level || 'N/A'}

Fournissez une analyse détaillée et des recommandations d'action.`;

    return this.getChatCompletion(prompt);
  }

  async getMaintenanceRecommendations(equipment: string, anomalies: any[]): Promise<string> {
    const prompt = `Analysez les anomalies suivantes pour l'équipement ${equipment} et proposez un plan de maintenance:

${anomalies.map((a, i) => `${i + 1}. ${a.description} (Criticité: ${a.final_criticality_level})`).join('\n')}

Proposez des recommandations de maintenance préventive et corrective.`;

    return this.getChatCompletion(prompt);
  }
}

export const llmService = new LLMService();
