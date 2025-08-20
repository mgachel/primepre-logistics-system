import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { ExcelUploadDialog } from '@/components/dialogs/ExcelUploadDialog';
import { ExcelUploadResponse } from '@/services/excelUploadService';

interface ContainerExcelUploadButtonProps {
  containerId: string;
  onUploadComplete?: (response: ExcelUploadResponse) => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function ContainerExcelUploadButton({
  containerId,
  onUploadComplete,
  variant = 'outline',
  size = 'sm',
  className,
  children,
}: ContainerExcelUploadButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUploadComplete = (response: ExcelUploadResponse) => {
    onUploadComplete?.(response);
    setDialogOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setDialogOpen(true)}
      >
        {children || (
          <>
            <Upload className="h-4 w-4 mr-1" />
            Excel Upload
          </>
        )}
      </Button>

      <ExcelUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUploadComplete={handleUploadComplete}
        defaultUploadType="sea_cargo"
        containerId={containerId}
      />
    </>
  );
}
