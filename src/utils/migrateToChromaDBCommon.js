// Migration script to move embeddings from Supabase to ChromaDB
// CommonJS version
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// First set up any environment variables that may be needed
process.env.VITE_CHROMA_API_KEY = process.env.VITE_CHROMA_API_KEY || '';
process.env.VITE_CHROMA_TENANT = process.env.VITE_CHROMA_TENANT || '';
process.env.VITE_CHROMA_DATABASE = process.env.VITE_CHROMA_DATABASE || '';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function main() {
  try {
    console.log('Loading vectorSearchService...');
    // Use dynamic import to ensure modules are loaded correctly
    const { vectorSearchService } = await import('../services/vectorSearchService');
    
    console.log("Starting migration of embeddings from Supabase to ChromaDB...");
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
main();
