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
  created_at: string;
  updated_at?: string;
}

// HTML 转纯文本（保留换行）
function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  div.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li').forEach(el => {
    el.insertAdjacentText('afterend', '\n');
  });
  div.querySelectorAll('hr').forEach(hr => hr.replaceWith('\n---\n'));
  return (div.textContent || '').trim();
}

// HTML 转 Markdown
function htmlToMarkdown(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(processNode).join('');

    switch (tag) {
      case 'h1': return `\n# ${children.trim()}\n\n`;
      case 'h2': return `\n## ${children.trim()}\n\n`;
      case 'h3': return `\n### ${children.trim()}\n\n`;
      case 'h4': return `\n#### ${children.trim()}\n\n`;
      case 'p': return `${children.trim()}\n\n`;
      case 'strong':
      case 'b': return `**${children.trim()}**`;
      case 'em':
      case 'i': return `*${children.trim()}*`;
      case 'code':
        if (el.parentElement?.tagName.toLowerCase() === 'pre') return children;
        return `\`${children.trim()}\``;
      case 'pre': return `\n\`\`\`\n${children.trim()}\n\`\`\`\n\n`;
      case 'blockquote':
        return children.trim().split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
      case 'ul': return children;
      case 'ol': return children;
      case 'li': {
        const parent = el.parentElement?.tagName.toLowerCase();
        if (parent === 'ol') {
          const idx = Array.from(el.parentElement!.children).indexOf(el) + 1;
          return `${idx}. ${children.trim()}\n`;
        }
        return `- ${children.trim()}\n`;
      }
      case 'hr': return '\n---\n\n';
      case 'br': return '\n';
      case 'a': {
        const href = el.getAttribute('href') || '';
        return `[${children.trim()}](${href})`;
      }
      default: return children;
    }
  }

  const md = Array.from(div.childNodes).map(processNode).join('');
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  const fmt = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;

  return `${fmt(start)} — ${fmt(end)}`;
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
      children: [new TextRun({ text: `周报：${formatDateRange(report.week_start_date, report.week_end_date)}`, bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: convertMillimetersToTwip(3) },
    })
  );

  children.push(
    new Paragraph({
      border: { bottom: { style: 'single', size: 1, color: 'CCCCCC' } },
      spacing: { after: convertMillimetersToTwip(5) },
    })
  );

  const plainText = htmlToPlainText(report.summary);
  const lines = plainText.split('\n').filter(l => l.trim());

  for (const line of lines) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line.trim(), size: 22 })],
        spacing: { after: convertMillimetersToTwip(2) },
      })
    );
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

  let md = `# 周报：${formatDateRange(report.week_start_date, report.week_end_date)}\n\n`;
  md += '---\n\n';
  md += htmlToMarkdown(report.summary);

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, fileName);
}
