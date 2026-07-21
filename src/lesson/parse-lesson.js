import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { LineCounter, parseDocument } from 'yaml';

import { createDiagnostic } from './diagnostics.js';
import { deepFreeze, normalizeSceneSnapshot } from './scene-state.js';
import { validateLessonMetadata, validateSceneDirective } from './schemas.js';

const markdownParser = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']);

function trimMarkdown(source, start, end) {
  return source.slice(start, end).trim();
}

function pointerSegments(path) {
  return path.split('/').slice(1).map((segment) =>
    segment.replace(/~1/g, '/').replace(/~0/g, '~'),
  ).map((segment) => (/^(0|[1-9]\d*)$/.test(segment) ? Number(segment) : segment));
}

function yamlLocation(document, lineCounter, originLine, path) {
  const node = document.getIn(pointerSegments(path), true);
  if (!node?.range) return null;
  const local = lineCounter.linePos(node.range[0]);
  return { line: originLine + local.line - 1, column: local.col };
}

function yamlErrorLocation(error, lineCounter, originLine) {
  const offset = error.pos?.[0] ?? 0;
  const local = lineCounter.linePos(offset);
  return { line: originLine + local.line - 1, column: local.col };
}

function parseYamlNode(node, scope) {
  const originLine = node.position.start.line + 1;
  const lineCounter = new LineCounter();
  const document = parseDocument(node.value, {
    lineCounter,
    prettyErrors: false,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    return {
      diagnostics: document.errors.map((error) => createDiagnostic(
        `${scope}.yaml.parse`,
        error.message,
        {
          ...yamlErrorLocation(error, lineCounter, originLine),
          path: '',
        },
      )),
    };
  }

  try {
    const value = document.toJS({ maxAliasCount: 0, mapAsMap: false });
    return {
      value,
      origin: { line: originLine, column: 1 },
      locate: (path) => yamlLocation(document, lineCounter, originLine, path),
      diagnostics: [],
    };
  } catch (error) {
    return {
      diagnostics: [createDiagnostic(
        `${scope}.yaml.alias`,
        error.message,
        { line: originLine, column: 1, path: '' },
      )],
    };
  }
}

function walk(node, parent, visit) {
  visit(node, parent);
  for (const child of node.children ?? []) walk(child, node, visit);
}

function isAllowedUrl(url, { image = false } = {}) {
  const normalized = url.trim().replace(/[\u0000-\u0020]+/g, '');
  if (!image && normalized.startsWith('#')) return true;
  return /^https:\/\//i.test(normalized);
}

function markdownDiagnostics(tree, visuals) {
  const diagnostics = [];
  const visualBySource = new Map(visuals.map((visual) => [visual.src, visual]));
  walk(tree, null, (node, parent) => {
    const at = {
      line: node.position?.start.line ?? 1,
      column: node.position?.start.column ?? 1,
    };
    if (node.type === 'html') {
      diagnostics.push(createDiagnostic(
        'markdown.raw-html',
        'raw HTML is not allowed in lessons',
        { ...at, path: '' },
      ));
    }
    if ((node.type === 'link' || node.type === 'image') && !isAllowedUrl(node.url, { image: node.type === 'image' })) {
      diagnostics.push(createDiagnostic(
        'markdown.unsafe-url',
        `URL scheme is not allowed: ${node.url}`,
        { ...at, path: '' },
      ));
    }
    if (node.type === 'image' && isAllowedUrl(node.url, { image: true })) {
      const declared = visualBySource.get(node.url);
      if (!declared || !node.alt || node.alt !== declared.alt) {
        diagnostics.push(createDiagnostic(
          'markdown.undeclared-image',
          'Markdown images must match a declared visual source and alt text',
          { ...at, path: '' },
        ));
      }
    }
    if (node.type === 'code' && node.lang === 'atlas-scene' && parent?.type !== 'root') {
      diagnostics.push(createDiagnostic(
        'scene.directive.nested',
        'atlas-scene directives must be top-level fenced blocks',
        { ...at, path: '' },
      ));
    }
  });
  return diagnostics;
}

function remapDiagnostics(diagnostics, yaml) {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    ...(yaml.locate(diagnostic.path) ?? yaml.origin),
  }));
}

function sortedDiagnostics(diagnostics) {
  return diagnostics.sort((a, b) =>
    a.line - b.line || a.column - b.column || a.code.localeCompare(b.code),
  );
}

