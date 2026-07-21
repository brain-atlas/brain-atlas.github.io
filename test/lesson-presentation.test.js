import assert from 'node:assert/strict';
import test from 'node:test';

import { createLessonPresentation } from '../src/ui/lesson-presentation.js';

const scene = (id) => Object.freeze({ id, title: id, snapshot: Object.freeze({ id }) });

test('entry scene supplies the pre-scroll view without becoming a numbered lesson scene', () => { // Tests INV-12, INV-14
  const presentation = createLessonPresentation({
    status: 'draft',
    entrySceneId: 'overview',
    scenes: [scene('overview'), scene('crossing'), scene('relay')],
  });

  assert.equal(presentation.status, 'draft');
  assert.equal(presentation.statusLabel, '[DRAFT]');
  assert.equal(presentation.entryScene.id, 'overview');
  assert.deepEqual(presentation.scenes.map(({ id }) => id), ['crossing', 'relay']);
  assert.equal(Object.isFrozen(presentation), true);
  assert.equal(Object.isFrozen(presentation.scenes), true);
});

test('lessons without an entry scene retain all scenes and no prelude', () => {
  const scenes = [scene('one'), scene('two')];
  const presentation = createLessonPresentation({ entrySceneId: null, scenes });
  assert.equal(presentation.status, null);
  assert.equal(presentation.statusLabel, null);
  assert.equal(presentation.entryScene, null);
  assert.deepEqual(presentation.scenes, scenes);
});

test('unknown entry scenes and entry-only lessons fail before presentation', () => {
  assert.throws(() => createLessonPresentation({ entrySceneId: 'missing', scenes: [scene('one')] }), /unknown entry scene/);
  assert.throws(() => createLessonPresentation({ entrySceneId: 'only', scenes: [scene('only')] }), /instructional scene/);
});
