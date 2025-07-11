import React from 'react';
import { Plus, Target, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';

interface QuickActionsProps {
  onCreateWindow: () => void;
  onOptimize: () => void;
  onAutoSchedule: () => void;
  unscheduledCount: number;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onCreateWindow,
  onOptimize,
  onAutoSchedule,
  unscheduledCount
}) => {
  return (
    <div className="flex items-center gap-3">
      {/* Unscheduled indicator */}
      {unscheduledCount > 0 && (
        <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-2 rounded-lg">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            {unscheduledCount} unscheduled
          </span>
        </div>
      )}

      {/* Quick action buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onAutoSchedule}
          disabled={unscheduledCount === 0}
          className="flex items-center gap-2"
          title={unscheduledCount > 0 ? `Auto-schedule ${unscheduledCount} anomalies` : 'No anomalies to schedule'}
        >
          <RefreshCw className="h-4 w-4" />
          Auto-Schedule
          {unscheduledCount > 0 && (
            <Badge variant="warning" className="text-xs ml-1">
              {unscheduledCount}
            </Badge>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={onCreateWindow}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Window
        </Button>

        <Button
          variant="outline"
          onClick={onOptimize}
          className="flex items-center gap-2"
        >
          <Target className="h-4 w-4" />
          Optimize
        </Button>
      </div>
    </div>
  );
};
