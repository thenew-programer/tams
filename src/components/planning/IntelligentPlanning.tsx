import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Clock, Calendar, AlertTriangle, CheckCircle, X, Play, RotateCw, Settings, Info } from 'lucide-react';
import { MockIntelligentPlanningService } from '../../services/mockIntelligentPlanningService';
import { IntelligentPlanningService, SchedulingResult } from '../../services/intelligentPlanningService';
import { IntelligentPlanningAlgorithmDemo } from './IntelligentPlanningAlgorithmDemo';
import { Anomaly, MaintenanceWindow } from '../../types';
import { toast } from 'react-hot-toast';

interface IntelligentPlanningProps {
  onScheduleComplete?: (results: SchedulingResult[]) => void;
  onWindowCreate?: (window: MaintenanceWindow) => void;
  anomalies?: Anomaly[];
  maintenanceWindows?: MaintenanceWindow[];
}

export const IntelligentPlanning: React.FC<IntelligentPlanningProps> = ({
  onScheduleComplete,
  onWindowCreate,
  anomalies = [],
  maintenanceWindows = []
}) => {
  // Use mock service for local development
  const isLocalDevelopment = import.meta.env.DEV || !import.meta.env.VITE_API_URL;
  const [planningService] = useState(() => 
    isLocalDevelopment 
      ? new MockIntelligentPlanningService() as any
      : new IntelligentPlanningService()
  );
  
  const [loading, setLoading] = useState(false);
  const [schedulingResults, setSchedulingResults] = useState<SchedulingResult[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [unschedulableAnomalies, setUnschedulableAnomalies] = useState<any[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load recommendations
      const { recommendations: recs, unschedulableAnomalies: unschedulable } = 
        await planningService.getSchedulingRecommendations();
      
      setRecommendations(recs);
      setUnschedulableAnomalies(unschedulable);
    } catch (error) {
      console.error('Failed to load planning data:', error);
      toast.error('Failed to load planning data');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSchedule = async () => {
    setLoading(true);
    try {
      const results = await planningService.autoScheduleTreatedAnomalies();
      setSchedulingResults(results);
      
      const successCount = results.filter((r: SchedulingResult) => r.success).length;
      const failCount = results.filter((r: SchedulingResult) => !r.success).length;
      
      toast.success(
        `Auto-scheduling complete: ${successCount} scheduled, ${failCount} failed`
      );
      
      if (onScheduleComplete) {
        onScheduleComplete(results);
      }
      
      // Reload data to reflect changes
      await loadData();
    } catch (error) {
      console.error('Auto-scheduling failed:', error);
      toast.error('Auto-scheduling failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWindow = async (anomaly: Anomaly, windowType: 'force' | 'minor' | 'major') => {
    setLoading(true);
    try {
      const newWindow = await planningService.createAutomaticMaintenanceWindow(anomaly, windowType);
      
      toast.success(`Created ${windowType} maintenance window for ${anomaly.title}`);
      
      if (onWindowCreate) {
        onWindowCreate(newWindow);
      }
      
      // Reload data to reflect changes
      await loadData();
    } catch (error) {
      console.error('Failed to create maintenance window:', error);
      toast.error('Failed to create maintenance window');
    } finally {
      setLoading(false);
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

  const getStatusColor = (success: boolean) => {
    return success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getWindowTypeColor = (type: string) => {
    switch (type) {
      case 'force': return 'bg-red-100 text-red-800';
      case 'minor': return 'bg-yellow-100 text-yellow-800';
      case 'major': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Intelligent Planning</h2>
          <p className="text-gray-600">Automatically schedule treated anomalies to maintenance windows</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDemo(!showDemo)}
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            Démonstration
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Recommendations
          </Button>
          <Button
            onClick={handleAutoSchedule}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Auto Schedule
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recommendations</p>
                <p className="text-2xl font-bold text-blue-600">{recommendations.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unschedulable</p>
                <p className="text-2xl font-bold text-red-600">{unschedulableAnomalies.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Scheduled</p>
                <p className="text-2xl font-bold text-green-600">
                  {schedulingResults.filter(r => r.success).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-orange-600">
                  {schedulingResults.filter(r => !r.success).length}
                </p>
              </div>
              <X className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Demo */}
      {showDemo && (
        <IntelligentPlanningAlgorithmDemo
          anomalies={anomalies}
          maintenanceWindows={maintenanceWindows}
        />
      )}

      {/* Recommendations */}
      {showRecommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Scheduling Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{rec.anomaly.title}</h4>
                        <Badge className={getCriticalityColor(rec.anomaly.criticalityLevel)}>
                          {rec.anomaly.criticalityLevel}
                        </Badge>
                        <Badge className={getCriticalityColor(rec.urgency)}>
                          {rec.urgency} urgency
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.anomaly.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {rec.anomaly.estimatedHours}h
                        </span>
                        <span>Equipment: {rec.anomaly.equipmentId}</span>
                        <span>Service: {rec.anomaly.service}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateWindow(rec.anomaly, 'minor')}
                        disabled={loading}
                      >
                        Create Window
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Recommended Window</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getWindowTypeColor(rec.recommendedWindow.type)}>
                            {rec.recommendedWindow.type}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {rec.recommendedWindow.startDate.toLocaleDateString()} - 
                            {rec.recommendedWindow.endDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="text-sm font-medium">{rec.recommendedWindow.durationDays} days</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Reason: {rec.reason}</p>
                  </div>
                </div>
              ))}

              {recommendations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No scheduling recommendations available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unschedulable Anomalies */}
      {unschedulableAnomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Unschedulable Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unschedulableAnomalies.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{item.anomaly.title}</h4>
                      <Badge className={getCriticalityColor(item.anomaly.criticalityLevel)}>
                        {item.anomaly.criticalityLevel}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{item.reason}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {item.anomaly.estimatedHours}h
                      </span>
                      <span>Equipment: {item.anomaly.equipmentId}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateWindow(item.anomaly, 'force')}
                      disabled={loading}
                    >
                      Create Force Window
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCreateWindow(item.anomaly, 'minor')}
                      disabled={loading}
                    >
                      Create Minor Window
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scheduling Results */}
      {schedulingResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Scheduling Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedulingResults.map((result, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Anomaly ID: {result.anomalyId}</span>
                      <Badge className={getStatusColor(result.success)}>
                        {result.success ? 'Scheduled' : 'Failed'}
                      </Badge>
                    </div>
                    {result.success ? (
                      <div className="text-sm text-gray-600">
                        <p>Window: {result.windowId}</p>
                        <p>Date: {result.scheduledDate.toLocaleDateString()}</p>
                        <p>Duration: {result.estimatedDuration}h</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">{result.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IntelligentPlanning;
