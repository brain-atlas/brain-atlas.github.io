const { test, expect } = require('@playwright/test');
const fs = require('fs');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';
const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

function monitor(page) {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function waitForQuietRequests(page, active, quietMs = 400) {
  for (;;) {
    await page.waitForTimeout(quietMs);
    if (active.size === 0) return;
  }
}

async function seriousAccessibilityViolations(page) {
  await page.waitForTimeout(200); // Audit the settled CSS state, not the initial 150 ms control transition.
  await page.evaluate(AXE_SOURCE);
  return page.evaluate(async () => {
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    });
    return result.violations
      .filter(({ impact }) => impact === 'serious' || impact === 'critical')
      .map(({ id, impact, help, nodes }) => ({
        id,
        impact,
        help,
        targets: nodes.map(({ target }) => target),
      }));
  });
}

test('compact workspaces and modal surfaces pass serious automated accessibility checks', async ({ page }) => { // Tests INV-9, INV-10, INV-30, INV-42
  const errors = monitor(page);
  const audits = {};
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  audits.atlas = await seriousAccessibilityViolations(page);

  await page.locator('#lessons-trigger').click();
  audits.drawer = await seriousAccessibilityViolations(page);
  await page.keyboard.press('Escape');
  await page.locator('#lesson-import-trigger').click();
  audits.import = await seriousAccessibilityViolations(page);
  await page.keyboard.press('Escape');

  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  audits.lesson = await seriousAccessibilityViolations(page);
  await page.locator('#model-sources-trigger').click();
  audits.modelSources = await seriousAccessibilityViolations(page);
  await expect(page.locator('#fidelity-panel')).toContainText(
    'Event rates, rhythms, bursts, time dilation, the common 40 MNI mm/display-second speed at activity speed 70, and playback scaling are illustrative rather than measured LGN or V1 physiology or universal axonal conduction velocity.',
  );
  await page.locator('#fidelity-close').click();

  await page.locator('#anatomy-browser').evaluate(element => { element.open = true; });
  await page.locator('#anatomy-options [data-inspectable-id="region.lgn"]').evaluate(element => element.click());
  audits.anatomyInspector = await seriousAccessibilityViolations(page);

  await page.goto(new URL('?no-webgl=1&lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'fallback');
  audits.noWebglLesson = await seriousAccessibilityViolations(page);

  expect(audits).toEqual({
    atlas: [],
    drawer: [],
    import: [],
    lesson: [],
    modelSources: [],
    anatomyInspector: [],
    noWebglLesson: [],
  });
  expect(errors).toEqual([]);
});

test('inactive lesson prose retains full text opacity', async ({ page }) => { // Tests INV-50
  const errors = monitor(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');

  const inactiveSceneOpacity = await page.locator('.lesson-scene:not(.is-active)').first()
    .evaluate(element => Number.parseFloat(getComputedStyle(element).opacity));
  expect(inactiveSceneOpacity).toBe(1);
  expect(errors).toEqual([]);
});

test('reduced motion suppresses spatial travel without erasing state feedback', async ({ page }) => { // Tests INV-53, FAIL-46
  const errors = monitor(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');

  const motion = await page.evaluate(() => {
    const reducedSelectors = [];
    const visit = (rules, inReducedMotion = false) => {
      for (const rule of rules) {
        const reduced = inReducedMotion || (
          rule instanceof CSSMediaRule
          && rule.conditionText.includes('prefers-reduced-motion')
          && rule.conditionText.includes('reduce')
        );
        if (reduced && rule.selectorText) reducedSelectors.push(rule.selectorText);
        if ('cssRules' in rule && rule.cssRules.length) visit(rule.cssRules, reduced);
      }
    };
    const feedbackTransitions = (element) => {
      const style = getComputedStyle(element);
      const properties = style.transitionProperty.split(',').map((value) => value.trim());
      const durations = style.transitionDuration.split(',').map((value) => parseFloat(value));
      return Object.fromEntries(properties.map((property, index) => [property, durations[index % durations.length]]));
    };
    for (const sheet of document.styleSheets) visit(sheet.cssRules);
    return {
      reducedSelectors,
      scrollBehavior: getComputedStyle(document.getElementById('page-scroll')).scrollBehavior,
      sceneTransitions: feedbackTransitions(document.querySelector('.scene-number')),
      buttonTransitions: feedbackTransitions(document.getElementById('back-to-atlas')),
    };
  });

  expect(motion.reducedSelectors).toEqual(['.page-scroll']);
  expect(motion.scrollBehavior).toBe('auto');
  for (const transitions of [motion.sceneTransitions, motion.buttonTransitions]) {
    for (const property of ['color', 'border-color', 'background']) {
      expect(transitions[property]).toBeGreaterThanOrEqual(0.15);
    }
  }
  await expect(page.locator('#play')).toBeDisabled();
  expect(await page.evaluate(() => window.__view.activity.state.playing)).toBe(false);
  expect(errors).toEqual([]);
});

test('interface colors resolve through semantic root theme tokens', async ({ page }) => { // Tests INV-54, FAIL-47
  const errors = monitor(page);
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');

  const theme = await page.evaluate(() => {
    const readableSheets = [...document.styleSheets].flatMap((sheet) => {
      try { return [{ sheet, rules: sheet.cssRules }]; } catch { return []; }
    });
    const themed = readableSheets.find(({ sheet }) => sheet.ownerNode?.dataset?.viteDevId?.endsWith('/src/style.css'))
      ?? readableSheets.find(({ rules }) => [...rules].some((rule) => (
        rule instanceof CSSStyleRule
        && rule.selectorText === ':root'
        && rule.style.getPropertyValue('--bg')
      )));
    if (!themed) return { literals: [{ selector: 'missing', property: 'theme', value: 'src/style.css' }], tokens: {} };

    const literals = [];
    const literalColor = /(?:#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\s*\(|\btransparent\b)/i;
    const visit = (rules) => {
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) {
          for (const property of rule.style) {
            if (rule.selectorText === ':root' && property.startsWith('--')) continue;
            const value = rule.style.getPropertyValue(property);
            const unthemed = value.replace(/--[a-z0-9_-]+/gi, '');
            const colorBearing = /(?:^|-)color$|^background(?:-|$)|^border(?:-|$)|^outline(?:-|$)|shadow$|^(?:fill|stroke|filter)$|^text-decoration(?:-|$)|^column-rule(?:-|$)/.test(property);
            const namedColor = (colorBearing || property.startsWith('--')) && (unthemed.match(/\b[a-z][a-z0-9-]*\b/gi) ?? [])
              .some((token) => !['currentcolor', 'inherit', 'initial', 'unset', 'revert'].includes(token.toLowerCase())
                && CSS.supports('color', token));
            if (literalColor.test(unthemed) || namedColor) {
              literals.push({ selector: rule.selectorText, property, value });
            }
          }
        }
        if ('cssRules' in rule && rule.cssRules.length) visit(rule.cssRules);
      }
    };
    visit(themed.rules);
    const rootRule = [...themed.rules].find((rule) => rule instanceof CSSStyleRule && rule.selectorText === ':root');
    const required = [
      '--text-on-accent', '--text-accent', '--surface-panel', '--surface-overlay', '--surface-clear',
      '--control-surface', '--accent-border', '--danger-border', '--backdrop', '--shadow-color',
      '--fallback-surface-start', '--fallback-surface-end', '--image-fallback-start', '--image-fallback-end',
    ];
    return {
      literals,
      tokens: Object.fromEntries(required.map((name) => [name, rootRule.style.getPropertyValue(name).trim()])),
    };
  });

  expect(theme.literals).toEqual([]);
  expect(Object.values(theme.tokens).every(Boolean)).toBe(true);
  expect(errors).toEqual([]);
});

test('retained layer controls expose entity-specific keyboard toggles', async ({ page }) => { // Tests INV-50
  const errors = monitor(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  if (!await page.locator('#viewer-console').getAttribute('open')) {
    await page.locator('#viewer-console > summary').click();
  }
  await page.locator('.lyr-disclosure').first().click();
  const row = page.locator('.lyr-kids .lyr-child').first();
  const entityName = (await row.locator('.lyr-t').textContent()).trim();
  const hemispheres = row.locator('.pill');
  await expect(hemispheres.nth(0)).toHaveAttribute('aria-label', `Show left hemisphere for ${entityName}`);
  await expect(hemispheres.nth(1)).toHaveAttribute('aria-label', `Show right hemisphere for ${entityName}`);

  const entityToggle = row.locator('button.lyr-t');
  await expect(entityToggle).toHaveAttribute('aria-label', `Show ${entityName} in both hemispheres`);
  await expect(entityToggle).toHaveAttribute('aria-pressed', 'true');
  await entityToggle.focus();
  await page.keyboard.press('Enter');
  await expect(entityToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(hemispheres.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await expect(hemispheres.nth(1)).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('compact keyboard journey preserves modal containment, announcements, and reciprocal focus', async ({ page }) => { // Tests INV-10, INV-22, INV-30, INV-41, INV-42
  const errors = monitor(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');

  await page.locator('#lessons-trigger').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#lesson-drawer')).toBeVisible();
  await expect(page.locator('[data-start-lesson="retina-to-v1"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#back-to-atlas')).toBeFocused();
  await expect(page.locator('#announcer')).toContainText('Opened lesson');

  await page.locator('#model-sources-trigger').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#fidelity-panel')).toHaveAttribute('role', 'dialog');
  await expect(page.locator('#fidelity-panel')).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('#fidelity-close')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.getElementById('fidelity-panel').contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.locator('#fidelity-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#model-sources-trigger')).toBeFocused();

  const anatomySummary = page.locator('#anatomy-browser > summary');
  await anatomySummary.focus();
  await page.keyboard.press('Enter');
  const lgn = page.locator('#anatomy-options [data-inspectable-id="region.lgn"]');
  await lgn.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#anatomy-inspector')).toHaveAttribute('role', 'dialog');
  await expect(page.locator('#anatomy-inspector-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(lgn).toBeFocused();

  await page.locator('#back-to-atlas').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#return-to-lesson')).toBeFocused();
  await expect(page.locator('#announcer')).toContainText('Atlas workspace opened from');
  await page.keyboard.press('Enter');
  await expect(page.locator('#back-to-atlas')).toBeFocused();
  await expect(page.locator('#announcer')).toContainText('Returned to Early Vision');
  expect(errors).toEqual([]);
});

test('compact Atlas keeps every semantic camera action at least 44 CSS pixels high', async ({ page }) => { // Tests INV-23
  const errors = monitor(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  if (!await page.locator('#viewer-console').getAttribute('open')) {
    await page.locator('#viewer-console > summary').click();
  }

  const actions = await page.locator('#viewer-console [data-view], #viewer-console [data-explore-camera], #reset')
    .evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => ({
      name: element.textContent.trim(),
      height: element.getBoundingClientRect().height,
    })));
  expect(actions.length).toBeGreaterThan(0);
  expect(actions.every(({ height }) => height >= 44)).toBe(true);
  expect(errors).toEqual([]);
});

test('compact Atlas exposes 44 CSS pixel effective Viewer targets', async ({ page }) => { // Tests INV-52
  const errors = monitor(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  if (!await page.locator('#viewer-console').getAttribute('open')) {
    await page.locator('#viewer-console > summary').click();
  }
  await page.locator('.lyr-disclosure[aria-expanded="false"]')
    .evaluateAll((disclosures) => disclosures.forEach((disclosure) => disclosure.click()));

  const targets = await page.locator('#viewer-console').evaluate((viewer) => {
    const visible = (element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
    return [...viewer.querySelectorAll('button, summary, select, input[type="range"], input[type="checkbox"]')]
      .filter((element) => visible(element) && !element.disabled)
      .map((element) => {
        const target = element.matches('input[type="checkbox"]') ? (element.closest('label') ?? element) : element;
        const rect = target.getBoundingClientRect();
        return {
          name: element.getAttribute('aria-label') || element.textContent.trim() || element.type,
          width: rect.width,
          height: rect.height,
        };
      });
  });
  expect(targets.length).toBeGreaterThan(40);
  expect(targets.filter(({ width, height }) => width < 44 || height < 44)).toEqual([]);
  expect(errors).toEqual([]);
});

test('model panel close and import picker match the 44 pixel control floor', async ({ page }) => { // Tests INV-55, FAIL-48
  const errors = monitor(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');

  await page.locator('#model-sources-trigger').click();
  const close = await page.locator('#fidelity-close').boundingBox();
  expect(close.width).toBeGreaterThanOrEqual(44);
  expect(close.height).toBeGreaterThanOrEqual(44);
  await page.locator('#fidelity-close').click();

  await page.locator('#lesson-import-trigger').click();
  const picker = await page.locator('#lesson-import-file').boundingBox();
  expect(picker.width).toBeGreaterThanOrEqual(44);
  expect(picker.height).toBeGreaterThanOrEqual(44);
  expect(errors).toEqual([]);
});

test('standalone navigation links meet the 44 pixel target floor without inflating inline citations', async ({ page }) => { // Tests INV-57
  const errors = monitor(page);
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
    await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');

    const assertTarget = async (locator, label) => {
      const box = await locator.boundingBox();
      expect(box, `${label} should be rendered`).not.toBeNull();
      expect(box.width, `${label} width`).toBeGreaterThanOrEqual(44);
      expect(box.height, `${label} height`).toBeGreaterThanOrEqual(44);
    };

    await assertTarget(page.locator('.brand'), 'topbar brand');
    const skip = page.locator('.skip-link');
    await skip.focus();
    await assertTarget(skip, 'focused skip link');
    await page.locator('#lesson-title').focus();

    const footerLinks = page.locator('.site-footer nav a:visible');
    expect(await footerLinks.count()).toBeGreaterThan(0);
    for (let index = 0; index < await footerLinks.count(); index++) {
      await assertTarget(footerLinks.nth(index), `footer link ${index + 1}`);
    }

    await page.locator('#model-sources-trigger').click();
    const citation = page.locator('#fidelity-content a').first();
    expect(await citation.count()).toBe(1);
    expect(await citation.evaluate(element => getComputedStyle(element).display)).toBe('inline');
    await page.locator('#fidelity-close').click();
  }
  expect(errors).toEqual([]);
});

test('compact and 200%-equivalent lesson layouts contain panels without root scroll or overlap', async ({ page }) => { // Tests INV-10, INV-13, INV-15
  const errors = monitor(page);
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 800, height: 450 },
    { width: 720, height: 450 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
    await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');

    const layout = await page.evaluate(() => {
      const stageTitle = document.getElementById('stage-heading').getBoundingClientRect();
      const stageActions = document.querySelector('.stage-actions').getBoundingClientRect();
      const pageSurface = document.getElementById('page-scroll');
      const visibleButtons = [...document.querySelectorAll('.topbar button, .scene-transport button')]
        .filter(button => button.getClientRects().length && !button.disabled);
      return {
        viewport: [document.documentElement.clientWidth, document.documentElement.clientHeight],
        scrollWidth: document.documentElement.scrollWidth,
        rootScroll: [scrollX, scrollY],
        pageSurface: pageSurface.getBoundingClientRect().toJSON(),
        stageHeaderOverlap: Math.max(0, Math.min(stageTitle.right, stageActions.right) - Math.max(stageTitle.left, stageActions.left))
          * Math.max(0, Math.min(stageTitle.bottom, stageActions.bottom) - Math.max(stageTitle.top, stageActions.top)),
        minimumButtonHeight: Math.min(...visibleButtons.map(button => button.getBoundingClientRect().height)),
      };
    });
    expect(layout.scrollWidth).toBe(layout.viewport[0]);
    expect(layout.rootScroll).toEqual([0, 0]);
    expect(layout.pageSurface.left).toBeGreaterThanOrEqual(0);
    expect(layout.pageSurface.right).toBeLessThanOrEqual(layout.viewport[0] + 1);
    expect(layout.stageHeaderOverlap).toBe(0);
    expect(layout.minimumButtonHeight).toBeGreaterThanOrEqual(44);

    await page.locator('#model-sources-trigger').click();
    const panel = await page.locator('#fidelity-panel').boundingBox();
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(panel.y + panel.height).toBeLessThanOrEqual(viewport.height + 1);
    await page.locator('#fidelity-close').click();

    await page.evaluate(() => { document.getElementById('page-scroll').scrollTop = 300; });
    expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);
  }
  expect(errors).toEqual([]);
});

test('direct lesson entry loads active filtered SWM once and defers later-region assets', async ({ page }) => { // Tests INV-45
  const errors = monitor(page);
  const requests = [];
  const active = new Set();
  page.on('request', request => {
    if (new URL(request.url()).origin !== new URL(BASE_URL).origin) return;
    requests.push(new URL(request.url()).pathname);
    active.add(request);
  });
  const finish = request => active.delete(request);
  page.on('requestfinished', finish);
  page.on('requestfailed', finish);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  await waitForQuietRequests(page, active);

  expect(requests).toContain('/models/brain_mni.glb');
  expect(requests).toContain('/data/or_fibres.json');
  expect(requests).toContain('/data/regions/lgn_L.obj');
  expect(requests).toContain('/data/regions/lgn_R.obj');
  expect(requests).toContain('/data/regions/v1_L.obj');
  expect(requests).toContain('/data/regions/v1_R.obj');
  expect(requests).toContain('/data/regions/v2_L.obj');
  expect(requests).toContain('/data/regions/v2_R.obj');
  expect(requests).toContain('/data/regions/v3v_L.obj');
  expect(requests).toContain('/data/regions/v3v_R.obj');
  expect(requests).toContain('/data/regions/v3d_L.obj');
  expect(requests).toContain('/data/regions/v3d_R.obj');
  expect(requests.filter(path => path === '/data/swm_fibres.json')).toHaveLength(1);
  expect(requests.filter(path => path === '/data/tracts.json')).toHaveLength(0);
  expect(requests.filter(path => path === '/data/tracts_metadata.json')).toHaveLength(1);
  expect(requests.some(path => path.startsWith('/data/regions/fg4_'))).toBe(false);

  for (let index = 0; index <= 4; index++) {
    await page.locator('#scene-next').click();
    await page.waitForFunction(expected => window.__lesson?.navigation?.activeIndex === expected, index);
    if (await page.locator('#scene-skip').isVisible()) await page.locator('#scene-skip').click();
  }
  await waitForQuietRequests(page, active);

  expect(requests.filter(path => path === '/data/swm_fibres.json')).toHaveLength(1);
  expect(requests.filter(path => path === '/data/tracts.json')).toHaveLength(1);
  expect(requests.filter(path => path === '/data/regions/v2_L.obj')).toHaveLength(1);
  expect(requests.filter(path => path === '/data/regions/v2_R.obj')).toHaveLength(1);
  expect(requests.some(path => path.startsWith('/data/regions/fg4_'))).toBe(false);
  expect(errors).toEqual([]);
});

test('Atlas Home still requests the complete authored default asset set', async ({ page }) => { // Tests INV-45
  const errors = monitor(page);
  const requests = [];
  const active = new Set();
  page.on('request', request => {
    if (new URL(request.url()).origin !== new URL(BASE_URL).origin) return;
    requests.push(new URL(request.url()).pathname);
    active.add(request);
  });
  const finish = request => active.delete(request);
  page.on('requestfinished', finish);
  page.on('requestfailed', finish);

  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  await waitForQuietRequests(page, active);

  expect(requests.filter(path => path === '/data/swm_fibres.json')).toHaveLength(1);
  expect(requests.filter(path => path === '/data/tracts_metadata.json')).toHaveLength(1);
  expect(requests.filter(path => path === '/data/tracts.json')).toHaveLength(1);
  expect(requests.filter(path => path === '/data/regions/fg4_L.obj')).toHaveLength(1);
  expect(requests.filter(path => path === '/data/regions/fg4_R.obj')).toHaveLength(1);
  expect(errors).toEqual([]);
});
