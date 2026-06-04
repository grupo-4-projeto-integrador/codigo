import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import type { ApoliceRecord } from '../../types/apolice';
import { formatCurrency } from "./currency"; // Assuming we have formatCurrency. Otherwise, I'll inline it.

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

export function exportToPDF(data: ApoliceRecord[], filename: string) {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  
  doc.setFontSize(14);
  doc.text("Listagem de Apólices", 14, 15);
  doc.setFontSize(10);
  doc.text(`Exportado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

  const head = [["LUC", "Loja", "Seguradora", "Vigência", "Vencimento", "Status", "Cobertura"]];
  const body = data.map(item => [
    item.luc || item.id || "-",
    item.fantasia || item.lojista || item.loja || "-",
    item.seguradora || "-",
    formatDate(item.vigencia),
    formatDate(item.vencimento),
    item.status || "-",
    formatValue(item.cobertura)
  ]);

  autoTable(doc, {
    startY: 28,
    head: head,
    body: body,
    theme: "striped",
    headStyles: { fillColor: [196, 21, 31] },
    styles: { fontSize: 8 },
  });

  const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(finalFilename);
}

// Let's create an inline formatter to be safe and standalone
const formatValue = (val: number | string | undefined) => {
  if (val === undefined) return "R$ 0,00";
  const num = Number(val);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const formatDate = (val: any) => {
  if (!val) return "-";
  if (typeof val === 'string' && val.includes("T")) {
    return new Date(val).toLocaleDateString("pt-BR");
  }
  return val;
};

export const exportApoliceParaPDF = (apolice: any, coberturas: any[] = []) => {
  const doc = new jsPDF();

  const now = new Date();
  const dataGeracao = now.toLocaleDateString("pt-BR");
  const horaGeracao = now.toLocaleTimeString("pt-BR");

  // 1. Cabeçalho
  doc.setFontSize(18);
  doc.setTextColor(196, 21, 31); // #c4151f
  doc.text("Shopping Flamboyant", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${dataGeracao} às ${horaGeracao}`, 196, 20, { align: "right" });

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, 25, 196, 25);

  // 2. Título Centralizado
  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text("APÓLICE DE SEGURO", 105, 35, { align: "center" });

  // 3. Seção Identificação
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text("Identificação", 14, 45);
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  
  // Coluna Esquerda
  doc.text("Número / LUC:", 14, 52);
  doc.text("Seguradora:", 14, 58);
  doc.setTextColor(0, 0, 0);
  doc.text(apolice.luc || apolice.id || "-", 45, 52);
  doc.text(apolice.seguradora || "-", 40, 58);

  // Coluna Direita
  doc.setTextColor(80, 80, 80);
  doc.text("Tipo / Segmento:", 105, 52);
  doc.text("Status:", 105, 58);
  doc.setTextColor(0, 0, 0);
  doc.text(apolice.tipo || apolice.segmento || "-", 135, 52);
  doc.text(apolice.status || "-", 120, 58);

  // 4. Seção Vigência
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text("Vigência e Valores", 14, 70);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("Início:", 14, 77);
  doc.text("Vencimento:", 14, 83);
  doc.text("Valor Segurado:", 14, 89);
  
  doc.setTextColor(0, 0, 0);
  doc.text(formatDate(apolice.vigencia), 45, 77);
  doc.text(formatDate(apolice.vencimento), 45, 83);
  doc.text(formatValue(apolice.cobertura), 45, 89);

  // 5. Coberturas Contratadas (AutoTable)
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text("Coberturas Contratadas", 14, 102);

  const tableBody = coberturas.length > 0 
    ? coberturas.map(c => [
        c.nome || "-",
        c.descricao || "-",
        formatValue(c.valor)
      ])
    : [["Nenhuma cobertura detalhada encontrada.", "", ""]];

  autoTable(doc, {
    startY: 106,
    head: [["Cobertura", "Descrição", "Valor"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: [196, 21, 31] },
    styles: { fontSize: 9 },
  });

  // 6. Partes Envolvidas
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text("Partes Envolvidas", 14, finalY);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("Segurado:", 14, finalY + 7);
  doc.text("Corretor:", 14, finalY + 13);
  doc.text("Resp. Interno:", 14, finalY + 19);

  doc.setTextColor(0, 0, 0);
  doc.text(apolice.lojista || apolice.loja || "-", 45, finalY + 7);
  doc.text("Corretora Padrão", 45, finalY + 13);
  doc.text(apolice.responsavel || "Não atribuído", 45, finalY + 19);

  // 7. Rodapé em todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const id = apolice.luc || apolice.id || "N/A";
    doc.text(`Apólice: ${id}`, 14, 285);
    doc.text(`Gerado em: ${dataGeracao} às ${horaGeracao} - Página ${i} de ${pageCount}`, 196, 285, { align: "right" });
  }

  // 8. Salvar PDF
  const safeId = (apolice.luc || apolice.id || "geral").replace(/[^a-zA-Z0-9]/g, '');
  const dataFile = now.toISOString().split("T")[0];
  doc.save(`apolice-${safeId}-${dataFile}.pdf`);
};
