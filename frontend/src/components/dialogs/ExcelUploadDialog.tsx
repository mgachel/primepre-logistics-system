import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  excelUploadService,
  ExcelUploadRequest,
  ExcelUploadResponse,
  ExcelTemplateType,
  WarehouseLocation,
} from '@/services/excelUploadService';

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (response: ExcelUploadResponse) => void;
  defaultUploadType?: 'goods_received' | 'sea_cargo';
  defaultWarehouse?: WarehouseLocation;
  containerId?: string; // For container-specific uploads
}

export function ExcelUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
  defaultUploadType = 'goods_received',
  defaultWarehouse = 'China',
  containerId,
}: ExcelUploadDialogProps) {
  const [uploadType, setUploadType] = useState<'goods_received' | 'sea_cargo'>(defaultUploadType);
  const [warehouse, setWarehouse] = useState<WarehouseLocation>(defaultWarehouse);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<ExcelUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Set upload type to sea_cargo when containerId is provided
  useEffect(() => {
    if (containerId) {
      setUploadType('sea_cargo');
    }
  }, [containerId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = excelUploadService.validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const request: ExcelUploadRequest = {
        file: selectedFile,
        upload_type: uploadType,
        ...(uploadType === 'goods_received' && { warehouse_location: warehouse }),
        ...(containerId && { container_id: containerId }),
      };

      const response = await excelUploadService.uploadExcel(request);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResult(response);

      toast({
        title: 'Upload Successful',
        description: `Processed ${response.summary.total_rows} rows with ${response.summary.created} created and ${response.summary.errors} errors.`,
        variant: response.summary.errors > 0 ? 'destructive' : 'default',
      });

      onUploadComplete?.(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const templateType: ExcelTemplateType = uploadType;
      const warehouseParam = uploadType === 'goods_received' ? warehouse : undefined;
      
      const blob = await excelUploadService.downloadTemplate(templateType, warehouseParam);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = uploadType === 'goods_received' 
        ? `goods_received_${warehouse.toLowerCase()}_template.xlsx`
        : 'sea_cargo_template.xlsx';
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Template Downloaded',
        description: `Downloaded ${fileName}`,
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadErrors = () => {
    if (!uploadResult?.results) return;
    
    const fileName = `${uploadType}_upload_errors_${new Date().toISOString().split('T')[0]}.csv`;
    excelUploadService.downloadErrorReport(uploadResult.results, fileName);
    
    toast({
      title: 'Error Report Downloaded',
      description: `Downloaded ${fileName}`,
    });
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(0);
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Upload
          </DialogTitle>
          <DialogDescription>
            Upload Excel files for bulk data import. Download templates to ensure proper format.
          </DialogDescription>
          {containerId && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
              📦 Items will be added to the current container
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Type Selection - hidden for container uploads */}
          {!containerId && (
            <div className="space-y-2">
              <Label htmlFor="upload-type">Upload Type</Label>
              <Select value={uploadType} onValueChange={(value: 'goods_received' | 'sea_cargo') => setUploadType(value)}>
                <SelectTrigger id="upload-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="goods_received">Goods Received</SelectItem>
                  <SelectItem value="sea_cargo">Sea Cargo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Warehouse Selection (only for goods received) */}
          {uploadType === 'goods_received' && (
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse Location</Label>
              <Select value={warehouse} onValueChange={(value: WarehouseLocation) => setWarehouse(value)}>
                <SelectTrigger id="warehouse">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="China">China</SelectItem>
                  <SelectItem value="Ghana">Ghana</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template Download */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Download Template</h4>
                <p className="text-sm text-muted-foreground">
                  Get the correct Excel format for your upload type
                </p>
              </div>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select Excel File</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              {selectedFile && (
                <div className="mt-2">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Uploading and processing...</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Upload Results</h4>
                
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.summary.created}
                    </div>
                    <div className="text-sm text-muted-foreground">Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {uploadResult.summary.updated}
                    </div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {uploadResult.summary.skipped}
                    </div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {uploadResult.summary.errors}
                    </div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>

                {/* Error Details */}
                {uploadResult.summary.errors > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Error Details:</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownloadErrors}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download Errors
                      </Button>
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded p-2 bg-red-50">
                      {uploadResult.results
                        .filter(r => r.status === 'error')
                        .slice(0, 5)
                        .map((result, index) => (
                          <div key={index} className="text-xs text-red-700">
                            Row {result.row_number}: {result.message}
                          </div>
                        ))}
                      {uploadResult.results.filter(r => r.status === 'error').length > 5 && (
                        <div className="text-xs text-red-600 mt-1">
                          +{uploadResult.results.filter(r => r.status === 'error').length - 5} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {uploadResult.summary.errors === 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      All rows processed successfully! Data is now available in Customer Shipments.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
