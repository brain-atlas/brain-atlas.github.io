const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';

function monitor(page) {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function ready(page, viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  await page.waitForFunction(() => window.__view?.fibreFilter?.summary?.population?.total === 17880);
}

async function waitForFrames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test('endpoint presets coherently filter geometry, activity, summaries, and canonical Atlas state', async ({ page }) => {
  const errors = monitor(page);
  await ready(page);

  await expect(page.locator('#fibre-filter-preset')).toHaveAccessibleName('Preset');
  await expect(page.locator('#fibre-filter-mode')).toHaveAccessibleName('Query mode');
  await expect(page.locator('#fibre-filter-summary')).toHaveAttribute('aria-live', 'polite');
  await page.locator('#fibre-filter-preset').selectOption('fibre-filter.dorsal');
  await page.waitForFunction(() => (
    window.__view.fibreFilter.selectedAssociationContours === 1178
    && window.__view.fibreFilter.eligibleAssociationContours === 1178
    && window.__view.fibreFilter.selectedSwmContours === 2002
  ));
  await waitForFrames(page);
  await page.waitForFunction(() => window.__view.fibreFilter.renderedSwmDots === 2002);
  const rebuildMs = await page.evaluate(() => window.__view.fibreFilter.lastRebuildMs);
  expect(Number.isFinite(rebuildMs)).toBe(true);
  expect(rebuildMs).toBeLessThan(120);

  expect(await page.evaluate(() => ({
    query: window.__view.fibreFilter.query,
    selected: window.__view.fibreFilter.summary.selected,
    panelSnapshot: window.__lesson.exploreState.snapshot.fibreFilter,
    status: document.getElementById('fibre-filter-summary').textContent,
  }))).toEqual({
    query: {
      preset: 'fibre-filter.dorsal',
      mode: 'touches-any',
      setA: [
        'region.hip1', 'region.hip2', 'region.hip3', 'region.hip4', 'region.hip5', 'region.hip6',
        'region.hip7', 'region.hip8', 'region.mt', 'region.spl5l', 'region.spl5m', 'region.spl7a',
        'region.spl7p', 'region.v1', 'region.v2', 'region.v3a', 'region.v3d', 'region.v6',
      ],
      setB: [],
    },
    selected: { association: 1178, swm: 2002, total: 3180, L: 1499, R: 1681 },
    panelSnapshot: {
      preset: 'fibre-filter.dorsal',
      mode: 'touches-any',
      setA: [
        'region.hip1', 'region.hip2', 'region.hip3', 'region.hip4', 'region.hip5', 'region.hip6',
        'region.hip7', 'region.hip8', 'region.mt', 'region.spl5l', 'region.spl5m', 'region.spl7a',
        'region.spl7p', 'region.v1', 'region.v2', 'region.v3a', 'region.v3d', 'region.v6',
      ],
      setB: [],
    },
    status: '3,180 of 17,880 fibres match: 1,178 association and 2,002 superficial. Active hemispheres: left and right. Endpoint assignment quality among matches: 1,986 known, 514 unknown, and 680 ambiguous.',
  });

  await page.locator('.hemi-chip input').nth(1).uncheck();
  await page.waitForFunction(() => window.__view.fibreFilter.summary.population.total === 8660);
  await waitForFrames(page);
  expect(await page.evaluate(() => ({
    selected: window.__view.fibreFilter.summary.selected,
    maskTotal: window.__view.fibreFilter.selectedAssociationContours + window.__view.fibreFilter.selectedSwmContours,
    dots: window.__view.fibreFilter.renderedSwmDots,
    hemispheres: window.__lesson.exploreState.snapshot.hemispheres.global,
  }))).toEqual({
    selected: { association: 559, swm: 940, total: 1499, L: 1499, R: 0 },
    maskTotal: 1499,
    dots: 940,
    hemispheres: { L: true, R: false },
  });
  expect(errors).toEqual([]);
});

test('custom endpoint controls expose all strict unordered query modes and explicit quality selectors', async ({ page }) => {
  const errors = monitor(page);
  await ready(page, { width: 1100, height: 820 });

  await page.locator('#fibre-filter-mode').selectOption('connects-between');
  await page.locator('#fibre-filter-set-a').selectOption(['region.v1']);
  await page.locator('#fibre-filter-set-b').selectOption(['region.mt']);
  await page.waitForFunction(() => {
    const query = window.__view.fibreFilter.query;
    return query.mode === 'connects-between' && query.setA[0] === 'region.v1' && query.setB[0] === 'region.mt';
  });
  expect(await page.evaluate(() => window.__lesson.exploreState.snapshot.fibreFilter)).toEqual({
    preset: null,
    mode: 'connects-between',
    setA: ['region.v1'],
    setB: ['region.mt'],
  });

  await page.locator('#fibre-filter-mode').selectOption('connects-within');
  await page.locator('#fibre-filter-set-a').selectOption(['region.v1', 'region.v2']);
  await page.waitForFunction(() => window.__view.fibreFilter.query.mode === 'connects-within'
    && window.__view.fibreFilter.query.setA.length === 2);
  expect(await page.locator('#fibre-filter-set-b-wrap').isHidden()).toBe(true);

  await page.locator('#fibre-filter-mode').selectOption('touches-any');
  await page.locator('#fibre-filter-set-a').selectOption(['endpoint.unknown']);
  await page.waitForFunction(() => window.__view.fibreFilter.query.setA[0] === 'endpoint.unknown');
  const quality = await page.evaluate(() => window.__view.fibreFilter.summary.selectedQuality);
  expect(quality.known).toBe(0);
  expect(quality.unknown).toBeGreaterThan(0);
  expect(quality.ambiguous).toBeGreaterThan(0, 'the opposite endpoint can still be ambiguous');

  await page.locator('#fibre-filter-set-a').selectOption(['endpoint.ambiguous']);
  await page.waitForFunction(() => window.__view.fibreFilter.query.setA[0] === 'endpoint.ambiguous');
  const ambiguous = await page.evaluate(() => window.__view.fibreFilter.summary);
  expect(ambiguous.selectedQuality).toEqual({ known: 0, unknown: 0, ambiguous: ambiguous.selected.total });

  await page.locator('#fibre-filter-mode').selectOption('all');
  await page.waitForFunction(() => window.__view.fibreFilter.summary.selected.total === 17880);
  expect(await page.locator('#fibre-filter-set-a-wrap').isHidden()).toBe(true);
  expect(errors).toEqual([]);
});
