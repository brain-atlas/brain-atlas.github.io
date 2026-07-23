import './style.css';

import { createLessonCatalog } from './lesson/index.js';
import lessonSource from './lessons/retina-to-v1.md?raw';
import { createFidelityViewModel } from './ui/fidelity-view-model.js';
import {
  applyAnatomySelectionIntent,
  availableInspectableIds,
  createAnatomyDetailViewModel,
  createAnatomySelectionState,
} from './ui/anatomy-inspector.js';
import {
  applyExploreCommands,
  createAtlasExploreSnapshot,
  createExplorePanelModel,
  createSceneExploreSnapshot,
  exploreFidelityIds,
} from './ui/explore-session.js';
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
import {
  captureAtlasSnapshot,
  createCheckedLessonEntry,
  createHistoryIntent,
  createLessonResumeToken,
  parseWorkspaceLocation,
  workspaceUrl,
} from './ui/workspace-session.js';

const byId = (id) => document.getElementById(id);
const app = byId('app');
const pageScroll = byId('page-scroll');
const skipLink = document.querySelector('.skip-link');
const sceneContainer = byId('lesson-scenes');
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const compactDisclosureQuery = matchMedia('(max-width: 700px)');
let disclosureScrollTop = null;
let anatomyScrollTop = null;
let anatomySelection = createAnatomySelectionState();
let anatomyAvailableIds = [];
let anatomyAvailabilityKey = '';
let anatomyInvoker = null;
const pageLockOwners = new Set();
let pageLockScrollTop = null;
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
let exitDialogCloseFocus = 'exit';
let referenceCandidate = null;
let activeLessonKey = 'checked:retina-to-v1';
let localLessonSerial = 0;
let historySerial = 0;
let restoringHistory = false;
let pendingWorkspaceNotice = '';
const localCandidatesByKey = new Map();
const inspectionBranchesByKey = new Map();
let sceneCards = [];
let scrollFrame = 0;
let suppressLessonScroll = false;
let cancelSceneFocusSettlement = () => {};
let exploreState = null;
const workspace = {
  phase: 'booting',
  mode: null,
  epoch: 0,
  atlas: { persistentSnapshot: null, activeSnapshot: null, kind: 'global' },
  lesson: { key: null, sourceKind: null, candidate: null, token: null },
};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function setTopbarStatus(message = '') {
  const status = byId('app-status');
  status.textContent = message;
  status.hidden = !message;
}

function setModelStatus(message = '') {
  const status = byId('model-status');
  status.textContent = message;
  status.hidden = !message;
}

function availableSessionKeys() {
  return [...localCandidatesByKey.keys(), ...inspectionBranchesByKey.keys()];
}

function workspaceLocationIntent() {
  return parseWorkspaceLocation({
    search: location.search,
    historyState: history.state,
    checkedIds: ['retina-to-v1'],
    availableSessionKeys: availableSessionKeys(),
  });
}

function writeWorkspaceHistory(mode, {
  checkedLessonId,
  sessionKey,
  replace = false,
  force = false,
} = {}) {
  if (restoringHistory && !force) return;
  const state = createHistoryIntent({
    mode,
    checkedLessonId,
    sessionKey,
    serial: ++historySerial,
  });
  const url = workspaceUrl({
    currentUrl: location.href,
    checkedLessonId: mode === 'lesson' ? (checkedLessonId ?? (sessionKey ? 'local' : undefined)) : undefined,
  });
  history[replace ? 'replaceState' : 'pushState'](state, '', url);
}

