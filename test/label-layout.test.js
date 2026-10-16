import test from 'node:test';
import assert from 'node:assert/strict';
import { LANDMARKS } from '../src/pathways.js';
import { readFileSync } from 'node:fs';
import { createLessonCatalog } from '../src/lesson/catalog.js';
import { layoutLabels } from '../src/ui/label-layout.js';
const label = (id, patch = {}) => ({ id, x: 180, y: 140, z: 0, depth: 100, width: 90, height: 24, priority: 0, visible: true, ...patch });
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
function layout(options) {
  return layoutLabels({ width: 390, height: 300, labels: [], ...options });
}

test('INV-71 deterministic placement separates coincident anchors within viewport', () => { // Tests INV-71
  const labels = ['c', 'a', 'b', 'd', 'e', 'f', 'g', 'h', 'i'].map(id => label(id));
  const result = layout({ labels });
  assert.ok(result.length >= 6);
  assert.deepEqual(result, layout({ labels: [...labels].reverse() }));
  for (const a of result) {
    assert.ok(a.x >= 8 && a.y >= 8 && a.x + a.width <= 382 && a.y + a.height <= 292);
    for (const b of result) if (a !== b) assert.equal(overlaps(a, b), false);
    const source = labels.find(l => l.id === a.id);
    assert.deepEqual(a.leader.from, [source.x, source.y]);
    assert.ok(a.leader.to[0] >= a.x && a.leader.to[0] <= a.x + a.width);
    assert.ok(a.leader.to[1] >= a.y && a.leader.to[1] <= a.y + a.height);
  }
});

test('INV-71 crowded viewport drops lower priority before selected owner', () => { // Tests INV-71
  const result = layout({ width: 110, height: 46, labels: [label('a'), label('z', { priority: 3 })].map(l => ({ ...l, x: 55, y: 23 })) });
  assert.deepEqual(result.map(l => l.id), ['z']);
});

test('INV-71 occupancy cost moves labels away from active pathway', () => { // Tests INV-71
  const obstacle = { x: 120, y: 80, width: 120, height: 120 };
  const [result] = layout({ labels: [label('a')], obstacles: [obstacle] });
  assert.equal(overlaps(result, obstacle), false);
});

test('INV-71 stable candidate assignment survives small camera movement', () => { // Tests INV-71
  const labels = [label('a'), label('b')];
  const first = layout({ labels });
  const next = layout({ labels: labels.map(l => ({ ...l, x: l.x + 0.2 })), previous: first });
  assert.deepEqual(next.map(l => l.slot), first.map(l => l.slot));
  assert.deepEqual(layout({ labels, previous: first }), first);
});

test('FAIL-64 hides filtered, occluded, invalid and out-of-frustum anchors', () => { // Tests FAIL-64
  const invalid = [{ visible: false }, { occluded: true }, { depth: -1 }, { depth: 0 }, { z: -1.1 }, { z: 1.1 }, { x: -1 }, { y: 301 }, { x: Infinity }, { y: NaN }, { width: 0 }, { width: 400 }];
  assert.deepEqual(layout({ labels: invalid.map((patch, i) => label(String(i), patch)) }), []);
  assert.deepEqual(layout({ width: 0, labels: [label('a')] }), []);
});

test('INV-71 viewport edges clamp labels without losing anchor association', () => { // Tests INV-71
  const result = layout({ labels: [label('a', { x: 0, y: 0 }), label('b', { x: 390, y: 300 })] });
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].leader.from, [0, 0]);
  assert.ok(result.every(l => l.x >= 8 && l.y >= 8 && l.x + l.width <= 382 && l.y + l.height <= 292));
});

test('INV-71 every retained landmark has unique stable ID and explicit owner', () => { // Tests INV-71
  assert.equal(LANDMARKS.length, 9);
  assert.equal(new Set(LANDMARKS.map(l => l.id)).size, 9);
  const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
  const catalog = createLessonCatalog(json('../public/data/entities.json'), json('../public/data/fidelity.json'));
  for (const l of LANDMARKS) {
    assert.ok(catalog.entitiesById[l.owner]);
    assert.ok(['L', 'R', null].includes(l.hemi));
    if (l.inspectable) assert.equal(catalog.inspectablesById[l.inspectable].entity, l.owner);
  }
});
