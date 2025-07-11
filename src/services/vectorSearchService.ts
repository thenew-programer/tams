import { ChromaClient, Collection } from 'chromadb';
import { supabase } from '../lib/supabase';
import OpenAI from 'openai';

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_LLM_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// ChromaDB client and collections
let chromaClient: ChromaClient | null = null;
let anomalyCollection: Collection | null = null;
let maintenanceCollection: Collection | null = null;
let knowledgeCollection: Collection | null = null;
let isInitialized = false;

// Function to initialize ChromaDB client and collections
const initializeChromaDB = async () => {
  try {
    if (isInitialized) return;

    // Try cloud client first, fall back to local
    const useCloud = import.meta.env.VITE_CHROMA_API_KEY && 
                     import.meta.env.VITE_CHROMA_TENANT && 
                     import.meta.env.VITE_CHROMA_DATABASE;

    if (useCloud) {
      console.log("Initializing ChromaDB Cloud client...");
      const { CloudClient } = await import('chromadb');
      chromaClient = new CloudClient({
        apiKey: import.meta.env.VITE_CHROMA_API_KEY,
        tenant: import.meta.env.VITE_CHROMA_TENANT,
        database: import.meta.env.VITE_CHROMA_DATABASE
      });
    } else {
      console.log("Initializing ChromaDB local client...");
      chromaClient = new ChromaClient({
        path: import.meta.env.VITE_CHROMA_URL || "http://localhost:8000"
      });
    }

    // Initialize collections
    anomalyCollection = await chromaClient.getOrCreateCollection({
      name: "anomalies",
      metadata: { description: "Anomaly data and embeddings" }
    });
    
    maintenanceCollection = await chromaClient.getOrCreateCollection({
      name: "maintenance", 
      metadata: { description: "Maintenance window data and embeddings" }
    });
    
    knowledgeCollection = await chromaClient.getOrCreateCollection({
      name: "knowledge",
      metadata: { description: "Knowledge base data and embeddings" }
    });
    
    isInitialized = true;
    console.log("ChromaDB collections initialized successfully");
  } catch (error) {
    console.error("Failed to initialize ChromaDB:", error);
    // ChromaDB is optional, continue without it
    chromaClient = null;
    anomalyCollection = null;
    maintenanceCollection = null;
    knowledgeCollection = null;
  }
};

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: any;
}

export class VectorSearchService {
  constructor() {
    // Initialize ChromaDB when service is created
    this.initializeChromaDB();
  }

  private async initializeChromaDB() {
    await initializeChromaDB();
    
    // Auto-index existing data if collections are empty
    // Run this after a short delay to allow the app to start
    setTimeout(() => {
      this.autoIndexExistingData().catch(error => {
        console.error('Auto-indexing failed:', error);
      });
    }, 5000); // 5 second delay
  }

  /**
   * Ensure ChromaDB is ready
   */
  private async ensureChromaDB() {
    if (!isInitialized) {
      await initializeChromaDB();
    }
  }

