import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Calendar, ArrowRight, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Anomaly, MaintenanceWindow } from '../../types';

interface IntelligentPlanningAlgorithmDemoProps {
  anomalies: Anomaly[];
  maintenanceWindows: MaintenanceWindow[];
}

interface SchedulingStep {
  step: number;
  description: string;
  data: any;
  type: 'filter' | 'sort' | 'assign' | 'result';
}

export const IntelligentPlanningAlgorithmDemo: React.FC<IntelligentPlanningAlgorithmDemoProps> = ({
  anomalies,
  maintenanceWindows
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<SchedulingStep[]>([]);

  const runAlgorithmDemo = () => {
    setIsRunning(true);
    const algorithmSteps: SchedulingStep[] = [];
    
    // Step 1: Filter treated anomalies
    const treatedAnomalies = anomalies.filter(a => a.status === 'treated' && !a.maintenanceWindowId);
    algorithmSteps.push({
      step: 1,
      description: 'Filtrer les anomalies traitées non planifiées',
      data: {
        total: anomalies.length,
        filtered: treatedAnomalies.length,
        anomalies: treatedAnomalies
      },
      type: 'filter'
    });

    // Step 2: Sort by priority and criticality
    const sortedAnomalies = [...treatedAnomalies].sort((a, b) => {
      const criticalityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aWeight = criticalityWeight[a.criticalityLevel as keyof typeof criticalityWeight];
      const bWeight = criticalityWeight[b.criticalityLevel as keyof typeof criticalityWeight];
      
      if (aWeight !== bWeight) return bWeight - aWeight;
      return (a.priority || 5) - (b.priority || 5);
    });

    algorithmSteps.push({
      step: 2,
      description: 'Trier par criticité et priorité',
      data: {
        sortedAnomalies: sortedAnomalies.map(a => ({
          id: a.id,
          title: a.title,
          criticality: a.criticalityLevel,
          priority: a.priority || 5,
          estimatedHours: a.estimatedHours || 0
        }))
      },
      type: 'sort'
    });

    // Step 3: Calculate available windows
    const availableWindows = maintenanceWindows.filter(w => w.status === 'planned');
    const windowSlots = availableWindows.map(window => ({
      id: window.id,
      type: window.type,
      startDate: window.startDate,
      totalHours: window.durationDays * 8, // 8 hours per day
      assignedHours: 0,
      availableHours: window.durationDays * 8,
      priority: window.type === 'force' ? 10 : window.type === 'minor' ? 5 : 3
    }));

    algorithmSteps.push({
      step: 3,
      description: 'Calculer les créneaux disponibles',
      data: {
        windowSlots: windowSlots.sort((a, b) => b.priority - a.priority)
      },
      type: 'assign'
    });

    // Step 4: Assign anomalies to windows
    const assignments: any[] = [];
    const updatedSlots = [...windowSlots];
    
    for (const anomaly of sortedAnomalies) {
      const requiredHours = anomaly.estimatedHours || 0;
      
      // Find first available slot
      const availableSlot = updatedSlots.find(slot => 
        slot.availableHours >= requiredHours + 2 // 2 hours buffer
      );
      
      if (availableSlot) {
        assignments.push({
          anomalyId: anomaly.id,
          anomalyTitle: anomaly.title,
          windowId: availableSlot.id,
          windowType: availableSlot.type,
          scheduledHours: requiredHours,
          success: true
        });
        
        // Update slot availability
        availableSlot.assignedHours += requiredHours + 2;
        availableSlot.availableHours -= requiredHours + 2;
      } else {
        assignments.push({
          anomalyId: anomaly.id,
          anomalyTitle: anomaly.title,
          windowId: null,
          windowType: null,
          scheduledHours: requiredHours,
          success: false,
          reason: 'Aucun créneau disponible'
        });
      }
    }

    algorithmSteps.push({
      step: 4,
      description: 'Assigner les anomalies aux créneaux optimaux',
      data: {
        assignments,
        successCount: assignments.filter(a => a.success).length,
        failCount: assignments.filter(a => !a.success).length
      },
      type: 'result'
    });

    setSteps(algorithmSteps);
    setCurrentStep(0);
    setIsRunning(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWindowTypeColor = (type: string) => {
    switch (type) {
      case 'force': return 'bg-red-100 text-red-800';
      case 'minor': return 'bg-yellow-100 text-yellow-800';
      case 'major': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStepContent = (step: SchedulingStep) => {
    switch (step.type) {
      case 'filter':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-medium">Anomalies totales</h4>
                <p className="text-2xl font-bold text-blue-600">{step.data.total}</p>
              </div>
              <ArrowRight className="h-8 w-8 text-blue-600" />
              <div>
                <h4 className="font-medium">Anomalies éligibles</h4>
                <p className="text-2xl font-bold text-green-600">{step.data.filtered}</p>
              </div>
            </div>
            <div className="space-y-2">
              {step.data.anomalies.slice(0, 3).map((anomaly: Anomaly) => (
                <div key={anomaly.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium">{anomaly.title}</p>
                    <p className="text-sm text-gray-600">{anomaly.equipmentId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getCriticalityColor(anomaly.criticalityLevel)}>
                      {anomaly.criticalityLevel}
                    </Badge>
                    <span className="text-sm text-gray-600">{anomaly.estimatedHours}h</span>
                  </div>
                </div>
              ))}
              {step.data.anomalies.length > 3 && (
                <p className="text-sm text-gray-500 text-center">
                  ... et {step.data.anomalies.length - 3} autres
                </p>
              )}
            </div>
          </div>
        );

      case 'sort':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-lg">
              <h4 className="font-medium mb-2">Critères de tri :</h4>
              <ul className="text-sm space-y-1">
                <li>• Criticité (Critical &gt; High &gt; Medium &gt; Low)</li>
                <li>• Priorité (1 = plus urgent, 5 = moins urgent)</li>
                <li>• Date de création (plus ancien en premier)</li>
              </ul>
            </div>
            <div className="space-y-2">
              {step.data.sortedAnomalies.map((anomaly: any, index: number) => (
                <div key={anomaly.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{anomaly.title}</p>
                      <p className="text-sm text-gray-600">{anomaly.estimatedHours}h</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getCriticalityColor(anomaly.criticality)}>
                      {anomaly.criticality}
                    </Badge>
                    <span className="text-sm text-gray-600">P{anomaly.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'assign':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium mb-2">Créneaux disponibles triés par priorité :</h4>
            </div>
            <div className="space-y-2">
              {step.data.windowSlots.map((slot: any, index: number) => (
                <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{slot.startDate.toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">{slot.availableHours}h disponibles</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getWindowTypeColor(slot.type)}>
                      {slot.type}
                    </Badge>
                    <span className="text-sm text-gray-600">Priorité {slot.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{step.data.successCount}</p>
                <p className="text-sm text-gray-600">Planifiées</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{step.data.failCount}</p>
                <p className="text-sm text-gray-600">Non planifiées</p>
              </div>
            </div>
            <div className="space-y-2">
              {step.data.assignments.map((assignment: any) => (
                <div key={assignment.anomalyId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium">{assignment.anomalyTitle}</p>
                    <p className="text-sm text-gray-600">{assignment.scheduledHours}h requises</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {assignment.success ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Badge className={getWindowTypeColor(assignment.windowType)}>
                          {assignment.windowType}
                        </Badge>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600">{assignment.reason}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Démonstration de l'Algorithme de Planning Intelligent
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Control buttons */}
          <div className="flex justify-center gap-4">
            <Button onClick={runAlgorithmDemo} disabled={isRunning} className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Démarrer la démonstration
            </Button>
            {steps.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
                  Précédent
                </Button>
                <Button variant="outline" onClick={nextStep} disabled={currentStep === steps.length - 1}>
                  Suivant
                </Button>
              </div>
            )}
          </div>

          {/* Step indicator */}
          {steps.length > 0 && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index === currentStep ? 'bg-blue-600' : 
                      index < currentStep ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step content */}
          {steps.length > 0 && steps[currentStep] && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Étape {steps[currentStep].step}: {steps[currentStep].description}
                </h3>
              </div>
              <div className="border rounded-lg p-4">
                {renderStepContent(steps[currentStep])}
              </div>
            </div>
          )}

          {/* Info message */}
          {steps.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Cliquez sur "Démarrer la démonstration" pour voir comment l'algorithme fonctionne</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IntelligentPlanningAlgorithmDemo;
