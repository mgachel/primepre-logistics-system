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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  excelUploadService,
  ExcelUploadRequest,
  ExcelUploadResponse,
  ExcelTemplateType,
  WarehouseLocation,
} from '@/services/excelUploadService';

// Types
interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (response: ExcelUploadResponse) => void;
  defaultUploadType?: 'goods_received' | 'sea_cargo';
  defaultWarehouse?: WarehouseLocation;
  containerId?: string;
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

  useEffect(() => {
    if (containerId) {
      setUploadType('sea_cargo');
    }
  }, [containerId]);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setUploadResult(null);
      setError(null);
      setUploading(false);
      setUploadProgress(0);
    }
  }, [open]);

  const getColumnSpecs = () => {
    if (uploadType === 'goods_received' && warehouse === 'China') {
      return {
        title: 'China Sea Goods Column Specifications (A-F)',
        description: 'Only the first six columns are read. Columns beyond F are ignored automatically.',
        columns: [
          { index: 0, name: 'Shipping Mark (A)', required: true, description: 'Customer shipping mark. If not found in the system it will still be accepted.' },
          { index: 1, name: 'Date Received (B)', required: true, description: 'Date goods arrived at China warehouse (DD/MM/YYYY).' },
          { index: 2, name: 'Description (C)', required: true, description: 'Product description or category.' },
          { index: 3, name: 'Quantity (D)', required: true, description: 'Number of pieces/cartons.' },
          { index: 4, name: 'CBM (E)', required: true, description: 'Cubic meters. If blank, defaults to 0.' },
          { index: 5, name: 'Supplier Tracking Number (F)', required: true, description: 'Supplier tracking / waybill number.' },
        ],
      };
    }

    if (uploadType === 'goods_received') {
      return {
        title: 'Goods Received Column Specifications (A,B,C,D,E,G,H)',
        description: 'Column position is CRITICAL - follows Excel columns A,B,C,D,E,G,H exactly.',
        columns: [
          { index: 0, name: 'Shipping Mark/Client (A)', required: true, description: 'Customer unique identifier' },
          { index: 1, name: 'Date of Receipt (B)', required: true, description: 'Date goods received in warehouse (DD/MM/YYYY)' },
          { index: 2, name: 'Date of Loading (C)', required: false, description: 'Date goods loaded for shipping (DD/MM/YYYY)' },
          { index: 3, name: 'Description (D)', required: true, description: 'Description of goods' },
          { index: 4, name: 'CTNS/Quantity (E)', required: true, description: 'Number of cartons/pieces' },
          { index: 5, name: 'Specifications (F)', required: false, description: '⚠️ SKIP - This column is ignored' },
          { index: 6, name: 'CBM (G)', required: true, description: 'Cubic meters (required for Ghana warehouse)' },
          { index: 7, name: 'Suppliers Tracking No (H)', required: true, description: 'Supplier tracking number' }
        ]
      };
    } else if (containerId) {
      return {
        title: 'Container-Specific Sea Cargo Column Specifications',
        description: `Upload cargo items for container ${containerId}. Column order is CRITICAL.`,
        columns: [
          { index: 0, name: 'Shipping Mark', required: true, description: 'Customer unique identifier' },
          { index: 1, name: 'Date of Loading', required: false, description: 'Date goods loaded into container' },
          { index: 2, name: 'Description', required: false, description: 'Description of cargo items' },
          { index: 3, name: 'Quantity', required: false, description: 'Number of items/pieces (default: 0)' },
          { index: 4, name: 'CBM', required: false, description: 'Cubic meters (default: 0)' },
          { index: 5, name: 'Supplier Tracking Number', required: false, description: 'Supplier tracking number' }
        ]
      };
    } else {
      return {
        title: 'General Sea Cargo Column Specifications',
        description: 'For uploads with container references. Column order is CRITICAL.',
        columns: [
          { index: 0, name: 'Container Ref/Number', required: true, description: 'Container identifier (creates if not exists)' },
          { index: 1, name: 'Shipping Mark', required: true, description: 'Customer unique identifier' },
          { index: 2, name: 'Date of Loading', required: false, description: 'Date goods loaded into container' },
          { index: 3, name: 'Description', required: false, description: 'Description of cargo items' },
          { index: 4, name: 'Quantity', required: false, description: 'Number of items/pieces (default: 0)' },
          { index: 5, name: 'CBM', required: false, description: 'Cubic meters (default: 0)' },
          { index: 6, name: 'Supplier Tracking Number', required: false, description: 'Supplier tracking number' }
        ]
      };
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      setError('Only Excel files (.xlsx, .xls) are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size cannot exceed 10MB.');
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
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => prev >= 90 ? prev : prev + 10);
      }, 200);

      const request: ExcelUploadRequest = {
        file: selectedFile,
        upload_type: uploadType,
        warehouse_location: uploadType === 'goods_received' ? warehouse : undefined,
        container_id: containerId,
      };

      const response = await excelUploadService.uploadExcel(request);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResult(response);
      
      if (response.summary.errors === 0) {
        toast({
          title: 'Upload Successful',
          description: `Created ${response.summary.created}, Updated ${response.summary.updated}`,
        });
      } else {
        toast({
          title: 'Upload Completed with Errors',
          description: `${response.summary.errors} rows had errors.`,
          variant: 'destructive',
        });
      }

      onUploadComplete?.(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
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
      await excelUploadService.downloadTemplate(
        uploadType as ExcelTemplateType,
        uploadType === 'goods_received' ? warehouse : undefined
      );
      
      toast({
        title: 'Template Downloaded',
        description: 'Excel template has been downloaded.',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download template';
      toast({
        title: 'Download Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const downloadErrorReport = () => {
    if (!uploadResult?.results) return;

    const errorRows = uploadResult.results.filter(row => row.status === 'error');
    if (errorRows.length === 0) return;

    const csvContent = [
      'Row Number,Error Message',
      ...errorRows.map(row => `${row.row_number},"${row.message}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `excel_upload_errors_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columnSpecs = getColumnSpecs();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="text-xl font-bold">
            Excel Upload - {uploadType === 'goods_received' ? 'Goods Received' : 'Sea Cargo'}
            {containerId && ` (Container: ${containerId})`}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Upload your Excel file with strict column order requirements
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 bg-gray-50/30">
          <div className="space-y-6">
              {/* Column Specifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    {columnSpecs.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{columnSpecs.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-y-auto pr-2">
                    <div className="space-y-2">
                      {columnSpecs.columns.map((col) => (
                        <div key={col.index} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border">
                          <Badge variant={col.required ? "default" : "secondary"} className="mt-0.5 flex-shrink-0 min-w-[60px] justify-center">
                            Col {col.index + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm">{col.name}</span>
                              {col.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                              {col.index === 5 && uploadType === 'goods_received' && (
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">SKIPPED</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{col.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload Controls */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Upload Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload Type & Warehouse */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!containerId && (
                      <div className="space-y-2">
                        <Label>Upload Type</Label>
                        <Select value={uploadType} onValueChange={(value: 'goods_received' | 'sea_cargo') => setUploadType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="goods_received">Goods Received</SelectItem>
                            <SelectItem value="sea_cargo">Sea Cargo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {uploadType === 'goods_received' && (
                      <div className="space-y-2">
                        <Label>Warehouse</Label>
                        <Select value={warehouse} onValueChange={(value: WarehouseLocation) => setWarehouse(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="China">China</SelectItem>
                            <SelectItem value="Ghana">Ghana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Template Download */}
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-6 w-6 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Download Template</p>
                        <p className="text-xs text-muted-foreground">
                          Get the Excel template with correct column format
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label>Select Excel File</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {selectedFile ? (
                        <div className="space-y-2">
                          <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                          <p className="font-medium text-sm">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            Change File
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-6 w-6 text-gray-400 mx-auto" />
                          <p className="text-xs text-muted-foreground">
                            Click to select an Excel file (.xlsx, .xls)
                          </p>
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            Select File
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Processing Excel file...</span>
                      </div>
                      <Progress value={uploadProgress} />
                      <p className="text-xs text-center text-muted-foreground">{uploadProgress}% complete</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {uploadResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {uploadResult.summary.errors === 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      )}
                      Upload Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{uploadResult.summary.total_rows}</div>
                        <div className="text-sm text-muted-foreground">Total Rows</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{uploadResult.summary.created}</div>
                        <div className="text-sm text-muted-foreground">Created</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{uploadResult.summary.updated}</div>
                        <div className="text-sm text-muted-foreground">Updated</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">{uploadResult.summary.errors}</div>
                        <div className="text-sm text-muted-foreground">Errors</div>
                      </div>
                    </div>
                    
                    {uploadResult.summary.errors > 0 && (
                      <div className="mt-4">
                        <Button variant="outline" onClick={downloadErrorReport} className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Download Error Report
                        </Button>
                      </div>
                    )}

                    {uploadResult.results && uploadResult.results.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Row Details:</p>
                        <div className="max-h-32 overflow-y-auto border rounded p-2">
                          <div className="space-y-1">
                            {uploadResult.results.slice(0, 10).map((row, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <Badge variant={row.status === 'error' ? 'destructive' : 'default'} className="text-xs">
                                  Row {row.row_number}
                                </Badge>
                                <span className="capitalize">{row.status}</span>
                                <span className="text-muted-foreground flex-1 truncate">{row.message}</span>
                              </div>
                            ))}
                            {uploadResult.results.length > 10 && (
                              <p className="text-xs text-muted-foreground">
                                ...and {uploadResult.results.length - 10} more rows
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

        <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t bg-white shadow-lg">
          <div className="flex gap-3 w-full justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-[100px]">
              {uploadResult ? 'Close' : 'Cancel'}
            </Button>
            {!uploadResult && (
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || uploading}
                className="min-w-[120px]"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload File
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
