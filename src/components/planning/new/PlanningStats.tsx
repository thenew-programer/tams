import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Target
} from 'lucide-react';
import { Card, CardContent } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Anomaly } from '../../../types';

interface PlanningStatsProps {
  treatedAnomalies: Anomaly[];
  unscheduledCount: number;
  scheduledCount: number;
  availableWindows: number;
  totalWindows: number;
}

export const PlanningStats: React.FC<PlanningStatsProps> = ({
  treatedAnomalies,
  unscheduledCount,
  scheduledCount,
  availableWindows,
  totalWindows
}) => {
  // Calculate criticality distribution
  const criticalityStats = treatedAnomalies.reduce(
    (acc, anomaly) => {
      acc[anomaly.criticalityLevel] = (acc[anomaly.criticalityLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate scheduling efficiency
  const schedulingEfficiency = treatedAnomalies.length > 0 
    ? Math.round((scheduledCount / treatedAnomalies.length) * 100)
    : 0;

  // Window utilization
  const windowUtilization = totalWindows > 0 
    ? Math.round(((totalWindows - availableWindows) / totalWindows) * 100)
    : 0;

  const stats = [
    {
      label: 'Treated Anomalies',
      value: treatedAnomalies.length,
      subtext: 'Ready for scheduling',
      icon: CheckCircle2,
      color: 'bg-green-500',
      trend: '+5% this week'
    },
    {
      label: 'Unscheduled',
      value: unscheduledCount,
      subtext: 'Awaiting assignment',
      icon: Clock,
      color: 'bg-orange-500',
      trend: unscheduledCount > 0 ? 'Needs attention' : 'All scheduled!'
    },
    {
      label: 'Scheduled',
      value: scheduledCount,
      subtext: `${schedulingEfficiency}% efficiency`,
      icon: Calendar,
      color: 'bg-blue-500',
      trend: schedulingEfficiency > 80 ? 'Excellent' : 'Can improve'
    },
    {
      label: 'Available Windows',
      value: availableWindows,
      subtext: `${windowUtilization}% utilized`,
      icon: Target,
      color: 'bg-purple-500',
      trend: availableWindows > 0 ? 'Capacity available' : 'Fully booked'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
                  </div>
                  <div className={`${stat.color} rounded-full p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{stat.trend}</span>
                  {stat.label === 'Unscheduled' && unscheduledCount > 0 && (
                    <Badge variant="danger" className="text-xs">
                      Action needed
                    </Badge>
                  )}
                  {stat.label === 'Scheduled' && schedulingEfficiency > 80 && (
                    <Badge variant="success" className="text-xs">
                      Optimal
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Progress bar for some stats */}
              {(stat.label === 'Scheduled' || stat.label === 'Available Windows') && (
                <div className="h-1 bg-gray-200">
                  <div 
                    className={`h-full ${stat.color}`}
                    style={{ 
                      width: stat.label === 'Scheduled' 
                        ? `${schedulingEfficiency}%`
                        : `${windowUtilization}%`
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Criticality Breakdown */}
      {Object.keys(criticalityStats).length > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Criticality Distribution
              </h3>
              <Badge variant="info" className="text-xs">
                {treatedAnomalies.length} total
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { level: 'critical', label: 'Critical', color: 'bg-red-500', textColor: 'text-red-700' },
                { level: 'high', label: 'High', color: 'bg-orange-500', textColor: 'text-orange-700' },
                { level: 'medium', label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
                { level: 'low', label: 'Low', color: 'bg-green-500', textColor: 'text-green-700' }
              ].map(({ level, label, color, textColor }) => {
                const count = criticalityStats[level] || 0;
                const percentage = treatedAnomalies.length > 0 
                  ? Math.round((count / treatedAnomalies.length) * 100)
                  : 0;

                return (
                  <div key={level} className="text-center">
                    <div className={`${color} rounded-lg p-3 mb-2`}>
                      <span className="text-white font-bold text-lg">{count}</span>
                    </div>
                    <p className={`font-medium ${textColor}`}>{label}</p>
                    <p className="text-xs text-gray-500">{percentage}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
