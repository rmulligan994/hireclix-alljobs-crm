/**
 * Boolean search query parser with full syntax support:
 * - Quoted phrases: "Senior Engineer"
 * - AND, OR, NOT operators
 * - Parentheses for grouping: (Boston OR Gloucester)
 *
 * Example: "Senior Engineer" AND (Boston OR Gloucester) NOT Manchester
 */

export type BooleanNode =
  | { type: "and"; left: BooleanNode; right: BooleanNode }
  | { type: "or"; left: BooleanNode; right: BooleanNode }
  | { type: "not"; operand: BooleanNode }
  | { type: "term"; value: string; isPhrase: boolean };

const OPERATORS = ["AND", "OR", "NOT"] as const;

function tokenize(input: string): { type: string; value: string }[] {
  const tokens: { type: string; value: string }[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    // Quoted phrase
    if (input[i] === '"' || input[i] === "'") {
      const quote = input[i];
      i++;
      let value = "";
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\") {
          i++;
          if (i < input.length) value += input[i++];
        } else {
          value += input[i++];
        }
      }
      if (i < input.length) i++; // consume closing quote
      tokens.push({ type: "QUOTED", value: value.trim() });
      continue;
    }

    // Parentheses
    if (input[i] === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (input[i] === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }

    // Word or operator
    let word = "";
    while (i < input.length && !/\s|[()"']/.test(input[i])) {
      word += input[i++];
    }
    if (word) {
      const upper = word.toUpperCase();
      if (OPERATORS.includes(upper as (typeof OPERATORS)[number])) {
        tokens.push({ type: upper, value: upper });
      } else {
        tokens.push({ type: "WORD", value: word });
      }
    }
  }

  return tokens;
}

class Parser {
  private tokens: { type: string; value: string }[];
  private pos = 0;

  constructor(tokens: { type: string; value: string }[]) {
    this.tokens = tokens;
  }

  private current() {
    return this.tokens[this.pos] ?? null;
  }

  private consume(type?: string) {
    const t = this.current();
    if (type && t?.type !== type) return null;
    this.pos++;
    return t;
  }

  parse(): BooleanNode | null {
    if (this.tokens.length === 0) return null;
    const expr = this.parseOr();
    return this.current() === null ? expr : null;
  }

  private parseOr(): BooleanNode | null {
    let left = this.parseAnd();
    if (!left) return null;

    while (this.current()?.type === "OR") {
      this.consume("OR");
      const right = this.parseAnd();
      if (!right) return left;
      left = { type: "or", left, right };
    }
    return left;
  }

  private parseAnd(): BooleanNode | null {
    let left = this.parseNot();
    if (!left) return null;

    // Allow "A NOT B" as "A AND NOT B" (implicit AND before NOT)
    while (this.current()?.type === "AND" || this.current()?.type === "NOT") {
      if (this.current()?.type === "AND") this.consume("AND");
      const right = this.parseNot();
      if (!right) return left;
      left = { type: "and", left, right };
    }
    return left;
  }

  private parseNot(): BooleanNode | null {
    if (this.current()?.type === "NOT") {
      this.consume("NOT");
      const operand = this.parseNot();
      if (!operand) return null;
      return { type: "not", operand };
    }
    return this.parseTerm();
  }

  private parseTerm(): BooleanNode | null {
    const t = this.current();
    if (!t) return null;

    if (t.type === "LPAREN") {
      this.consume("LPAREN");
      const expr = this.parseOr();
      if (!this.consume("RPAREN")) return expr;
      return expr;
    }

    if (t.type === "QUOTED" || t.type === "WORD") {
      this.consume();
      return {
        type: "term",
        value: t.value,
        isPhrase: t.type === "QUOTED",
      };
    }

    return null;
  }
}

export interface SearchableCandidate {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  location: string;
  skills: string[];
}

function getSearchableText(c: SearchableCandidate): string {
  return [
    `${c.firstName} ${c.lastName}`,
    c.email,
    c.phone,
    c.company,
    c.title,
    c.location,
    ...c.skills,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function termMatches(candidate: SearchableCandidate, term: string, isPhrase: boolean): boolean {
  const searchable = getSearchableText(candidate);
  const t = term.toLowerCase();

  if (isPhrase) {
    return searchable.includes(t);
  }
  // For single words, split searchable and check each token
  const tokens = searchable.split(/\s+/);
  return tokens.some((tok) => tok.includes(t) || t.includes(tok));
}

function evaluate(node: BooleanNode, candidate: SearchableCandidate): boolean {
  switch (node.type) {
    case "term":
      return termMatches(candidate, node.value, node.isPhrase);
    case "and":
      return evaluate(node.left, candidate) && evaluate(node.right, candidate);
    case "or":
      return evaluate(node.left, candidate) || evaluate(node.right, candidate);
    case "not":
      return !evaluate(node.operand, candidate);
    default:
      return false;
  }
}

/**
 * Parse a boolean search query and return an evaluator function, or null if parse failed.
 * Falls back to simple substring match when query has no operators (backward compatible).
 */
export function parseBooleanSearch(query: string): ((candidate: SearchableCandidate) => boolean) | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;

  // If no operators or parens, treat as simple search (backward compatible)
  const hasOperators = tokens.some((t) => t.type === "AND" || t.type === "OR" || t.type === "NOT" || t.type === "LPAREN");
  if (!hasOperators) {
    // Single term, phrase, or space-separated words - match as substring (legacy behavior)
    const value = tokens.map((t) => t.value).join(" ").toLowerCase();
    return (c) => getSearchableText(c).includes(value);
  }

  const parser = new Parser(tokens);
  const ast = parser.parse();
  if (!ast) return null;

  return (candidate) => evaluate(ast, candidate);
}

/**
 * Check if a query appears to use boolean syntax (for UI hints).
 */
export function hasBooleanSyntax(query: string): boolean {
  return /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:AND|OR|NOT)\b|\(|\)/.test(query.trim());
}