function writeCurrentLessonHistory({ replace = false } = {}) {
  if (lessonSourceKind === 'reference') {
    writeWorkspaceHistory('lesson', { checkedLessonId: 'retina-to-v1', replace });
  } else {
    writeWorkspaceHistory('lesson', { sessionKey: activeLessonKey, replace });
  }
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

function renderLessonIdentity() {
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
  skipLink.textContent = 'Skip to lesson';
  skipLink.href = '#lesson-reader';
}

function renderAtlasIdentity() {
  byId('lesson-brand-title').textContent = 'Visual system atlas';
  document.querySelector('.brand').setAttribute('aria-label', 'Brain Atlas home');
  byId('lesson-status').hidden = true;
  document.title = 'Brain Atlas — Explore the human visual system';
  skipLink.textContent = 'Skip to atlas';
  skipLink.href = '#stage';
}

function renderLesson() {
  const statusLabel = presentation.statusLabel;
  renderLessonIdentity();
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

function renderLessonDrawer() {
  if (!referenceCandidate) return;
  const entry = createCheckedLessonEntry({
    id: 'retina-to-v1',
    candidate: referenceCandidate,
    summary: 'Follow visual signals from the retina through early vision and into ventral and dorsal cortical streams.',
  });
  const card = node('article', 'lesson-entry-card');
  card.dataset.lessonId = entry.id;
  const heading = node('h4', '', entry.title);
  const description = node('p', '', entry.summary);
  const meta = node('div', 'lesson-entry-meta');
  if (entry.statusLabel) meta.append(node('span', 'lesson-status', entry.statusLabel));
  meta.append(node('span', '', `${entry.sceneCount} scenes`));
  const resume = workspace.lesson.key === `checked:${entry.id}` && workspace.lesson.token;
  const actions = node('div', 'lesson-entry-actions');
  const action = node('button', '', resume ? 'Resume lesson' : 'Start lesson');
  action.type = 'button';
  action.dataset.startLesson = entry.id;
  action.addEventListener('click', () => openCheckedLesson(entry.id, { resume: Boolean(resume) }));
  actions.append(action);
  if (resume) {
    const restart = node('button', 'secondary', 'Start over');
    restart.type = 'button';
    restart.dataset.restartLesson = entry.id;
    restart.addEventListener('click', () => openCheckedLesson(entry.id, { resume: false }));
    actions.append(restart);
  }
  card.append(heading, description, meta, actions);
  byId('premade-lessons').replaceChildren(card);
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

function titleCaseStatus(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function appendInspectorLinks(container, heading, links, className) {
  if (!links.length) return;
  const section = node('section', `anatomy-inspector-section ${className}`);
  section.append(node('h3', '', heading));
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

function renderAnatomyDetail(id) {
  const model = createAnatomyDetailViewModel(id, catalog);
  const content = byId('anatomy-inspector-content');
  const fragment = document.createDocumentFragment();
  const anatomy = node('section', 'anatomy-inspector-section anatomy-inspector-anatomy');
  anatomy.append(node('h3', '', 'Anatomy'), node('p', '', model.description));
  fragment.append(anatomy);

  if (model.relationships.length) {
    const relationships = node('section', 'anatomy-inspector-section anatomy-inspector-relationships');
    relationships.append(node('h3', '', 'Relationship evidence'));
    const list = document.createElement('ul');
    for (const relationship of model.relationships) {
      const item = document.createElement('li');
      item.append(node('p', '', relationship.summary));
      item.append(node(
        'span',
        'anatomy-relationship-meta',
        `${relationship.labels.direction} · ${relationship.labels.evidence} · ${relationship.labels.status} · ${relationship.labels.confidence} · ${relationship.targetLabel}`,
      ));
      item.append(node('span', 'anatomy-relationship-method', `Method: ${relationship.labels.method}`));
      const sourceList = node('ul', 'anatomy-relationship-sources');
      for (const source of relationship.sources) {
        const sourceItem = document.createElement('li');
        const anchor = node('a', '', source.label);
        anchor.href = source.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        sourceItem.append(anchor);
        sourceList.append(sourceItem);
      }
      item.append(sourceList);
      list.append(item);
    }
    relationships.append(list);
    fragment.append(relationships);
  }

  const shown = node('section', 'anatomy-inspector-section anatomy-inspector-shown');
  shown.append(node('h3', '', 'Shown here'));
  const statuses = node('div', 'fidelity-statuses');
  addLabeledStatus(statuses, 'Geometry', model.geometry.statuses.map(titleCaseStatus), 'geometry');
  addLabeledStatus(statuses, 'Activity', model.activity.statuses.map(titleCaseStatus), 'activity');
  shown.append(statuses, node('p', '', model.geometry.summary), node('p', '', model.activity.summary));
  fragment.append(shown);

  if (model.limitations.length) {
    const limitations = node('section', 'anatomy-inspector-section anatomy-inspector-limitations');
    limitations.append(node('h3', '', 'What not to infer'));
    const list = document.createElement('ul');
    for (const limitation of model.limitations) list.append(node('li', '', limitation.summary));
    limitations.append(list);
    fragment.append(limitations);
  }

  appendInspectorLinks(fragment, 'Anatomy sources', model.anatomySources, 'anatomy-inspector-anatomy-sources');
  appendInspectorLinks(fragment, 'Data and method sources', model.dataSources, 'anatomy-inspector-data-sources');
  appendInspectorLinks(fragment, 'Licenses', model.licenses, 'anatomy-inspector-licenses');
  fragment.append(node('p', 'review-date', `Representation record reviewed ${model.reviewed}`));

  const entityType = catalog.entitiesById[model.entity].type;
  byId('anatomy-inspector-context').textContent = id.startsWith('landmark.')
    ? 'Schematic landmark'
    : ({ region: 'Atlas region', tract: 'Association bundle', layer: 'Atlas layer' }[entityType]
      ?? 'Visual pathway');
  byId('anatomy-inspector-title').textContent = model.label;
  content.replaceChildren(fragment);
}

function lockPageForAnatomy() {
  if (anatomyScrollTop !== null) return;
  anatomyScrollTop = pageScroll.scrollTop;
  acquirePageLock('anatomy-inspector');
  app.inert = true;
  skipLink.inert = true;
}

function unlockPageForAnatomy() {
  const restoreTop = anatomyScrollTop;
  anatomyScrollTop = null;
  app.inert = false;
  skipLink.inert = false;
  releasePageLock('anatomy-inspector');
  if (restoreTop !== null && !exploreState) pageScroll.scrollTop = restoreTop;
}

function syncAnatomyMode() {
  const panel = byId('anatomy-inspector');
  if (panel.hidden) return;
  if (isCompactDisclosure()) {
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    lockPageForAnatomy();
    if (!panel.contains(document.activeElement)) byId('anatomy-inspector-close').focus();
  } else {
    panel.removeAttribute('role');
    panel.removeAttribute('aria-modal');
    unlockPageForAnatomy();
  }
}

function anatomyFallbackInvoker() {
  const preview = byId('anatomy-preview');
  if (!preview.hidden && preview.isConnected) return preview;
  const summary = byId('anatomy-browser').querySelector(':scope > summary');
  return summary.getClientRects().length ? summary : null;
}

function hideAnatomyInspector({ restoreFocus = true } = {}) {
  const panel = byId('anatomy-inspector');
  if (panel.hidden) return;
  panel.hidden = true;
  panel.removeAttribute('role');
  panel.removeAttribute('aria-modal');
  unlockPageForAnatomy();
  if (restoreFocus && anatomyInvoker?.closest('#anatomy-browser')) {
    byId('anatomy-browser').open = true;
  }
  const invoker = anatomyInvoker?.isConnected && anatomyInvoker.getClientRects().length
    ? anatomyInvoker
    : anatomyFallbackInvoker();
  anatomyInvoker = null;
  if (restoreFocus) invoker?.focus({ preventScroll: true });
}

function renderAnatomySelection() {
  const preview = byId('anatomy-preview');
  const inspectable = anatomySelection.previewedId
    ? catalog.inspectablesById[anatomySelection.previewedId]
    : null;
  preview.hidden = !inspectable;
  preview.textContent = inspectable?.shortLabel ?? '';
  if (inspectable) {
    preview.dataset.inspectableId = inspectable.id;
    preview.setAttribute('aria-label', `Open details about ${inspectable.label}`);
  } else {
    delete preview.dataset.inspectableId;
    preview.removeAttribute('aria-label');
  }
  rendererAdapter?.setInspectableHighlight(inspectable?.id ?? null);
}

function openAnatomyInspector(id, invoker) {
  byId('anatomy-browser').open = false;
  if (!byId('fidelity-panel').hidden) closeFidelity({ restoreFocus: false });
  anatomyInvoker = invoker?.isConnected ? invoker : byId('anatomy-preview');
  renderAnatomyDetail(id);
  const panel = byId('anatomy-inspector');
  panel.hidden = false;
  syncAnatomyMode();
  byId('anatomy-inspector-close').focus();
}

function applyAnatomyIntent(intent, { invoker = null, restoreFocusOnClose = false } = {}) {
  if (intent.id && !anatomyAvailableIds.includes(intent.id)) return;
  const previousDetailsId = anatomySelection.detailsId;
  anatomySelection = applyAnatomySelectionIntent(anatomySelection, intent);
  renderAnatomySelection();
  if (anatomySelection.detailsId && anatomySelection.detailsId !== previousDetailsId) {
    openAnatomyInspector(
      anatomySelection.detailsId,
      invoker ?? byId('anatomy-preview'),
    );
  } else if (previousDetailsId && !anatomySelection.detailsId) {
    hideAnatomyInspector({ restoreFocus: restoreFocusOnClose });
  }
}

function closeAnatomyInspector({ restoreFocus = true, clear = false } = {}) {
  anatomySelection = applyAnatomySelectionIntent(
    anatomySelection,
    clear ? { type: 'reset' } : { type: 'close-details' },
  );
  renderAnatomySelection();
  hideAnatomyInspector({ restoreFocus });
}

function resetAnatomyInspector() {
  anatomySelection = applyAnatomySelectionIntent(anatomySelection, { type: 'reset' });
  renderAnatomySelection();
  hideAnatomyInspector({ restoreFocus: false });
}

function renderAnatomyOptions() {
  const key = anatomyAvailableIds.join('|');
  if (key === anatomyAvailabilityKey) return;
  anatomyAvailabilityKey = key;
  const controls = byId('anatomy-controls');
  const browser = byId('anatomy-browser');
  const options = byId('anatomy-options');
  const fragment = document.createDocumentFragment();
  for (const id of anatomyAvailableIds) {
    const inspectable = catalog.inspectablesById[id];
    const button = node('button', '', inspectable.label);
    button.type = 'button';
    button.dataset.inspectableId = id;
    button.addEventListener('focus', () => {
      applyAnatomyIntent({ type: 'preview', id, input: 'focus' });
    });
    button.addEventListener('blur', () => {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!controls.contains(active) && !byId('anatomy-inspector').contains(active)) {
          applyAnatomyIntent({ type: 'clear', input: 'focus' });
        }
      });
    });
    button.addEventListener('click', (event) => {
      applyAnatomyIntent({
        type: 'activate',
        id,
        input: event.detail === 0 ? 'keyboard' : 'pointer',
      }, { invoker: button });
    });
    fragment.append(button);
  }
  options.replaceChildren(fragment);
  browser.hidden = anatomyAvailableIds.length === 0;
  if (browser.hidden) browser.open = false;
}

function syncAnatomyAvailability(snapshot) {
  anatomyAvailableIds = availableInspectableIds(snapshot, catalog);
  const previousDetailsId = anatomySelection.detailsId;
  anatomySelection = applyAnatomySelectionIntent(anatomySelection, {
    type: 'availability',
    ids: anatomyAvailableIds,
  });
  if (previousDetailsId && !anatomySelection.detailsId) {
    hideAnatomyInspector({ restoreFocus: false });
  }
  renderAnatomyOptions();
  renderAnatomySelection();
}

function bindAnatomyInspector() {
  byId('anatomy-preview').addEventListener('click', () => {
    if (!anatomySelection.previewedId) return;
    applyAnatomyIntent({
      type: 'activate',
      id: anatomySelection.previewedId,
      input: 'keyboard',
    }, { invoker: byId('anatomy-preview') });
  });
  byId('anatomy-inspector-close').addEventListener('click', () => closeAnatomyInspector());
  compactDisclosureQuery.addEventListener('change', syncAnatomyMode);
  document.addEventListener('keydown', (event) => {
    const panel = byId('anatomy-inspector');
    if (panel.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeAnatomyInspector();
      return;
    }
    if (event.key !== 'Tab' || !isCompactDisclosure()) return;
    const focusable = [...panel.querySelectorAll('button, a[href]')]
      .filter((element) => !element.disabled && element.getClientRects().length > 0);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}

function activePresentationScene(index) {
  return index === -1 ? presentation.entryScene : presentation.scenes[index];
}

function renderFidelityModel(model) {
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

function renderFidelity(index) {
  const scene = activePresentationScene(index);
  byId('fidelity-context').textContent = 'Current scene';
  renderFidelityModel(createFidelityViewModel({
    fidelityIds: scene.fidelityIds,
    entityIds: scene.snapshot.visibility.entities,
  }, catalog));
}

function updateActivePresentation(index, reason = 'initial') {
  sceneCards.forEach((card, cardIndex) => {
    const active = cardIndex === index;
    card.classList.toggle('is-active', active);
    if (active) card.setAttribute('aria-current', 'step'); else card.removeAttribute('aria-current');
  });
  const scene = activePresentationScene(index);
  syncAnatomyAvailability(scene.snapshot);
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
  cancelSceneFocusSettlement();
  if (reducedMotionQuery.matches) {
    target.focus({ preventScroll: true });
    return;
  }
  let focused = false;
  let timer = 0;
  const cleanup = () => {
    pageScroll.removeEventListener('scrollend', focus);
    clearTimeout(timer);
    if (cancelSceneFocusSettlement === cleanup) cancelSceneFocusSettlement = () => {};
  };
  const focus = () => {
    if (focused) return;
    focused = true;
    cleanup();
    target.focus({ preventScroll: true });
  };
  cancelSceneFocusSettlement = cleanup;
  pageScroll.addEventListener('scrollend', focus, { once: true });
  timer = setTimeout(focus, 700);
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
  if (exploreState) return;
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
  if (exploreState || suppressLessonScroll || scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    if (exploreState) return;
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
    blocked: disclosureScrollTop !== null || Boolean(exploreState),
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
    if (workspace.mode === 'atlas') {
      byId(rendererUnavailable ? 'stage-fallback' : 'stage').focus({ preventScroll: true });
      return;
    }
    const target = byId('lesson-title') ?? byId('lesson-reader');
    scrollToSurfaceTarget(target);
    focusSceneAfterScroll(target);
  });
  document.querySelector('.brand').addEventListener('click', (event) => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    if (workspace.mode === 'lesson') {
      leaveLessonForAtlas(event.currentTarget);
    } else {
      byId('atlas-heading').focus({ preventScroll: true });
    }
  });
  pageScroll.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('keydown', onPageScrollKey);
}

function isCompactDisclosure() {
  return compactDisclosureQuery.matches;
}

function acquirePageLock(owner) {
  if (pageLockOwners.has(owner)) return;
  if (pageLockOwners.size === 0) {
    pageLockScrollTop = pageScroll.scrollTop;
    pageScroll.style.overflowY = 'hidden';
  }
  pageLockOwners.add(owner);
}

function releasePageLock(owner) {
  pageLockOwners.delete(owner);
  if (pageLockOwners.size > 0 || pageLockScrollTop === null) return;
  const restoreTop = pageLockScrollTop;
  pageLockScrollTop = null;
  pageScroll.style.removeProperty('overflow-y');
  pageScroll.scrollTop = restoreTop;
}

function lockPageForDisclosure() {
  if (disclosureScrollTop !== null || exploreState) return;
  disclosureScrollTop = pageScroll.scrollTop;
  acquirePageLock('disclosure');
  app.inert = true;
  skipLink.inert = true;
}

function unlockPageForDisclosure() {
  const restoreTop = disclosureScrollTop;
  disclosureScrollTop = null;
  app.inert = false;
  skipLink.inert = false;
  releasePageLock('disclosure');
  if (restoreTop !== null && !exploreState) pageScroll.scrollTop = restoreTop;
}

function syncFidelityMode() {
  const panel = byId('fidelity-panel');
  if (panel.hidden) return;
  if (isCompactDisclosure() && !exploreState) {
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

function closeFidelity({ restoreFocus = true } = {}) {
  const panel = byId('fidelity-panel');
  if (panel.hidden) return;
  panel.hidden = true;
  panel.removeAttribute('role');
  panel.removeAttribute('aria-modal');
  unlockPageForDisclosure();
  const trigger = byId('model-sources-trigger');
  trigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus) trigger.focus();
}

function openFidelity() {
  if (!byId('anatomy-inspector').hidden) closeAnatomyInspector({ restoreFocus: false });
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
  byId('fidelity-close').addEventListener('click', () => closeFidelity());
  compactDisclosureQuery.addEventListener('change', syncFidelityMode);
  document.addEventListener('keydown', (event) => {
    const panel = byId('fidelity-panel');
    if (panel.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeFidelity();
      return;
    }
    if (event.key !== 'Tab' || !isCompactDisclosure() || exploreState) return;
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
  if (!lessonImportCandidate || workspace.phase === 'switching') return;
  const candidate = lessonImportCandidate;
  const key = `local:${++localLessonSerial}`;
  localCandidatesByKey.clear();
  localCandidatesByKey.set(key, candidate);
  inspectionBranchesByKey.clear();
  importCloseFocus = 'none';
  byId('lesson-import-dialog').close();
  openLessonCandidate(candidate, { key, sourceKind: 'local' });
  byId('announcer').textContent = `Opened local lesson: ${candidate.lesson.title}`;
}

function bindLessonImport() {
  const dialog = byId('lesson-import-dialog');
  const trigger = byId('lesson-import-trigger');
  trigger.addEventListener('click', () => {
    if (workspace.phase === 'switching') return;
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
    } else if (destination === 'trigger') {
      trigger.focus();
    }
  });
}

function bindLessonDrawer() {
  const dialog = byId('lesson-drawer');
  const trigger = byId('lessons-trigger');
  trigger.addEventListener('click', () => {
    if (workspace.mode !== 'atlas' || workspace.phase === 'switching') return;
    renderLessonDrawer();
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => {
      dialog.querySelector('[data-start-lesson]')?.focus();
    });
  });
  byId('lesson-drawer-close').addEventListener('click', () => dialog.close());
  byId('lesson-drawer-open-local').addEventListener('click', () => {
    dialog.close();
    requestAnimationFrame(() => byId('lesson-import-trigger').click());
  });
  dialog.addEventListener('close', () => {
    if (workspace.mode === 'atlas' && document.activeElement === document.body) {
      trigger.focus({ preventScroll: true });
    }
  });
}

function setExploreAvailability(available) {
  const inLesson = workspace.mode === 'lesson';
  const hasLessonSession = workspace.mode === 'atlas' && Boolean(workspace.lesson.token);
  byId('back-to-atlas').hidden = !inLesson;
  byId('explore-scene-trigger').hidden = !available || !inLesson;
  byId('lessons-trigger').hidden = inLesson;
  byId('lesson-import-trigger').hidden = false;
  byId('lesson-session-actions').hidden = !hasLessonSession;
  app.dataset.lessonSession = String(hasLessonSession);
}

function renderExploreFidelity(snapshot, includedFidelityIds) {
  syncAnatomyAvailability(snapshot);
  const fidelityIds = exploreFidelityIds(snapshot, catalog, includedFidelityIds);
  byId('fidelity-context').textContent = 'Visible in Atlas';
  renderFidelityModel(createFidelityViewModel({
    fidelityIds,
    entityIds: snapshot.visibility.entities,
  }, catalog));
}

function moveExploreNode(element, name, mount = byId('atlas-mount')) {
  const rect = element.getBoundingClientRect();
  const placeholder = node('div', `explore-placeholder explore-placeholder-${name}`);
  placeholder.hidden = element.hidden;
  if (!element.hidden) placeholder.style.height = `${rect.height}px`;
  element.replaceWith(placeholder);
  mount.append(element);
  return { element, placeholder };
}

function restoreExploreNodes(homes) {
  for (const { element, placeholder } of homes) placeholder.replaceWith(element);
  byId('atlas-mount').replaceChildren();
}

function applyExploreCommandBatch(commands) {
  if (!exploreState || exploreState.phase !== 'active') return;
  try {
    const next = applyExploreCommands(
      exploreState.snapshot,
      commands,
      rendererAdapter.captureRenderedCamera(),
      catalog,
    );
    rendererAdapter.apply(next);
    rendererAdapter.syncExplorePanel(createExplorePanelModel(next, catalog));
    exploreState.snapshot = next;
    workspace.atlas.activeSnapshot = next;
    if (exploreState.kind === 'global') workspace.atlas.persistentSnapshot = next;
    renderExploreFidelity(next, exploreState.includedFidelityIds);
  } catch (error) {
    failExplore(error);
  }
}

function prepareExploreChrome(kind, scene, canReturn) {
  byId('scene-count').textContent = kind === 'global' ? 'Atlas home' : 'Lesson view in Atlas';
  byId('stage-heading').textContent = kind === 'global' ? 'Complete visual-system atlas' : scene.title;
  byId('explore-scene-trigger').hidden = true;
  byId('scene-skip').hidden = true;
  byId('visual-selector').hidden = true;
  byId('viewer-console').hidden = false;
  byId('viewer-console').open = innerWidth > 980;
  byId('viewer-controls-fieldset').disabled = false;
  byId('viewer-policy-note').textContent = kind === 'global'
    ? 'Atlas workspace: camera, layers, hemispheres, cutaway, tissue, and activity controls are available.'
    : 'Lesson view in Atlas: changes are temporary. Return restores the lesson; Exit resets Atlas Home.';
  document.querySelector('.stage-hint').hidden = false;
  document.querySelector('.stage-hint').textContent = canReturn
    ? 'Drag to orbit · wheel or pinch to zoom · right-drag or two fingers to pan · Return restores the lesson · Exit resets Atlas Home.'
    : 'Drag to orbit · wheel or pinch to zoom · right-drag or two fingers to pan.';
  showLessonVisual('atlas', 'dominant');
}

function prepareInitialAtlasWorkspace() {
  const scene = activePresentationScene(navigation.activeIndex);
  const snapshot = createAtlasExploreSnapshot(catalog);
  exploreState = {
    phase: 'opening',
    kind: 'global',
    origin: 'home',
    trigger: null,
    activeIndex: navigation.activeIndex,
    authoredSnapshot: scene.snapshot,
    includedFidelityIds: [],
    snapshot,
    savedScrollTop: pageScroll.scrollTop,
    viewerWasOpen: byId('viewer-console').open,
    visualSelectorWasHidden: byId('visual-selector').hidden,
    stageHint: document.querySelector('.stage-hint').textContent,
    homes: [
      moveExploreNode(document.querySelector('.stage-shell'), 'stage'),
      moveExploreNode(byId('viewer-console'), 'controls'),
      moveExploreNode(byId('fidelity-panel'), 'fidelity'),
      moveExploreNode(document.querySelector('.site-footer'), 'footer', byId('atlas-project-links')),
    ],
  };
  workspace.mode = 'atlas';
  workspace.atlas.kind = 'global';
  workspace.atlas.activeSnapshot = snapshot;
  workspace.atlas.persistentSnapshot = snapshot;
  pageScroll.hidden = true;
  pageScroll.inert = true;
  byId('atlas-workspace').hidden = false;
  prepareExploreChrome('global', scene, false);
  renderExploreFidelity(snapshot, []);
  renderAtlasIdentity();
  setModelStatus('Loading 3D anatomy…');
  setExploreAvailability(false);
}

function activateInitialAtlasRenderer() {
  const state = exploreState;
  if (!state || state.origin !== 'home') throw new Error('initial Atlas workspace is unavailable');
  rendererAdapter.resizeToStage();
  rendererAdapter.apply(state.snapshot);
  rendererAdapter.beginExploreCamera(state.snapshot.camera, { fitToStage: true });
  rendererAdapter.setExploreCommandHandler(applyExploreCommandBatch);
  rendererAdapter.syncExplorePanel(createExplorePanelModel(state.snapshot, catalog));
  state.phase = 'active';
  workspace.phase = 'atlas';
  setModelStatus();
  setTopbarStatus();
  app.dataset.state = 'ready';
  setExploreAvailability(true);
  byId('announcer').textContent = pendingWorkspaceNotice || 'Atlas workspace ready.';
  pendingWorkspaceNotice = '';
}

function beginExplore(kind, trigger = null) {
  const canReturn = workspace.mode === 'lesson';
  if (exploreState || (!rendererUnavailable && !rendererAdapter) || !['ready', 'fallback'].includes(app.dataset.state)) return;
  const scene = activePresentationScene(navigation.activeIndex);
  const fallbackSnapshot = scene.snapshot;
  const snapshot = kind === 'global'
    ? (workspace.atlas.persistentSnapshot ?? createAtlasExploreSnapshot(catalog))
    : createSceneExploreSnapshot(
      rendererAdapter?.capture() ?? fallbackSnapshot,
      rendererAdapter?.captureRenderedCamera() ?? fallbackSnapshot.camera,
      createLessonRuntimeCatalog(catalog, lesson),
    );
  const savedScrollTop = pageScroll.scrollTop;
  resetAnatomyInspector();
  if (!byId('fidelity-panel').hidden) closeFidelity({ restoreFocus: false });
  cancelSceneFocusSettlement();
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
  pageScroll.scrollTo({ top: savedScrollTop, behavior: 'auto' });

  exploreState = {
    phase: 'opening',
    kind,
    origin: canReturn ? 'lesson' : 'home',
    trigger,
    activeIndex: navigation.activeIndex,
    authoredSnapshot: scene.snapshot,
    includedFidelityIds: kind === 'global' ? [] : scene.fidelityIds,
    snapshot,
    savedScrollTop,
    viewerWasOpen: byId('viewer-console').open,
    visualSelectorWasHidden: byId('visual-selector').hidden,
    stageHint: document.querySelector('.stage-hint').textContent,
    homes: [],
  };
  workspace.phase = 'switching';

  try {
    exploreState.homes.push(moveExploreNode(document.querySelector('.stage-shell'), 'stage'));
    exploreState.homes.push(moveExploreNode(byId('viewer-console'), 'controls'));
    exploreState.homes.push(moveExploreNode(byId('fidelity-panel'), 'fidelity'));
    exploreState.homes.push(moveExploreNode(document.querySelector('.site-footer'), 'footer', byId('atlas-project-links')));
    pageScroll.hidden = true;
    pageScroll.inert = true;
    byId('atlas-workspace').hidden = false;
    rendererAdapter?.resizeToStage();
    prepareExploreChrome(kind, scene, canReturn);
    if (rendererAdapter) {
      rendererAdapter.apply(snapshot);
      rendererAdapter.beginExploreCamera(snapshot.camera, { fitToStage: kind === 'global' });
      rendererAdapter.setExploreCommandHandler(applyExploreCommandBatch);
      rendererAdapter.syncExplorePanel(createExplorePanelModel(snapshot, catalog));
    }
    renderExploreFidelity(snapshot, exploreState.includedFidelityIds);
    exploreState.phase = 'active';
    workspace.phase = 'atlas';
    workspace.mode = 'atlas';
    workspace.atlas.kind = kind;
    workspace.atlas.activeSnapshot = snapshot;
    if (kind === 'global') workspace.atlas.persistentSnapshot = snapshot;
    renderAtlasIdentity();
    setTopbarStatus(canReturn && lessonSourceKind === 'local' ? 'Local lesson · not saved' : '');
    setExploreAvailability(!rendererUnavailable);
    if (canReturn) byId('return-to-lesson').focus({ preventScroll: true });
    byId('announcer').textContent = kind === 'global'
      ? 'Atlas workspace opened with the complete atlas.'
      : `Atlas workspace opened from ${scene.title}.`;
  } catch (error) {
    failExplore(error);
  }
}

function exitExplore() {
  if (!exploreState || exploreState.phase === 'closing' || exploreState.origin !== 'lesson') return;
  const state = exploreState;
  resetAnatomyInspector();
  state.phase = 'closing';
  workspace.phase = 'switching';
  let restoreError = null;
  try {
    if (!byId('fidelity-panel').hidden) closeFidelity({ restoreFocus: false });
    if (state.kind === 'global') {
      workspace.atlas.persistentSnapshot = captureAtlasSnapshot(
        state.snapshot,
        rendererAdapter.captureRenderedCamera(),
        catalog,
      );
    }
    rendererAdapter?.setExploreCommandHandler(null);
    rendererAdapter?.endExplore();
    restoreExploreNodes(state.homes);
    byId('atlas-workspace').hidden = true;
    pageScroll.hidden = false;
    pageScroll.inert = false;
    byId('visual-selector').hidden = state.visualSelectorWasHidden;
    document.querySelector('.stage-hint').textContent = state.stageHint;
    byId('viewer-console').open = state.viewerWasOpen;
    updateActivePresentation(state.activeIndex, 'explore-return');
    renderLessonIdentity();
  } catch (error) {
    restoreError = error;
  } finally {
    suppressLessonScroll = true;
    exploreState = null;
    workspace.phase = restoreError ? 'fallback' : 'lesson';
    workspace.mode = 'lesson';
    pageScroll.scrollTo({ top: state.savedScrollTop, behavior: 'auto' });
    setExploreAvailability(!rendererUnavailable);
    requestAnimationFrame(() => {
      pageScroll.scrollTo({ top: state.savedScrollTop, behavior: 'auto' });
      suppressLessonScroll = false;
      state.trigger?.focus({ preventScroll: true });
    });
  }
  if (restoreError) {
    console.error('Explore return failed:', restoreError);
    showRendererFallback('The 3D renderer could not restore the lesson after Explore. The readable lesson and Model & sources remain available.');
  } else {
    setTopbarStatus(lessonSourceKind === 'local' ? 'Local lesson · not saved' : '');
    byId('announcer').textContent = 'Returned to the authored lesson scene.';
  }
}

function failExplore(error) {
  console.error('Explore mode failed:', error);
  exitExplore();
  showRendererFallback('Explore mode could not display the requested 3D state. The readable lesson and Model & sources remain available.');
}

function showPersistentAtlasState() {
  if (workspace.mode !== 'atlas' || !exploreState) return;
  const snapshot = workspace.atlas.persistentSnapshot ?? createAtlasExploreSnapshot(catalog);
  const scene = activePresentationScene(navigation.activeIndex);
  exploreState.kind = 'global';
  exploreState.snapshot = snapshot;
  exploreState.includedFidelityIds = [];
  workspace.atlas.kind = 'global';
  workspace.atlas.activeSnapshot = snapshot;
  if (rendererAdapter) {
    rendererAdapter.apply(snapshot);
    rendererAdapter.beginExploreCamera(snapshot.camera, { fitToStage: true });
    rendererAdapter.syncExplorePanel(createExplorePanelModel(snapshot, catalog));
  }
  prepareExploreChrome('global', scene, Boolean(workspace.lesson.token));
  renderExploreFidelity(snapshot, []);
  renderAtlasIdentity();
  setExploreAvailability(!rendererUnavailable);
}

function restoreAtlasWithoutHistory() {
  if (workspace.mode === 'lesson') leaveLessonForAtlas(null, { historyAction: 'none' });
  else showPersistentAtlasState();
}

function focusHistoryDestination(id, mode) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (workspace.mode === mode) byId(id)?.focus({ preventScroll: true });
  }));
}

