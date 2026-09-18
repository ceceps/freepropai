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

/** Convert markdown to HTML */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Escape HTML first (but we need to be careful to not escape markdown syntax)
  // We'll process markdown first, then escape any remaining HTML

  // 1. Code blocks (```...```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>');
    return `<pre class="markdown-code-block"><code class="language-${lang || 'text'}">${escaped}</code></pre>`;
  });

  // 2. Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="markdown-inline-code">$1</code>');

  // 3. Headings (###, ##, #)
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="markdown-h3">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="markdown-h2">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="markdown-h1">$1</h1>');

  // 4. Bold (**text** or __text__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="markdown-bold">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong class="markdown-bold">$1</strong>');

  // 5. Italic (*text* or _text_) - avoid matching bold already processed
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="markdown-italic">$1</em>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="markdown-italic">$1</em>');

  // 6. Bullet points (- or * at start of line)
  html = html.replace(/^[\s]*[-*]\s+(.+)$/gm, '<li class="markdown-li">$1</li>');

  // 7. Numbered lists (1. at start of line)
  html = html.replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li class="markdown-li">$1</li>');

  // 8. Wrap consecutive <li> in <ul>
  html = html.replace(/(<li class="markdown-li">[\s\S]*?<\/li>)+/g, (match) => {
    return `<ul class="markdown-ul">${match}</ul>`;
  });

  // 9. Horizontal rule (--- or ***)
  html = html.replace(/^---+$/gm, '<hr class="markdown-hr" />');
  html = html.replace(/^\*\*\*+$/gm, '<hr class="markdown-hr" />');

  // 10. Blockquotes (>)
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="markdown-blockquote">$1</blockquote>');

  // 11. Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // 12. Convert remaining newlines to <br> (but not inside code blocks, lists, etc.)
  // Split by double newline for paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map((p) => {
      // If already wrapped in block element, keep as is
      if (
        p.trim().startsWith('<h') ||
        p.trim().startsWith('<ul') ||
        p.trim().startsWith('<ol') ||
        p.trim().startsWith('<pre') ||
        p.trim().startsWith('<blockquote') ||
        p.trim().startsWith('<hr')
      ) {
        return p;
      }
      // Convert single newlines to <br>
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

  // Clean up extra whitespace but preserve single newlines
  text = text.replace(/[ \t]+$/gm, ''); // trailing spaces
  text = text.replace(/\n{3,}/g, '\n\n'); // max 2 newlines

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