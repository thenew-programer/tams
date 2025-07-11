import React from 'react';
import { useData } from '../../contexts/DataContext';
import { Anomaly } from '../../types';

export const AnomaliesTest: React.FC = () => {
  const { anomalies, isLoading, useBackend } = useData();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Anomalies Data</h2>
        <div className="flex items-center space-x-4 text-sm">
          <span className={`px-2 py-1 rounded ${useBackend ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {useBackend ? 'Connected to Supabase' : 'Using Local Data'}
          </span>
          <span className="text-gray-500">
            {anomalies.length} anomalies loaded
          </span>
        </div>
      </div>

      <div className="grid gap-4">
        {anomalies.map((anomaly: any) => (
          <div key={anomaly.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{anomaly.title}</h3>
                <p className="text-gray-600 text-sm mb-2">{anomaly.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Equipment: {anomaly.equipmentId}</span>
                  <span>Service: {anomaly.service}</span>
                  <span>Responsible: {anomaly.responsiblePerson}</span>
                  <span>Status: {anomaly.status}</span>
                </div>
              </div>
              <div className="ml-4 text-right">
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  anomaly.criticalityLevel === 'critical' ? 'bg-red-100 text-red-800' :
                  anomaly.criticalityLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                  anomaly.criticalityLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {anomaly.criticalityLevel}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <div>F+I: {anomaly.fiabiliteIntegriteScore?.toFixed(1) || 'N/A'}/5</div>
                  <div>Disp: {anomaly.disponibiliteScore?.toFixed(1) || 'N/A'}/5</div>
                  <div>Sec: {anomaly.processSafetyScore?.toFixed(1) || 'N/A'}/5</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {anomalies.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No anomalies found</div>
          <p className="text-sm text-gray-400">
            {useBackend 
              ? 'Make sure your Supabase table has data or the migration has been run.'
              : 'Using local fallback data.'
            }
          </p>
        </div>
      )}
    </div>
  );
};
