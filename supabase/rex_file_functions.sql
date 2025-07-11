-- Create a function to associate a REX file with an anomaly
CREATE OR REPLACE FUNCTION public.associate_rex_file_with_anomaly(
    p_anomaly_id uuid,
    p_file_id uuid,
    p_filename text,
    p_filepath text,
    p_file_size_bytes integer,
    p_mime_type text,
    p_description text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rex_file_id uuid;
BEGIN
    -- Insert the file information into rex_files table
    INSERT INTO rex_files (
        id, filename, filepath, file_size_bytes, mime_type, 
        uploaded_by, description
    ) VALUES (
        p_file_id, p_filename, p_filepath, p_file_size_bytes, p_mime_type,
        auth.uid(), p_description
    )
    RETURNING id INTO v_rex_file_id;

    -- Update the anomaly with the rex_file_id
    UPDATE anomalies
    SET rex_file_id = v_rex_file_id
    WHERE id = p_anomaly_id;

    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;
