-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table for anomalies
CREATE TABLE IF NOT EXISTS anomaly_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_id uuid REFERENCES anomalies(id) ON DELETE CASCADE,
    content text NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimension
    created_at timestamp with time zone DEFAULT now()
);

-- Create embeddings table for maintenance windows
CREATE TABLE IF NOT EXISTS maintenance_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_window_id uuid REFERENCES maintenance_windows(id) ON DELETE CASCADE,
    content text NOT NULL,
    embedding vector(1536),
    created_at timestamp with time zone DEFAULT now()
);

-- Create embeddings table for general knowledge/documents
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    embedding vector(1536),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for vector similarity search
CREATE INDEX ON anomaly_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON maintenance_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS on embedding tables
ALTER TABLE anomaly_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies for embedding tables
CREATE POLICY "All users can view anomaly_embeddings" ON anomaly_embeddings
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "All users can insert anomaly_embeddings" ON anomaly_embeddings
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "All users can update anomaly_embeddings" ON anomaly_embeddings
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "All users can view maintenance_embeddings" ON maintenance_embeddings
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "All users can insert maintenance_embeddings" ON maintenance_embeddings
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "All users can update maintenance_embeddings" ON maintenance_embeddings
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "All users can view knowledge_embeddings" ON knowledge_embeddings
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "All users can insert knowledge_embeddings" ON knowledge_embeddings
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "All users can update knowledge_embeddings" ON knowledge_embeddings
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Function to search similar anomalies
CREATE OR REPLACE FUNCTION search_similar_anomalies(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    anomaly_id uuid,
    content text,
    similarity float,
    anomaly_data jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.anomaly_id,
        ae.content,
        1 - (ae.embedding <=> query_embedding) as similarity,
        to_jsonb(a.*) as anomaly_data
    FROM anomaly_embeddings ae
    JOIN anomalies a ON ae.anomaly_id = a.id
    WHERE 1 - (ae.embedding <=> query_embedding) > match_threshold
    ORDER BY ae.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to search similar maintenance windows
CREATE OR REPLACE FUNCTION search_similar_maintenance(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    maintenance_window_id uuid,
    content text,
    similarity float,
    maintenance_data jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        me.maintenance_window_id,
        me.content,
        1 - (me.embedding <=> query_embedding) as similarity,
        to_jsonb(mw.*) as maintenance_data
    FROM maintenance_embeddings me
    JOIN maintenance_windows mw ON me.maintenance_window_id = mw.id
    WHERE 1 - (me.embedding <=> query_embedding) > match_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to search knowledge base
CREATE OR REPLACE FUNCTION search_knowledge_base(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    similarity float,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ke.id,
        ke.title,
        ke.content,
        1 - (ke.embedding <=> query_embedding) as similarity,
        ke.metadata
    FROM knowledge_embeddings ke
    WHERE 1 - (ke.embedding <=> query_embedding) > match_threshold
    ORDER BY ke.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
