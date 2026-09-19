export interface ParsedPersona {
  name: string;
  description: string;
  characteristics: string[];
}

export interface ParsedSellingPoint {
  segment: string;
  profile: string;
}

export interface ParsedInsight {
  channel: string;
  reasoning: string;
  tactics: string[];
}

export interface ParsedPipelineAnalysis {
  title: string | null;
  disclaimer: string | null;
  buyerPersonas: ParsedPersona[];
  sellingPoints: ParsedSellingPoint[];
  insights: ParsedInsight[];
}

interface PipelineAnalysisSource {
  buyerPersona?: string | null;
  sellingPoints?: string | null;
  fullAnalysisMarkdown?: string | null;
  listingTitle?: string | null;
}

interface MarkdownSection {
  heading: string;
  body: string;
}

const EMOJI_RE = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;

function stripEmoji(value: string): string {
  return value.replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim();
}

function stripMd(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function normalizeHeading(raw: string): string {
  return stripMd(stripEmoji(raw)).replace(/[:：]\s*$/, '').trim().toLowerCase();
}

function classifyH2(title: string): 'persona' | 'selling' | 'summary' | 'other' {
  const t = normalizeHeading(title);
  if (t.includes('buyer') || t.includes('persona') || t.includes('pembeli')) return 'persona';
  if (t.includes('selling') || t.includes('poin jual') || t.includes('selling point')) return 'selling';
  if (
    t.includes('ringkasan') ||
    t.includes('summary') ||
    t.includes('channel') ||
    t.includes('pemasaran') ||
    t.includes('rekomendasi')
  ) {
    return 'summary';
  }
  return 'other';
}

function splitByHeading(markdown: string, level: 1 | 2 | 3): MarkdownSection[] {
  const marker = '#'.repeat(level);
  const re = new RegExp(`^${marker}\\s+(.+)$`);
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections: MarkdownSection[] = [];
  let heading = '';
  let body: string[] = [];

  const flush = () => {
    const text = body.join('\n').trim();
    if (heading || text) sections.push({ heading, body: text });
  };

  for (const line of lines) {
    const match = re.exec(line);
    if (match && !line.startsWith(`${marker}#`)) {
      flush();
      heading = match[1].trim();
      body = [];
    } else {
      body.push(line);
    }
  }
  flush();
  return sections;
}

function extractDisclaimer(markdown: string): { disclaimer: string | null; rest: string } {
  const match = markdown.match(/^>\s*(?:\*\*)?(?:Disclaimer:\s*)?(?:\*\*)?(.+)$/m);
  if (!match) return { disclaimer: null, rest: markdown };
  return {
    disclaimer: stripMd(match[1]),
    rest: markdown.replace(match[0], '').replace(/^\n+/, ''),
  };
}

function splitListItems(text: string): string[] {
  const items: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
    const match = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line.trim());
    if (match) {
      if (current) items.push(stripMd(current.trim()));
      current = match[1];
    } else if (/^\s{2,}/.test(line) && current) {
      current += ` ${line.trim()}`;
    } else if (current && line.trim()) {
      current += ` ${line.trim()}`;
    }
  }
  if (current) items.push(stripMd(current.trim()));
  return items.filter(Boolean);
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => stripMd(block.replace(/^[-*+]\s+/gm, '').replace(/^\d+[.)]\s+/gm, '').replace(/\n/g, ' ')))
    .map((block) => block.replace(/^[-—–]+\s*$/, '').trim())
    .filter((block) => block && block !== '---');
}

function labeledItems(text: string): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  for (const raw of splitListItems(text)) {
    const match = /^\*?\*?([^:*]+)\*?\*?\s*[:：]\s*(.+)$/.exec(raw);
    if (match) items.push({ label: stripMd(match[1]), value: stripMd(match[2]) });
  }
  return items;
}

function parseTableRows(text: string): { segment: string; profile: string }[] {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const rows: { segment: string; profile: string }[] = [];
  let i = 0;
  while (i < lines.length) {
    if (i + 1 < lines.length && lines[i].includes('|') && /^\|?[\s:]*-+[\s:]*\|/.test(lines[i + 1])) {
      i += 2;
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i]
          .split('|')
          .map((cell) => stripMd(cell.trim()))
          .filter(Boolean);
        if (cells.length >= 2) rows.push({ segment: cells[0], profile: cells.slice(1).join(' — ') });
        i += 1;
      }
    } else {
      i += 1;
    }
  }
  return rows;
}

