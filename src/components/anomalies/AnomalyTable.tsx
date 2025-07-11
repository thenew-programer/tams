import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Eye, 
  Edit, 
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Anomaly } from '../../types';
import { formatDate } from '../../lib/utils';

interface AnomalyTableProps {
  anomalies: Anomaly[];
  onEdit?: (anomaly: Anomaly) => void;
  onDelete?: (anomaly: Anomaly) => void;
  onRestore?: (anomaly: Anomaly) => void;
  isArchive?: boolean;
  isLoading?: boolean;
}

export const AnomalyTable: React.FC<AnomalyTableProps> = ({ 
  anomalies, 
  onEdit, 
  onDelete,
  onRestore,
  isArchive = false,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof Anomaly | 'criticality'>('criticality');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'new', label: '🆕 Nouveau' },
    { value: 'in_progress', label: '⏳ En cours' },
    { value: 'treated', label: '✅ Traité' },
    { value: 'closed', label: '🔒 Fermé' },
  ];
  
  // Dynamic service options based on actual data
  const uniqueServices = [...new Set(anomalies.map(a => a.service).filter(Boolean))];
  const serviceOptions = [
    { value: 'all', label: 'Tous les services' },
    ...uniqueServices.map(service => ({ value: service, label: service }))
  ];

  const criticalityOptions = [
    { value: 'all', label: 'Toutes les criticités' },
    { value: 'critical', label: '🔴 Critique' },
    { value: 'high', label: '🟠 Élevée' },
    { value: 'normal', label: '🟡 Normale' },
    { value: 'low', label: '🟢 Faible' },
  ];
  
  // Calculate criticality level based on sum of scores - Updated logic
  const calculateCriticalityLevel = (anomaly: Anomaly): 'low' | 'normal' | 'high' | 'critical' => {
    const fiabiliteIntegriteScore = anomaly.userFiabiliteIntegriteScore ?? anomaly.fiabiliteIntegriteScore ?? 0;
    const disponibiliteScore = anomaly.userDisponibiliteScore ?? anomaly.disponibiliteScore ?? 0;
    const processSafetyScore = anomaly.userProcessSafetyScore ?? anomaly.processSafetyScore ?? 0;
    
    const totalScore = fiabiliteIntegriteScore + disponibiliteScore + processSafetyScore;
    
    // New criticality logic:
    // >= 9: Anomalies critiques
    // 7-8: Anomalies à criticité élevée  
    // 3-6: Anomalies à criticité normale
    // 0-2: Anomalies à criticité faible
    if (totalScore >= 9) return 'critical';
    if (totalScore >= 7) return 'high';
    if (totalScore >= 3) return 'normal';
    return 'low';
  };

  // French translations for criticality levels
  const getCriticalityLabel = (level: 'low' | 'normal' | 'high' | 'critical'): string => {
    switch (level) {
      case 'critical': return 'Critique';
      case 'high': return 'Élevée';
      case 'normal': return 'Normale';
      case 'low': return 'Faible';
      default: return 'Normale';
    }
  };

  // French translations for status
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'new': return 'Nouveau';
      case 'in_progress': return 'En cours';
      case 'treated': return 'Traité';
      case 'closed': return 'Fermé';
      default: return 'Nouveau';
    }
  };

  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'normal': return 'info';
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
  
  const filteredAnomalies = anomalies.filter(anomaly => {
    const matchesSearch = (anomaly.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (anomaly.equipmentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (anomaly.responsiblePerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (anomaly.service || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (anomaly.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || anomaly.status === statusFilter;
    const matchesService = serviceFilter === 'all' || anomaly.service === serviceFilter;
    const matchesCriticality = criticalityFilter === 'all' || calculateCriticalityLevel(anomaly) === criticalityFilter;
    
    return matchesSearch && matchesStatus && matchesService && matchesCriticality;
  });
  
  const sortedAnomalies = [...filteredAnomalies].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    // Handle special sorting for criticality
    if (sortField === 'criticality') {
      const criticalityOrder = { 'critical': 4, 'high': 3, 'normal': 2, 'low': 1 };
      aValue = criticalityOrder[calculateCriticalityLevel(a)];
      bValue = criticalityOrder[calculateCriticalityLevel(b)];
    } else {
      aValue = a[sortField as keyof Anomaly];
      bValue = b[sortField as keyof Anomaly];
    }
    
    // Handle undefined/null values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
    if (bValue == null) return sortDirection === 'asc' ? 1 : -1;
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedAnomalies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAnomalies = sortedAnomalies.slice(startIndex, endIndex);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, serviceFilter, criticalityFilter]);

  const itemsPerPageOptions = [
    { value: '5', label: '5 par page' },
    { value: '10', label: '10 par page' },
    { value: '20', label: '20 par page' },
    { value: '50', label: '50 par page' },
  ];
  
  const handleSort = (field: keyof Anomaly | 'criticality') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'criticality' ? 'desc' : 'asc'); // Default desc for criticality, asc for others
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-end">
          <div className="flex space-x-2">
            {(statusFilter !== 'all' || serviceFilter !== 'all' || criticalityFilter !== 'all' || searchTerm) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setStatusFilter('all');
                  setServiceFilter('all');
                  setCriticalityFilter('all');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex flex-col space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par titre, description, équipement, responsable ou service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                <Select
                  options={statusOptions}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Service</label>
                <Select
                  options={serviceOptions}
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Criticité</label>
                <Select
                  options={criticalityOptions}
                  value={criticalityFilter}
                  onChange={(e) => setCriticalityFilter(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Active Filters Summary */}
            {(statusFilter !== 'all' || serviceFilter !== 'all' || criticalityFilter !== 'all' || searchTerm) && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <span className="text-xs font-medium text-gray-600">Filtres actifs:</span>
                <div className="flex flex-wrap gap-1">
                  {searchTerm && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Recherche: "{searchTerm}"
                    </span>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Statut: {statusOptions.find(opt => opt.value === statusFilter)?.label}
                    </span>
                  )}
                  {serviceFilter !== 'all' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Service: {serviceFilter}
                    </span>
                  )}
                  {criticalityFilter !== 'all' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Criticité: {criticalityOptions.find(opt => opt.value === criticalityFilter)?.label}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Chargement des anomalies..." />
          </div>
        )}
        
        {/* Table Content */}
        {!isLoading && (
          <>
            <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('equipmentId')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Équipement</span>
                    {sortField === 'equipmentId' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('criticality')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Criticité</span>
                      {sortField === 'criticality' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      )}
                    </div>
                    <div title="Calculé à partir de la somme des scores: Faible (0-2), Normale (3-6), Élevée (7-8), Critique (≥9). Cliquez pour trier.">
                      <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Date</span>
                    {sortField === 'createdAt' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAnomalies.map((anomaly) => (
                <tr key={anomaly.id} className="hover:bg-gray-50">
                  {/* <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${getCriticalityColor(anomaly.criticalityLevel)}`} />
                      <div className="text-sm font-medium text-gray-900">
                        {anomaly.equipmentId || 'N/A'}
                      </div>
                    </div>
                  </td> */}
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate" title={anomaly.description || 'N/A'}>
                      {anomaly.description || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {anomaly.service || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getBadgeVariant(calculateCriticalityLevel(anomaly))}>
                      {getCriticalityLabel(calculateCriticalityLevel(anomaly))}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusVariant(anomaly.status || 'new')}>
                      {getStatusLabel(anomaly.status || 'new')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(anomaly.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Link to={`/anomaly/${anomaly.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      {isArchive ? (
                        <>
                          {onRestore && (
                            <Button variant="ghost" size="sm" onClick={() => onRestore(anomaly)}>
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button variant="ghost" size="sm" onClick={() => onDelete(anomaly)}>
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {onEdit && (
                            <Button variant="ghost" size="sm" onClick={() => onEdit(anomaly)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {paginatedAnomalies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune anomalie trouvée.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {sortedAnomalies.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Afficher:</span>
                <Select
                  options={itemsPerPageOptions}
                  value={itemsPerPage.toString()}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="text-sm text-gray-700">
                Affichage de {startIndex + 1} à {Math.min(endIndex, sortedAnomalies.length)} sur {sortedAnomalies.length} résultats
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
        </>
        )}
      </CardContent>
    </Card>
  );
};