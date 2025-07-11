# Système de Planning Intelligent

## Vue d'ensemble

Le système de planning intelligent est conçu pour automatiser l'assignation des anomalies traitées aux créneaux de maintenance disponibles. Il utilise un algorithme sophistiqué qui prend en compte plusieurs facteurs pour optimiser la planification.

## Fonctionnalités principales

### 1. Planification automatique
- **Surveillance continue** : Le système surveille automatiquement les anomalies avec le statut "treated"
- **Assignation intelligente** : Assigne automatiquement les anomalies aux créneaux de maintenance optimaux
- **Exécution périodique** : Fonctionne en arrière-plan toutes les 5 minutes

### 2. Algorithme de priorisation
L'algorithme utilise plusieurs critères pour prioriser les anomalies :

1. **Niveau de criticité** (poids décroissant) :
   - Critical : 4 points
   - High : 3 points
   - Medium : 2 points
   - Low : 1 point

2. **Priorité** (1 = plus urgent, 5 = moins urgent)

3. **Date de création** (plus ancien = plus prioritaire)

### 3. Optimisation des créneaux
Le système optimise l'utilisation des créneaux selon :

- **Type de créneau** (priorité décroissante) :
  - Force : 10 points
  - Minor : 5 points
  - Major : 3 points

- **Proximité temporelle** : Les créneaux plus proches dans le temps sont prioritaires

- **Capacité disponible** : Calcul des heures disponibles en tenant compte des assignations existantes

## Comment ça fonctionne

### Étape 1 : Filtrage
```typescript
const treatedAnomalies = anomalies.filter(anomaly => 
  anomaly.status === 'treated' && 
  !anomaly.maintenanceWindowId &&
  anomaly.estimatedHours >= minHoursForScheduling
);
```

### Étape 2 : Tri par priorité
```typescript
const sortedAnomalies = treatedAnomalies.sort((a, b) => {
  // Tri par criticité puis par priorité
  if (aCriticality !== bCriticality) {
    return bCriticality - aCriticality;
  }
  return (a.priority || 5) - (b.priority || 5);
});
```

### Étape 3 : Assignation optimale
```typescript
for (const anomaly of sortedAnomalies) {
  const requiredHours = anomaly.estimatedHours;
  const optimalSlot = findOptimalSlot(requiredHours, availableSlots);
  
  if (optimalSlot) {
    assignAnomalyToWindow(anomaly, optimalSlot);
  }
}
```

## Configuration

### Paramètres configurables
```typescript
const config = {
  minHoursForScheduling: 1,        // Heures minimum pour planifier
  maxHoursPerWindow: 120,          // Heures maximum par créneau
  timeBuffer: 2,                   // Tampon entre les tâches (heures)
  workingHoursPerDay: 8,           // Heures de travail par jour
  criticalityWeights: {            // Poids par niveau de criticité
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  }
};
```

## Utilisation

### Activation/Désactivation
```typescript
const { 
  autoScheduleEnabled, 
  setAutoScheduleEnabled 
} = useIntelligentPlanning();

// Activer la planification automatique
setAutoScheduleEnabled(true);
```

### Planification manuelle
```typescript
const results = await planningService.autoScheduleTreatedAnomalies();
console.log('Résultats:', results);
```

### Création automatique de créneaux
```typescript
const newWindow = await planningService.createAutomaticMaintenanceWindow(
  anomaly, 
  'minor' // Type de créneau
);
```

## Recommandations

### Obtenir des recommandations
```typescript
const { recommendations, unschedulableAnomalies } = 
  await planningService.getSchedulingRecommendations();
```

### Types de recommandations
- **Anomalies planifiables** : Avec créneau recommandé
- **Anomalies non planifiables** : Nécessitent la création de nouveaux créneaux
- **Suggestions d'optimisation** : Amélioration de l'utilisation des créneaux

## Gestion des erreurs

Le système gère plusieurs types d'erreurs :

1. **Aucun créneau disponible** : Propose la création d'un nouveau créneau
2. **Durée insuffisante** : Suggère l'extension du créneau
3. **Conflits de planification** : Propose des alternatives
4. **Erreurs API** : Gestion gracieuse avec retry automatique

## Métriques et suivi

### Indicateurs de performance
- Taux de planification réussie
- Utilisation des créneaux
- Temps moyen de résolution
- Nombre d'anomalies en attente

### Historique
- Historique des planifications
- Tendances d'utilisation
- Analyse des échecs

## Bonnes pratiques

1. **Estimation précise** : Fournir des estimations d'heures réalistes
2. **Mise à jour régulière** : Maintenir les statuts d'anomalies à jour
3. **Planification proactive** : Créer des créneaux avant les pics d'activité
4. **Surveillance continue** : Vérifier régulièrement les métriques

## Dépannage

### Problèmes courants
- **Anomalies non planifiées** : Vérifier les heures estimées et les créneaux disponibles
- **Créneaux sous-utilisés** : Ajuster les paramètres de buffer
- **Conflits de priorité** : Réviser les niveaux de criticité

### Logs et debugging
```typescript
// Activer les logs détaillés
console.log('Planification en cours...', {
  anomalies: treatedAnomalies.length,
  créneaux: availableWindows.length,
  résultats: schedulingResults
});
```

## Évolutions futures

- **Machine Learning** : Prédiction des durées optimales
- **Intégration calendrier** : Synchronisation avec systèmes externes
- **Optimisation multi-critères** : Prise en compte des coûts et ressources
- **Planification collaborative** : Assignation d'équipes

---

Ce système représente une approche moderne et intelligente de la planification de maintenance, permettant une optimisation automatique des ressources et une amélioration continue des processus.