function firstSentence(text: string): string {
  const clean = stripMd(text).replace(/\s+/g, ' ').trim();
  const match = clean.match(/^(.+?[.!?])\s/);
  if (match && match[1].length >= 12 && match[1].length <= 90) return match[1];
  const comma = clean.split(',')[0]?.trim() ?? clean;
  if (comma.length >= 8 && comma.length <= 72) return comma;
  return clean.length > 72 ? `${clean.slice(0, 72).trimEnd()}…` : clean;
}

function personaFromBlock(heading: string, body: string): ParsedPersona | null {
  const name = stripMd(stripEmoji(heading))
    .replace(/^(Profil Utama|Profil Sekunder|Persona)\s*[:：]\s*/i, '')
    .trim();
  const labels = labeledItems(body);
  const lists = splitListItems(body);
  const paras = paragraphs(body).filter((p) => !splitListItems(p).length || p.length > 80);

  const characteristics = labels.length
    ? labels.map((item) => `${item.label}: ${item.value}`)
    : lists.map((item) => item.replace(/^\*?\*?([^:*]+)\*?\*?\s*[:：]\s*/, ''));

  let description = paras[0] || '';
  if (!description && labels.length) {
    description = labels.map((item) => `${item.label} ${item.value}`).join('. ') + '.';
  }
  if (!description && lists.length) {
    description = lists.slice(0, 2).join(' ');
  }
  if (!description && name) description = name;
  if (!description) return null;

  return {
    name: name || firstSentence(description),
    description,
    characteristics: characteristics.filter((item) => item && item !== description).slice(0, 8),
  };
}

function parsePersonas(body: string): ParsedPersona[] {
  if (!body.trim()) return [];
  const sub = splitByHeading(body, 3).filter((section) => section.heading);
  if (sub.length) {
    return sub.map((section) => personaFromBlock(section.heading, section.body)).filter((p): p is ParsedPersona => Boolean(p));
  }

  const calon = body.match(/Calon Pembeli\s*[:：]\s*([\s\S]+)$/i);
  if (calon) {
    const intro = body.slice(0, calon.index).trim();
    const buyers = splitListItems(calon[1]);
    const shared = labeledItems(intro).map((item) => `${item.label}: ${item.value}`);
    if (buyers.length) {
      return buyers.map((buyer, idx) => ({
        name: firstSentence(buyer),
        description: buyer,
        characteristics: idx === 0 ? shared : [],
      }));
    }
  }

  const labels = labeledItems(body);
  const lists = splitListItems(body);
  if (labels.length >= 2) {
    return [
      {
        name: labels[0] ? `${labels[0].label} ${labels[0].value}` : firstSentence(body),
        description: paragraphs(body)[0] || labels.map((item) => `${item.label}: ${item.value}`).join('. '),
        characteristics: labels.map((item) => `${item.label}: ${item.value}`),
      },
    ];
  }
  if (lists.length >= 2) {
    return [
      {
        name: firstSentence(lists[0]),
        description: lists[0],
        characteristics: lists.slice(1, 7),
      },
    ];
  }

  const text = stripMd(body.replace(/\n+/g, ' ')).trim();
  if (!text) return [];
  return [
    {
      name: firstSentence(text),
      description: text,
      characteristics: [],
    },
  ];
}

function sellingFromBlock(heading: string, body: string): ParsedSellingPoint {
  const profile = paragraphs(body)[0] || splitListItems(body).join(' ') || stripMd(body.replace(/\n+/g, ' '));
  return {
    segment: stripMd(stripEmoji(heading)) || firstSentence(profile),
    profile: profile.trim(),
  };
}

