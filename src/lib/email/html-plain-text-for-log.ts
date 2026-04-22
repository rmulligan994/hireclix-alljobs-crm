/**
 * HTML → short plain text for subject lines and manually logged email notes.
 * (System-sent emails are subject-only in the comm log; no body is stored.)
 */
export function htmlToPlainTextForCommunicationLog(html: string, maxLength: number): string {
  if (!html || !String(html).trim()) return "";
  let s = String(html);

  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ");
  s = s.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/p>/gi, "\n");
  s = s.replace(/<\/tr>/gi, "\n");
  s = s.replace(/<\/div>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");

  s = stripPlainTextAtMediaBlocks(s);
  s = stripPlainTextCssClassBlocks(s);
  s = s.replace(/^\d{1,3}\s+(?=[A-Z][a-z])/, "");
  s = decodeCommonHtmlEntities(s);
  s = s.replace(/[\r\n\t]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxLength) s = s.slice(0, maxLength);
  return s;
}

/**
 * When tags were already stripped, responsive CSS is often still present as raw text, e.g.
 * `@media only screen and (max-width: 600px) { .a { } .b { } }`. Remove with nested-brace matching.
 */
function stripPlainTextAtMediaBlocks(input: string): string {
  let s = input;
  const re = /@media\b/i;
  for (;;) {
    const m = re.exec(s);
    if (m == null) break;
    const i = m.index;
    const brace0 = s.indexOf("{", i);
    if (brace0 < 0) break;
    let depth = 0;
    let j = brace0;
    const len = s.length;
    for (; j < len; j++) {
      if (s[j] === "{") depth++;
      else if (s[j] === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    if (depth !== 0) {
      s = s.slice(0, i);
      break;
    }
    s = s.slice(0, i) + " " + s.slice(j);
  }
  return s;
}

/** Single-line email CSS rules: `.class { width: 100% !important; }` left as plain text after tag strip. */
function stripPlainTextCssClassBlocks(input: string): string {
  return input.replace(
    /(?:\s+|^)(?:[.#][a-zA-Z_-][\w-]*|@(?:font-face|import))\s*\{[^{}]*\}/g,
    " ",
  );
}

function decodeCommonHtmlEntities(input: string): string {
  let s = input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const code = parseInt(d, 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    });

  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&amp;/g, "&");

  return s;
}
