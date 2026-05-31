import * as XLSX from 'xlsx';
import type { ApoliceRecord } from '../../types/apolice';

export function exportToCSV(data: ApoliceRecord[], filename: string) {
  if (!data || data.length === 0) return;

  const keys = Object.keys(data[0]) as (keyof ApoliceRecord)[];
  
  const csvContent = [
    keys.join(','),
    ...data.map(row => 
      keys.map(key => `"${String(row[key] || '').replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToXLSX(data: ApoliceRecord[], filename: string) {
  if (!data || data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  XLSX.utils.book_append_sheet(workbook, worksheet, "Apolices");
  
  // ensure the filename has the correct extension
  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  
  XLSX.writeFile(workbook, finalFilename);
}
