import { apiService, ApiResponse } from './apiService';

export interface PredictionRequest {
  num_equipement: string;
  description: string;
  service: string;
  source_origine: string;
}

export interface PredictionResponse {
  fiabilite_score: number;
  integrite_score: number;
  disponibilite_score: number;
  process_safety_score: number;
  criticality_level: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
}

export interface BatchPredictionRequest {
  predictions: PredictionRequest[];
}

export interface BatchPredictionResponse {
  predictions: Array<PredictionRequest & PredictionResponse>;
}

export class PredictionService {
  async getPrediction(data: PredictionRequest): Promise<PredictionResponse> {
    const response = await apiService.post<ApiResponse<PredictionResponse>>('/predict', data);
    return response.data!;
  }

  async getBatchPredictions(data: BatchPredictionRequest): Promise<BatchPredictionResponse> {
    const response = await apiService.post<ApiResponse<BatchPredictionResponse>>('/predict-batch', data);
    return response.data!;
  }

  async getPredictionsFromFile(file: File): Promise<BatchPredictionResponse> {
    const response = await apiService.uploadFile<ApiResponse<BatchPredictionResponse>>('/predict-file', file);
    return response.data!;
  }
}

export const predictionService = new PredictionService();