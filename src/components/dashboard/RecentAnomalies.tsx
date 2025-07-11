import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, User, Wrench } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Anomaly } from '../../types';
import { formatDate, getCriticalityColor, getStatusColor } from '../../lib/utils';

interface RecentAnomaliesProps {
  anomalies: Anomaly[];
}

export const RecentAnomalies: React.FC<RecentAnomaliesProps> = ({ anomalies }) => {
  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'new': return 'info';
      case 'in_progress': return 'warning';
      case 'treated': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Anomalies Récentes</CardTitle>
        <Link to="/anomalies">
          <Button variant="ghost" size="sm">Voir tout</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {anomalies.slice(0, 5).map((anomaly) => (
            <div key={anomaly.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${getCriticalityColor(anomaly.criticalityLevel)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {anomaly.equipmentId || 'Équipement non spécifié'}
                  </h4>
                  <Badge variant={getBadgeVariant(anomaly.criticalityLevel)}>
                    {anomaly.criticalityLevel}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {anomaly.description || 'Aucune description'}
                </p>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Wrench className="w-3 h-3 mr-1" />
                    {anomaly.equipmentId}
                  </div>
                  <div className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {anomaly.responsiblePerson}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDate(anomaly.createdAt)}
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant={getStatusVariant(anomaly.status)}>
                    {anomaly.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};