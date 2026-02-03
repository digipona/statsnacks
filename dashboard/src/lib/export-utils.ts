/**
 * Export utilities for CSV and Excel downloads.
 */

import * as XLSX from 'xlsx';

/**
 * Generate CSV string from data array.
 */
export function generateCsv<T extends Record<string, unknown>>(
  data: T[],
  columns?: (keyof T)[]
): string {
  if (data.length === 0) return '';

  const keys = columns || (Object.keys(data[0]) as (keyof T)[]);

  // Header row
  const header = keys.join(',');

  // Data rows
  const rows = data.map((row) =>
    keys
      .map((key) => {
        const value = row[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Download CSV file.
 */
export function downloadCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: (keyof T)[]
): void {
  const csv = generateCsv(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Generate Excel workbook with multiple sheets.
 */
export function generateExcelWorkbook(
  sheets: Array<{
    name: string;
    data: Record<string, unknown>[];
    columns?: string[];
  }>
): Blob {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    if (sheet.data.length === 0) {
      // Create empty sheet with headers only
      const ws = XLSX.utils.aoa_to_sheet([sheet.columns || []]);
      XLSX.utils.book_append_sheet(workbook, ws, sheet.name.slice(0, 31));
      continue;
    }

    const columns = sheet.columns || Object.keys(sheet.data[0]);

    // Create array of arrays for worksheet
    const aoa: unknown[][] = [columns];
    for (const row of sheet.data) {
      aoa.push(columns.map((col) => row[col] ?? ''));
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set column widths
    ws['!cols'] = columns.map((col) => ({
      wch: Math.min(
        50,
        Math.max(
          col.length,
          ...sheet.data.map((row) => String(row[col] || '').length)
        )
      ),
    }));

    XLSX.utils.book_append_sheet(workbook, ws, sheet.name.slice(0, 31));
  }

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Download Excel file with multiple sheets.
 */
export function downloadExcel(
  sheets: Array<{
    name: string;
    data: Record<string, unknown>[];
    columns?: string[];
  }>,
  filename: string
): void {
  const blob = generateExcelWorkbook(sheets);
  downloadBlob(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Helper to download a blob as a file.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format number for display (with K/M suffixes).
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

/**
 * Format percentage for display.
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format position for display.
 */
export function formatPosition(value: number): string {
  return value.toFixed(1);
}

/**
 * Format duration in seconds to MM:SS.
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