function parseSellingPoints(body: string): ParsedSellingPoint[] {
  if (!body.trim()) return [];
  const sub = splitByHeading(body, 3).filter((section) => section.heading);
  if (sub.length) {
    const fromSubs: ParsedSellingPoint[] = [];
    for (const section of sub) {
      const table = parseTableRows(section.body);
      if (table.length) fromSubs.push(...table);
      else {
        const lists = splitListItems(section.body);
        if (lists.length > 1 && !paragraphs(section.body)[0]) {
          fromSubs.push(
            ...lists.map((item) => {
              const labeled = /^([^:：]+)[:：]\s*(.+)$/.exec(item);
              return labeled
                ? { segment: labeled[1].trim(), profile: labeled[2].trim() }
                : { segment: firstSentence(item), profile: item };
            })
          );
        } else {
          fromSubs.push(sellingFromBlock(section.heading, section.body));
        }
      }
    }
    return fromSubs.filter((item) => item.segment && item.profile);
  }

  const table = parseTableRows(body);
  if (table.length) return table;

  const lists = splitListItems(body);
  if (lists.length) {
    return lists.map((item) => {
      const labeled = /^([^:：]+)[:：]\s*(.+)$/.exec(item);
      if (labeled) return { segment: labeled[1].trim(), profile: labeled[2].trim() };
      return { segment: firstSentence(item), profile: item };
    });
  }

  const specs = body
    .split(';')
    .map((part) => stripMd(part).trim())
    .filter(Boolean);
  if (specs.length > 1 && specs.every((spec) => spec.length < 80)) {
    return specs.map((spec) => {
      const labeled = /^([^:：]+)[:：]\s*(.+)$/.exec(spec);
      return labeled
        ? { segment: labeled[1].trim(), profile: labeled[2].trim() }
        : { segment: spec, profile: spec };
    });
  }

  const text = stripMd(body.replace(/\n+/g, ' ')).trim();
  if (!text) return [];
  return [{ segment: firstSentence(text), profile: text }];
}

function parseInsights(body: string): ParsedInsight[] {
  if (!body.trim()) return [];
  const sub = splitByHeading(body, 3).filter((section) => section.heading);
  if (sub.length) {
    return sub.map((section) => {
      const lists = splitListItems(section.body);
      const paras = paragraphs(section.body);
      return {
        channel: stripMd(stripEmoji(section.heading)),
        reasoning: paras[0] || lists[0] || stripMd(section.body.replace(/\n+/g, ' ')),
        tactics: lists.filter((item) => item !== paras[0]).slice(0, 8),
      };
    });
  }

  const lists = splitListItems(body);
  const paras = paragraphs(body);
  if (lists.length >= 2 && paras.length) {
    return [
      {
        channel: 'Ringkasan Analisa',
        reasoning: paras[0],
        tactics: lists.slice(0, 8),
      },
    ];
  }
  if (lists.length >= 2) {
    return [
      {
        channel: firstSentence(lists[0]),
        reasoning: lists[0],
        tactics: lists.slice(1, 8),
      },
    ];
  }

  const text = stripMd(body.replace(/\n+/g, ' ')).trim();
  if (!text) return [];
  return [
    {
      channel: 'Ringkasan Analisa',
      reasoning: text,
      tactics: [],
    },
  ];
}

export function parsePipelineAnalysis(source: PipelineAnalysisSource): ParsedPipelineAnalysis {
  const markdown = (source.fullAnalysisMarkdown || '').trim();
  const { disclaimer, rest } = extractDisclaimer(markdown);
  const h1 = splitByHeading(rest, 1);
  const titleFromH1 = h1.length && h1[0].heading ? stripMd(stripEmoji(h1[0].heading)) : null;
  const afterTitle = h1.length ? h1.map((section) => section.body).join('\n\n') : rest;
  const h2 = splitByHeading(afterTitle, 2).filter((section) => section.heading);

  let buyerPersonas: ParsedPersona[] = [];
  let sellingPoints: ParsedSellingPoint[] = [];
  let insights: ParsedInsight[] = [];

  if (h2.length) {
    for (const section of h2) {
      const kind = classifyH2(section.heading);
      if (kind === 'persona') buyerPersonas = parsePersonas(section.body);
      else if (kind === 'selling') sellingPoints = parseSellingPoints(section.body);
      else if (kind === 'summary') insights = parseInsights(section.body);
    }
  }

  if (!buyerPersonas.length && source.buyerPersona) buyerPersonas = parsePersonas(source.buyerPersona);
  if (!sellingPoints.length && source.sellingPoints) sellingPoints = parseSellingPoints(source.sellingPoints);
  if (!insights.length && markdown && !h2.length) insights = parseInsights(afterTitle);

  return {
    title: titleFromH1 || source.listingTitle || null,
    disclaimer,
    buyerPersonas,
    sellingPoints,
    insights,
  };
}

export function analysisPreviewText(source: PipelineAnalysisSource, max = 180): string {
  const parsed = parsePipelineAnalysis(source);
  const persona = parsed.buyerPersonas[0];
  if (persona) {
    const text = `${persona.name}. ${persona.description}`.replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
  }
  const raw = (source.buyerPersona || source.sellingPoints || source.fullAnalysisMarkdown || '').replace(/\s+/g, ' ').trim();
  return raw.length > max ? `${raw.slice(0, max).trimEnd()}...` : raw;
}
