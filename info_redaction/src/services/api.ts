// API service for communicating with FastAPI backend
const API_BASE_URL = 'http://localhost:8000';

export interface ProcessingJob {
  job_id: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  result_files?: string[];
  error?: string;
}

export interface UploadResponse {
  job_id: string;
  filename: string;
  file_size: number;
  status: string;
  message: string;
}

export interface ProcessingRequest {
  policy_file?: string;
  create_overlay: boolean;
  user_replacement_choice: 'text_box' | 'image';
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  async processDocument(
    jobId: string, 
    request: ProcessingRequest = {
      create_overlay: true,
      user_replacement_choice: 'text_box'
    }
  ): Promise<{ job_id: string; status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/process/${jobId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Processing failed');
    }

    return response.json();
  }

  async getJobStatus(jobId: string): Promise<ProcessingJob> {
    const response = await fetch(`${this.baseUrl}/status/${jobId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get job status');
    }

    return response.json();
  }

  async downloadFile(filename: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/download/${filename}`);

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  }

  async listJobs(): Promise<{ jobs: ProcessingJob[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/jobs`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list jobs');
    }

    return response.json();
  }

  async deleteJob(jobId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete job');
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    return response.json();
  }

  // Utility method to download and save file
  async downloadAndSaveFile(filename: string, downloadName?: string): Promise<void> {
    try {
      const blob = await this.downloadFile(filename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName || filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
