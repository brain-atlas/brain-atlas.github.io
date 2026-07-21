import './style.css';

import { createLessonCatalog, parseLesson } from './lesson/index.js';
import lessonSource from './lessons/retina-to-v1.md?raw';
import { createFidelityViewModel } from './ui/fidelity-view-model.js';
import { createLessonSceneController } from './ui/lesson-scene-controller.js';
import { createLessonPresentation } from './ui/lesson-presentation.js';
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
let sceneCards = [];
let scrollFrame = 0;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
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
      const element = document.createElement('img');
      element.src = model.url;
      element.alt = model.alt;
      if (model.title) element.title = model.title;
      element.loading = 'lazy';
      return element;
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

function probeWebGL2() {
  if (new URLSearchParams(location.search).has('no-webgl')) return false;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  if (!context) return false;
  context.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
}

function showRendererFallback(message) {
  byId('stage').hidden = true;
  byId('stage-fallback').hidden = false;
  byId('fallback-message').textContent = message;
  byId('scene-skip').hidden = true;
  byId('scene-skip').disabled = true;
  byId('viewer-controls-fieldset').disabled = true;
  byId('viewer-console').hidden = true;
  document.querySelector('.stage-hint').hidden = true;
  byId('app-status').textContent = 'Lesson ready · 3D unavailable';
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

async function start() {
  try {
    app.dataset.state = 'loading';
    const [entities, fidelity] = await Promise.all([
      fetchJson('/data/entities.json'),
      fetchJson('/data/fidelity.json'),
    ]);
    catalog = createLessonCatalog(entities, fidelity);
    const parsed = parseLesson(lessonSource, catalog);
    if (!parsed.ok) throw new Error(`reference lesson failed validation: ${JSON.stringify(parsed.diagnostics)}`);
    lesson = parsed.value;
    presentation = createLessonPresentation(lesson);
    navigation = createSceneNavigationState(
      presentation.scenes.length,
      presentation.entryScene ? -1 : 0,
    );
    renderLesson();
    bindNavigation();
    bindFidelity();
    updateActivePresentation(navigation.activeIndex);
    document.body.classList.toggle('reduced-motion', reducedMotionQuery.matches);

    if (!probeWebGL2()) {
      showRendererFallback('WebGL2 is unavailable or was disabled. The complete text lesson and scene-specific Model & sources records remain accessible.');
      return;
    }

    byId('app-status').textContent = 'Loading 3D anatomy…';
    try {
      const renderer = await import('./main.js');
      await renderer.viewerReady;
      const adapter = renderer.createLessonRendererAdapter(catalog, {
        onTransitionStateChange(isTransitioning) {
          const skip = byId('scene-skip');
          skip.hidden = !isTransitioning || reducedMotionQuery.matches;
          skip.disabled = !isTransitioning || reducedMotionQuery.matches;
        },
      });
      controller = createLessonSceneController({
        scenes: presentation.scenes,
        entryScene: presentation.entryScene,
        initialIndex: navigation.activeIndex,
        adapter,
        reducedMotion: reducedMotionQuery.matches,
        onChange(state) {
          if (state.status === 'error') {
            showRendererFallback('The current 3D scene could not be displayed. The lesson and Model & sources remain available.');
          }
        },
      });
      controller.setReady();
      updateActivePresentation(navigation.activeIndex);
      byId('app-status').textContent = 'Lesson ready';
      updateActivePresentation(navigation.activeIndex);
      app.dataset.state = 'ready';

      reducedMotionQuery.addEventListener('change', ({ matches }) => {
        document.body.classList.toggle('reduced-motion', matches);
        controller.setReducedMotion(matches);
        updateActivePresentation(navigation.activeIndex);
      });
    } catch (error) {
      console.error('3D renderer failed:', error);
      showRendererFallback('The 3D renderer could not initialize. The complete text lesson and scene-specific Model & sources records remain accessible.');
    }

    if (import.meta.env.DEV) {
      window.__lesson = {
        lesson,
        presentation,
        catalog,
        get navigation() { return navigation; },
        get controllerState() { return controller?.state ?? null; },
      };
    }
  } catch (error) {
    showLessonError(error);
  }
}

start();