function restoreHistoryIntent(intent) {
  restoringHistory = true;
  try {
    if (byId('lesson-drawer').open) byId('lesson-drawer').close();
    if (byId('lesson-import-dialog').open) byId('lesson-import-dialog').close();
    if (byId('lesson-exit-dialog').open) {
      exitDialogCloseFocus = 'none';
      byId('lesson-exit-dialog').close();
    }
    if (!byId('fidelity-panel').hidden) closeFidelity({ restoreFocus: false });

    if (intent.mode === 'atlas') {
      const derivedFromLesson = workspace.mode === 'lesson';
      restoreAtlasWithoutHistory();
      if (intent.recovery) {
        writeWorkspaceHistory('atlas', { replace: true, force: true });
        byId('announcer').textContent = intent.recovery === 'session-unavailable'
          ? 'The local session was not retained. Returned to Atlas.'
          : 'That checked lesson is unavailable. Returned to Atlas.';
      }
      focusHistoryDestination(
        derivedFromLesson && !intent.recovery ? 'return-to-lesson' : 'atlas-heading',
        'atlas',
      );
      return;
    }
    if (intent.mode === 'lesson') {
      let candidate;
      let key;
      let sourceKind;
      if (intent.sourceKind === 'reference') {
        candidate = referenceCandidate;
        key = `checked:${intent.checkedLessonId}`;
        sourceKind = 'reference';
      } else {
        candidate = localCandidatesByKey.get(intent.sessionKey);
        key = intent.sessionKey;
        sourceKind = 'local';
      }
      if (!candidate) {
        restoreAtlasWithoutHistory();
        writeWorkspaceHistory('atlas', { replace: true, force: true });
        byId('announcer').textContent = 'The local session was not retained. Returned to Atlas.';
        return;
      }
      const token = workspace.lesson.key === key ? workspace.lesson.token : null;
      openLessonCandidate(candidate, {
        key,
        sourceKind,
        resumeToken: token,
        historyAction: 'none',
        focus: false,
      });
      focusHistoryDestination('lesson-title', 'lesson');
      return;
    }
    const branch = inspectionBranchesByKey.get(intent.sessionKey);
    if (!branch) {
      restoreAtlasWithoutHistory();
      writeWorkspaceHistory('atlas', { replace: true, force: true });
      byId('announcer').textContent = 'That scene inspection session is unavailable. Returned to Atlas.';
      return;
    }
    if (workspace.mode === 'lesson') {
      leaveLessonForAtlas(null, { historyAction: 'none' });
    }
    if (exploreState && rendererAdapter) {
      exploreState.kind = 'scene';
      exploreState.snapshot = branch.snapshot;
      workspace.atlas.kind = 'scene';
      workspace.atlas.activeSnapshot = branch.snapshot;
      rendererAdapter.apply(branch.snapshot);
      rendererAdapter.beginExploreCamera(branch.snapshot.camera);
      rendererAdapter.syncExplorePanel(createExplorePanelModel(branch.snapshot, catalog));
      renderExploreFidelity(branch.snapshot, activePresentationScene(branch.lessonToken.activeIndex).fidelityIds);
      focusHistoryDestination('return-to-lesson', 'atlas');
    }
  } finally {
    restoringHistory = false;
  }
}

