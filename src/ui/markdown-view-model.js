import { unified } from 'unified';
import remarkParse from 'remark-parse';

import { isCredentialFreeHttps } from '../lesson/https-formats.js';
import { deepFreeze } from '../lesson/scene-state.js';

function allowedUrl(value, { image = false } = {}) {
  const normalized = value.trim();
  if (!image && normalized.startsWith('#')) return normalized;
  return isCredentialFreeHttps(normalized) ? normalized : null;
}

function childModels(node, context) {
  return (node.children ?? []).map((child) => nodeModel(child, context)).filter(Boolean);
}

function safeLink(node, context, image = false) {
  const url = allowedUrl(node.url, { image });
  if (!url) throw new Error(`unsafe URL in Markdown: ${node.url}`);
  if (image) return { type: 'image', url, alt: node.alt ?? '', title: node.title ?? null };
  return { type: 'link', url, title: node.title ?? null, children: childModels(node, context) };
}

function nodeModel(node, context) {
  switch (node.type) {
    case 'root':
      return { type: 'root', children: childModels(node, context) };
    case 'text':
      return { type: 'text', value: node.value };
    case 'paragraph':
      return { type: 'paragraph', children: childModels(node, context) };
    case 'heading':
      return { type: 'heading', depth: node.depth, children: childModels(node, context) };
    case 'strong':
    case 'emphasis':
    case 'blockquote':
    case 'listItem':
      return { type: node.type, children: childModels(node, context) };
    case 'list':
      return {
        type: 'list',
        ordered: Boolean(node.ordered),
        start: node.ordered ? (node.start ?? 1) : null,
        children: childModels(node, context),
      };
    case 'inlineCode':
      return { type: 'inlineCode', value: node.value };
    case 'code':
      return { type: 'code', lang: node.lang ?? null, value: node.value };
    case 'break':
      return { type: 'break' };
    case 'thematicBreak':
      return { type: 'thematicBreak' };
    case 'link':
      return safeLink(node, context);
    case 'image':
      return safeLink(node, context, true);
    case 'linkReference': {
      const definition = context.definitions.get(node.identifier);
      if (!definition) return { type: 'text', value: node.label ?? '' };
      return safeLink({ ...definition, children: node.children }, context);
    }
    case 'imageReference': {
      const definition = context.definitions.get(node.identifier);
      if (!definition) return { type: 'text', value: node.alt ?? '' };
      return safeLink({ ...definition, alt: node.alt }, context, true);
    }
    case 'definition':
      return null;
    case 'html':
      throw new Error('raw HTML is not allowed in lesson presentation');
    default:
      throw new Error(`unsupported Markdown node: ${node.type}`);
  }
}

function annotateGlossary(model, glossary, seen) {
  if (glossary.length === 0) return model;
  const spellings = glossary.flatMap((term) => [term.term, ...(term.aliases ?? [])]
    .map((spelling) => ({ term, spelling })))
    .sort((a, b) => b.spelling.length - a.spelling.length);
  const alternatives = spellings.map(({ spelling }) => `(${spelling.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}\\p{M}_])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}\\p{M}_])`, 'giu');
  function displayedText(node) {
    if (['image', 'break'].includes(node.type)) return '\n';
    return node.value ?? (node.children ?? []).map(displayedText).join('');
  }
  function visit(node, before = '', after = '') {
    if (['heading', 'link', 'image', 'inlineCode', 'code', 'glossaryTerm'].includes(node.type)) return node;
    if (node.type === 'text') {
      const children = [];
      let offset = 0;
      for (const match of node.value.matchAll(pattern)) {
        if (match.index === 0 && /[\p{L}\p{N}\p{M}_]$/u.test(before)) continue;
        if (match.index + match[0].length === node.value.length && /^[\p{L}\p{N}\p{M}_]/u.test(after)) continue;
        const term = spellings[match.slice(1).findIndex((value) => value !== undefined)].term;
        if (seen.has(term.id)) continue;
        if (match.index > offset) children.push({ type: 'text', value: node.value.slice(offset, match.index) });
        children.push({ type: 'glossaryTerm', id: term.id, value: match[0], definition: term.definition });
        seen.add(term.id);
        offset = match.index + match[0].length;
      }
      if (offset === 0) return node;
      if (offset < node.value.length) children.push({ type: 'text', value: node.value.slice(offset) });
      return children;
    }
    if (!node.children) return node;
    if (!['paragraph', 'strong', 'emphasis'].includes(node.type)) {
      return { ...node, children: node.children.flatMap((child) => visit(child)) };
    }
    const values = node.children.map(displayedText);
    const content = values.join('');
    let offset = 0;
    return { ...node, children: node.children.flatMap((child, index) => {
      const start = offset;
      offset += values[index].length;
      return visit(child, content.slice(Math.max(0, start - 2), start) || before, content.slice(offset, offset + 2) || after);
    }) };
  }
  return visit(model);
}

export function markdownToViewModel(markdown, { glossary = [], seen = new Set() } = {}) {
  if (typeof markdown !== 'string') throw new TypeError('Markdown source must be a string');
  const tree = unified().use(remarkParse).parse(markdown);
  const definitions = new Map();
  for (const node of tree.children) {
    if (node.type !== 'definition') continue;
    if (!allowedUrl(node.url)) throw new Error(`unsafe URL in Markdown: ${node.url}`);
    definitions.set(node.identifier, node);
  }
  return deepFreeze(annotateGlossary(nodeModel(tree, { definitions }), glossary, seen));
}
