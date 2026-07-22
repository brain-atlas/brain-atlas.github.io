import './style.css';

import { createLessonCatalog } from './lesson/index.js';
import lessonSource from './lessons/retina-to-v1.md?raw';
import { createFidelityViewModel } from './ui/fidelity-view-model.js';
import { createLessonSceneController } from './ui/lesson-scene-controller.js';
import {
  createLessonRuntimeCatalog,
  MAX_LESSON_SOURCE_BYTES,
  validateLessonImport,
} from './ui/lesson-import.js';
import { markdownToViewModel } from './ui/markdown-view-model.js';
import {
  createSceneNavigationState,
  moveScene,
  updateSceneFromScroll,
} from './ui/scene-navigation.js';
import {
  pageScrollKeyAction,
  relativeAnchorTops,
  targetScrollTop,
} from './ui/scroll-surface.js';

const byId = (id) => document.getElementById(id);
const app = byId('app');
const pageScroll = byId('page-scroll');
const skipLink = document.querySelector('.skip-link');
const sceneContainer = byId('lesson-scenes');
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const compactDisclosureQuery = matchMedia('(max-width: 700px)');
let disclosureScrollTop = null;
let catalog;
let lesson;
let presentation;
let navigation;
let controller = null;
let rendererAdapter = null;
let rendererAdapterFactory = null;
let rendererUnavailable = false;
let selectedVisualId = 'atlas';
let lessonSourceKind = 'reference';
let lessonImportCandidate = null;
let importCloseFocus = 'trigger';
let sceneCards = [];
let scrollFrame = 0;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createDeclaredImageFigure(visual, className = 'lesson-inline-visual') {
  const figure = document.createElement('figure');
  figure.className = className;
  const frame = node('div', 'lesson-inline-image-frame');
  frame.style.aspectRatio = String(visual.aspectRatio ?? (16 / 9));
  const image = document.createElement('img');
  image.alt = visual.alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  const failure = node('div', 'lesson-inline-image-failure');
  failure.setAttribute('role', 'status');
  failure.setAttribute('aria-live', 'polite');
  failure.hidden = true;
  const retry = node('button', '', 'Retry image');
  retry.type = 'button';
  failure.append(node('strong', '', visual.alt), node('span', '', 'Image unavailable. Use the source link below.'), retry);
  image.addEventListener('error', () => {
    image.hidden = true;
    failure.hidden = false;
  });
  image.addEventListener('load', () => {
    image.hidden = false;
    failure.hidden = true;
  });
  retry.addEventListener('click', () => {
    image.hidden = false;
    failure.hidden = true;
    image.removeAttribute('src');
    image.src = visual.src;
  });
  frame.append(image, failure);
  const caption = document.createElement('figcaption');
  caption.append(node('span', '', visual.caption), node('span', '', `Credit: ${visual.credit}`));
  const source = node('a', '', 'Open image source');
  source.href = visual.source;
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  caption.append(source);
  figure.append(frame, caption);
  image.src = visual.src;
  return figure;
}

function renderMarkdownNode(model) {
  switch (model.type) {
    case 'root': {
      const fragment = document.createDocumentFragment();
      for (const child of model.children) fragment.append(renderMarkdownNode(child));
      return fragment;
    }
    case 'text':
      return document.createTextNode(model.value);
    case 'paragraph':
    case 'blockquote':
    case 'strong':
    case 'emphasis': {
      const tags = { paragraph: 'p', blockquote: 'blockquote', strong: 'strong', emphasis: 'em' };
      const element = document.createElement(tags[model.type]);
      for (const child of model.children) element.append(renderMarkdownNode(child));
      return element;
    }
    case 'heading': {
      const element = document.createElement(`h${model.depth}`);
      for (const child of model.children) element.append(renderMarkdownNode(child));
      return element;
    }
    case 'list': {
      const element = document.createElement(model.ordered ? 'ol' : 'ul');
      if (model.ordered && model.start !== 1) element.start = model.start;
      for (const child of model.children) element.append(renderMarkdownNode(child));
      return element;
    }
    case 'listItem': {
      const element = document.createElement('li');
      for (const child of model.children) element.append(renderMarkdownNode(child));
      return element;
    }
    case 'inlineCode':
      return node('code', '', model.value);
    case 'code': {
      const pre = document.createElement('pre');
      const code = node('code', '', model.value);
      if (model.lang) code.dataset.language = model.lang;
      pre.append(code);
      return pre;
    }
    case 'break':
      return document.createElement('br');
    case 'thematicBreak':
      return document.createElement('hr');
    case 'link': {
      const element = document.createElement('a');
      element.href = model.url;
      if (!model.url.startsWith('#')) {
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
      }
      if (model.title) element.title = model.title;
      for (const child of model.children) element.append(renderMarkdownNode(child));
      return element;
    }
    case 'image': {
      const visual = lesson.visuals.find(({ src, alt }) => src === model.url && alt === model.alt);
      if (!visual) throw new Error(`undeclared lesson image: ${model.url}`);
      return createDeclaredImageFigure(visual);
    }
    default:
      throw new Error(`unsupported presentation node: ${model.type}`);
  }
}

