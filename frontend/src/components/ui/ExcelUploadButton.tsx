import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { ExcelUploadDialog } from '@/components/dialogs/ExcelUploadDialog';
import { ExcelUploadResponse, WarehouseLocation } from '@/services/excelUploadService';

interface ExcelUploadButtonProps {
  uploadType?: 'goods_received' | 'sea_cargo';
  warehouse?: WarehouseLocation;
  onUploadComplete?: (response: ExcelUploadResponse) => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function ExcelUploadButton({
  uploadType = 'goods_received',
  warehouse = 'China',
  onUploadComplete,
  variant = 'default',
  size = 'default',
  className,
  style,
  children,
}: ExcelUploadButtonProps) {
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
        style={style}
        onClick={() => setDialogOpen(true)}
      >
        {children || (
          <>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel Upload
          </>
        )}
      </Button>

      <ExcelUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUploadComplete={handleUploadComplete}
        defaultUploadType={uploadType}
        defaultWarehouse={warehouse}
      />
    </>
  );
}
