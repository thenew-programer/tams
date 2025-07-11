import React, { useEffect, useState } from 'react';
import { Zap, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Anomaly } from '../../../types';

interface AutoSchedulerProps {
  treatedAnomalies: Anomaly[];
  onScheduleComplete: () => void;
  enabled: boolean;
}

export const AutoScheduler: React.FC<AutoSchedulerProps> = ({
  treatedAnomalies,
  onScheduleComplete,
  enabled
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [schedulingStats, setSchedulingStats] = useState({
    totalProcessed: 0,
    successfullyScheduled: 0,
    newWindowsCreated: 0,
    unscheduled: 0
  });

  // Auto-run effect
  useEffect(() => {
    if (enabled && treatedAnomalies.length > 0 && !isRunning) {
      const timer = setTimeout(() => {
        runAutoScheduler();
      }, 3000); // 3 second delay

      return () => clearTimeout(timer);
    }
  }, [treatedAnomalies, enabled, isRunning]);

  const runAutoScheduler = async () => {
    if (isRunning) return;

    setIsRunning(true);
    
    try {
      // Simulate auto-scheduling process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update stats (this would be real data from the scheduling engine)
      setSchedulingStats({
        totalProcessed: treatedAnomalies.length,
        successfullyScheduled: Math.floor(treatedAnomalies.length * 0.8),
        newWindowsCreated: Math.floor(treatedAnomalies.length * 0.2),
        unscheduled: Math.floor(treatedAnomalies.length * 0.2)
      });

      setLastRun(new Date());
      onScheduleComplete();
    } catch (error) {
      console.error('Auto-scheduling failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <Card className="fixed bottom-6 right-6 w-80 shadow-lg border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            isRunning ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
          }`} />
          Auto Scheduler
          <Badge variant={isRunning ? 'info' : 'success'} className="text-xs ml-auto">
            {isRunning ? 'Running' : 'Ready'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {isRunning && (
          <div className="flex items-center gap-3 p-3 bg-blue-100 rounded-lg">
            <div className="animate-spin">
              <Zap className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Auto-scheduling in progress...
              </p>
              <p className="text-xs text-blue-700">
                Processing {treatedAnomalies.length} treated anomalies
              </p>
            </div>
          </div>
        )}

        {!isRunning && lastRun && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Clock className="h-3 w-3" />
              <span>Last run: {lastRun.toLocaleTimeString()}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span>Scheduled: {schedulingStats.successfullyScheduled}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-blue-600" />
                <span>New windows: {schedulingStats.newWindowsCreated}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <span>Unscheduled: {schedulingStats.unscheduled}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-600" />
                <span>Total: {schedulingStats.totalProcessed}</span>
              </div>
            </div>
          </div>
        )}

        {!isRunning && !lastRun && treatedAnomalies.length > 0 && (
          <div className="text-center py-2">
            <p className="text-sm text-gray-600">
              Ready to process {treatedAnomalies.length} treated anomalies
            </p>
          </div>
        )}

        {treatedAnomalies.length === 0 && (
          <div className="text-center py-2 text-gray-500">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">All anomalies scheduled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
