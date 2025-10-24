import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Users,
  UserX,
  Copy,
  AlertCircle,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { containerExcelService, ContainerExcelUploadResponse } from '@/services/containerExcelService';
import { ShippingMarkMappingDialog } from './ShippingMarkMappingDialog';
import { UnmatchedGroupsDialog } from './UnmatchedGroupsDialog';

interface ContainerExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerId: string;
  onUploadComplete?: (response: ContainerExcelUploadResponse) => void;
}

type UploadStep = 'select' | 'uploading' | 'results' | 'mapping';

export function ContainerExcelUploadDialog({
  open,
  onOpenChange,
  containerId,
  onUploadComplete,
}: ContainerExcelUploadDialogProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<ContainerExcelUploadResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showGroupsDialog, setShowGroupsDialog] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = useCallback(() => {
    setStep('select');
    setUploadProgress(0);
    setUploadResults(null);
    setSelectedFile(null);
    setError(null);
    setShowMappingDialog(false);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please select an Excel file (.xlsx)');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStep('uploading');
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await containerExcelService.uploadExcel(containerId, selectedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setUploadResults(response);
      setStep('results');
      
      toast({
        title: "Upload Complete",
        description: `Processed ${response.parsing_results.valid_candidates} items from Excel file`,
      });
      
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setStep('select');
      
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to process Excel file",
        variant: "destructive",
      });
    }
  };

  const handleCreateItems = async () => {
    if (!uploadResults || !uploadResults.matching_results) return;
    
    try {
      const createResponse = await containerExcelService.createItems(
        containerId,
        uploadResults.matching_results.matched_items || [],
        [] // No resolved mappings yet
      );
      
      toast({
        title: "Items Created",
        description: `Successfully created ${createResponse.statistics.total_created} cargo items`,
      });
      
      onUploadComplete?.(uploadResults);
      onOpenChange(false);
      resetState();
      
    } catch (err: any) {
      toast({
        title: "Failed to Create Items",
        description: err.message || "Failed to create cargo items",
        variant: "destructive",
      });
    }
  };

  const handleResolveUnmatched = () => {
    if (!uploadResults) return;
    // If backend returned grouped unmatched items, open the groups dialog first
    const groups = uploadResults.matching_results?.unmatched_groups;
    if (groups && groups.length > 0) {
      setShowGroupsDialog(true);
      return;
    }
    setShowMappingDialog(true);
  };

  const handleMappingComplete = (resolvedMappings: any[]) => {
    if (!uploadResults || !uploadResults.matching_results) return;
    
    // Create items with both matched and resolved mappings
    containerExcelService.createItems(
      containerId,
      uploadResults.matching_results.matched_items || [],
      resolvedMappings
    ).then(() => {
      toast({
        title: "All Items Created",
        description: "Successfully created all cargo items including resolved mappings",
      });
      
      onUploadComplete?.(uploadResults);
      onOpenChange(false);
      resetState();
    }).catch(err => {
      toast({
        title: "Failed to Create Items",
        description: err.message || "Failed to create cargo items",
        variant: "destructive",
      });
    });
    
    setShowMappingDialog(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const renderSelectStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Upload Container Items</h3>
        <p className="text-muted-foreground">
          Import container items from Excel file with automatic shipping mark matching
        </p>
      </div>

      {/* Expected Format Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Expected Excel Format
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Column A:</strong> Shipping Mark (required)
            </div>
            <div>
              <strong>Column D:</strong> Description
            </div>
            <div>
              <strong>Column E:</strong> Quantity (required)
            </div>
            <div>
              <strong>Column G:</strong> CBM (optional)
            </div>
            <div>
              <strong>Column H:</strong> Tracking Number (optional)
            </div>
          </div>
          <p className="text-muted-foreground text-xs mt-2">
            Headers will be automatically detected and skipped
          </p>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        
        {selectedFile ? (
          <div>
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div>
            <p className="font-medium mb-2">Drop Excel file here or click to browse</p>
            <p className="text-sm text-muted-foreground">
              Supports .xlsx files up to 10MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleUpload} 
          disabled={!selectedFile || !!error}
        >
          <Upload className="h-4 w-4 mr-2" />
          Process File
        </Button>
      </div>
    </div>
  );

  const renderUploadingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Processing Excel File</h3>
        <p className="text-muted-foreground">
          Parsing data and matching shipping marks...
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={uploadProgress} className="w-full" />
        <p className="text-sm text-center text-muted-foreground">
          {uploadProgress}% complete
        </p>
      </div>
    </div>
  );

  const renderResultsStep = () => {
    if (!uploadResults || !uploadResults.matching_results || !uploadResults.parsing_results) return null;

    const { parsing_results, matching_results } = uploadResults;
    const stats = matching_results.statistics || { matched_count: 0, unmatched_count: 0, total_candidates: 0, duplicate_count: 0 };

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Processing Complete</h3>
          <p className="text-muted-foreground">
            Review the results below and choose how to proceed
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold">{stats.matched_count}</p>
                  <p className="text-sm text-muted-foreground">Matched Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-semibold">{stats.unmatched_count}</p>
                  <p className="text-sm text-muted-foreground">Unmatched Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invalid Rows */}
        {parsing_results && parsing_results.invalid_rows && parsing_results.invalid_rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Invalid Rows ({parsing_results.invalid_rows.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {parsing_results.invalid_rows.slice(0, 5).map((row: any, index: number) => (
                <div key={index} className="text-sm p-2 bg-red-50 rounded">
                  <strong>Row {row.source_row_number}:</strong> {row.reason}
                </div>
              ))}
              {parsing_results.invalid_rows.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  ...and {parsing_results.invalid_rows.length - 5} more
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Duplicate Tracking Numbers */}
        {matching_results && matching_results.duplicate_tracking_numbers && matching_results.duplicate_tracking_numbers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Copy className="h-4 w-4 text-orange-600" />
                Duplicate Tracking Numbers ({matching_results.duplicate_tracking_numbers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {matching_results.duplicate_tracking_numbers.slice(0, 3).map((dup: any, index: number) => (
                <div key={index} className="text-sm p-2 bg-orange-50 rounded">
                  <strong>Row {dup.candidate.source_row_number}:</strong> {dup.candidate.tracking_number}
                  {dup.reason === 'duplicate_tracking_number_in_db' && (
                    <span className="text-muted-foreground"> (exists in {dup.existing_container})</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          <div className="flex gap-2">
            {stats.unmatched_count > 0 && (
              <Button variant="outline" onClick={handleResolveUnmatched}>
                <Users className="h-4 w-4 mr-2" />
                Resolve Unmatched ({stats.unmatched_count})
              </Button>
            )}
            
            {stats.matched_count > 0 && (
              <Button onClick={handleCreateItems}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create {stats.matched_count} Item{stats.matched_count !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Container Items
            </DialogTitle>
            <DialogDescription>
              Upload Excel file to import items for container {containerId}
            </DialogDescription>
          </DialogHeader>

          {step === 'select' && renderSelectStep()}
          {step === 'uploading' && renderUploadingStep()}
          {step === 'results' && renderResultsStep()}
        </DialogContent>
      </Dialog>

      {uploadResults && uploadResults.matching_results && (
        <ShippingMarkMappingDialog
          open={showMappingDialog}
          onOpenChange={setShowMappingDialog}
          unmatchedItems={uploadResults.matching_results.unmatched_items || []}
          onMappingComplete={handleMappingComplete}
        />
      )}

      {uploadResults && uploadResults.matching_results && (
        <UnmatchedGroupsDialog
          open={showGroupsDialog}
          onOpenChange={setShowGroupsDialog}
          uploadId={uploadResults.upload_id}
          unmatchedGroups={uploadResults.matching_results.unmatched_groups || []}
          matchedItems={uploadResults.matching_results.matched_items || []}
          containerId={containerId}
          onComplete={() => {
            // After bulk create, close dialog and finish
            setShowGroupsDialog(false);
            onUploadComplete?.(uploadResults);
            onOpenChange(false);
            resetState();
          }}
        />
      )}
    </>
  );
}