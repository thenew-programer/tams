import React, { useState } from 'react';
import { vectorSearchService } from '../../services/vectorSearchService';

export const VectorSearchDebug: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const status = await vectorSearchService.testChromaDBConnection();
      setConnectionStatus(status);
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionStatus({ connected: false, error: 'Connection test failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const results = await vectorSearchService.getContextForQuery(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error running search:', error);
      setSearchResults({ error: 'Search failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAutoIndex = async () => {
    setIsLoading(true);
    try {
      await vectorSearchService.autoIndexExistingData();
      alert('Auto-indexing completed successfully!');
    } catch (error) {
      console.error('Error during auto-indexing:', error);
      alert('Auto-indexing failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerMigration = async () => {
    setIsLoading(true);
    try {
      await vectorSearchService.migrateEmbeddingsToChromaDB();
      alert('Migration completed successfully!');
    } catch (error) {
      console.error('Error during migration:', error);
      alert('Migration failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white shadow rounded-lg">
      <h2 className="text-xl font-bold mb-4">Vector Search Debug Console</h2>
      
      {/* Connection Status */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={testConnection}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test ChromaDB Connection
          </button>
          {isLoading && <span className="text-gray-500">Loading...</span>}
        </div>
        
        {connectionStatus && (
          <div className={`p-3 rounded ${connectionStatus.connected ? 'bg-green-100' : 'bg-red-100'}`}>
            <p><strong>Connected:</strong> {connectionStatus.connected ? 'Yes' : 'No'}</p>
            {connectionStatus.error && (
              <p><strong>Error:</strong> {connectionStatus.error}</p>
            )}
            {connectionStatus.collections && (
              <div>
                <strong>Collections:</strong>
                <ul className="list-disc ml-4">
                  {connectionStatus.collections.map((collection: any) => (
                    <li key={collection.name}>
                      {collection.name}: {collection.count} documents
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Test */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Test Vector Search</h3>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter search query (e.g., 'turbine problem vibration')"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={runSearch}
            disabled={isLoading || !searchQuery.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Search
          </button>
        </div>
        
        {searchResults && (
          <div className="p-3 bg-gray-100 rounded">
            {searchResults.error ? (
              <p className="text-red-600">Error: {searchResults.error}</p>
            ) : (
              <div>
                <p><strong>Anomalies found:</strong> {searchResults.anomalies?.length || 0}</p>
                <p><strong>Maintenance found:</strong> {searchResults.maintenance?.length || 0}</p>
                <p><strong>Knowledge found:</strong> {searchResults.knowledge?.length || 0}</p>
                
                {searchResults.anomalies?.length > 0 && (
                  <div className="mt-2">
                    <strong>Top Anomalies:</strong>
                    <ul className="list-disc ml-4">
                      {searchResults.anomalies.slice(0, 3).map((result: any, index: number) => (
                        <li key={index}>
                          ID: {result.id}, Similarity: {(result.similarity * 100).toFixed(1)}%
                          <br />
                          <small>{result.content.substring(0, 100)}...</small>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Actions */}
      <div className="space-y-2">
        <h3 className="font-semibold">Manual Actions</h3>
        <button
          onClick={triggerAutoIndex}
          disabled={isLoading}
          className="mr-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          Auto-Index Existing Data
        </button>
        <button
          onClick={triggerMigration}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Migrate to ChromaDB
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>This debug console helps test and troubleshoot the vector search functionality.</p>
        <p>Check the browser console for detailed logs.</p>
      </div>
    </div>
  );
};

export default VectorSearchDebug;
