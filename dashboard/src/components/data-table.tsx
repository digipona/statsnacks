'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Column<T> {
  key: keyof T;
  header: string;
  format?: (value: any, row: T) => string | number;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchKey,
  searchPlaceholder = 'Search...',
  pageSize = 20,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Filter data
  const filteredData = searchKey && search
    ? data.filter((row) =>
        String(row[searchKey]).toLowerCase().includes(search.toLowerCase())
      )
    : data;

  // Paginate
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-4">
      {searchKey && (
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className={col.align === 'right' ? 'text-right' : ''}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((col) => (
                    <TableCell
                      key={String(col.key)}
                      className={col.align === 'right' ? 'text-right' : ''}
                    >
                      {col.format ? col.format(row[col.key], row) : String(row[col.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, filteredData.length)} of {filteredData.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
