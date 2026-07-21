export function createLessonPresentation(lesson) {
  if (!Array.isArray(lesson?.scenes) || lesson.scenes.length === 0) {
    throw new TypeError('lesson presentation requires scenes');
  }
  const entryScene = lesson.entrySceneId
    ? lesson.scenes.find(({ id }) => id === lesson.entrySceneId)
    : null;
  if (lesson.entrySceneId && !entryScene) {
    throw new RangeError(`unknown entry scene: ${lesson.entrySceneId}`);
  }
  const scenes = entryScene
    ? lesson.scenes.filter(({ id }) => id !== entryScene.id)
    : [...lesson.scenes];
  if (scenes.length === 0) {
    throw new RangeError('lesson presentation requires at least one instructional scene');
  }
  return Object.freeze({
    entryScene,
    scenes: Object.freeze(scenes),
  });
}