export function parseLesson(source, catalog) {
  const diagnostics = [];
  let tree;
  try {
    tree = markdownParser.parse(source);
  } catch (error) {
    return {
      ok: false,
      diagnostics: [createDiagnostic('markdown.parse', error.message)],
    };
  }

  const frontmatterNodes = tree.children.filter((node) => node.type === 'yaml');
  if (frontmatterNodes.length !== 1 || tree.children[0]?.type !== 'yaml') {
    diagnostics.push(createDiagnostic(
      'lesson.frontmatter.invalid',
      'lesson must begin with exactly one YAML frontmatter block',
    ));
  }

  const metadataYaml = frontmatterNodes[0] ? parseYamlNode(frontmatterNodes[0], 'lesson') : null;
  diagnostics.push(...(metadataYaml?.diagnostics ?? []));
  const metadata = metadataYaml?.value;
  if (metadata !== undefined) {
    diagnostics.push(...validateLessonMetadata(metadata, metadataYaml));
  }
  const visuals = Array.isArray(metadata?.visuals) ? metadata.visuals : [];
  const visualIds = new Set();
  visuals.forEach((visual, index) => {
    if (visualIds.has(visual.id)) {
      const path = `/visuals/${index}/id`;
      diagnostics.push(createDiagnostic(
        'lesson.visual.duplicate',
        `duplicate visual ID: ${visual.id}`,
        {
          ...(metadataYaml.locate(path) ?? metadataYaml.origin),
          path,
        },
      ));
    }
    visualIds.add(visual.id);
  });
  diagnostics.push(...markdownDiagnostics(tree, visuals));

  const sceneNodes = tree.children.filter((node) => node.type === 'code' && node.lang === 'atlas-scene');
  if (sceneNodes.length === 0) {
    diagnostics.push(createDiagnostic(
      'lesson.scene.missing',
      'lesson must contain at least one top-level atlas-scene directive',
    ));
  }

  const sceneContext = {
    ...catalog,
    visualIds: [...new Set([...(catalog.visualIds ?? []), ...visuals.map(({ id }) => id)])],
  };
  const scenes = [];
  const sceneIds = new Map();
  for (let index = 0; index < sceneNodes.length; index++) {
    const node = sceneNodes[index];
    const yaml = parseYamlNode(node, 'scene');
    diagnostics.push(...yaml.diagnostics);
    if (yaml.value === undefined) continue;

    const schemaDiagnostics = validateSceneDirective(yaml.value, yaml);
    diagnostics.push(...schemaDiagnostics);
    if (schemaDiagnostics.length > 0) continue;

    if (sceneIds.has(yaml.value.id)) {
      diagnostics.push(createDiagnostic(
        'lesson.scene.duplicate',
        `duplicate scene ID: ${yaml.value.id}`,
        {
          ...(yaml.locate('/id') ?? yaml.origin),
          path: '/id',
        },
      ));
      continue;
    }
    sceneIds.set(yaml.value.id, node.position.start.line);

    try {
      const snapshot = normalizeSceneSnapshot(yaml.value, sceneContext);
      const nextOffset = sceneNodes[index + 1]?.position.start.offset ?? source.length;
      scenes.push({
        id: yaml.value.id,
        title: yaml.value.title ?? null,
        proseMarkdown: trimMarkdown(source, node.position.end.offset, nextOffset),
        snapshot,
        source: {
          line: node.position.start.line,
          column: node.position.start.column,
        },
      });
    } catch (error) {
      if (Array.isArray(error.diagnostics)) {
        diagnostics.push(...remapDiagnostics(error.diagnostics, yaml));
      } else {
        throw error;
      }
    }
  }

  if (diagnostics.length > 0 || metadata === undefined) {
    return { ok: false, diagnostics: sortedDiagnostics(diagnostics) };
  }

  const introductionStart = frontmatterNodes[0].position.end.offset;
  const introductionEnd = sceneNodes[0]?.position.start.offset ?? source.length;
  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: metadata.schema,
      id: metadata.id ?? null,
      title: metadata.title,
      summary: metadata.summary ?? null,
      visuals: structuredClone(visuals),
      introductionMarkdown: trimMarkdown(source, introductionStart, introductionEnd),
      scenes,
    }),
  };
}