function markdownFragment(markdown) {
  return renderMarkdownNode(markdownToViewModel(markdown));
}

function sceneEntityLabels(scene) {
  return scene.snapshot.visibility.entities.map((id) => catalog.entitiesById[id].label);
}

function renderLesson() {
  const statusLabel = presentation.statusLabel;
  byId('lesson-brand-title').textContent = lesson.title;
  document.querySelector('.brand').setAttribute(
    'aria-label',
    `Brain Atlas home: ${lesson.title}${statusLabel ? ', Draft' : ''}`,
  );
  const headerStatus = byId('lesson-status');
  headerStatus.textContent = statusLabel ?? '';
  headerStatus.hidden = !statusLabel;
  document.title = `Brain Atlas — ${lesson.title}${statusLabel ? ` ${statusLabel}` : ''}`;

  const intro = byId('lesson-intro');
  intro.replaceChildren(markdownFragment(lesson.introductionMarkdown));
  const title = intro.querySelector('h1');
  if (title) {
    title.id = 'lesson-title';
    title.tabIndex = -1;
  }
  const meta = node('div', 'lesson-meta');
  if (statusLabel) {
    const status = node('span', 'lesson-status', statusLabel);
    status.setAttribute('aria-label', 'Lesson status: Draft');
    meta.append(status);
  }
  if (lessonSourceKind === 'local') meta.append(node('span', '', 'Local lesson · not saved'));
  meta.append(node('span', '', `${presentation.scenes.length} scenes`), node('span', '', 'Data, models & limitations disclosed'));
  intro.append(meta);

  const fragment = document.createDocumentFragment();
  sceneCards = presentation.scenes.map((scene, index) => {
    const card = node('section', 'lesson-scene');
    card.id = `scene-${scene.id}`;
    card.dataset.sceneIndex = index;
    card.setAttribute('aria-label', `Scene ${index + 1}: ${scene.title}`);
    const rail = node('div', 'scene-rail');
    rail.append(node('span', 'scene-number', String(index + 1).padStart(2, '0')));
    const content = node('div', 'scene-copy');
    content.append(markdownFragment(scene.proseMarkdown));
    const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) heading.tabIndex = -1;
    const summary = node('p', 'scene-data-summary', `Stage: ${sceneEntityLabels(scene).join(' · ')}`);
    content.append(summary);
    card.append(rail, content);
    fragment.append(card);
    return card;
  });
  sceneContainer.replaceChildren(fragment);
  renderVisualSelector();
}

function renderVisualSelector() {
  const selector = byId('visual-selector');
  const visuals = [{ id: 'atlas', caption: '3D atlas', alt: 'Interactive 3D atlas' }, ...lesson.visuals];
  selector.hidden = lesson.visuals.length === 0;
  const fragment = document.createDocumentFragment();
  for (const visual of visuals) {
    const button = node('button', '', visual.caption);
    button.type = 'button';
    button.dataset.visualId = visual.id;
    button.title = visual.alt;
    button.setAttribute('aria-pressed', String(visual.id === selectedVisualId));
    button.addEventListener('click', () => {
      const scene = activePresentationScene(navigation.activeIndex);
      showLessonVisual(visual.id, scene.snapshot.visual.layout, { announce: true });
    });
    fragment.append(button);
  }
  selector.replaceChildren(fragment);
}

