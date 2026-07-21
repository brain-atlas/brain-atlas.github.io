import { unified } from 'unified';
import remarkParse from 'remark-parse';

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function allowedUrl(value, { image = false } = {}) {
  const normalized = value.trim();
  if (!image && normalized.startsWith('#')) return normalized;
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
    return normalized;
  } catch {
    return null;
  }
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

export function markdownToViewModel(markdown) {
  if (typeof markdown !== 'string') throw new TypeError('Markdown source must be a string');
  const tree = unified().use(remarkParse).parse(markdown);
  const definitions = new Map();
  for (const node of tree.children) {
    if (node.type !== 'definition') continue;
    if (!allowedUrl(node.url)) throw new Error(`unsafe URL in Markdown: ${node.url}`);
    definitions.set(node.identifier, node);
  }
  return freezeDeep(nodeModel(tree, { definitions }));
}
