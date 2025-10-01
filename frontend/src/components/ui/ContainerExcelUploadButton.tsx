import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { ContainerExcelUploadDialog } from '@/components/dialogs/ContainerExcelUploadDialog';
import { ContainerExcelUploadResponse } from '@/services/containerExcelService';

interface ContainerExcelUploadButtonProps {
  containerId: string;
  onUploadComplete?: (response: ContainerExcelUploadResponse) => void;
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

  const handleUploadComplete = (response: ContainerExcelUploadResponse) => {
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
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Import Items
          </>
        )}
      </Button>

      <ContainerExcelUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        containerId={containerId}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
}
