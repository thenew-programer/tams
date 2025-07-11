// Migration script to move embeddings from Supabase to ChromaDB
// Using require instead of import for better compatibility with ts-node
import { vectorSearchService } from '../services/vectorSearchService.ts';

async function migrateEmbeddings() {
  console.log("Starting migration of embeddings from Supabase to ChromaDB...");
  try {
    await vectorSearchService.migrateEmbeddingsToChromaDB();
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    // Exit the process when done
    process.exit(0);
  }
}

// Run the migration
migrateEmbeddings();