function bindWorkspaceHistory() {
  addEventListener('popstate', () => restoreHistoryIntent(workspaceLocationIntent()));
}

function exitLessonSession() {
  if (workspace.mode !== 'atlas' || workspace.phase === 'switching'
    || !workspace.lesson.token || !exploreState) return;
  workspace.phase = 'switching';
  workspace.epoch += 1;
  resetAnatomyInspector();
  if (!byId('fidelity-panel').hidden) closeFidelity({ restoreFocus: false });
  if (byId('lesson-drawer').open) byId('lesson-drawer').close();
  if (byId('lesson-import-dialog').open) {
    importCloseFocus = 'none';
    byId('lesson-import-dialog').close();
  }
  cancelSceneFocusSettlement();
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;

  localCandidatesByKey.clear();
  inspectionBranchesByKey.clear();
  workspace.lesson = { key: null, sourceKind: null, candidate: null, token: null };
  const snapshot = createAtlasExploreSnapshot(catalog);
  const scene = activePresentationScene(navigation.activeIndex);
  exploreState.kind = 'global';
  exploreState.origin = 'home';
  exploreState.trigger = null;
  exploreState.includedFidelityIds = [];
  exploreState.snapshot = snapshot;
  workspace.atlas.kind = 'global';
  workspace.atlas.activeSnapshot = snapshot;
  workspace.atlas.persistentSnapshot = snapshot;

  try {
    if (rendererAdapter) {
      rendererAdapter.resizeToStage();
      rendererAdapter.apply(snapshot);
      rendererAdapter.beginExploreCamera(snapshot.camera, { fitToStage: true });
      rendererAdapter.syncExplorePanel(createExplorePanelModel(snapshot, catalog));
    }
    prepareExploreChrome('global', scene, false);
    renderExploreFidelity(snapshot, []);
    renderAtlasIdentity();
    renderLessonDrawer();
    writeWorkspaceHistory('atlas', { replace: true });
    workspace.phase = rendererUnavailable ? 'fallback' : 'atlas';
    setTopbarStatus();
    setExploreAvailability(!rendererUnavailable);
    byId('announcer').textContent = 'Lesson closed. The complete Atlas is ready.';
    focusHistoryDestination(rendererUnavailable ? 'stage-fallback' : 'atlas-heading', 'atlas');
  } catch (error) {
    console.error('Lesson exit failed:', error);
    showRendererFallback('The lesson was closed, but the 3D Atlas could not reset. Atlas sources and lessons remain accessible.');
    focusHistoryDestination('stage-fallback', 'atlas');
  }
}