function showLessonVisual(visualId, layout, { announce = false } = {}) {
  const visual = visualId === 'atlas'
    ? null
    : lesson.visuals.find(({ id }) => id === visualId);
  if (visualId !== 'atlas' && !visual) throw new RangeError(`unknown lesson visual: ${visualId}`);

  selectedVisualId = visualId;
  const surface = byId('visual-surface');
  const atlasSurface = byId('atlas-surface');
  const figure = byId('supplementary-visual');
  surface.dataset.visual = visualId;
  surface.dataset.layout = layout;
  surface.classList.toggle('is-split', Boolean(visual && layout === 'split'));
  atlasSurface.hidden = Boolean(visual && layout !== 'split');
  figure.hidden = !visual;
  byId('stage').hidden = rendererUnavailable;
  byId('stage-fallback').hidden = !rendererUnavailable;

  for (const button of byId('visual-selector').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.visualId === visualId));
  }

  if (visual) {
    const image = byId('supplementary-image');
    const failure = byId('supplementary-image-failure');
    image.alt = visual.alt;
    byId('supplementary-image-alt').textContent = visual.alt;
    byId('supplementary-caption').textContent = visual.caption;
    byId('supplementary-credit').textContent = visual.credit;
    const source = byId('supplementary-source');
    source.href = visual.source;
    image.onload = () => {
      image.hidden = false;
      failure.hidden = true;
      figure.dataset.state = 'loaded';
    };
    image.onerror = () => {
      image.hidden = true;
      failure.hidden = false;
      figure.dataset.state = 'error';
    };
    if (image.dataset.src !== visual.src) {
      image.dataset.src = visual.src;
      image.hidden = false;
      failure.hidden = true;
      figure.dataset.state = 'loading';
      image.src = visual.src;
    }
  }

  if (announce) {
    byId('announcer').textContent = visual ? `Showing lesson visual: ${visual.caption}` : 'Showing interactive 3D atlas';
  }
}

function resetSupplementaryImage() {
  const image = byId('supplementary-image');
  image.onload = null;
  image.onerror = null;
  image.removeAttribute('src');
  delete image.dataset.src;
  image.hidden = false;
  byId('supplementary-image-failure').hidden = true;
  delete byId('supplementary-visual').dataset.state;
}

function retrySupplementaryImage() {
  const visual = lesson.visuals.find(({ id }) => id === selectedVisualId);
  if (!visual) return;
  const image = byId('supplementary-image');
  image.removeAttribute('src');
  delete image.dataset.src;
  showLessonVisual(visual.id, byId('visual-surface').dataset.layout);
}

function bindVisualPresentation() {
  byId('supplementary-image-retry').addEventListener('click', retrySupplementaryImage);
}

function addLabeledStatus(container, label, values, kind) {
  const group = node('div', `fidelity-status fidelity-status-${kind}`);
  group.append(node('span', 'fidelity-status-label', label));
  for (const value of values) group.append(node('span', 'status-chip', value));
  container.append(group);
}

function appendTextList(container, heading, values) {
  if (!values.length) return;
  const section = node('section', 'fidelity-list');
  section.append(node('h4', '', heading));
  const list = document.createElement('ul');
  for (const value of values) list.append(node('li', '', typeof value === 'string' ? value : value.summary));
  section.append(list);
  container.append(section);
}

function appendLinks(container, heading, links) {
  if (!links.length) return;
  const section = node('section', 'fidelity-list');
  section.append(node('h4', '', heading));
  const list = document.createElement('ul');
  for (const link of links) {
    const item = document.createElement('li');
    const anchor = node('a', '', link.label);
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    item.append(anchor);
    list.append(item);
  }
  section.append(list);
  container.append(section);
}

function activePresentationScene(index) {
  return index === -1 ? presentation.entryScene : presentation.scenes[index];
}

