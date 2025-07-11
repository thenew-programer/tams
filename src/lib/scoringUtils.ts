/**
 * Utility functions for anomaly scoring system
 */

/**
 * Combine Fiabilité and Intégrité scores and convert to /5 scale
 * @param fiabiliteScore - Fiabilité score (0-10)
 * @param integriteScore - Intégrité score (0-10)
 * @returns Combined score (0-5)
 */
export const combineFiabiliteIntegrite = (fiabiliteScore: number, integriteScore: number): number => {
  // Average the two scores and convert from /10 to /5
  const averageScore = (fiabiliteScore + integriteScore) / 2;
  const convertedScore = (averageScore / 10) * 5;
  
  // Round to 1 decimal place
  return Math.round(convertedScore * 10) / 10;
};

/**
 * Convert a score from /10 to /5 scale
 * @param score - Score on /10 scale
 * @returns Score on /5 scale
 */
export const convertToFiveScale = (score: number): number => {
  const convertedScore = (score / 10) * 5;
  return Math.round(convertedScore * 10) / 10;
};

/**
 * Calculate criticality level based on combined scores
 * @param fiabiliteIntegriteScore - Combined Fiabilité + Intégrité score (/5)
 * @param disponibiliteScore - Disponibilité score (/5)
 * @param processSafetyScore - Process Safety score (/5)
 * @returns Criticality level
 */
export const calculateCriticalityLevel = (
  fiabiliteIntegriteScore: number,
  disponibiliteScore: number,
  processSafetyScore: number
): 'low' | 'medium' | 'high' | 'critical' => {
  // Calculate sum of 3 scores out of 5 each (total range 0-15)
  const totalScore = fiabiliteIntegriteScore + disponibiliteScore + processSafetyScore;
  
  if (totalScore > 9) return 'critical';     // > 9: Anomalies critiques
  if (totalScore >= 7) return 'high';       // 7-8: Anomalies à criticité élevée  
  if (totalScore >= 3) return 'medium';     // 3-6: Anomalies à criticité normale
  return 'low';                             // 0-2: Anomalies à criticité faible
};

/**
 * Format score for display
 * @param score - Score value
 * @param maxScore - Maximum possible score (default: 5)
 * @returns Formatted score string
 */
export const formatScore = (score: number, maxScore: number = 5): string => {
  return `${score.toFixed(1)}/${maxScore}`;
};

/**
 * Get score color based on value
 * @param score - Score value
 * @param maxScore - Maximum possible score (default: 5)
 * @returns CSS color class
 */
export const getScoreColor = (score: number, maxScore: number = 5): string => {
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 80) return 'text-red-600'; // Critical
  if (percentage >= 60) return 'text-orange-600'; // High
  if (percentage >= 40) return 'text-yellow-600'; // Medium
  return 'text-green-600'; // Low
};

/**
 * Get score background color for badges
 * @param score - Score value
 * @param maxScore - Maximum possible score (default: 5)
 * @returns CSS background color class
 */
export const getScoreBackgroundColor = (score: number, maxScore: number = 5): string => {
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 80) return 'bg-red-100 text-red-800'; // Critical
  if (percentage >= 60) return 'bg-orange-100 text-orange-800'; // High
  if (percentage >= 40) return 'bg-yellow-100 text-yellow-800'; // Medium
  return 'bg-green-100 text-green-800'; // Low
};

/**
 * Example usage for your case:
 * - Fiabilité: 3.3/10
 * - Intégrité: 5.4/10
 * - Combined: combineFiabiliteIntegrite(3.3, 5.4) = 2.2/5
 * 
 * - Disponibilité: 3.9/5 (already correct)
 * - Sécurité: 5.9/5 (should be max 5.0/5)
 */
export const exampleCalculation = () => {
  const fiabilite = 3.3; // /10
  const integrite = 5.4; // /10
  const disponibilite = 3.9; // /5
  const securite = Math.min(5.0, 5.9); // Cap at 5.0/5
  
  const combinedFiabiliteIntegrite = combineFiabiliteIntegrite(fiabilite, integrite);
  
  console.log('Combined Fiabilité + Intégrité:', formatScore(combinedFiabiliteIntegrite));
  console.log('Disponibilité:', formatScore(disponibilite));
  console.log('Sécurité:', formatScore(securite));
  
  const criticality = calculateCriticalityLevel(combinedFiabiliteIntegrite, disponibilite, securite);
  console.log('Criticality Level:', criticality);
};