function requestLessonExit() {
  if (workspace.lesson.sourceKind !== 'local') {
    exitLessonSession();
    return;
  }
  exitDialogCloseFocus = 'exit';
  const dialog = byId('lesson-exit-dialog');
  if (!dialog.open) dialog.showModal();
  byId('lesson-exit-keep').focus();
}

function bindLessonExit() {
  const dialog = byId('lesson-exit-dialog');
  byId('exit-lesson').addEventListener('click', requestLessonExit);
  byId('lesson-exit-keep').addEventListener('click', () => dialog.close());
  byId('lesson-exit-confirm').addEventListener('click', () => {
    exitDialogCloseFocus = 'none';
    dialog.close();
    exitLessonSession();
  });
  dialog.addEventListener('close', () => {
    const destination = exitDialogCloseFocus;
    exitDialogCloseFocus = 'exit';
    if (destination === 'exit' && !byId('lesson-session-actions').hidden) {
      requestAnimationFrame(() => byId('exit-lesson').focus({ preventScroll: true }));
    }
  });
}

function bindExplore() {
  byId('back-to-atlas').addEventListener('click', (event) => leaveLessonForAtlas(event.currentTarget));
  byId('explore-scene-trigger').addEventListener('click', (event) => leaveLessonForAtlas(event.currentTarget));
  byId('return-to-lesson').addEventListener('click', returnToLesson);
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
  if (exploreState?.origin === 'lesson') exitExplore();
  rendererUnavailable = true;
  setExploreAvailability(false);
  byId('stage').hidden = true;
  byId('stage-fallback').hidden = false;
  byId('fallback-message').textContent = message;
  byId('scene-skip').hidden = true;
  byId('scene-skip').disabled = true;
  byId('viewer-controls-fieldset').disabled = true;
  byId('viewer-console').hidden = true;
  document.querySelector('.stage-hint').hidden = true;
  setModelStatus();
  setTopbarStatus(workspace.mode === 'lesson' && lessonSourceKind === 'local' ? 'Local lesson · not saved' : '');
  workspace.phase = 'fallback';
  app.dataset.state = 'fallback';
}

