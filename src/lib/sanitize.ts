/**
 * Safe HTML sanitizer to prevent Cross-Site Scripting (XSS).
 * Whitelists common formatting and text elements while stripping scripts, dangerous attributes, and event handlers.
 */

const ALLOWED_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'dd', 'div', 'dl', 'dt', 'em',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'li', 'ol', 'p', 'pre',
  'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th',
  'thead', 'tr', 'u', 'ul'
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  span: new Set(['class', 'style']),
  div: new Set(['class']),
  p: new Set(['class']),
  table: new Set(['class']),
  th: new Set(['class']),
  td: new Set(['class']),
};

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Recursively clean node tree
      function cleanNode(node: Node) {
        const children = Array.from(node.childNodes);
        for (const child of children) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement;
            const tagName = el.tagName.toLowerCase();

            if (!ALLOWED_TAGS.has(tagName)) {
              // Strip disallowed tag but keep text content
              const textNode = doc.createTextNode(el.textContent || '');
              node.replaceChild(textNode, el);
              continue;
            }

            // Remove all attributes except allowed ones
            const allowedForTag = ALLOWED_ATTRS[tagName] || new Set();
            const attrs = Array.from(el.attributes);
            for (const attr of attrs) {
              const attrName = attr.name.toLowerCase();
              const attrVal = attr.value;

              // Check event handlers (e.g. onload, onerror, onclick)
              if (attrName.startsWith('on')) {
                el.removeAttribute(attr.name);
                continue;
              }

              if (!allowedForTag.has(attrName)) {
                el.removeAttribute(attr.name);
                continue;
              }

              // Disallow javascript: URLs in href
              if (attrName === 'href') {
                const cleanHref = attrVal.trim().toLowerCase();
                if (cleanHref.startsWith('javascript:') || cleanHref.startsWith('data:') || cleanHref.startsWith('vbscript:')) {
                  el.removeAttribute(attr.name);
                } else if (cleanHref.startsWith('http://') || cleanHref.startsWith('https://')) {
                  el.setAttribute('rel', 'noopener noreferrer');
                  el.setAttribute('target', '_blank');
                }
              }
            }

            cleanNode(el);
          }
        }
      }

      cleanNode(doc.body);
      return doc.body.innerHTML;
    } catch {
      // Fallback
    }
  }

  // Server-side / fallback regex sanitizer
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/href=["']?javascript:[^"'>]*["']?/gi, 'href="#"');
}