function renderFidelity(index) {
  const scene = activePresentationScene(index);
  const model = createFidelityViewModel({
    fidelityIds: scene.fidelityIds,
    entityIds: scene.snapshot.visibility.entities,
  }, catalog);
  const content = byId('fidelity-content');
  const fragment = document.createDocumentFragment();
  const statuses = node('section', 'fidelity-statuses');
  addLabeledStatus(statuses, 'Geometry', model.geometryStatuses, 'geometry');
  addLabeledStatus(statuses, 'Activity', model.activityStatuses, 'activity');
  fragment.append(statuses);

  for (const record of model.records) {
    const details = document.createElement('details');
    details.className = 'fidelity-record';
    const summary = document.createElement('summary');
    summary.append(node('span', 'fidelity-record-title', record.subjects.join(', ') || record.id));
    summary.append(node('span', 'fidelity-record-status', `${record.geometry.statuses.join(' + ')} · ${record.activity.statuses.join(' + ')}`));
    details.append(summary);
    const body = node('div', 'fidelity-record-body');
    body.append(node('p', '', record.geometry.summary), node('p', '', record.activity.summary));
    appendTextList(body, 'What this supports', record.supports);
    appendTextList(body, 'Assumptions', record.assumptions);
    appendTextList(body, 'Uncertainty', record.uncertainties);
    appendTextList(body, 'Material limitations', record.limitations);
    appendLinks(body, 'Sources', record.sources);
    appendLinks(body, 'Licenses', record.licenses);
    body.append(node('p', 'review-date', `Record reviewed ${record.reviewed}`));
    details.append(body);
    fragment.append(details);
  }
  content.replaceChildren(fragment);
}

function updateActivePresentation(index, reason = 'initial') {
  sceneCards.forEach((card, cardIndex) => {
    const active = cardIndex === index;
    card.classList.toggle('is-active', active);
    if (active) card.setAttribute('aria-current', 'step'); else card.removeAttribute('aria-current');
  });
  const scene = activePresentationScene(index);
  showLessonVisual(scene.snapshot.visual.id, scene.snapshot.visual.layout);
  const isEntry = index === -1;
  const count = presentation.scenes.length;
  byId('scene-count').textContent = isEntry ? 'Topic overview' : `Scene ${index + 1} of ${count}`;
  byId('stage-heading').textContent = isEntry ? lesson.title : scene.title;
  byId('scene-position').textContent = isEntry ? 'Scroll to begin' : `Scene ${index + 1} of ${count}`;
  byId('scene-previous').disabled = isEntry;
  byId('scene-next').disabled = index === count - 1;
  byId('stage-fallback').querySelector('#fallback-message').textContent = isEntry
    ? `Topic overview: ${lesson.title}. Scroll to begin the first scene; Model & sources describes the displayed pathway.`
    : `Current scene: ${scene.title}. Refer to the active lesson section and Model & sources for its anatomy and limitations.`;
  renderFidelity(index);
  byId('announcer').textContent = reason === 'initial'
    ? ''
    : (isEntry ? `Topic overview: ${lesson.title}` : `Scene ${index + 1}: ${scene.title}`);
  const fieldset = byId('viewer-controls-fieldset');
  fieldset.disabled = scene.snapshot.controlPolicy.mode !== 'explore' || !controller;
  byId('viewer-policy-note').textContent = fieldset.disabled
    ? 'This lesson scene controls the display. Canvas interaction follows the scene policy.'
    : 'Explore mode: viewer controls are available.';
}

function focusSceneAfterScroll(target) {
  if (reducedMotionQuery.matches) {
    target.focus({ preventScroll: true });
    return;
  }
  let focused = false;
  const focus = () => {
    if (focused) return;
    focused = true;
    target.focus({ preventScroll: true });
  };
  pageScroll.addEventListener('scrollend', focus, { once: true });
  setTimeout(focus, 700);
}

function surfaceClearance() {
  const topbarBottom = document.querySelector('.topbar').getBoundingClientRect().bottom;
  const stageShell = document.querySelector('.stage-shell');
  return getComputedStyle(stageShell).position === 'sticky' && innerWidth <= 980
    ? stageShell.getBoundingClientRect().bottom + 16
    : topbarBottom + 16;
}

function scrollToSurfaceTarget(target) {
  pageScroll.scrollTo({
    top: targetScrollTop({
      scrollTop: pageScroll.scrollTop,
      targetTop: target.getBoundingClientRect().top,
      clearanceTop: surfaceClearance(),
      maxScrollTop: pageScroll.scrollHeight - pageScroll.clientHeight,
    }),
    behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
  });
}