function showLessonError(error) {
  console.error(error);
  app.dataset.state = 'error';
  const intro = byId('lesson-intro');
  intro.replaceChildren(node('p', 'eyebrow', 'Lesson error'), node('h1', '', 'This lesson could not be loaded'),
    node('p', '', 'The checked-in lesson or its catalog did not pass validation. No partial scene was activated.'));
  sceneContainer.replaceChildren();
  showRendererFallback('The 3D stage was not started because lesson validation failed.');
  setTopbarStatus('Lesson unavailable');
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
    get exploreState() {
      return exploreState ? {
        phase: exploreState.phase,
        kind: exploreState.kind,
        snapshot: exploreState.snapshot,
      } : null;
    },
    get sourceKind() { return lessonSourceKind; },
    get workspaceState() {
      return {
        phase: workspace.phase,
        mode: workspace.mode,
        epoch: workspace.epoch,
        atlasKind: workspace.atlas.kind,
        lessonToken: workspace.lesson.token,
        persistentAtlasSnapshot: workspace.atlas.persistentSnapshot,
      };
    },
  };
}

function onRendererTransitionStateChange(isTransitioning) {
  const skip = byId('scene-skip');
  skip.hidden = !isTransitioning || reducedMotionQuery.matches;
  skip.disabled = !isTransitioning || reducedMotionQuery.matches;
}

