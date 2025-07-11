import { BackendAnomaly } from './anomalyService';

export interface ImportResult {
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: Array<{
    row: number;
    errors: Record<string, string[]>;
  }>;
  imported_anomalies: BackendAnomaly[];
}

export class ImportService {
  private readonly BASE_URL = 'https://tams-model-production.up.railway.app';

  async importSingleAnomaly(anomaly: any): Promise<BackendAnomaly> {
    const response = await fetch(`${this.BASE_URL}/store/single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(anomaly),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async importBatchAnomalies(anomalies: any[]): Promise<BackendAnomaly[]> {
    const response = await fetch(`${this.BASE_URL}/store/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ anomalies }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async importCSVFile(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.BASE_URL}/store/file/csv`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      total_rows: result.total_rows || 0,
      successful_rows: result.successful_rows || 0,
      failed_rows: result.failed_rows || 0,
      errors: result.errors || [],
      imported_anomalies: result.imported_anomalies || []
    };
  }

  async importExcelFile(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.BASE_URL}/store/file/excel`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      total_rows: result.total_rows || 0,
      successful_rows: result.successful_rows || 0,
      failed_rows: result.failed_rows || 0,
      errors: result.errors || [],
      imported_anomalies: result.imported_anomalies || []
    };
  }

  async importAnomalies(file: File): Promise<ImportResult> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    switch (fileExtension) {
      case 'csv':
        return this.importCSVFile(file);
      case 'xlsx':
      case 'xls':
        return this.importExcelFile(file);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  }
}

export const importService = new ImportService();