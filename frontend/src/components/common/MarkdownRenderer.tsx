/**
 * Simple Markdown to HTML renderer for display purposes.
 * Converts common markdown syntax to styled HTML.
 * On copy, falls back to plain text preserving layout.
 */
import { useCallback, useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onCopy?: (text: string) => void;
}

/** Process inline markdown (bold, italic, code, links) on a single line */
function processInline(text: string): string {
  let s = text;
  s = s.replace(/`([^`]+)`/g, '<code class="markdown-inline-code">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="markdown-bold">$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong class="markdown-bold">$1</strong>');
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="markdown-italic">$1</em>');
  s = s.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="markdown-italic">$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}

/** Convert markdown tables to HTML tables */
function processTables(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    // Detect table: line with |, followed by separator |---|---|, followed by data rows
    if (
      i + 1 < lines.length &&
      lines[i].includes('|') &&
      /^\|[\s:]*-+[\s:]*\|/.test(lines[i + 1])
    ) {
      // Parse header
      const headerCells = lines[i]
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c !== '');

      i += 2; // skip header + separator

      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        const cells = lines[i]
          .split('|')
          .map((c) => c.trim())
          .filter((c) => c !== '');
        rows.push(cells);
        i++;
      }

      let table = '<div class="markdown-table-wrap"><table class="markdown-table"><thead><tr>';
      headerCells.forEach((cell) => {
        table += `<th class="markdown-th">${processInline(cell)}</th>`;
      });
      table += '</tr></thead><tbody>';
      rows.forEach((row) => {
        table += '<tr>';
        row.forEach((cell) => {
          table += `<td class="markdown-td">${processInline(cell)}</td>`;
        });
        table += '</tr>';
      });
      table += '</tbody></table></div>';
      result.push(table);
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join('\n');
}

/** Convert markdown to HTML */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // 1. Code blocks (```...```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
    return `<pre class="markdown-code-block"><code class="language-${lang || 'text'}">${escaped}</code></pre>`;
  });

  // 2. Tables (before inline processing to avoid conflicts)
  html = processTables(html);

  // 3. Headings (###, ##, #)
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="markdown-h3">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="markdown-h2">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="markdown-h1">$1</h1>');

  // 4. Horizontal rule (--- or ***)
  html = html.replace(/^---+$/gm, '<hr class="markdown-hr" />');
  html = html.replace(/^\*\*\*+$/gm, '<hr class="markdown-hr" />');

  // 5. Blockquotes (>)
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="markdown-blockquote">$1</blockquote>');

  // 6. Bullet points: - item, * item, • item
  html = html.replace(/^[\s]*(?:[-*•])\s+(.+)$/gm, (_, content) => {
    return `<li class="markdown-li">${processInline(content)}</li>`;
  });

  // 7. Numbered lists (1. at start of line)
  html = html.replace(/^[\s]*\d+\.\s+(.+)$/gm, (_, content) => {
    return `<li class="markdown-li">${processInline(content)}</li>`;
  });

  // 8. Wrap consecutive <li> in <ul>
  html = html.replace(/(<li class="markdown-li">[\s\S]*?<\/li>)+/g, (match) => {
    return `<ul class="markdown-ul">${match}</ul>`;
  });

  // 9. Inline processing on remaining lines (not already in tags)
  const lines = html.split('\n');
  html = lines
    .map((line) => {
      const trimmed = line.trim();
      // Skip lines that are already HTML tags or inside pre/table
      if (
        trimmed === '' ||
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<li') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<table') ||
        trimmed.startsWith('<thead') ||
        trimmed.startsWith('<tbody') ||
        trimmed.startsWith('<tr') ||
        trimmed.startsWith('<th') ||
        trimmed.startsWith('<td') ||
        trimmed.startsWith('</') ||
        trimmed.startsWith('<!')
      ) {
        return line;
      }
      return processInline(line);
    })
    .join('\n');

  // 10. Convert remaining newlines to <br> (but not inside block elements)
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<table')
      ) {
        return p;
      }
      // Check if paragraph is a single empty-ish line
      if (trimmed === '') return '';
      const withBreaks = p.replace(/\n/g, '<br />');
      return `<p class="markdown-p">${withBreaks}</p>`;
    })
    .join('\n');

  return html;
}

/** Convert markdown to plain text for copying (preserves layout, strips HTML) */
function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // Remove markdown syntax but keep structure
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, __, code) => `\n${code.trim()}\n`);
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/^###\s+(.+)$/gm, '\n$1\n');
  text = text.replace(/^##\s+(.+)$/gm, '\n$1\n');
  text = text.replace(/^#\s+(.+)$/gm, '\n$1\n');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1');
  text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, '$1');
  text = text.replace(/^[\s]*[-*]\s+(.+)$/gm, '• $1');
  text = text.replace(/^[\s]*\d+\.\s+(.+)$/gm, '$1');
  text = text.replace(/^>\s+(.+)$/gm, '  $1');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

  // Convert markdown tables to plain text tables
  // Process line by line
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (i + 1 < lines.length && /^\|[\s:]*-+[\s:]*\|/.test(lines[i + 1])) {
      // Table header
      const headers = lines[i]
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c !== '');
      result.push(headers.join(' | '));
      result.push(headers.map(() => '---').join(' | '));
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        const cells = lines[i]
          .split('|')
          .map((c) => c.trim())
          .filter((c) => c !== '');
        result.push(cells.join(' | '));
        i++;
      }
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  text = result.join('\n');

  // Clean up trailing whitespace but preserve newlines
  text = text.replace(/[ \t]+$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export default function MarkdownRenderer({
  content,
  className = '',
  onCopy,
}: MarkdownRendererProps) {
  const html = useMemo(() => markdownToHtml(content), [content]);
  const plainText = useMemo(() => markdownToPlainText(content), [content]);

  const handleCopy = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.clipboardData.setData('text/plain', plainText);
      if (onCopy) onCopy(plainText);
    },
    [plainText, onCopy]
  );

  return (
    <div
      className={`markdown-renderer ${className}`}
      onCopy={handleCopy}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
