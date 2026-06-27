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

interface DailyReportData {
  id: number;
  date: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

// ========== PDF 导出 ==========
export async function exportDailyReportPDF(
  report: DailyReportData,
  elementRef?: HTMLElement | null
): Promise<void> {
  const fileName = `日报_${report.date.slice(0, 10)}_${report.title}.pdf`;

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
export async function exportDailyReportWord(report: DailyReportData): Promise<void> {
  const fileName = `日报_${report.date.slice(0, 10)}_${report.title}.docx`;

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: report.title, bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: convertMillimetersToTwip(3) },
    })
  );

  const metaParts: string[] = [formatDate(report.date)];
  if (report.mood) metaParts.push(`心情：${report.mood}`);
  if (report.tags && report.tags.length > 0) metaParts.push(`标签：${report.tags.join('、')}`);

  children.push(
    new Paragraph({
      children: [new TextRun({ text: metaParts.join('  |  '), color: '666666', size: 20 })],
      spacing: { after: convertMillimetersToTwip(5) },
    })
  );

  children.push(
    new Paragraph({
      border: { bottom: { style: 'single', size: 1, color: 'CCCCCC' } },
      spacing: { after: convertMillimetersToTwip(5) },
    })
  );

  const plainText = htmlToPlainText(report.content);
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
export function exportDailyReportMarkdown(report: DailyReportData): void {
  const fileName = `日报_${report.date.slice(0, 10)}_${report.title}.md`;

  let md = `# ${report.title}\n\n`;
  md += `**日期**：${formatDate(report.date)}`;
  if (report.mood) md += ` | **心情**：${report.mood}`;
  md += '\n';
  if (report.tags && report.tags.length > 0) md += `**标签**：${report.tags.join('、')}\n`;
  md += '\n---\n\n';
  md += htmlToMarkdown(report.content);

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, fileName);
}
