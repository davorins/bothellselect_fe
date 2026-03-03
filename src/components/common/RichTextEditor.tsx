// src/components/common/RichTextEditor.tsx
import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
  value: string; // HTML content
  onChange: (html: string) => void;
  placeholder?: string;
  showPreview?: boolean;
}

// Convert markdown to HTML with proper paragraph handling
const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';

  let html = markdown;

  // First, handle special patterns
  // Pattern: ****[text](url)**** -> <strong><a>text</a></strong>
  html = html.replace(
    /\*\*\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\*\*/g,
    '<strong><a href="$2" target="_blank" rel="noopener noreferrer">$1</a></strong>'
  );

  // Pattern: **text** -> <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Pattern: *text* -> <em>text</em>
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // IMPORTANT: Handle paragraphs properly
  // Split by double newlines to preserve paragraphs
  const paragraphs = html.split(/\n\s*\n/);

  if (paragraphs.length > 1) {
    // Multiple paragraphs - wrap each in <p> tags
    html = paragraphs
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => {
        // Handle single newlines within paragraphs (convert to <br>)
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');
  } else {
    // Single paragraph
    const trimmed = html.trim();
    if (trimmed) {
      html = `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }
  }

  // Clean up
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');

  return html;
};

// Convert HTML back to markdown for editing
const htmlToMarkdown = (html: string): string => {
  if (!html) return '';

  let markdown = html;

  // Remove <p> tags but keep the content with double newlines
  markdown = markdown.replace(/<p>(.*?)<\/p>/g, (match, content) => {
    // Replace <br> with single newlines within paragraphs
    const text = content.replace(/<br\s*\/?>/g, '\n');
    return text + '\n\n';
  });

  // Remove other HTML tags
  markdown = markdown
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(
      /<a href="(.*?)" target="_blank" rel="noopener noreferrer">(.*?)<\/a>/g,
      '[$2]($1)'
    )
    .replace(/<[^>]*>/g, '')
    .trim();

  return markdown;
};

// Sanitize HTML
const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'em',
      'b',
      'i',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'div',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'title', 'class', 'style'],
  });
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter text here...',
  showPreview = true,
}) => {
  const [content, setContent] = useState(value);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [markdown, setMarkdown] = useState(htmlToMarkdown(value));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(value);
    setMarkdown(htmlToMarkdown(value));
  }, [value]);

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMarkdown = e.target.value;
    setMarkdown(newMarkdown);

    // Convert to HTML with proper paragraph handling
    const html = markdownToHtml(newMarkdown);
    const sanitizedHtml = sanitizeHtml(html);

    setContent(sanitizedHtml);
    onChange(sanitizedHtml);
  };

  const applyFormat = (format: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);

    let newText = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        newText = selectedText ? `**${selectedText}**` : '**bold text**';
        cursorOffset = 2;
        break;
      case 'italic':
        newText = selectedText ? `*${selectedText}*` : '*italic text*';
        cursorOffset = 1;
        break;
      case 'link':
        newText = selectedText ? `[${selectedText}](url)` : '[link text](url)';
        cursorOffset = -1;
        break;
      case 'paragraph':
        // Add paragraph break (two newlines)
        newText = selectedText ? `${selectedText}\n\n` : '\n\n';
        cursorOffset = 2;
        break;
      default:
        return;
    }

    const updatedMarkdown =
      markdown.substring(0, start) + newText + markdown.substring(end);

    setMarkdown(updatedMarkdown);

    // Convert to HTML
    const html = markdownToHtml(updatedMarkdown);
    const sanitizedHtml = sanitizeHtml(html);

    setContent(sanitizedHtml);
    onChange(sanitizedHtml);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + newText.length + cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  return (
    <div className='rich-text-editor'>
      <div className='toolbar mb-2'>
        <div className='d-flex flex-wrap align-items-center gap-2'>
          {showPreview && (
            <div className='btn-group btn-group-sm'>
              <button
                type='button'
                className={`btn ${
                  activeTab === 'write'
                    ? 'btn-primary'
                    : 'btn-outline-secondary'
                }`}
                onClick={() => setActiveTab('write')}
              >
                Write
              </button>
              <button
                type='button'
                className={`btn ${
                  activeTab === 'preview'
                    ? 'btn-primary'
                    : 'btn-outline-secondary'
                }`}
                onClick={() => setActiveTab('preview')}
              >
                Preview
              </button>
            </div>
          )}

          <div className='btn-group btn-group-sm'>
            <button
              type='button'
              className='btn btn-outline-secondary'
              onClick={() => applyFormat('bold')}
              title='Bold'
            >
              <strong>B</strong>
            </button>
            <button
              type='button'
              className='btn btn-outline-secondary'
              onClick={() => applyFormat('italic')}
              title='Italic'
            >
              <em>I</em>
            </button>
            <button
              type='button'
              className='btn btn-outline-secondary'
              onClick={() => applyFormat('link')}
              title='Link'
            >
              🔗
            </button>
            <button
              type='button'
              className='btn btn-outline-secondary'
              onClick={() => applyFormat('paragraph')}
              title='New Paragraph'
            >
              ¶
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'write' ? (
        <>
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={handleMarkdownChange}
            placeholder={placeholder}
            className='form-control'
            style={{
              height: '250px',
              fontFamily: "'Courier New', monospace",
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
            }}
          />
          <div className='mt-2 text-muted small'>
            <small>
              <strong>Tip:</strong> Press Enter twice to create a new paragraph.
              Single Enter for line breaks within a paragraph.
            </small>
          </div>
        </>
      ) : (
        <div
          className='preview-area border rounded p-3 bg-light'
          style={{
            minHeight: '250px',
            maxHeight: '400px',
            overflowY: 'auto',
            fontSize: '16px',
            lineHeight: '1.6',
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
};

export default RichTextEditor;
