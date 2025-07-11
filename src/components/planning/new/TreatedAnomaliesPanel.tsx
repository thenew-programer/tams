import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2,
  Calendar,
  Zap,
  ArrowRight,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Anomaly } from '../../../types';
import { formatDate } from '../../../lib/utils';

interface TreatedAnomaliesPanelProps {
  anomalies: Anomaly[];
  unscheduledAnomalies: Anomaly[];
  onSchedule: (anomalyId: string, windowId: string) => void;
  onCreateWindow: (anomalyId?: string) => void;
  onBatchSchedule: (anomalyIds: string[], windowId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterStatus: 'all' | 'urgent' | 'scheduled' | 'unscheduled';
  onFilterChange: (status: 'all' | 'urgent' | 'scheduled' | 'unscheduled') => void;
}

export const TreatedAnomaliesPanel: React.FC<TreatedAnomaliesPanelProps> = ({
  anomalies,
  unscheduledAnomalies,
  onCreateWindow,
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterChange
}) => {
  const [selectedAnomalies, setSelectedAnomalies] = useState<string[]>([]);
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);

  // Filter and search anomalies
  const filteredAnomalies = useMemo(() => {
    let filtered = anomalies;

    // Apply status filter
    switch (filterStatus) {
      case 'urgent':
        filtered = filtered.filter(a => a.criticalityLevel === 'critical' || a.criticalityLevel === 'high');
        break;
      case 'scheduled':
        filtered = filtered.filter(a => !!a.maintenanceWindowId);
        break;
      case 'unscheduled':
        filtered = filtered.filter(a => !a.maintenanceWindowId);
        break;
      default:
        break;
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term) ||
        a.equipmentId.toLowerCase().includes(term) ||
        a.service.toLowerCase().includes(term) ||
        a.responsiblePerson.toLowerCase().includes(term)
      );
    }

    // Sort by criticality then by creation date
    return filtered.sort((a, b) => {
      const criticalityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      const aCriticality = criticalityOrder[a.criticalityLevel];
      const bCriticality = criticalityOrder[b.criticalityLevel];
      
      if (aCriticality !== bCriticality) {
        return aCriticality - bCriticality;
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [anomalies, filterStatus, searchTerm]);

  const handleSelectAnomaly = (anomalyId: string) => {
    setSelectedAnomalies(prev => 
      prev.includes(anomalyId)
        ? prev.filter(id => id !== anomalyId)
        : [...prev, anomalyId]
    );
  };

  const handleSelectAll = () => {
    const unscheduledIds = filteredAnomalies
      .filter(a => !a.maintenanceWindowId)
      .map(a => a.id);
    
    setSelectedAnomalies(
      selectedAnomalies.length === unscheduledIds.length ? [] : unscheduledIds
    );
  };

  const getCriticalityBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Treated Anomalies
          </CardTitle>
          <Badge variant="info" className="text-xs">
            {anomalies.length} total
          </Badge>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search anomalies..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="flex gap-1">
              {[
                { id: 'all', label: 'All', count: anomalies.length },
                { id: 'urgent', label: 'Urgent', count: anomalies.filter(a => a.criticalityLevel === 'critical' || a.criticalityLevel === 'high').length },
                { id: 'unscheduled', label: 'Unscheduled', count: unscheduledAnomalies.length },
                { id: 'scheduled', label: 'Scheduled', count: anomalies.filter(a => !!a.maintenanceWindowId).length }
              ].map(filter => (
                <Button
                  key={filter.id}
                  variant={filterStatus === filter.id ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onFilterChange(filter.id as any)}
                  className="text-xs"
                >
                  {filter.label} ({filter.count})
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Batch Actions */}
        {selectedAnomalies.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedAnomalies.length} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onCreateWindow()}
                  className="text-xs"
                >
                  Create Window
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAnomalies([])}
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-0">
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {filteredAnomalies.length === 0 ? (
            <div className="text-center py-8 px-6 text-gray-500">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No treated anomalies found</p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSearchChange('')}
                  className="mt-2 text-xs"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Select All Button */}
              {unscheduledAnomalies.length > 0 && (
                <div className="px-6 py-2 border-b">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs w-full justify-start"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAnomalies.length === filteredAnomalies.filter(a => !a.maintenanceWindowId).length}
                      onChange={() => {}}
                      className="mr-2"
                    />
                    Select all unscheduled
                  </Button>
                </div>
              )}

              {filteredAnomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedAnomalies.includes(anomaly.id) ? 'bg-blue-50' : ''
                  } ${
                    expandedAnomaly === anomaly.id ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection checkbox for unscheduled anomalies */}
                    {!anomaly.maintenanceWindowId && (
                      <input
                        type="checkbox"
                        checked={selectedAnomalies.includes(anomaly.id)}
                        onChange={() => handleSelectAnomaly(anomaly.id)}
                        className="mt-1"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm truncate">
                            {anomaly.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={getCriticalityBadgeVariant(anomaly.criticalityLevel)}
                              className="text-xs"
                            >
                              {anomaly.criticalityLevel}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {anomaly.equipmentId}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {anomaly.maintenanceWindowId ? (
                            <Badge variant="success" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              Scheduled
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedAnomaly(
                              expandedAnomaly === anomaly.id ? null : anomaly.id
                            )}
                            className="p-1 h-6 w-6"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Details when expanded */}
                      {expandedAnomaly === anomaly.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="space-y-2 text-xs text-gray-600">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="font-medium">Service:</span> {anomaly.service}
                              </div>
                              <div>
                                <span className="font-medium">Responsible:</span> {anomaly.responsiblePerson}
                              </div>
                              <div>
                                <span className="font-medium">Created:</span> {formatDate(anomaly.createdAt)}
                              </div>
                              <div>
                                <span className="font-medium">Updated:</span> {formatDate(anomaly.updatedAt)}
                              </div>
                            </div>
                            <p className="text-xs text-gray-700 mt-2">
                              {anomaly.description}
                            </p>
                          </div>

                          {/* Action buttons */}
                          {!anomaly.maintenanceWindowId && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => onCreateWindow(anomaly.id)}
                                className="text-xs flex items-center gap-1"
                              >
                                <Zap className="h-3 w-3" />
                                Create Window
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* Open window selector */}}
                                className="text-xs flex items-center gap-1"
                              >
                                <ArrowRight className="h-3 w-3" />
                                Assign to Window
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
