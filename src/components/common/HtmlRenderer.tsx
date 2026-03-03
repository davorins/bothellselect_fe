// src/components/common/HtmlRenderer.tsx
import React from 'react';
import DOMPurify from 'dompurify';

interface HtmlRendererProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

const HtmlRenderer: React.FC<HtmlRendererProps> = ({
  html,
  className = '',
  style,
}) => {
  if (!html) return null;

  // Sanitize HTML with DOMPurify
  const sanitizedHtml = DOMPurify.sanitize(html, {
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
      'span',
      'mark',
      'a',
      'ul',
      'ol',
      'li',
      'div',
      'section',
      'article',
      'header',
      'footer',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'img',
      'figure',
      'figcaption',
      'blockquote',
      'code',
      'pre',
      'hr',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'title',
      'class',
      'style',
      'id',
      'src',
      'alt',
      'width',
      'height',
      'loading',
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
  });

  // Process the HTML to ensure proper formatting
  const processedHtml = sanitizedHtml
    // Ensure links open in new tab
    .replace(
      /<a(?![^>]*target=)/g,
      '<a target="_blank" rel="noopener noreferrer"'
    )
    // Fix missing http in links
    .replace(/href="\/\/([^"]+)"/g, 'href="https://$1"');

  return (
    <div
      className={`html-content ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
};

export default HtmlRenderer;
