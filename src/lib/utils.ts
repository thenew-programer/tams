import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getCriticalityColor(level: string): string {
  switch (level) {
    case 'critical': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'new': return 'bg-blue-500';
    case 'in_progress': return 'bg-yellow-500';
    case 'treated': return 'bg-green-500';
    case 'closed': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function calculateCriticality(
  fiabilite_integrite: number,
  disponibilite: number,
  processSafety: number
): 'low' | 'medium' | 'high' | 'critical' {
  // Calculate sum of 3 scores out of 5 each (total range 0-15)
  const totalScore = fiabilite_integrite + disponibilite + processSafety;
  
  if (totalScore > 9) return 'critical';     // > 9: Anomalies critiques
  if (totalScore >= 7) return 'high';       // 7-8: Anomalies à criticité élevée  
  if (totalScore >= 3) return 'medium';     // 3-6: Anomalies à criticité normale
  return 'low';                             // 0-2: Anomalies à criticité faible
}

export function optimizeMaintenanceSchedule(
  anomalies: any[],
  windows: any[]
): { efficiency: number; suggestions: any[] } {
  // AI-powered optimization algorithm
  const unscheduled = anomalies.filter(a => !a.maintenanceWindowId);
  const available = windows.filter(w => w.status === 'planned');
  
  const suggestions = available.map(window => {
    const compatible = unscheduled
      .filter(a => (a.estimatedHours || 4) <= window.durationDays * 8)
      .sort((a, b) => {
        const criticalityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (criticalityOrder[b.criticalityLevel as keyof typeof criticalityOrder] || 0) - 
               (criticalityOrder[a.criticalityLevel as keyof typeof criticalityOrder] || 0);
      });
    
    return {
      windowId: window.id,
      anomalies: compatible.slice(0, 5),
      efficiency: Math.min(100, (compatible.length / 3) * 100)
    };
  });
  
  const overallEfficiency = suggestions.reduce((sum, s) => sum + s.efficiency, 0) / suggestions.length;
  
  return { efficiency: overallEfficiency || 0, suggestions };
}