  /**
   * Generate embedding for a text query using OpenAI's embeddings API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use OpenAI's text-embedding-ada-002 model (the correct current model)
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',  // Using the correct embedding model
        input: text,
        encoding_format: 'float', // Get floating point embeddings
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Search for similar anomalies using vector similarity
   */
  async searchSimilarAnomalies(
    query: string, 
    matchThreshold: number = 0.7, 
    matchCount: number = 5
  ): Promise<SearchResult[]> {
    try {
      const embedding = await this.generateEmbedding(query);
      
      // Ensure ChromaDB collection is available
      if (!anomalyCollection) {
        await this.ensureChromaDB();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // First try ChromaDB
      if (anomalyCollection) {
        try {
          const results = await anomalyCollection.query({
            queryEmbeddings: [embedding],
            nResults: matchCount * 2, // Get more results to filter
            where: { type: "anomaly" }, // Filter by type
            include: ["documents", "metadatas", "distances"]
          });
          
          if (results.ids[0]?.length > 0) {
            const validResults: SearchResult[] = [];
            
            for (let i = 0; i < results.ids[0].length; i++) {
              const id = results.ids[0][i];
              const distance = results.distances?.[0]?.[i] || 1;
              // Better similarity calculation (cosine similarity)
              const similarity = Math.max(0, 1 - distance);
              
              // Only include results above threshold
              if (similarity >= matchThreshold) {
                validResults.push({
                  id,
                  content: results.documents?.[0]?.[i] || '',
                  similarity,
                  metadata: results.metadatas?.[0]?.[i] || {}
                });
              }
            }
            
            if (validResults.length > 0) {
              // Sort by similarity and limit results
              const sortedResults = validResults
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, matchCount);
              
              console.log(`Found ${sortedResults.length} similar anomalies in ChromaDB with similarities:`, 
                sortedResults.map(r => ({ id: r.id, similarity: r.similarity.toFixed(3) })));
              return sortedResults;
            }
          }
        } catch (chromaError) {
          console.error('ChromaDB error, falling back to Supabase:', chromaError);
        }
      }
      
      // Fall back to Supabase
      console.log('Using Supabase for anomaly search...');
      const { data, error } = await supabase.rpc('search_similar_anomalies', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      if (error) throw error;

      const results = data.map((item: any) => ({
        id: item.anomaly_id,
        content: item.content || '',
        similarity: item.similarity,
        metadata: item.anomaly_data
      }));
      
      console.log(`Found ${results.length} similar anomalies in Supabase`);
      return results;
    } catch (error) {
      console.error('Error searching similar anomalies:', error);
      return [];
    }
  }

  /**
   * Search for similar maintenance windows
   */
  async searchSimilarMaintenance(
    query: string, 
    matchThreshold: number = 0.7, 
    matchCount: number = 5
  ): Promise<SearchResult[]> {
    try {
      const embedding = await this.generateEmbedding(query);
      
      // First try ChromaDB
      if (maintenanceCollection) {
        try {
          const results = await maintenanceCollection.query({
            queryEmbeddings: [embedding],
            nResults: matchCount * 2,
            where: { type: "maintenance" },
            include: ["documents", "metadatas", "distances"]
          });
          
          if (results.ids[0]?.length > 0) {
            const validResults: SearchResult[] = [];
            
            for (let i = 0; i < results.ids[0].length; i++) {
              const id = results.ids[0][i];
              const distance = results.distances?.[0]?.[i] || 1;
              const similarity = Math.max(0, 1 - distance);
              
              // Only include results above threshold
              if (similarity >= matchThreshold) {
                validResults.push({
                  id,
                  content: results.documents?.[0]?.[i] || '',
                  similarity,
                  metadata: results.metadatas?.[0]?.[i] || {}
                });
              }
            }
            
            if (validResults.length > 0) {
              const sortedResults = validResults
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, matchCount);
                
              console.log(`Found ${sortedResults.length} similar maintenance windows in ChromaDB`);
              return sortedResults;
            }
          }
        } catch (chromaError) {
          console.error('ChromaDB error, falling back to Supabase:', chromaError);
        }
      }
      
      // Fall back to Supabase
      console.log('Using Supabase for maintenance search...');
      const { data, error } = await supabase.rpc('search_similar_maintenance', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.maintenance_window_id,
        content: item.content || '',  // Ensure content is never undefined
        similarity: item.similarity,
        metadata: item.maintenance_data
      }));
    } catch (error) {
      console.error('Error searching similar maintenance:', error);
      return [];
    }
  }

  /**
   * Search knowledge base
   */
  async searchKnowledgeBase(
    query: string, 
    matchThreshold: number = 0.7, 
    matchCount: number = 5
  ): Promise<SearchResult[]> {
    try {
      const embedding = await this.generateEmbedding(query);
      
      // First try ChromaDB
      if (knowledgeCollection) {
        try {
          const results = await knowledgeCollection.query({
            queryEmbeddings: [embedding],
            nResults: matchCount * 2,
            where: { type: "knowledge" },
            include: ["documents", "metadatas", "distances"]
          });
          
          if (results.ids[0]?.length > 0) {
            const validResults: SearchResult[] = [];
            
            for (let i = 0; i < results.ids[0].length; i++) {
              const id = results.ids[0][i];
              const distance = results.distances?.[0]?.[i] || 1;
              const similarity = Math.max(0, 1 - distance);
              
              // Only include results above threshold
              if (similarity >= matchThreshold) {
                const metadata = results.metadatas?.[0]?.[i] || {};
                const title = metadata.title || 'Document sans titre';
                
                validResults.push({
                  id,
                  content: results.documents?.[0]?.[i] || '',
                  similarity,
                  metadata: { title, ...metadata }
                });
              }
            }
            
            if (validResults.length > 0) {
              const sortedResults = validResults
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, matchCount);
                
              console.log(`Found ${sortedResults.length} knowledge base results in ChromaDB`);
              return sortedResults;
            }
          }
        } catch (chromaError) {
          console.error('ChromaDB error, falling back to Supabase:', chromaError);
        }
      }
      
      // Fall back to Supabase
      console.log('Using Supabase for knowledge search...');
      const { data, error } = await supabase.rpc('search_knowledge_base', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        content: item.content || '',  // Ensure content is never undefined
        similarity: item.similarity,
        metadata: { title: item.title, ...item.metadata }
      }));
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  /**
   * Get comprehensive context for a query using vector search
   */
  async getContextForQuery(query: string): Promise<{
    anomalies: SearchResult[];
    maintenance: SearchResult[];
    knowledge: SearchResult[];
  }> {
    try {
      const [anomalies, maintenance, knowledge] = await Promise.all([
        this.searchSimilarAnomalies(query, 0.6, 3),
        this.searchSimilarMaintenance(query, 0.6, 2),
        this.searchKnowledgeBase(query, 0.6, 3)
      ]);

      return { anomalies, maintenance, knowledge };
    } catch (error) {
      console.error('Error getting context for query:', error);
      return { anomalies: [], maintenance: [], knowledge: [] };
    }
  }

  /**
   * Store anomaly embedding
   */
  async storeAnomalyEmbedding(anomalyId: string, content: string, metadata?: any): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(content);
      
      console.log(`Storing anomaly embedding for ID: ${anomalyId}`);
      
      // Ensure ChromaDB collection is available
      if (!anomalyCollection) {
        console.log("Initializing ChromaDB collections...");
        await this.ensureChromaDB();
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Store in ChromaDB first
      if (anomalyCollection) {
        try {
          const embeddingMetadata = { 
            type: 'anomaly',
            anomalyId,
            updatedAt: new Date().toISOString(),
            ...metadata || {}
          };

          // Try to get existing document first
          let existingDoc = null;
          try {
            const existing = await anomalyCollection.get({
              ids: [anomalyId],
              include: ["metadatas"]
            });
            if (existing.ids.length > 0) {
              existingDoc = existing;
            }
          } catch (getError) {
            // Document doesn't exist, will add new
          }
          
          if (existingDoc) {
            // Update existing document
            await anomalyCollection.update({
              ids: [anomalyId],
              embeddings: [embedding],
              metadatas: [embeddingMetadata],
              documents: [content]
            });
            console.log(`✅ Updated anomaly embedding in ChromaDB for ID: ${anomalyId}`);
          } else {
            // Add new document
            await anomalyCollection.add({
              ids: [anomalyId],
              embeddings: [embedding],
              metadatas: [embeddingMetadata],
              documents: [content]
            });
            console.log(`✅ Added new anomaly embedding to ChromaDB for ID: ${anomalyId}`);
          }
        } catch (chromaError) {
          console.error('❌ ChromaDB error when storing anomaly embedding:', chromaError);
        }
      } else {
        console.warn('⚠️ ChromaDB not available, storing only in Supabase');
      }
      
      // Also store in Supabase as backup
      const { error } = await supabase
        .from('anomaly_embeddings')
        .upsert({
          anomaly_id: anomalyId,
          content,
          embedding,
          metadata: metadata || {}
        });

      if (error) {
        console.error('❌ Supabase error when storing anomaly embedding:', error);
      } else {
        console.log(`✅ Stored anomaly embedding in Supabase for ID: ${anomalyId}`);
      }
    } catch (error) {
      console.error('❌ Error storing anomaly embedding:', error);
    }
  }

  /**
   * Store maintenance window embedding
   */
  async storeMaintenanceEmbedding(maintenanceId: string, content: string, metadata?: any): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(content);
      
      console.log(`Storing maintenance embedding for ID: ${maintenanceId}`);
      
      // Ensure ChromaDB collection is available
      if (!maintenanceCollection) {
        console.log("Initializing ChromaDB collections...");
        await this.ensureChromaDB();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Store in ChromaDB first
      if (maintenanceCollection) {
        try {
          const embeddingMetadata = { 
            type: 'maintenance',
            maintenanceId,
            updatedAt: new Date().toISOString(),
            ...metadata || {}
          };

          // Try to get existing document first
          let existingDoc = null;
          try {
            const existing = await maintenanceCollection.get({
              ids: [maintenanceId],
              include: ["metadatas"]
            });
            if (existing.ids.length > 0) {
              existingDoc = existing;
            }
          } catch (getError) {
            // Document doesn't exist, will add new
          }
          
          if (existingDoc) {
            await maintenanceCollection.update({
              ids: [maintenanceId],
              embeddings: [embedding],
              metadatas: [embeddingMetadata],
              documents: [content]
            });
            console.log(`✅ Updated maintenance embedding in ChromaDB for ID: ${maintenanceId}`);
          } else {
            await maintenanceCollection.add({
              ids: [maintenanceId],
              embeddings: [embedding],
              metadatas: [embeddingMetadata],
              documents: [content]
            });
            console.log(`✅ Added new maintenance embedding to ChromaDB for ID: ${maintenanceId}`);
          }
        } catch (chromaError) {
          console.error('❌ ChromaDB error when storing maintenance embedding:', chromaError);
        }
      }
      
      // Also store in Supabase as backup
      const { error } = await supabase
        .from('maintenance_embeddings')
        .upsert({
          maintenance_window_id: maintenanceId,
          content,
          embedding,
          metadata: metadata || {}
        });

      if (error) {
        console.error('❌ Supabase error when storing maintenance embedding:', error);
      } else {
        console.log(`✅ Stored maintenance embedding in Supabase for ID: ${maintenanceId}`);
      }
    } catch (error) {
      console.error('❌ Error storing maintenance embedding:', error);
    }
  }

  /**
   * Store knowledge base embedding
   */
  async storeKnowledgeEmbedding(
    title: string, 
    content: string, 
    metadata?: any
  ): Promise<string> {
    try {
      const fullContent = `${title}\n${content}`;
      const embedding = await this.generateEmbedding(fullContent);
      const documentId = crypto.randomUUID();
      
      console.log(`Storing knowledge embedding for title: ${title}`);
      
      // Ensure ChromaDB collection is available
      if (!knowledgeCollection) {
        console.log("Initializing ChromaDB collections...");
        await this.ensureChromaDB();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Store in ChromaDB first
      if (knowledgeCollection) {
        try {
          await knowledgeCollection.add({
            ids: [documentId],
            embeddings: [embedding],
            metadatas: [{ 
              type: 'knowledge', 
              title,
              documentId,
              createdAt: new Date().toISOString(),
              ...metadata || {} 
            }],
            documents: [fullContent]
          });
          console.log(`✅ Added knowledge embedding to ChromaDB for title: ${title}`);
        } catch (chromaError) {
          console.error('❌ ChromaDB error when storing knowledge embedding:', chromaError);
        }
      }
      
      // Also store in Supabase as backup
      const { error } = await supabase
        .from('knowledge_embeddings')
        .insert({
          id: documentId,
          title,
          content,
          embedding,
          metadata: metadata || {}
        });

      if (error) {
        console.error('❌ Supabase error when storing knowledge embedding:', error);
      } else {
        console.log(`✅ Stored knowledge embedding in Supabase for title: ${title}`);
      }
      
      return documentId;
    } catch (error) {
      console.error('❌ Error storing knowledge embedding:', error);
      return crypto.randomUUID(); // Return a fallback ID
    }
  }

  /**
   * Migrate existing embeddings from Supabase to ChromaDB
   */
  async migrateEmbeddingsToChromaDB(): Promise<void> {
    try {
      console.log("Starting migration of embeddings to ChromaDB...");
      
      // Ensure collections are initialized
      if (!anomalyCollection || !maintenanceCollection || !knowledgeCollection) {
        console.log("Waiting for ChromaDB collections to initialize...");
        await this.ensureChromaDB();
        // Wait a bit to ensure collections are initialized
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 1. Migrate anomaly embeddings
      console.log("Migrating anomaly embeddings...");
      const { data: anomalyEmbeddings, error: anomalyError } = await supabase
        .from('anomaly_embeddings')
        .select('*');
        
      if (anomalyError) {
        console.error("Error fetching anomaly embeddings:", anomalyError);
      } else if (anomalyEmbeddings && anomalyEmbeddings.length > 0 && anomalyCollection) {
        const batchSize = 100;
        for (let i = 0; i < anomalyEmbeddings.length; i += batchSize) {
          const batch = anomalyEmbeddings.slice(i, i + batchSize);
          try {
            await anomalyCollection.add({
              ids: batch.map(item => item.anomaly_id),
              embeddings: batch.map(item => item.embedding),
              metadatas: batch.map(() => ({ type: 'anomaly' })),
              documents: batch.map(item => item.content || '')
            });
            console.log(`Migrated anomaly embeddings batch ${i / batchSize + 1}`);
          } catch (error) {
            console.error(`Error migrating anomaly embeddings batch ${i / batchSize + 1}:`, error);
          }
        }
      }
      
      // 2. Migrate maintenance embeddings
      console.log("Migrating maintenance embeddings...");
      const { data: maintenanceEmbeddings, error: maintenanceError } = await supabase
        .from('maintenance_embeddings')
        .select('*');
        
      if (maintenanceError) {
        console.error("Error fetching maintenance embeddings:", maintenanceError);
      } else if (maintenanceEmbeddings && maintenanceEmbeddings.length > 0 && maintenanceCollection) {
        const batchSize = 100;
        for (let i = 0; i < maintenanceEmbeddings.length; i += batchSize) {
          const batch = maintenanceEmbeddings.slice(i, i + batchSize);
          try {
            await maintenanceCollection.add({
              ids: batch.map(item => item.maintenance_window_id),
              embeddings: batch.map(item => item.embedding),
              metadatas: batch.map(() => ({ type: 'maintenance' })),
              documents: batch.map(item => item.content || '')
            });
            console.log(`Migrated maintenance embeddings batch ${i / batchSize + 1}`);
          } catch (error) {
            console.error(`Error migrating maintenance embeddings batch ${i / batchSize + 1}:`, error);
          }
        }
      }
      
      // 3. Migrate knowledge embeddings
      console.log("Migrating knowledge embeddings...");
      const { data: knowledgeEmbeddings, error: knowledgeError } = await supabase
        .from('knowledge_embeddings')
        .select('*');
        
      if (knowledgeError) {
        console.error("Error fetching knowledge embeddings:", knowledgeError);
      } else if (knowledgeEmbeddings && knowledgeEmbeddings.length > 0 && knowledgeCollection) {
        const batchSize = 100;
        for (let i = 0; i < knowledgeEmbeddings.length; i += batchSize) {
          const batch = knowledgeEmbeddings.slice(i, i + batchSize);
          try {
            await knowledgeCollection.add({
              ids: batch.map(item => item.id),
              embeddings: batch.map(item => item.embedding),
              metadatas: batch.map(item => ({ 
                type: 'knowledge',
                title: item.title,
                ...item.metadata || {}
              })),
              documents: batch.map(item => `${item.title}\n${item.content || ''}`)
            });
            console.log(`Migrated knowledge embeddings batch ${i / batchSize + 1}`);
          } catch (error) {
            console.error(`Error migrating knowledge embeddings batch ${i / batchSize + 1}:`, error);
          }
        }
      }
      
      console.log("Migration of embeddings to ChromaDB completed");
    } catch (error) {
      console.error("Error during migration to ChromaDB:", error);
    }
  }

  /**
   * Index an anomaly for vector search (automatically called when anomalies are created/updated)
   */
  async indexAnomaly(anomaly: any): Promise<void> {
    try {
      // Create rich content for better RAG accuracy
      const content = `
        Titre: ${anomaly.title}
        Description: ${anomaly.description}
        Équipement: ${anomaly.equipmentId}
        Service: ${anomaly.service}
        Responsable: ${anomaly.responsiblePerson}
        Statut: ${anomaly.status}
        Niveau de criticité: ${anomaly.criticalityLevel}
        Source: ${anomaly.originSource}
        Score fiabilité/intégrité: ${anomaly.fiabiliteIntegriteScore}
        Score disponibilité: ${anomaly.disponibiliteScore}
        Score sécurité procédé: ${anomaly.processSafetyScore}
        ${anomaly.actionPlan ? `Plan d'action: ${JSON.stringify(anomaly.actionPlan)}` : ''}
      `.trim();

      const metadata = {
        equipmentId: anomaly.equipmentId,
        service: anomaly.service,
        status: anomaly.status,
        criticalityLevel: anomaly.criticalityLevel,
        createdAt: anomaly.createdAt,
        updatedAt: anomaly.updatedAt
      };

      await this.storeAnomalyEmbedding(anomaly.id, content, metadata);
    } catch (error) {
      console.error('Error indexing anomaly:', error);
    }
  }

  /**
   * Index a maintenance window for vector search
   */
  async indexMaintenanceWindow(window: any): Promise<void> {
    try {
      const content = `
        Type d'arrêt: ${window.type}
        Durée: ${window.durationDays} jours
        Date de début: ${window.startDate}
        Date de fin: ${window.endDate}
        Description: ${window.description || ''}
        Statut: ${window.status}
        ${window.assignedAnomalies ? `Anomalies assignées: ${window.assignedAnomalies.length}` : ''}
      `.trim();

      const metadata = {
        type: window.type,
        durationDays: window.durationDays,
        status: window.status,
        startDate: window.startDate,
        endDate: window.endDate
      };

      await this.storeMaintenanceEmbedding(window.id, content, metadata);
    } catch (error) {
      console.error('Error indexing maintenance window:', error);
    }
  }

  /**
   * Index REX files for better knowledge base search
   */
  async indexREXFile(anomalyId: string, filename: string, content: string): Promise<void> {
    try {
      const title = `REX - ${filename}`;
      const fullContent = `
        Fichier REX pour l'anomalie: ${anomalyId}
        Nom du fichier: ${filename}
        Contenu: ${content}
      `.trim();

      const metadata = {
        anomalyId,
        filename,
        type: 'rex_file',
        source: 'user_upload'
      };

      await this.storeKnowledgeEmbedding(title, fullContent, metadata);
    } catch (error) {
      console.error('Error indexing REX file:', error);
    }
  }

  /**
   * Bulk index existing data for better RAG performance
   */
  async bulkIndexExistingData(): Promise<void> {
    try {
      console.log("Starting bulk indexing of existing data...");

      // Index anomalies
      const { data: anomalies, error: anomaliesError } = await supabase
        .from('anomalies')
        .select('*');

      if (!anomaliesError && anomalies) {
        console.log(`Indexing ${anomalies.length} anomalies...`);
        for (const anomaly of anomalies) {
          await this.indexAnomaly(anomaly);
        }
      }

      // Index maintenance windows
      const { data: windows, error: windowsError } = await supabase
        .from('maintenance_windows')
        .select('*');

      if (!windowsError && windows) {
        console.log(`Indexing ${windows.length} maintenance windows...`);
        for (const window of windows) {
          await this.indexMaintenanceWindow(window);
        }
      }

      // Index REX files
      const { data: rexFiles, error: rexError } = await supabase
        .from('rex_files')
        .select('*');

      if (!rexError && rexFiles) {
        console.log(`Indexing ${rexFiles.length} REX files...`);
        for (const file of rexFiles) {
          const anomalyId = file.metadata?.anomaly_id;
          if (anomalyId) {
            await this.indexREXFile(anomalyId, file.filename, file.description || '');
          }
        }
      }

      console.log("Bulk indexing completed successfully");
    } catch (error) {
      console.error('Error during bulk indexing:', error);
    }
  }

  /**
   * Prepare content for embedding storage
   */
  private prepareAnomalyContent(anomaly: any): string {
    const parts = [
      `Anomalie: ${anomaly.title || 'Sans titre'}`,
      `Description: ${anomaly.description || ''}`,
      `Équipement: ${anomaly.equipment || ''}`,
      `Localisation: ${anomaly.location || ''}`,
      `Criticité: ${anomaly.criticality_level || anomaly.criticality || ''}`,
      `Statut: ${anomaly.status || ''}`,
      `Date: ${anomaly.reported_date || anomaly.created_at || ''}`
    ].filter(part => part.split(': ')[1]); // Only include non-empty fields
    
    return parts.join('\n');
  }

  /**
   * Prepare maintenance window content for embedding
   */
  private prepareMaintenanceContent(window: any): string {
    const parts = [
      `Fenêtre de maintenance: ${window.title || window.name || 'Sans titre'}`,
      `Description: ${window.description || ''}`,
      `Type: ${window.type || ''}`,
      `Équipements: ${Array.isArray(window.equipment_list) ? window.equipment_list.join(', ') : window.equipment_list || ''}`,
      `Date début: ${window.start_date || window.startDate || ''}`,
      `Date fin: ${window.end_date || window.endDate || ''}`,
      `Durée: ${window.duration_days || window.durationDays || ''} jours`,
      `Statut: ${window.status || ''}`
    ].filter(part => part.split(': ')[1]); // Only include non-empty fields
    
    return parts.join('\n');
  }

  /**
   * Bulk index anomalies for better search performance
   */
  async bulkIndexAnomalies(anomalies: any[]): Promise<void> {
    console.log(`Bulk indexing ${anomalies.length} anomalies...`);
    
    for (const anomaly of anomalies) {
      try {
        const content = this.prepareAnomalyContent(anomaly);
        const metadata = {
          title: anomaly.title,
          equipment: anomaly.equipment,
          location: anomaly.location,
          criticality: anomaly.criticality_level || anomaly.criticality,
          status: anomaly.status,
          reported_date: anomaly.reported_date || anomaly.created_at
        };
        
        await this.storeAnomalyEmbedding(anomaly.id, content, metadata);
      } catch (error) {
        console.error(`Error indexing anomaly ${anomaly.id}:`, error);
      }
    }
    
    console.log('✅ Bulk anomaly indexing completed');
  }

  /**
   * Bulk index maintenance windows for better search performance
   */
  async bulkIndexMaintenanceWindows(windows: any[]): Promise<void> {
    console.log(`Bulk indexing ${windows.length} maintenance windows...`);
    
    for (const window of windows) {
      try {
        const content = this.prepareMaintenanceContent(window);
        const metadata = {
          title: window.title || window.name,
          type: window.type,
          equipment_list: window.equipment_list,
          start_date: window.start_date || window.startDate,
          end_date: window.end_date || window.endDate,
          duration_days: window.duration_days || window.durationDays,
          status: window.status
        };
        
        await this.storeMaintenanceEmbedding(window.id, content, metadata);
      } catch (error) {
        console.error(`Error indexing maintenance window ${window.id}:`, error);
      }
    }
    
    console.log('✅ Bulk maintenance window indexing completed');
  }

  /**
   * Test ChromaDB connectivity and collection status
   */
  async testChromaDBConnection(): Promise<{
    connected: boolean;
    collections: { name: string; count: number }[];
    error?: string;
  }> {
    try {
      await this.ensureChromaDB();
      
      if (!chromaClient) {
        return {
          connected: false,
          collections: [],
          error: 'ChromaDB client not initialized'
        };
      }

      const collections = [];
      
      // Test each collection
      if (anomalyCollection) {
        try {
          const count = await anomalyCollection.count();
          collections.push({ name: 'anomalies', count });
        } catch (error) {
          collections.push({ name: 'anomalies', count: -1 });
        }
      }
      
      if (maintenanceCollection) {
        try {
          const count = await maintenanceCollection.count();
          collections.push({ name: 'maintenance', count });
        } catch (error) {
          collections.push({ name: 'maintenance', count: -1 });
        }
      }
      
      if (knowledgeCollection) {
        try {
          const count = await knowledgeCollection.count();
          collections.push({ name: 'knowledge', count });
        } catch (error) {
          collections.push({ name: 'knowledge', count: -1 });
        }
      }

      return {
        connected: true,
        collections
      };
    } catch (error) {
      return {
        connected: false,
        collections: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Force reinitialize ChromaDB (useful for debugging)
   */
  async reinitializeChromaDB(): Promise<void> {
    console.log('🔄 Force reinitializing ChromaDB...');
    
    // Reset state
    chromaClient = null;
    anomalyCollection = null;
    maintenanceCollection = null;
    knowledgeCollection = null;
    isInitialized = false;
    
    // Reinitialize
    await initializeChromaDB();
    
    console.log('✅ ChromaDB reinitialized');
  }

  /**
   * Auto-index existing data if ChromaDB collections are empty
   */
  async autoIndexExistingData(): Promise<void> {
    try {
      console.log('🔍 Checking if auto-indexing is needed...');
      
      await this.ensureChromaDB();
      
      if (!chromaClient) {
        console.log('⚠️  ChromaDB not available, skipping auto-indexing');
        return;
      }

      // Check if collections have data
      const needsIndexing = {
        anomalies: false,
        maintenance: false,
        knowledge: false
      };

      if (anomalyCollection) {
        const count = await anomalyCollection.count();
        needsIndexing.anomalies = count === 0;
        console.log(`📊 Anomaly collection has ${count} entries`);
      }

      if (maintenanceCollection) {
        const count = await maintenanceCollection.count();
        needsIndexing.maintenance = count === 0;
        console.log(`📊 Maintenance collection has ${count} entries`);
      }

      if (knowledgeCollection) {
        const count = await knowledgeCollection.count();
        needsIndexing.knowledge = count === 0;
        console.log(`📊 Knowledge collection has ${count} entries`);
      }

      // Index anomalies if needed
      if (needsIndexing.anomalies) {
        console.log('📥 Auto-indexing anomalies...');
        const { data: anomalies, error } = await supabase
          .from('anomalies')
          .select('*')
          .limit(100); // Start with first 100

        if (!error && anomalies && anomalies.length > 0) {
          await this.bulkIndexAnomalies(anomalies);
        }
      }

      // Index maintenance windows if needed
      if (needsIndexing.maintenance) {
        console.log('📥 Auto-indexing maintenance windows...');
        const { data: windows, error } = await supabase
          .from('maintenance_windows')
          .select('*')
          .limit(50); // Start with first 50

        if (!error && windows && windows.length > 0) {
          await this.bulkIndexMaintenanceWindows(windows);
        }
      }

      // Index REX files if needed
      if (needsIndexing.knowledge) {
        console.log('📥 Auto-indexing REX files...');
        const { data: rexFiles, error } = await supabase
          .from('rex_files')
          .select('*')
          .limit(50);

        if (!error && rexFiles && rexFiles.length > 0) {
          for (const file of rexFiles) {
            try {
              const anomalyId = file.metadata?.anomaly_id;
              if (anomalyId) {
                await this.indexREXFile(anomalyId, file.filename, file.description || '');
              }
            } catch (error) {
              console.error(`Error indexing REX file ${file.id}:`, error);
            }
          }
        }
      }

      console.log('✅ Auto-indexing completed');
    } catch (error) {
      console.error('❌ Error during auto-indexing:', error);
    }
  }

}

export const vectorSearchService = new VectorSearchService();