function moveExplicit(delta) {
  const next = moveScene(navigation, delta);
  if (next === navigation) return;
  navigation = next;
  updateActivePresentation(next.activeIndex, next.lastReason);
  if (controller) controller.activate(next.activeIndex, { reason: next.lastReason });
  const destination = next.activeIndex === -1 ? byId('lesson-intro') : sceneCards[next.activeIndex];
  const focusTarget = destination.querySelector('h1, h2, h3, h4, h5, h6') ?? destination;
  scrollToSurfaceTarget(focusTarget);
  focusSceneAfterScroll(focusTarget);
}

function onScroll() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    const surfaceTop = pageScroll.getBoundingClientRect().top;
    const next = updateSceneFromScroll(navigation, {
      anchorTops: relativeAnchorTops(
        sceneCards.map((card) => card.getBoundingClientRect().top),
        surfaceTop,
      ),
      viewportHeight: pageScroll.clientHeight,
      scrollY: pageScroll.scrollTop,
    });
    const changed = next.activeIndex !== navigation.activeIndex;
    navigation = next;
    if (changed) {
      updateActivePresentation(next.activeIndex, next.lastReason);
      if (controller) controller.activate(next.activeIndex, { reason: next.lastReason });
    }
  });
}

function keyboardTargetKind(target) {
  if (!(target instanceof Element)) return 'page';
  if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return 'editable';
  if (target.closest('button, summary')) return 'interactive';
  return 'page';
}

function onPageScrollKey(event) {
  const target = event.target;
  const action = pageScrollKeyAction({
    key: event.key,
    code: event.code,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    targetHasScrollContext: pageScroll.contains(target) || byId('fidelity-panel').contains(target),
    targetKind: keyboardTargetKind(target),
    blocked: disclosureScrollTop !== null,
  });
  if (!action) return;

  event.preventDefault();
  const pageStep = pageScroll.clientHeight * 0.9;
  if (action === 'start') pageScroll.scrollTo({ top: 0, behavior: 'auto' });
  else if (action === 'end') pageScroll.scrollTo({ top: pageScroll.scrollHeight, behavior: 'auto' });
  else pageScroll.scrollBy({
    top: action === 'page-forward' ? pageStep : -pageStep,
    behavior: 'auto',
  });
}

function bindNavigation() {
  byId('scene-previous').addEventListener('click', () => moveExplicit(-1));
  byId('scene-next').addEventListener('click', () => moveExplicit(1));
  byId('scene-skip').addEventListener('click', () => controller?.skip());
  skipLink.addEventListener('click', (event) => {
    event.preventDefault();
    const target = byId('lesson-title') ?? byId('lesson-reader');
    scrollToSurfaceTarget(target);
    focusSceneAfterScroll(target);
  });
  document.querySelector('.brand').addEventListener('click', (event) => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    pageScroll.scrollTo({
      top: 0,
      behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
    });
  });
  pageScroll.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('keydown', onPageScrollKey);
}

function isCompactDisclosure() {
  return compactDisclosureQuery.matches;
}

function lockPageForDisclosure() {
  if (disclosureScrollTop !== null) return;
  disclosureScrollTop = pageScroll.scrollTop;
  app.inert = true;
  skipLink.inert = true;
  pageScroll.style.overflowY = 'hidden';
}

function unlockPageForDisclosure() {
  const restoreTop = disclosureScrollTop;
  disclosureScrollTop = null;
  app.inert = false;
  skipLink.inert = false;
  if (restoreTop === null) return;
  pageScroll.style.removeProperty('overflow-y');
  pageScroll.scrollTop = restoreTop;
}

function syncFidelityMode() {
  const panel = byId('fidelity-panel');
  if (panel.hidden) return;
  if (isCompactDisclosure()) {
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    lockPageForDisclosure();
    if (!panel.contains(document.activeElement)) byId('fidelity-close').focus();
  } else {
    panel.removeAttribute('role');
    panel.removeAttribute('aria-modal');
    unlockPageForDisclosure();
  }
}

function closeFidelity() {
  const panel = byId('fidelity-panel');
  if (panel.hidden) return;
  panel.hidden = true;
  panel.removeAttribute('role');
  panel.removeAttribute('aria-modal');
  unlockPageForDisclosure();
  const trigger = byId('model-sources-trigger');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.focus();
}

