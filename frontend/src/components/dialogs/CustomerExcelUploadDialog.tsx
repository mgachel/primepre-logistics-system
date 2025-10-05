/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Users,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildApiUrl } from '@/lib/apiUrl';

interface CustomerExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

interface UploadResults {
  parsing_results?: {
    total_rows: number;
    valid_candidates: number;
    invalid_rows: Array<{
      source_row_number: number;
      reason: string;
      raw_data: any[];
    }>;
  };
  duplicate_results?: {
    existing_duplicates: Array<{
      candidate: any;
      reason: string;
    }>;
    batch_duplicates: Array<{
      candidate: any;
      reason: string;
    }>;
    unique_candidates: any[];
  };
  upload_id?: string;
}

interface CreateResults {
  created_customers: Array<{
    id: number;
    shipping_mark: string;
    name: string;
    email: string;
    phone: string;
    source_row_number: number;
  }>;
  failed_customers: Array<{
    customer_data: any;
    error: string;
    source_row_number: number;
  }>;
  total_attempted: number;
  total_created: number;
  total_failed: number;
  errors?: string[];
  message?: string;
}

interface TaskStatusSnapshot {
  status: string;
  message: string;
  progressPercent: number;
  created: number;
  failed: number;
}

export function CustomerExcelUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: CustomerExcelUploadDialogProps) {
  const { toast } = useToast();
  
  // Upload states
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResults | null>(null);
  const [createResults, setCreateResults] = useState<CreateResults | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'create' | 'complete'>('upload');
  const [taskStatus, setTaskStatus] = useState<TaskStatusSnapshot | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const resetDialog = useCallback(() => {
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setFile(null);
    setIsUploading(false);
    setIsCreating(false);
    setUploadResults(null);
    setCreateResults(null);
    setTaskStatus(null);
    setCurrentStep('upload');
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(buildApiUrl('/api/auth/customers/excel/upload/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Server returned HTML (likely an error page)
        const responseSnippet = (await response.text()).slice(0, 200);
        throw new Error(`Server error: ${response.status} ${response.statusText}. Received non-JSON response starting with: ${responseSnippet}`);
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      setUploadResults(data);
      setCurrentStep('review');

      toast({
        title: "File Processed",
        description: data.message,
      });

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCustomers = async () => {
    if (!uploadResults?.duplicate_results?.unique_candidates) return;

    setIsCreating(true);
    try {
      const uniqueCandidates = uploadResults.duplicate_results.unique_candidates;
      const totalToCreate = uniqueCandidates.length;

      console.log('Creating customers with data:', uniqueCandidates);

      const response = await fetch(buildApiUrl('/api/auth/customers/excel/bulk-create-async/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          customers: uniqueCandidates,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Bulk create failed with non-JSON response:', response.status, text);
        throw new Error(`Server error: ${response.status} ${response.statusText}. The server returned an HTML page. Please check server logs.`);
      }

      console.log('Bulk create response:', data);

      if (!response.ok) {
        console.error('Bulk create failed:', response.status, data);
        throw new Error(data.message || data.error || `Creation failed with status ${response.status}`);
      }

      // ═══════════════════════════════════════════════════════════════
      // ASYNC TASK HANDLING (NEW)
      // ═══════════════════════════════════════════════════════════════
      // Check if response is async (has task_id) or sync (has total_created)
      if (data.task_id) {
        console.log('🔄 Async task queued:', data.task_id);
        const totalCustomers = data.total_customers ?? totalToCreate;
        
        toast({
          title: "Processing Started",
          description: `Processing ${totalCustomers} customers in background. This may take a few minutes...`,
        });

        setCurrentStep('create');
        setTaskStatus({
          status: data.status ?? 'QUEUED',
          message: data.message ?? `Task queued. Processing ${totalCustomers} customers...`,
          progressPercent: 0,
          created: 0,
          failed: 0,
        });

        const stopPolling = () => {
          if (pollingIntervalRef.current) {
            window.clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        };

        const handleStatusUpdate = (statusData: any) => {
          setTaskStatus({
            status: statusData.status,
            message: statusData.message ?? 'Processing customers...',
            progressPercent: statusData.progress_percent ?? (statusData.status === 'COMPLETE' ? 100 : 0),
            created: statusData.created ?? 0,
            failed: statusData.failed ?? 0,
          });
        };

        const extractErrors = (errors: unknown): string[] => {
          if (!errors) {
            return [];
          }

          if (Array.isArray(errors)) {
            return errors.map((errorItem) =>
              typeof errorItem === 'string' ? errorItem : JSON.stringify(errorItem)
            );
          }

          if (typeof errors === 'string') {
            return [errors];
          }

          return [JSON.stringify(errors)];
        };

        const buildFailedCustomers = (errorMessages: string[]) =>
          errorMessages.map((errorMsg, index) => ({
            customer_data: null,
            error: errorMsg,
            source_row_number: index + 1,
          }));

        const pollStatus = async () => {
          const statusResponse = await fetch(
            buildApiUrl(`/api/auth/customers/excel/bulk-create/status/${data.task_id}/`),
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              },
            }
          );

          if (!statusResponse.ok) {
            const errorText = await statusResponse.text();
            throw new Error(
              `Status check failed: ${statusResponse.status} ${statusResponse.statusText}. ${errorText}`
            );
          }

          const statusData = await statusResponse.json();
          console.log('Task status:', statusData);

          if (statusData.status === 'FORBIDDEN' || statusData.status === 'NOT_FOUND') {
            stopPolling();
            setIsCreating(false);
            setTaskStatus(null);
            throw new Error(statusData.message || 'Unable to find task status');
          }

          if (statusData.status === 'FAILED' || statusData.is_failed) {
            stopPolling();
            setIsCreating(false);
            handleStatusUpdate(statusData);
            const normalizedErrors = extractErrors(statusData.errors);
            setCreateResults({
              created_customers: [],
              failed_customers: buildFailedCustomers(normalizedErrors),
              total_attempted: totalCustomers,
              total_created: statusData.created ?? 0,
              total_failed: statusData.failed ?? totalCustomers,
              errors: normalizedErrors,
              message: statusData.message,
            });
            setCurrentStep('complete');
            setTaskStatus(null);
            toast({
              title: 'Bulk Upload Failed',
              description: statusData.message || 'Background task failed. Please review the errors and try again.',
              variant: 'destructive',
            });
            return;
          }

          handleStatusUpdate(statusData);

          if (statusData.status === 'COMPLETE' || statusData.is_complete) {
            stopPolling();
            setIsCreating(false);
            const normalizedErrors = extractErrors(statusData.errors);
            setCreateResults({
              created_customers: [],
              failed_customers: buildFailedCustomers(normalizedErrors),
              total_attempted: totalCustomers,
              total_created: statusData.created ?? totalCustomers,
              total_failed: statusData.failed ?? 0,
               errors: normalizedErrors,
              message: statusData.message,
            });
            setCurrentStep('complete');

            toast({
              title: '✅ Customers Created',
              description: statusData.message || `Successfully created ${statusData.created ?? totalCustomers} customers`,
            });

            if (onUploadComplete) {
              onUploadComplete();
            }

            setTaskStatus(null);
          }
        };

        try {
          // Kick off first status fetch immediately for quicker feedback
          await pollStatus();
        } catch (pollError) {
          console.error('Status polling error:', pollError);
          setIsCreating(false);
          setTaskStatus(null);
          toast({
            title: 'Error Checking Status',
            description: pollError instanceof Error ? pollError.message : 'Failed to check task status',
            variant: 'destructive',
          });
          return;
        }

        pollingIntervalRef.current = window.setInterval(async () => {
          try {
            await pollStatus();
          } catch (pollError) {
            console.error('Status polling error:', pollError);
            stopPolling();
            setIsCreating(false);
            setTaskStatus(null);
            toast({
              title: 'Error Checking Status',
              description: pollError instanceof Error ? pollError.message : 'Failed to check task status',
              variant: 'destructive',
            });
          }
        }, 2000);

        return;

      } else {
        // ═══════════════════════════════════════════════════════════════
        // SYNC RESPONSE HANDLING (OLD - BACKWARD COMPATIBLE)
        // ═══════════════════════════════════════════════════════════════
        setCreateResults(data);
        setCurrentStep('complete');

        toast({
          title: "Customers Created",
          description: `Successfully created ${data.total_created} customers`,
        });

        // Call completion callback
        if (onUploadComplete) {
          onUploadComplete();
        }
        
        setIsCreating(false);
      }

    } catch (error) {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setTaskStatus(null);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
      setIsCreating(false);
      setCurrentStep('review');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/auth/customers/excel/template/'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Template download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customer_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Template Downloaded",
        description: "Customer upload template has been downloaded",
      });

    } catch (error) {
      console.error('Template download failed', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Download Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Download className="h-4 w-4" />
            Download Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Download the Excel template with the correct format and sample data.
          </p>
          <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4" />
            Upload Customer Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
          >
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {file ? (
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Drop your Excel file here or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Supports .xlsx and .xls files (max 10MB)
                </p>
              </div>
            )}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              Choose File
            </label>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? 'Processing...' : 'Upload and Process'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Format Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Expected Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-5 gap-2 text-xs font-medium">
            <div>Column A</div>
            <div>Column B</div>
            <div>Column C</div>
            <div>Column D</div>
            <div>Column E</div>
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground">
            <div>Shipping Mark*</div>
            <div>First Name*</div>
            <div>Last Name*</div>
            <div>Email</div>
            <div>Phone Number*</div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * Required fields
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderReviewStep = () => {
    if (!uploadResults) return null;

    const { parsing_results, duplicate_results } = uploadResults;

    return (
      <div className="space-y-4">
        {/* Processing Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Processing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {parsing_results?.total_rows || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Rows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {duplicate_results?.unique_candidates?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Ready to Create</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {(parsing_results?.invalid_rows?.length || 0) + 
                   (duplicate_results?.existing_duplicates?.length || 0) + 
                   (duplicate_results?.batch_duplicates?.length || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Issues Found</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invalid Rows */}
        {parsing_results?.invalid_rows && parsing_results.invalid_rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-500" />
                Invalid Rows ({parsing_results.invalid_rows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {parsing_results.invalid_rows.slice(0, 5).map((row, index) => (
                  <div key={index} className="text-xs p-2 bg-red-50 rounded">
                    <div className="font-medium">Row {row.source_row_number}: {row.reason}</div>
                  </div>
                ))}
                {parsing_results.invalid_rows.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    ...and {parsing_results.invalid_rows.length - 5} more
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Duplicates */}
        {duplicate_results?.existing_duplicates && duplicate_results.existing_duplicates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Existing Duplicates ({duplicate_results.existing_duplicates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {duplicate_results.existing_duplicates.slice(0, 5).map((dup, index) => (
                  <div key={index} className="text-xs p-2 bg-yellow-50 rounded">
                    <div className="font-medium">
                      Row {dup.candidate.source_row_number}: {dup.candidate.shipping_mark} - {dup.reason}
                    </div>
                  </div>
                ))}
                {duplicate_results.existing_duplicates.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    ...and {duplicate_results.existing_duplicates.length - 5} more
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Large Upload Warning */}
        {duplicate_results?.unique_candidates && duplicate_results.unique_candidates.length > 1000 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                Large Upload Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You're uploading {duplicate_results.unique_candidates.length} customers. 
                This may take several minutes to process. Please be patient and do not close the dialog.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create Button */}
        <div className="flex gap-3">
          <Button onClick={() => setCurrentStep('upload')} variant="outline" className="flex-1">
            Back to Upload
          </Button>
          <Button
            onClick={handleCreateCustomers}
            disabled={!duplicate_results?.unique_candidates?.length || isCreating}
            className="flex-1"
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              `Create ${duplicate_results?.unique_candidates?.length || 0} Customers`
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderProcessingStep = () => {
    return (
      <div className="space-y-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {taskStatus?.message ?? 'Preparing background task...'}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
              {taskStatus?.status ?? 'QUEUED'}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Background Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 transition-all duration-500"
                style={{ width: `${Math.min(taskStatus?.progressPercent ?? 5, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-semibold text-green-600">
                  {taskStatus?.created ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Created</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-red-600">
                  {taskStatus?.failed ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Please keep this dialog open while customers are being created. You can safely continue browsing other pages.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCompleteStep = () => {
    if (!createResults) return null;

    return (
      <div className="space-y-4">
        {/* Success Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Upload Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {createResults.total_created}
                </div>
                <div className="text-xs text-muted-foreground">Created</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {createResults.total_failed}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
            {createResults.message && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                {createResults.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Created Customers */}
        {createResults.created_customers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-green-500" />
                Successfully Created ({createResults.created_customers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {createResults.created_customers.slice(0, 5).map((customer) => (
                  <div key={customer.id} className="text-xs p-2 bg-green-50 rounded">
                    <div className="font-medium">
                      {customer.shipping_mark} - {customer.name}
                    </div>
                    <div className="text-muted-foreground">
                      {customer.email} • {customer.phone}
                    </div>
                  </div>
                ))}
                {createResults.created_customers.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    ...and {createResults.created_customers.length - 5} more
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Failed Customers */}
        {createResults.failed_customers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-500" />
                Failed to Create ({createResults.failed_customers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {createResults.failed_customers.map((failed, index) => (
                  <div key={index} className="text-xs p-2 bg-red-50 rounded">
                    <div className="font-medium">
                      Row {failed.source_row_number}: {failed.error}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {createResults.errors && createResults.errors.length > 0 && createResults.failed_customers.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs">
                {createResults.errors.map((errorMessage, index) => (
                  <li key={index} className="p-2 bg-yellow-50 rounded">
                    {errorMessage}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Close Button */}
        <Button onClick={handleClose} className="w-full">
          Close
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Upload Customers from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to bulk import customer data. Follow the template format with shipping marks, names, emails, and phone numbers.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 py-4">
          <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-blue-600' : currentStep === 'review' || currentStep === 'create' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-3 h-3 rounded-full ${currentStep === 'upload' ? 'bg-blue-600' : currentStep === 'review' || currentStep === 'create' || currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`} />
            <span className="text-xs font-medium">Upload</span>
          </div>
          <div className={`w-8 h-px ${currentStep === 'review' || currentStep === 'create' || currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`} />
          <div className={`flex items-center space-x-2 ${currentStep === 'review' ? 'text-blue-600' : currentStep === 'create' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-3 h-3 rounded-full ${currentStep === 'review' ? 'bg-blue-600' : currentStep === 'create' || currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`} />
            <span className="text-xs font-medium">Review</span>
          </div>
          <div className={`w-8 h-px ${currentStep === 'create' || currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`} />
          <div className={`flex items-center space-x-2 ${currentStep === 'create' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-3 h-3 rounded-full ${currentStep === 'create' || currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`} />
            <span className="text-xs font-medium">Complete</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'review' && renderReviewStep()}
          {currentStep === 'create' && renderProcessingStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}