-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_messages
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create maintenance_windows table first (no dependencies)
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('force', 'minor', 'major')) NOT NULL,
  duration_days INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create anomalies table without foreign key constraint first
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  equipment_id TEXT NOT NULL,
  service TEXT NOT NULL,
  responsible_person TEXT,
  status TEXT CHECK (status IN ('new', 'in_progress', 'treated', 'closed')) DEFAULT 'new',
  origin_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fiabilite_score DECIMAL(3,2),
  integrite_score DECIMAL(3,2),
  disponibilite_score DECIMAL(3,2),
  process_safety_score DECIMAL(3,2),
  criticality_level TEXT CHECK (criticality_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  estimated_hours INTEGER,
  priority INTEGER CHECK (priority >= 1 AND priority <= 5),
  maintenance_window_id UUID
);

-- Add foreign key constraint after both tables are created
ALTER TABLE anomalies 
ADD CONSTRAINT fk_anomalies_maintenance_window 
FOREIGN KEY (maintenance_window_id) REFERENCES maintenance_windows(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS anomalies_status_idx ON anomalies(status);
CREATE INDEX IF NOT EXISTS anomalies_criticality_idx ON anomalies(criticality_level);
CREATE INDEX IF NOT EXISTS anomalies_equipment_idx ON anomalies(equipment_id);
CREATE INDEX IF NOT EXISTS anomalies_created_at_idx ON anomalies(created_at DESC);
CREATE INDEX IF NOT EXISTS anomalies_maintenance_window_idx ON anomalies(maintenance_window_id);

CREATE INDEX IF NOT EXISTS maintenance_windows_status_idx ON maintenance_windows(status);
CREATE INDEX IF NOT EXISTS maintenance_windows_start_date_idx ON maintenance_windows(start_date);

-- Enable Row Level Security for anomalies and maintenance_windows
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all authenticated users to read/write for now)
CREATE POLICY "Authenticated users can view anomalies" ON anomalies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert anomalies" ON anomalies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update anomalies" ON anomalies
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view maintenance windows" ON maintenance_windows
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert maintenance windows" ON maintenance_windows
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update maintenance windows" ON maintenance_windows
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_anomalies_updated_at BEFORE UPDATE ON anomalies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_windows_updated_at BEFORE UPDATE ON maintenance_windows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample maintenance windows first
INSERT INTO maintenance_windows (type, duration_days, start_date, end_date, description, status) VALUES
('minor', 3, '2025-01-15 06:00:00', '2025-01-18 06:00:00', 'Arrêt mineur - Maintenance préventive secteur A', 'planned'),
('major', 14, '2025-02-01 06:00:00', '2025-02-15 06:00:00', 'Arrêt majeur - Révision générale', 'planned'),
('force', 1, '2025-01-13 14:00:00', '2025-01-14 14:00:00', 'Arrêt forcé - Réparation d''urgence', 'in_progress');

-- Insert sample anomalies (some with maintenance window references)
INSERT INTO anomalies (title, description, equipment_id, service, responsible_person, status, criticality_level, estimated_hours, priority) VALUES
('Vibration excessive sur pompe centrifuge P-101', 'Vibrations anormales détectées sur la pompe centrifuge P-101 du circuit de refroidissement principal.', 'P-101', 'Production', 'Ahmed Bennani', 'in_progress', 'high', 16, 1),
('Fuite huile sur réducteur R-205', 'Fuite d''huile constatée au niveau du joint d''étanchéité du réducteur R-205.', 'R-205', 'Maintenance', 'Fatima Zahra', 'new', 'high', 8, 2),
('Défaillance capteur température T-301', 'Le capteur de température T-301 affiche des valeurs erronées.', 'T-301', 'Instrumentation', 'Youssef Alami', 'treated', 'medium', 4, 3),
('Corrosion avancée sur canalisation C-402', 'Corrosion externe importante détectée sur la canalisation C-402.', 'C-402', 'Intégrité', 'Omar Tazi', 'new', 'critical', 48, 1),
('Usure palier moteur M-501', 'Usure anormale détectée sur le palier principal du moteur M-501.', 'M-501', 'Maintenance', 'Kamal Benjelloun', 'treated', 'high', 12, 2);
