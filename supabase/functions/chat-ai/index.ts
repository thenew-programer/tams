import { serve } from "http/serve"
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get request body
    const { message, context } = await req.json()

    // Get additional context from database
    const enrichedContext = await getEnrichedContext(supabase, message)

    // Generate AI response
    const response = await generateAIResponse(message, enrichedContext)

    // Save the conversation to database
    await supabase
      .from('chat_messages')
      .insert({
        message,
        response,
        context_data: enrichedContext
      })

    return new Response(
      JSON.stringify({ 
        response,
        context: enrichedContext 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in chat-ai function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "Désolé, je rencontre une difficulté technique. Pouvez-vous reformuler votre question?"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function getEnrichedContext(supabase: any, message: string) {
  const lowerMessage = message.toLowerCase()
  const context: any = {}

  try {
    // Get statistics
    const { count: totalAnomalies } = await supabase
      .from('anomalies')
      .select('*', { count: 'exact', head: true })

    const { count: openAnomalies } = await supabase
      .from('anomalies')
      .select('*', { count: 'exact', head: true })
      .in('status', ['new', 'in_progress'])

    const { count: criticalAnomalies } = await supabase
      .from('anomalies')
      .select('*', { count: 'exact', head: true })
      .eq('criticality_level', 'critical')

    context.statistics = {
      totalAnomalies: totalAnomalies || 0,
      openAnomalies: openAnomalies || 0,
      criticalAnomalies: criticalAnomalies || 0
    }

    // Get relevant anomalies based on message content
    if (lowerMessage.includes('anomalie') || lowerMessage.includes('critique') || lowerMessage.includes('équipement')) {
      let query = supabase
        .from('anomalies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (lowerMessage.includes('critique')) {
        query = query.eq('criticality_level', 'critical')
      }

      // Extract equipment ID if mentioned
      const equipmentMatch = message.match(/[A-Z]-\d+/i)
      if (equipmentMatch) {
        query = query.eq('equipment_id', equipmentMatch[0].toUpperCase())
      }

      const { data: anomalies } = await query
      context.anomalies = anomalies || []
    }

    // Get maintenance windows if planning/maintenance is mentioned
    if (lowerMessage.includes('maintenance') || lowerMessage.includes('planning') || lowerMessage.includes('arrêt')) {
      const { data: maintenanceWindows } = await supabase
        .from('maintenance_windows')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(3)

      context.maintenanceWindows = maintenanceWindows || []
    }

    // Search for specific content if needed
    if (lowerMessage.includes('recherche') || lowerMessage.includes('trouve')) {
      const searchTerm = extractSearchTerm(message)
      if (searchTerm) {
        const { data: searchResults } = await supabase
          .from('anomalies')
          .select('*')
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,equipment_id.ilike.%${searchTerm}%`)
          .limit(5)

        context.searchResults = searchResults || []
      }
    }

  } catch (error) {
    console.error('Error enriching context:', error)
  }

  return context
}

async function generateAIResponse(message: string, context: any): Promise<string> {
  const lowerMessage = message.toLowerCase()

  // Critical anomalies query
  if (lowerMessage.includes('anomalie') && lowerMessage.includes('critique')) {
    const criticalCount = context.statistics?.criticalAnomalies || 0
    if (context.anomalies && context.anomalies.length > 0) {
      const criticalAnomaly = context.anomalies[0]
      return `Actuellement, vous avez ${criticalCount} anomalies critiques en attente. La plus urgente concerne l'équipement ${criticalAnomaly.equipment_id}: "${criticalAnomaly.title}". Criticité: ${criticalAnomaly.criticality_level}. Voulez-vous voir les détails ou les actions recommandées?`
    } else {
      return `Vous avez ${criticalCount} anomalies critiques en attente. Voulez-vous que je vous donne plus de détails?`
    }
  }

  // Statistics query
  if (lowerMessage.includes('statistique') || lowerMessage.includes('rapport') || lowerMessage.includes('résumé')) {
    const stats = context.statistics
    if (stats) {
      const treatmentRate = stats.totalAnomalies > 0 ? 
        Math.round(((stats.totalAnomalies - stats.openAnomalies) / stats.totalAnomalies) * 100) : 0
      
      return `📊 **Résumé des statistiques actuelles:**
- **Total des anomalies:** ${stats.totalAnomalies}
- **Anomalies ouvertes:** ${stats.openAnomalies}
- **Anomalies critiques:** ${stats.criticalAnomalies}
- **Taux de traitement:** ${treatmentRate}%

Souhaitez-vous un rapport détaillé sur une catégorie spécifique?`
    }
  }

  // Maintenance planning query
  if (lowerMessage.includes('maintenance') || lowerMessage.includes('planning') || lowerMessage.includes('arrêt')) {
    if (context.maintenanceWindows && context.maintenanceWindows.length > 0) {
      const nextWindow = context.maintenanceWindows[0]
      const startDate = new Date(nextWindow.start_date).toLocaleDateString('fr-FR')
      
      return `🔧 **Prochaine maintenance planifiée:**
- **Type:** ${nextWindow.type} (${nextWindow.duration_days} jours)
- **Date:** ${startDate}
- **Description:** ${nextWindow.description}

Je peux optimiser le planning pour inclure des anomalies compatibles. Voulez-vous voir les recommandations?`
    } else {
      return `Aucune maintenance n'est actuellement planifiée. Voulez-vous que je créé un planning basé sur les anomalies prioritaires?`
    }
  }

  // Equipment-specific query
  const equipmentMatch = message.match(/[A-Z]-\d+/i)
  if (equipmentMatch || lowerMessage.includes('équipement')) {
    if (context.anomalies && context.anomalies.length > 0) {
      const anomaly = context.anomalies[0]
      return `🔍 **Équipement ${anomaly.equipment_id}:**
- **Anomalie:** ${anomaly.title}
- **Statut:** ${anomaly.status}
- **Criticité:** ${anomaly.criticality_level}
- **Responsable:** ${anomaly.responsible_person}
- **Service:** ${anomaly.service}

Voulez-vous voir l'historique complet ou les actions recommandées?`
    } else if (equipmentMatch) {
      return `Aucune anomalie active trouvée pour l'équipement ${equipmentMatch[0]}. L'équipement semble fonctionner normalement. Voulez-vous voir l'historique de maintenance?`
    }
  }

  // Search results
  if (context.searchResults && context.searchResults.length > 0) {
    const results = context.searchResults.slice(0, 3)
    let response = `🔍 **Résultats de recherche trouvés:**\n\n`
    
    results.forEach((anomaly: any, index: number) => {
      response += `${index + 1}. **${anomaly.equipment_id}** - ${anomaly.title} (${anomaly.criticality_level})\n`
    })
    
    response += `\nVoulez-vous voir les détails d'une anomalie spécifique?`
    return response
  }

  // Help and general queries
  if (lowerMessage.includes('aide') || lowerMessage.includes('help') || lowerMessage.includes('que peux-tu faire')) {
    return `🤖 **Je peux vous aider avec:**

📋 **Anomalies:** Rechercher, analyser et suivre les anomalies
📊 **Statistiques:** Générer des rapports et analyses
🔧 **Maintenance:** Optimiser la planification et les interventions
🔍 **Recherche:** Trouver des équipements ou anomalies spécifiques
💡 **Recommandations:** Suggérer des actions et priorités

**Exemples de questions:**
- "Quelles sont les anomalies critiques?"
- "Statut de l'équipement P-101?"
- "Prochain arrêt maintenance?"
- "Statistiques de résolution?"

Comment puis-je vous assister aujourd'hui?`
  }

  // Default response
  return `Je comprends votre question sur "${message}". Je peux vous aider avec:

🔍 Les anomalies et équipements
📊 Les statistiques et rapports  
🔧 La planification de maintenance
💡 Les recommandations d'actions

Pourriez-vous préciser ce que vous cherchez? Par exemple:
- Une anomalie ou équipement spécifique
- Des statistiques particulières
- Des informations sur la maintenance`
}

function extractSearchTerm(message: string): string | null {
  // Simple extraction of search terms after common French search keywords
  const searchPatterns = [
    /recherche\s+(.+)/i,
    /trouve\s+(.+)/i,
    /cherche\s+(.+)/i,
    /information\s+sur\s+(.+)/i
  ]

  for (const pattern of searchPatterns) {
    const match = message.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return null
}
