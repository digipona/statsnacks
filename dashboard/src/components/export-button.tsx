'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadCsv, downloadExcel } from '@/lib/export-utils';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: string[];
  sheets?: Array<{
    name: string;
    data: Record<string, unknown>[];
    columns?: string[];
  }>;
  disabled?: boolean;
}

export function ExportButton({
  data,
  filename,
  columns,
  sheets,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleCsvExport = async () => {
    setIsExporting(true);
    try {
      // Small delay for UI feedback
      await new Promise((resolve) => setTimeout(resolve, 100));
      downloadCsv(data, filename, columns);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExcelExport = async () => {
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (sheets && sheets.length > 0) {
        downloadExcel(sheets, filename);
      } else {
        downloadExcel([{ name: 'Data', data, columns }], filename);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const hasMultipleSheets = sheets && sheets.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCsvExport}>
          <FileText className="mr-2 h-4 w-4" />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcelExport}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {hasMultipleSheets ? 'Download Excel (Multi-sheet)' : 'Download Excel'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