function refreshRendererAdapter() {
  if (!rendererAdapterFactory) return;
  rendererAdapter?.setAnatomyIntentHandler(null);
  rendererAdapter?.setInspectableHighlight(null);
  rendererAdapter?.setExploreCommandHandler(null);
  rendererAdapter?.endExplore();
  controller = null;
  rendererAdapter = rendererAdapterFactory(createLessonRuntimeCatalog(catalog, lesson), {
    onTransitionStateChange: onRendererTransitionStateChange,
  });
  rendererAdapter.setAnatomyIntentHandler((intent) => applyAnatomyIntent(intent));
  rendererAdapter.setInspectableHighlight(anatomySelection.previewedId);
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

function captureCurrentLessonToken() {
  const scene = activePresentationScene(navigation.activeIndex);
  const runtimeCatalog = createLessonRuntimeCatalog(catalog, lesson);
  const snapshot = rendererAdapter?.capture() ?? scene.snapshot;
  const renderedCamera = rendererAdapter?.captureRenderedCamera() ?? {
    position: snapshot.camera.position,
    target: snapshot.camera.target,
  };
  return createLessonResumeToken({
    lessonKey: activeLessonKey,
    sourceKind: lessonSourceKind,
    activeIndex: navigation.activeIndex,
    sceneCount: presentation.scenes.length,
    hasEntryScene: Boolean(presentation.entryScene),
    scrollTop: pageScroll.scrollTop,
    selectedVisualId,
    snapshot,
    renderedCamera,
    focusTarget: 'back-to-atlas',
  }, runtimeCatalog);
}

function restoreLessonSurfaceHomes(state) {
  rendererAdapter?.setExploreCommandHandler(null);
  rendererAdapter?.endExplore();
  restoreExploreNodes(state.homes);
  byId('atlas-workspace').hidden = true;
  pageScroll.hidden = false;
  pageScroll.inert = false;
  rendererAdapter?.resizeToStage();
  byId('visual-selector').hidden = state.visualSelectorWasHidden;
  document.querySelector('.stage-hint').textContent = state.stageHint;
  byId('viewer-console').open = state.viewerWasOpen;
}

function openLessonCandidate(candidate, {
  key,
  sourceKind,
  resumeToken = null,
  focus = true,
  historyAction = 'push',
} = {}) {
  if (!candidate || workspace.phase === 'switching') return;
  workspace.phase = 'switching';
  workspace.epoch += 1;
  const epoch = workspace.epoch;
  const atlasState = exploreState;
  try {
    if (workspace.mode === 'atlas' && atlasState) {
      if (rendererAdapter && atlasState.kind === 'global') {
        workspace.atlas.persistentSnapshot = captureAtlasSnapshot(
          atlasState.snapshot,
          rendererAdapter.captureRenderedCamera(),
          catalog,
        );
      }
      if (!byId('fidelity-panel').hidden) closeFidelity({ restoreFocus: false });
      restoreLessonSurfaceHomes(atlasState);
      exploreState = null;
    }
    activeLessonKey = key;
    workspace.mode = 'lesson';
    workspace.lesson = { key, sourceKind, candidate, token: resumeToken };
    activatePreparedLesson(candidate, {
      sourceKind,
      initialIndex: resumeToken?.activeIndex ?? null,
      resumeToken,
    });
    workspace.phase = app.dataset.state === 'fallback' ? 'fallback' : 'lesson';
    if (historyAction !== 'none') writeCurrentLessonHistory({ replace: historyAction === 'replace' });
    setExploreAvailability(!rendererUnavailable);
    renderLessonDrawer();
    const restoreTop = resumeToken?.scrollTop ?? 0;
    suppressLessonScroll = true;
    requestAnimationFrame(() => {
      if (workspace.epoch !== epoch || workspace.mode !== 'lesson') return;
      pageScroll.scrollTo({ top: restoreTop, behavior: 'auto' });
      requestAnimationFrame(() => {
        if (workspace.epoch !== epoch || workspace.mode !== 'lesson') return;
        pageScroll.scrollTo({ top: restoreTop, behavior: 'auto' });
        suppressLessonScroll = false;
        if (focus) byId('back-to-atlas').focus({ preventScroll: true });
      });
    });
    byId('announcer').textContent = resumeToken
      ? `Returned to ${candidate.lesson.title}.`
      : `Opened lesson: ${candidate.lesson.title}.`;
  } catch (error) {
    suppressLessonScroll = false;
    console.error('Lesson workspace activation failed:', error);
    showRendererFallback('The lesson could not activate the 3D stage. Its readable content and Model & sources remain available.');
  }
}

function openCheckedLesson(id, { resume = false } = {}) {
  if (id !== 'retina-to-v1' || !referenceCandidate) return;
  if (byId('lesson-drawer').open) byId('lesson-drawer').close();
  const token = resume && workspace.lesson.key === `checked:${id}` ? workspace.lesson.token : null;
  if (!token) {
    localCandidatesByKey.clear();
    inspectionBranchesByKey.clear();
  }
  openLessonCandidate(referenceCandidate, {
    key: `checked:${id}`,
    sourceKind: 'reference',
    resumeToken: token,
  });
}

function leaveLessonForAtlas(trigger, { historyAction = 'push' } = {}) {
  if (workspace.mode !== 'lesson' || workspace.phase === 'switching') return;
  workspace.lesson = {
    key: activeLessonKey,
    sourceKind: lessonSourceKind,
    candidate: workspace.lesson.candidate,
    token: captureCurrentLessonToken(),
  };
  const position = navigation.activeIndex === -1
    ? 'Topic overview'
    : `Scene ${navigation.activeIndex + 1}`;
  const returnAction = byId('return-to-lesson');
  const returnLabel = `Return to ${lesson.title}, ${position}`;
  returnAction.textContent = 'Return to lesson';
  returnAction.setAttribute('aria-label', returnLabel);
  returnAction.title = returnLabel;
  const exitAction = byId('exit-lesson');
  exitAction.title = lessonSourceKind === 'local'
    ? 'Exit this unsaved local lesson and reset the Atlas'
    : 'Exit this lesson and reset the Atlas';
  exitAction.toggleAttribute('aria-haspopup', lessonSourceKind === 'local');
  renderLessonDrawer();
  beginExplore('scene', trigger);
  if (workspace.mode === 'atlas' && historyAction !== 'none') {
    const sessionKey = `inspect:${++localLessonSerial}`;
    inspectionBranchesByKey.clear();
    inspectionBranchesByKey.set(sessionKey, {
      lessonKey: workspace.lesson.key,
      snapshot: exploreState.snapshot,
      lessonToken: workspace.lesson.token,
    });
    writeWorkspaceHistory('inspect', { sessionKey, replace: historyAction === 'replace' });
  }
}

function returnToLesson({ historyAction = 'push' } = {}) {
  const state = exploreState;
  const session = workspace.lesson;
  if (!state || state.origin !== 'lesson' || !session?.candidate || !session.token) return;
  if (rendererAdapter && state.kind === 'global') {
    workspace.atlas.persistentSnapshot = captureAtlasSnapshot(
      state.snapshot,
      rendererAdapter.captureRenderedCamera(),
      catalog,
    );
  }
  restoreLessonSurfaceHomes(state);
  exploreState = null;
  workspace.mode = 'lesson';
  openLessonCandidate(session.candidate, {
    key: session.key,
    sourceKind: session.sourceKind,
    resumeToken: session.token,
    historyAction,
  });
}

function activatePreparedLesson(candidate, {
  sourceKind = 'reference',
  initialIndex = null,
  resumeToken = null,
} = {}) {
  resetAnatomyInspector();
  lessonSourceKind = sourceKind;
  lesson = candidate.lesson;
  presentation = candidate.presentation;
  const startIndex = initialIndex ?? (presentation.entryScene ? -1 : 0);
  const resumeVisualId = resumeToken?.selectedVisualId ?? null;
  navigation = createSceneNavigationState(presentation.scenes.length, startIndex);
  selectedVisualId = resumeVisualId
    ?? activePresentationScene(navigation.activeIndex).snapshot.visual.id;
  resetSupplementaryImage();
  renderLesson();
  refreshRendererAdapter();
  createCurrentController();
  updateActivePresentation(navigation.activeIndex, resumeToken ? 'workspace-resume' : 'initial');
  if (resumeToken && controller) {
    controller.restore(resumeToken.snapshot, { reason: 'workspace-resume' });
    syncAnatomyAvailability(resumeToken.snapshot);
    const scene = activePresentationScene(navigation.activeIndex);
    showLessonVisual(resumeVisualId, scene.snapshot.visual.layout);
  }
  if (rendererAdapter) {
    const panelSnapshot = resumeToken?.snapshot ?? activePresentationScene(navigation.activeIndex).snapshot;
    const runtimeCatalog = createLessonRuntimeCatalog(catalog, lesson);
    rendererAdapter.syncExplorePanel(createExplorePanelModel(panelSnapshot, runtimeCatalog));
    rendererAdapter.endExplore();
  }
  const scrollTop = resumeToken?.scrollTop ?? 0;
  pageScroll.scrollTo({ top: scrollTop, behavior: 'auto' });
  if (['ready', 'fallback'].includes(app.dataset.state)) {
    setTopbarStatus(sourceKind === 'local' ? 'Local lesson · not saved' : '');
  }
  exposeLessonDebugState();
}

async function start() {
  try {
    app.dataset.state = 'loading';
    setTopbarStatus();
    setModelStatus('Loading atlas data…');
    const [entities, fidelity, fibreFilterPresets] = await Promise.all([
      fetchJson('/data/entities.json'),
      fetchJson('/data/fidelity.json'),
      fetchJson('/data/fibre_filter_presets.json'),
    ]);
    catalog = createLessonCatalog(entities, fidelity, fibreFilterPresets);
    const prepared = validateLessonImport(lessonSource, catalog);
    if (!prepared.ok) throw new Error(`reference lesson failed validation: ${JSON.stringify(prepared.diagnostics)}`);
    referenceCandidate = prepared.value;
    activatePreparedLesson(referenceCandidate);
    bindNavigation();
    bindFidelity();
    bindAnatomyInspector();
    bindLessonImport();
    bindLessonDrawer();
    bindVisualPresentation();
    bindExplore();
    bindLessonExit();
    bindWorkspaceHistory();
    document.body.classList.toggle('reduced-motion', reducedMotionQuery.matches);
    historySerial = Number.isInteger(history.state?.serial) ? history.state.serial : 0;
    const initialIntent = workspaceLocationIntent();
    if (initialIntent.mode === 'lesson' && initialIntent.sourceKind === 'reference') {
      activeLessonKey = `checked:${initialIntent.checkedLessonId}`;
      workspace.mode = 'lesson';
      workspace.lesson = {
        key: activeLessonKey,
        sourceKind: 'reference',
        candidate: referenceCandidate,
        token: null,
      };
      workspace.phase = 'booting';
      pageScroll.hidden = false;
      pageScroll.inert = false;
      byId('atlas-workspace').hidden = true;
      writeWorkspaceHistory('lesson', {
        checkedLessonId: initialIntent.checkedLessonId,
        replace: true,
      });
      setExploreAvailability(false);
    } else {
      prepareInitialAtlasWorkspace();
      writeWorkspaceHistory('atlas', { replace: true });
      if (initialIntent.recovery) {
        pendingWorkspaceNotice = initialIntent.recovery === 'session-unavailable'
          ? 'The local session was not retained after reload. Returned to Atlas.'
          : 'That checked lesson is unavailable. Returned to Atlas.';
        byId('announcer').textContent = pendingWorkspaceNotice;
      }
    }

    if (!probeWebGL2()) {
      showRendererFallback('WebGL2 is unavailable or was disabled. Atlas sources, lessons, local import, and readable scene content remain accessible.');
      return;
    }

    setModelStatus('Loading 3D anatomy…');
    try {
      const renderer = await import('./main.js');
      await renderer.viewerReady;
      rendererUnavailable = false;
      rendererAdapterFactory = renderer.createLessonRendererAdapter;
      refreshRendererAdapter();
      if (workspace.mode === 'atlas') {
        activateInitialAtlasRenderer();
      } else {
        createCurrentController();
        updateActivePresentation(navigation.activeIndex);
        workspace.phase = 'lesson';
        setModelStatus();
        setTopbarStatus(lessonSourceKind === 'local' ? 'Local lesson · not saved' : '');
        app.dataset.state = 'ready';
        setExploreAvailability(true);
      }

      reducedMotionQuery.addEventListener('change', ({ matches }) => {
        document.body.classList.toggle('reduced-motion', matches);
        if (workspace.mode === 'atlas' && exploreState?.phase === 'active') {
          rendererAdapter.apply(exploreState.snapshot);
          rendererAdapter.syncExplorePanel(createExplorePanelModel(exploreState.snapshot, catalog));
          return;
        }
        controller?.setReducedMotion(matches);
        updateActivePresentation(navigation.activeIndex);
      });
    } catch (error) {
      rendererAdapter = null;
      rendererAdapterFactory = null;
      console.error('3D renderer failed:', error);
      showRendererFallback('The 3D renderer could not initialize. Atlas sources, lessons, local import, and readable scene content remain accessible.');
    }
    exposeLessonDebugState();
  } catch (error) {
    showLessonError(error);
  }
}

start();
