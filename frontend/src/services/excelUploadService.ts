// Excel upload types
export interface ExcelUploadRequest {
  file: File;
  upload_type: 'goods_received' | 'sea_cargo';
  warehouse_location?: 'China' | 'Ghana';
  container_id?: string; // For container-specific uploads
}

export interface ExcelUploadResult {
  row_number: number;
  status: 'created' | 'updated' | 'skipped' | 'error';
  message: string;
}

export interface ExcelUploadSummary {
  total_rows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface ExcelUploadResponse {
  message: string;
  summary: ExcelUploadSummary;
  results: ExcelUploadResult[];
  upload_info?: {
    file_name: string;
    upload_type: string;
    warehouse_location?: string;
    processed_by: string;
    processed_at: string;
  };
}

export interface ExcelUploadError {
  error: string;
  details?: Record<string, string[]>; // Serializer validation errors
  summary?: ExcelUploadSummary;
  results?: ExcelUploadResult[];
  suggestions?: string[];
}

export type ExcelTemplateType = 'goods_received' | 'sea_cargo';
export type WarehouseLocation = 'China' | 'Ghana';

class ExcelUploadService {
  /**
   * Check if user has a valid access token
   */
  private getAuthToken(): string {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token found. Please log in.');
    }
    return token;
  }


  /**
   * Upload Excel file for processing
   */
  async uploadExcel(request: ExcelUploadRequest): Promise<ExcelUploadResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('upload_type', request.upload_type);
    
    if (request.warehouse_location) {
      formData.append('warehouse_location', request.warehouse_location);
    }
    
    if (request.container_id) {
      formData.append('container_id', request.container_id.toString());
    }

    // Debug logging
    console.log('Upload request:', {
      fileName: request.file.name,
      uploadType: request.upload_type,
      warehouseLocation: request.warehouse_location,
      containerId: request.container_id
    });

    try {
      const token = this.getAuthToken();
      
      const response = await fetch('/api/cargo/excel/upload/', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        try {
          const errorData = await response.json() as ExcelUploadError;
          const errorMessage = errorData.details 
            ? `${errorData.error}: ${JSON.stringify(errorData.details)}`
            : errorData.error;
          throw new Error(errorMessage || 'Upload failed');
        } catch (jsonError) {
          throw new Error(`Upload failed with status ${response.status}`);
        }
      }

      return await response.json() as ExcelUploadResponse;
    } catch (error) {
      console.error('Excel upload error:', error);
      throw error;
    }
  }

  /**
   * Upload Excel file to a specific container
   */
  async uploadToContainer(containerId: string, file: File): Promise<ExcelUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Debug logging
    console.log('Container upload request:', {
      containerId,
      fileName: file.name
    });

    try {
      const token = this.getAuthToken();
      
      const response = await fetch(`/api/cargo/containers/${containerId}/excel/upload/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        if (response.status === 404) {
          throw new Error(`Container ${containerId} not found.`);
        }
        try {
          const errorData = await response.json() as ExcelUploadError;
          const errorMessage = errorData.details 
            ? `${errorData.error}: ${JSON.stringify(errorData.details)}`
            : errorData.error;
          throw new Error(errorMessage || 'Upload failed');
        } catch (jsonError) {
          throw new Error(`Upload failed with status ${response.status}`);
        }
      }

      return await response.json() as ExcelUploadResponse;
    } catch (error) {
      console.error('Container excel upload error:', error);
      throw error;
    }
  }

  /**
   * Download Excel template
   */
  async downloadTemplate(
    type: ExcelTemplateType, 
    warehouse?: WarehouseLocation
  ): Promise<Blob> {
    const params = new URLSearchParams({ type });
    if (warehouse) {
      params.append('warehouse', warehouse);
    }

    try {
      const token = this.getAuthToken();
      
      const response = await fetch(`/api/cargo/excel/template/?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      return await response.blob();
    } catch (error) {
      console.error('Template download error:', error);
      throw error;
    }
  }

  /**
   * Download container-specific Excel template
   */
  async downloadContainerTemplate(containerId?: string): Promise<Blob> {
    try {
      const token = this.getAuthToken();
      
      const url = containerId 
        ? `/api/cargo/containers/${containerId}/excel/template/`
        : '/api/cargo/excel/container-template/';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download container template');
      }

      return await response.blob();
    } catch (error) {
      console.error('Container template download error:', error);
      throw error;
    }
  }

  /**
   * Enhanced upload with detailed error handling
   */
  async enhancedUpload(request: ExcelUploadRequest): Promise<ExcelUploadResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('upload_type', request.upload_type);
    
    if (request.warehouse_location) {
      formData.append('warehouse_location', request.warehouse_location);
    }

    try {
      const response = await fetch('/api/cargo/excel/enhanced-upload/', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ExcelUploadError;
        throw new Error(errorData.error || 'Enhanced upload failed');
      }

      return data as ExcelUploadResponse;
    } catch (error) {
      console.error('Enhanced upload error:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return {
        valid: false,
        error: 'Only Excel files (.xlsx, .xls) are allowed'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size cannot exceed 10MB'
      };
    }

    return { valid: true };
  }

  /**
   * Generate downloadable error report
   */
  generateErrorReport(results: ExcelUploadResult[]): Blob {
    const errorResults = results.filter(r => r.status === 'error');
    
    const csvContent = [
      'Row Number,Error Message',
      ...errorResults.map(r => `${r.row_number},"${r.message}"`)
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  }

  /**
   * Download error report as CSV
   */
  downloadErrorReport(results: ExcelUploadResult[], filename: string = 'upload_errors.csv') {
    const blob = this.generateErrorReport(results);
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

export const excelUploadService = new ExcelUploadService();