function openFidelity() {
  const panel = byId('fidelity-panel');
  panel.hidden = false;
  byId('model-sources-trigger').setAttribute('aria-expanded', 'true');
  syncFidelityMode();
  byId('fidelity-close').focus();
}

function bindFidelity() {
  byId('model-sources-trigger').addEventListener('click', () => {
    if (byId('fidelity-panel').hidden) openFidelity(); else closeFidelity();
  });
  byId('fidelity-close').addEventListener('click', closeFidelity);
  compactDisclosureQuery.addEventListener('change', syncFidelityMode);
  document.addEventListener('keydown', (event) => {
    const panel = byId('fidelity-panel');
    if (panel.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeFidelity();
      return;
    }
    if (event.key !== 'Tab' || !isCompactDisclosure()) return;
    const focusable = [...panel.querySelectorAll('button, summary, a[href]')]
      .filter((element) => {
        if (element.disabled || element.getClientRects().length === 0) return false;
        const details = element.closest('details');
        return !details || details.open || element === details.querySelector(':scope > summary');
      });
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}

function setImportResultState(kind) {
  const result = byId('lesson-import-result');
  result.classList.toggle('is-error', kind === 'error');
  result.classList.toggle('is-valid', kind === 'valid');
  if (kind === 'error') result.setAttribute('role', 'alert');
  else result.removeAttribute('role');
  return result;
}

function renderImportMessage(message) {
  const result = setImportResultState('idle');
  if (result.dataset.message === message) return;
  result.dataset.message = message;
  result.replaceChildren(node('p', '', message));
}

function renderImportDiagnostics(diagnostics) {
  const result = setImportResultState('error');
  delete result.dataset.message;
  const heading = node('h3', '', diagnostics.length === 1 ? 'Lesson needs one correction' : `Lesson needs ${diagnostics.length} corrections`);
  const list = document.createElement('ol');
  list.className = 'import-diagnostics';
  for (const diagnostic of diagnostics) {
    const item = document.createElement('li');
    const location = diagnostic.line > 0
      ? `Line ${diagnostic.line}, column ${diagnostic.column}`
      : 'Lesson source';
    item.append(node('strong', '', `${location}: `), document.createTextNode(diagnostic.message));
    if (diagnostic.path) item.append(document.createTextNode(' '), node('code', '', diagnostic.path));
    list.append(item);
  }
  result.replaceChildren(heading, list);
}

function renderImportSummary(summary) {
  const result = setImportResultState('valid');
  delete result.dataset.message;
  const heading = node('h3', '', 'Lesson is ready to open');
  const details = document.createElement('dl');
  details.className = 'import-summary';
  const rows = [
    ['Title', summary.title],
    ['Status', summary.statusLabel ?? 'No lifecycle claim'],
    ['Scenes', String(summary.sceneCount)],
    ['Images', String(summary.imageCount)],
    ['Image hosts', summary.externalHosts.length ? summary.externalHosts.join(', ') : 'None'],
  ];
  for (const [label, value] of rows) details.append(node('dt', '', label), node('dd', '', value));
  const message = summary.externalHosts.length
    ? `Opening this lesson permits image requests to ${summary.externalHosts.join(', ')}. No referrer is sent.`
    : 'Opening this lesson makes no external image requests.';
  result.replaceChildren(heading, details, node('p', '', message));
}

function invalidateImport(message = 'Changes have not been validated.') {
  lessonImportCandidate = null;
  byId('lesson-import-open').disabled = true;
  renderImportMessage(message);
}

async function loadImportFile() {
  const file = byId('lesson-import-file').files?.[0];
  if (!file) return;
  if (!/\.md$/i.test(file.name)) {
    lessonImportCandidate = null;
    byId('lesson-import-open').disabled = true;
    renderImportDiagnostics([{
      code: 'import.file.type',
      message: 'Choose a .md file. Other local file types are not opened.',
      line: 1,
      column: 1,
      path: '',
    }]);
    return;
  }
  if (file.size > MAX_LESSON_SOURCE_BYTES) {
    lessonImportCandidate = null;
    byId('lesson-import-open').disabled = true;
    renderImportDiagnostics([{
      code: 'import.file.too-large',
      message: 'The selected file exceeds the 512 KiB local import limit and was not read.',
      line: 1,
      column: 1,
      path: '',
    }]);
    return;
  }
  try {
    byId('lesson-import-source').value = await file.text();
    invalidateImport(`${file.name} loaded. Validate the lesson before opening it.`);
  } catch (error) {
    lessonImportCandidate = null;
    byId('lesson-import-open').disabled = true;
    renderImportDiagnostics([{
      code: 'import.file.read',
      message: `The selected file could not be read: ${error.message}`,
      line: 1,
      column: 1,
      path: '',
    }]);
  }
}

function validateImportSource() {
  const result = validateLessonImport(byId('lesson-import-source').value, catalog);
  lessonImportCandidate = result.ok ? result.value : null;
  byId('lesson-import-open').disabled = !result.ok;
  if (result.ok) renderImportSummary(result.value.summary);
  else renderImportDiagnostics(result.diagnostics);
}

function openValidatedImport() {
  if (!lessonImportCandidate) return;
  const candidate = lessonImportCandidate;
  importCloseFocus = 'lesson';
  byId('lesson-import-dialog').close();
  activatePreparedLesson(candidate, { sourceKind: 'local' });
  byId('announcer').textContent = `Opened local lesson: ${candidate.lesson.title}`;
}

function bindLessonImport() {
  const dialog = byId('lesson-import-dialog');
  const trigger = byId('lesson-import-trigger');
  trigger.addEventListener('click', () => {
    if (!byId('fidelity-panel').hidden) closeFidelity();
    importCloseFocus = 'trigger';
    if (!dialog.open) dialog.showModal();
    byId('lesson-import-source').focus();
  });
  byId('lesson-import-close').addEventListener('click', () => dialog.close());
  byId('lesson-import-cancel').addEventListener('click', () => dialog.close());
  byId('lesson-import-source').addEventListener('input', () => invalidateImport());
  byId('lesson-import-file').addEventListener('change', loadImportFile);
  byId('lesson-import-validate').addEventListener('click', validateImportSource);
  byId('lesson-import-open').addEventListener('click', openValidatedImport);
  dialog.addEventListener('close', () => {
    const destination = importCloseFocus;
    importCloseFocus = 'trigger';
    if (destination === 'lesson') {
      requestAnimationFrame(() => (byId('lesson-title') ?? byId('lesson-reader')).focus({ preventScroll: true }));
    } else {
      trigger.focus();
    }
  });
}

function probeWebGL2() {
  if (new URLSearchParams(location.search).has('no-webgl')) return false;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  if (!context) return false;
  context.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
}

function showRendererFallback(message) {
  rendererUnavailable = true;
  byId('stage').hidden = true;
  byId('stage-fallback').hidden = false;
  byId('fallback-message').textContent = message;
  byId('scene-skip').hidden = true;
  byId('scene-skip').disabled = true;
  byId('viewer-controls-fieldset').disabled = true;
  byId('viewer-console').hidden = true;
  document.querySelector('.stage-hint').hidden = true;
  byId('app-status').textContent = lessonSourceKind === 'local'
    ? 'Local lesson · 3D unavailable'
    : 'Lesson ready · 3D unavailable';
  app.dataset.state = 'fallback';
}

function showLessonError(error) {
  console.error(error);
  app.dataset.state = 'error';
  byId('app-status').textContent = 'Lesson unavailable';
  const intro = byId('lesson-intro');
  intro.replaceChildren(node('p', 'eyebrow', 'Lesson error'), node('h1', '', 'This lesson could not be loaded'),
    node('p', '', 'The checked-in lesson or its catalog did not pass validation. No partial scene was activated.'));
  sceneContainer.replaceChildren();
  showRendererFallback('The 3D stage was not started because lesson validation failed.');
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`failed to load ${path}: ${response.status}`);
  return response.json();
}

function exposeLessonDebugState() {
  if (!import.meta.env.DEV) return;
  window.__lesson = {
    get lesson() { return lesson; },
    get presentation() { return presentation; },
    get catalog() { return catalog; },
    get navigation() { return navigation; },
    get controllerState() { return controller?.state ?? null; },
    get sourceKind() { return lessonSourceKind; },
  };
}

function onRendererTransitionStateChange(isTransitioning) {
  const skip = byId('scene-skip');
  skip.hidden = !isTransitioning || reducedMotionQuery.matches;
  skip.disabled = !isTransitioning || reducedMotionQuery.matches;
}

function refreshRendererAdapter() {
  if (!rendererAdapterFactory) return;
  rendererAdapter = rendererAdapterFactory(createLessonRuntimeCatalog(catalog, lesson), {
    onTransitionStateChange: onRendererTransitionStateChange,
  });
}

function createCurrentController() {
  if (!rendererAdapter) {
    controller = null;
    return;
  }
  controller = createLessonSceneController({
    scenes: presentation.scenes,
    entryScene: presentation.entryScene,
    initialIndex: navigation.activeIndex,
    adapter: rendererAdapter,
    reducedMotion: reducedMotionQuery.matches,
    onChange(state) {
      if (state.status === 'error') {
        showRendererFallback('The current 3D scene could not be displayed. The lesson and Model & sources remain available.');
      }
    },
  });
  controller.setReady();
}

function activatePreparedLesson(candidate, { sourceKind = 'reference' } = {}) {
  lessonSourceKind = sourceKind;
  lesson = candidate.lesson;
  presentation = candidate.presentation;
  navigation = createSceneNavigationState(
    presentation.scenes.length,
    presentation.entryScene ? -1 : 0,
  );
  selectedVisualId = activePresentationScene(navigation.activeIndex).snapshot.visual.id;
  resetSupplementaryImage();
  renderLesson();
  refreshRendererAdapter();
  createCurrentController();
  updateActivePresentation(navigation.activeIndex);
  pageScroll.scrollTo({ top: 0, behavior: 'auto' });
  if (app.dataset.state === 'ready') {
    byId('app-status').textContent = sourceKind === 'local' ? 'Local lesson · not saved' : 'Lesson ready';
  } else if (app.dataset.state === 'fallback') {
    byId('app-status').textContent = sourceKind === 'local'
      ? 'Local lesson · 3D unavailable'
      : 'Lesson ready · 3D unavailable';
  }
  exposeLessonDebugState();
}

async function start() {
  try {
    app.dataset.state = 'loading';
    const [entities, fidelity] = await Promise.all([
      fetchJson('/data/entities.json'),
      fetchJson('/data/fidelity.json'),
    ]);
    catalog = createLessonCatalog(entities, fidelity);
    const prepared = validateLessonImport(lessonSource, catalog);
    if (!prepared.ok) throw new Error(`reference lesson failed validation: ${JSON.stringify(prepared.diagnostics)}`);
    activatePreparedLesson(prepared.value);
    bindNavigation();
    bindFidelity();
    bindLessonImport();
    bindVisualPresentation();
    document.body.classList.toggle('reduced-motion', reducedMotionQuery.matches);

    if (!probeWebGL2()) {
      showRendererFallback('WebGL2 is unavailable or was disabled. The complete text lesson and scene-specific Model & sources records remain accessible.');
      return;
    }

    byId('app-status').textContent = 'Loading 3D anatomy…';
    try {
      const renderer = await import('./main.js');
      await renderer.viewerReady;
      rendererUnavailable = false;
      rendererAdapterFactory = renderer.createLessonRendererAdapter;
      refreshRendererAdapter();
      createCurrentController();
      updateActivePresentation(navigation.activeIndex);
      byId('app-status').textContent = lessonSourceKind === 'local' ? 'Local lesson · not saved' : 'Lesson ready';
      app.dataset.state = 'ready';

      reducedMotionQuery.addEventListener('change', ({ matches }) => {
        document.body.classList.toggle('reduced-motion', matches);
        controller?.setReducedMotion(matches);
        updateActivePresentation(navigation.activeIndex);
      });
    } catch (error) {
      rendererAdapter = null;
      rendererAdapterFactory = null;
      console.error('3D renderer failed:', error);
      showRendererFallback('The 3D renderer could not initialize. The complete text lesson and scene-specific Model & sources records remain accessible.');
    }
    exposeLessonDebugState();
  } catch (error) {
    showLessonError(error);
  }
}

start();
