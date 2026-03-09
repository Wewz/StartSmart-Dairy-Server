import sanitizeHtml from "sanitize-html";

const richTextConfig: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "a",
    "strong",
    "em",
    "u",
    "blockquote",
    "code",
    "pre",
    "table",
    "tbody",
    "thead",
    "tr",
    "td",
    "th",
    "img",
    "br",
    "hr",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (_tagName: string, attribs: Record<string, string>) => ({
      tagName: "a",
      attribs: {
        ...attribs,
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
  },
};

export const sanitizeRichText = (
  value?: string | null,
): string | null | undefined => {
  if (value === undefined || value === null) return value;
  return sanitizeHtml(value, richTextConfig).trim();
};

export const sanitizePlainText = (
  value?: string | null,
): string | null | undefined => {
  if (value === undefined || value === null) return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
};
