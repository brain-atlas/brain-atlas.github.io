import globalTerms from './glossary.json' with { type: 'json' };
import { createDiagnostic } from './diagnostics.js';
import { deepFreeze } from './scene-state.js';
import { validateLessonMetadata } from './schemas.js';

// The project-owned vocabulary crosses the same shape/semantic boundary as local entries.
const globalShape = validateLessonMetadata({ schema: 1, title: 'Global glossary', glossary: { terms: globalTerms } });
if (globalShape.length) throw new Error(`Invalid global glossary: ${JSON.stringify(globalShape)}`);
const globalsById = new Map(globalTerms.map((term) => [term.id, term]));

export function resolveGlossary({ use = [], terms = [] } = {}) {
  const diagnostics = [];
  const fail = (message, path) => diagnostics.push(createDiagnostic('lesson.glossary.invalid', message, { path }));
  const resolved = new Map();
  for (const [index, id] of use.entries()) {
    if (!globalsById.has(id)) fail(`unknown global glossary ID: ${id}`, `/glossary/use/${index}`);
    else resolved.set(id, globalsById.get(id));
  }
  const localIds = new Set();
  for (const [index, term] of terms.entries()) {
    if (localIds.has(term.id)) fail(`duplicate glossary ID: ${term.id}`, `/glossary/terms/${index}/id`);
    localIds.add(term.id);
    resolved.set(term.id, term);
  }
  if (resolved.size > 64) fail('glossary exceeds 64 effective terms', '/glossary');
  const spellings = [];
  for (const term of resolved.values()) {
    for (const spelling of [term.term, ...(term.aliases ?? [])]) {
      const literal = new RegExp(`^${spelling.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'iu');
      if (spellings.some((prior) => literal.test(prior))) {
        fail(`ambiguous glossary spelling: ${spelling}`, '/glossary');
      }
      spellings.push(spelling);
    }
  }
  return {
    diagnostics,
    terms: deepFreeze(structuredClone([...resolved.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0))),
  };
}

const globalSemantics = resolveGlossary({ terms: globalTerms });
if (globalSemantics.diagnostics.length) throw new Error(`Invalid global glossary: ${JSON.stringify(globalSemantics.diagnostics)}`);
