'use client';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  convertMillimetersToTwip,
} from 'docx';
import { saveAs } from './save-as';

interface WeeklyReportData {
  id: number;
  week_start_date: string;
  week_end_date: string;
  summary: string;
}

// Markdown 转纯文本
function markdownToPlainText(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^>\s+/gm, '')
    .replace(/---+/g, '')
    .trim();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} 至 ${formatDate(end)}`;
}

// ========== PDF 导出 ==========
export async function exportWeeklyReportPDF(
  report: WeeklyReportData,
  elementRef?: HTMLElement | null
): Promise<void> {
  const fileName = `周报_${report.week_start_date.slice(0, 10)}_${report.week_end_date.slice(0, 10)}.pdf`;

  if (elementRef) {
    const canvas = await html2canvas(elementRef, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(fileName);
  }
}

// ========== Word 导出 ==========
export async function exportWeeklyReportWord(report: WeeklyReportData): Promise<void> {
  const fileName = `周报_${report.week_start_date.slice(0, 10)}_${report.week_end_date.slice(0, 10)}.docx`;

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: '周报', bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: convertMillimetersToTwip(3) },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: formatDateRange(report.week_start_date, report.week_end_date),
          color: '666666',
          size: 20,
        }),
      ],
      spacing: { after: convertMillimetersToTwip(5) },
    })
  );

  children.push(
    new Paragraph({
      border: { bottom: { style: 'single', size: 1, color: 'CCCCCC' } },
      spacing: { after: convertMillimetersToTwip(5) },
    })
  );

  const plainText = markdownToPlainText(report.summary);
  const lines = plainText.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.slice(2), size: 22 })],
          bullet: { level: 0 },
          spacing: { after: convertMillimetersToTwip(1) },
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, size: 22 })],
          spacing: { after: convertMillimetersToTwip(2) },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(25),
              bottom: convertMillimetersToTwip(25),
              left: convertMillimetersToTwip(25),
              right: convertMillimetersToTwip(25),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}

// ========== Markdown 导出 ==========
export function exportWeeklyReportMarkdown(report: WeeklyReportData): void {
  const fileName = `周报_${report.week_start_date.slice(0, 10)}_${report.week_end_date.slice(0, 10)}.md`;

  let md = `# 周报\n\n`;
  md += `**周期**：${formatDateRange(report.week_start_date, report.week_end_date)}\n\n`;
  md += `---\n\n`;
  md += report.summary;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, fileName);
}
