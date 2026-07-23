const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';
const PLAYING_VIEWS = [
  { index: -1, id: 'orientation', anterior: true, optic: true, swm: true },
  { index: 0, id: 'nasal-crossing', anterior: true },
  { index: 1, id: 'lgn-relay', anterior: true, optic: true, swm: true },
  { index: 2, id: 'optic-radiation', optic: true },
  { index: 3, id: 'v1-arrival', optic: true, association: true, swm: true, groups: ['ifof:L', 'ilf:L'] },
  { index: 4, id: 'extrastriate-branching', association: true, swm: true, groups: ['ifof:L', 'ifof:R', 'ilf:L', 'ilf:R', 'vof:L', 'vof:R'] },
  { index: 5, id: 'ventral-stream', association: true, swm: true, groups: ['ifof:L', 'ilf:L', 'vof:L'] },
  { index: 6, id: 'dorsal-stream', association: true, swm: true, groups: ['ifof:L', 'ilf:L', 'mdlf:L', 'slf1:L', 'slf2:L', 'slf3:L', 'vof:L'] },
  { index: 7, id: 'conclusion', anterior: true, optic: true, swm: true },
];

async function ready(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => window.__lesson?.controllerState?.status === 'ready');
  await page.waitForFunction(() => window.__view?.activity?.opticRadiation && window.__view?.association && window.__view?.swm);
}

async function waitForSettledCamera(page, index) {
  await page.waitForFunction(expected => window.__lesson.controllerState.activeIndex === expected, index);
  await page.waitForFunction(() => !window.__view.lesson.cameraTransitioning && !window.__view.lesson.visibilityTransitioning);
}

async function waitForExpectedActivity(page, expected) {
  await page.waitForFunction(({ anterior, optic, association, swm }) => {
    const activity = window.__view.activity;
    if (anterior && activity.anterior.points.length === 0) return false;
    if (optic) {
      const radiation = activity.opticRadiation;
      if (radiation.activeCount < 1) return false;
      const attribute = radiation.points.geometry.attributes.position;
      const count = Math.min(radiation.points.geometry.drawRange.count, attribute.count);
      const point = new window.__view.THREE.Vector3();
      let hasTracerNearV1 = false;
      for (let index = 0; index < count && !hasTracerNearV1; index++) {
        point.fromBufferAttribute(attribute, index);
        hasTracerNearV1 = radiation.v1Endpoints.some(endpoint => point.distanceTo(endpoint) <= 18);
      }
      if (!hasTracerNearV1) return false;
    }
    if (association && window.__view.association.points.geometry.drawRange.count < 1) return false;
    if (swm && window.__view.swm.points.geometry.drawRange.count < 1) return false;
    return true;
  }, expected);
}

async function activitySample(page) {
  return page.evaluate(() => {
    const THREE = window.__view.THREE;
    const camera = window.__view.camera;
    const summarize = (objects) => {
      let checksum = 0;
      let drawn = 0;
      let inFrame = 0;
      let opacity = Infinity;
      let visibleObjects = 0;
      let colorEnergy = 0;
      const point = new THREE.Vector3();
      for (const object of objects) {
        const attribute = object.geometry.attributes.position;
        const color = object.geometry.attributes.color;
        const requested = object.geometry.drawRange.count;
        const count = Number.isFinite(requested) ? Math.min(requested, attribute.count) : attribute.count;
        let effectivelyVisible = true;
        for (let parent = object; parent; parent = parent.parent) effectivelyVisible &&= parent.visible;
        drawn += count;
        if (effectivelyVisible) {
          visibleObjects++;
          opacity = Math.min(opacity, object.material.opacity ?? 1);
        }
        for (let index = 0; index < count; index++) {
          checksum += (index + 1) * (attribute.getX(index) * 0.3 + attribute.getY(index) * 0.5 + attribute.getZ(index) * 0.7);
          if (color) colorEnergy += Math.abs(color.getX(index)) + Math.abs(color.getY(index)) + Math.abs(color.getZ(index));
          point.fromBufferAttribute(attribute, index);
          object.localToWorld(point);
          point.project(camera);
          if (effectivelyVisible && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z >= -1 && point.z <= 1) inFrame++;
        }
      }
      return {
        checksum,
        drawn,
        inFrame,
        opacity: visibleObjects ? opacity : 0,
        colorEnergy,
        automaticallyCulled: objects.some((object) => object.frustumCulled),
      };
    };
    const activity = window.__view.activity;
    const optic = activity.opticRadiation;
    let transparentPathwayDepthWrites = 0;
    activity.anterior.points[0]?.parent?.traverse((object) => {
      if (object.isMesh && object.material.transparent && object.material.depthWrite) {
        transparentPathwayDepthWrites++;
      }
    });
    const tracerAttribute = optic.points.geometry.attributes.position;
    const tracerCount = Math.min(optic.points.geometry.drawRange.count, tracerAttribute.count);
    let nearV1 = 0;
    const tracer = new THREE.Vector3();
    for (let index = 0; index < tracerCount; index++) {
      tracer.fromBufferAttribute(tracerAttribute, index);
      if (optic.v1Endpoints.some(endpoint => tracer.distanceTo(endpoint) <= 18)) nearV1++;
    }
    return {
      scene: window.__lesson.controllerState.activeSceneId,
      state: activity.state,
      camera: window.__view.camera.position.toArray(),
      target: window.__view.controls.target.toArray(),
      anterior: {
        distanceMm: activity.anterior.distanceMm,
        points: summarize(activity.anterior.points),
        transparentPathwayDepthWrites,
      },
      optic: {
        modelTime: optic.modelTime,
        activeCount: optic.activeCount,
        nearV1,
        points: summarize([optic.points]),
        endpointCaps: summarize(optic.endpointCaps),
      },
      association: {
        modelTime: window.__view.association.modelTime,
        activeCount: window.__view.association.activeCount,
        eligibleGroups: window.__view.association.eligibleRenderedGroups,
        renderedGroups: [...new Set(window.__view.association.renderedGroups)].sort(),
        points: summarize([window.__view.association.points]),
      },
      swm: { modelTime: window.__view.swm.modelTime, points: summarize([window.__view.swm.points]) },
    };
  });
}

for (const [label, viewport] of Object.entries({
  wide: { width: 1440, height: 900 },
  compact: { width: 390, height: 844 },
})) {
  test(`every playing lesson view remains perceptibly active after camera settlement — ${label}`, async ({ page }) => { // Tests INV-33
    await ready(page, viewport);
    for (const expected of PLAYING_VIEWS) {
      if (expected.index >= 0) await page.locator('#scene-next').click();
      await waitForSettledCamera(page, expected.index);
      await waitForExpectedActivity(page, expected);
      const before = await activitySample(page);
      const beforeFrame = await page.locator('#stage').screenshot();
      await page.waitForTimeout(900);
      const after = await activitySample(page);
      const afterFrame = await page.locator('#stage').screenshot();

      expect(after.scene).toBe(expected.id);
      expect(afterFrame.equals(beforeFrame), `${expected.id} should visibly change rendered stage pixels`).toBe(false);
      expect(after.state).toMatchObject({ playing: true, settled: false, reducedMotion: false });
      after.camera.forEach((value, axis) => expect(value).toBeCloseTo(before.camera[axis], 10));
      after.target.forEach((value, axis) => expect(value).toBeCloseTo(before.target[axis], 10));
      if (expected.anterior) {
        expect(after.anterior.distanceMm).toBeGreaterThan(before.anterior.distanceMm);
        expect(after.anterior.points.checksum).not.toBe(before.anterior.points.checksum);
        expect(after.anterior.transparentPathwayDepthWrites).toBe(0);
        expect(after.anterior.points.inFrame).toBeGreaterThan(0);
        expect(after.anterior.points.opacity).toBeGreaterThan(0.5);
      }
      if (expected.optic) {
        expect(after.optic.modelTime).toBeGreaterThan(before.optic.modelTime);
        expect(after.optic.points.checksum).not.toBe(before.optic.points.checksum);
        expect(after.optic.points.automaticallyCulled).toBe(false);
        expect(after.optic.points.inFrame).toBeGreaterThan(0);
        expect(after.optic.points.opacity).toBeGreaterThan(0.5);
        expect(after.optic.endpointCaps.drawn).toBeGreaterThan(0);
        expect(after.optic.endpointCaps.inFrame).toBeGreaterThan(0);
        expect(after.optic.endpointCaps.opacity).toBeGreaterThan(0.5);
        expect(after.optic.nearV1, `${expected.id} should show an active tracer near V1`).toBeGreaterThan(0);
      }
      if (expected.association) {
        expect(after.association.modelTime).toBeGreaterThan(before.association.modelTime);
        expect(after.association.points.checksum).not.toBe(before.association.points.checksum);
        expect(after.association.points.automaticallyCulled).toBe(false);
        expect(after.association.points.inFrame).toBeGreaterThan(0);
        expect(after.association.points.opacity).toBeGreaterThan(0.5);
        expect(after.association.points.colorEnergy).toBeGreaterThan(0);
        expect(after.association.eligibleGroups).toEqual(expected.groups);
        expect(after.association.renderedGroups.length).toBeGreaterThan(0);
        expect(after.association.renderedGroups.every(group => expected.groups.includes(group))).toBe(true);
      }
      if (expected.swm) {
        expect(after.swm.modelTime).toBeGreaterThan(before.swm.modelTime);
        expect(after.swm.points.checksum).not.toBe(before.swm.points.checksum);
        expect(after.swm.points.automaticallyCulled).toBe(false);
        expect(after.swm.points.inFrame).toBeGreaterThan(0);
        expect(after.swm.points.opacity).toBeGreaterThan(0.25);
      }
    }
  });
}

test('actual short and long association contours share physical speed but have different latency', async ({ page }) => {
  await ready(page, { width: 1440, height: 900 });
  for (let index = 0; index <= 4; index++) await page.locator('#scene-next').click();
  await waitForSettledCamera(page, 4);
  await waitForExpectedActivity(page, {
    association: true,
    groups: ['ifof:L', 'ifof:R', 'ilf:L', 'ilf:R', 'vof:L', 'vof:R'],
  });
  await page.waitForFunction(() => window.__view.association?.physicalTravel?.profileCount > 1);
  await page.waitForFunction(() => {
    const active = window.__view.association.activeTravel;
    return active.length > 1 && active.some((event) => event.lengthMm !== active[0].lengthMm);
  });

  const { travel, active } = await page.evaluate(() => ({
    travel: window.__view.association.physicalTravel,
    active: window.__view.association.activeTravel,
  }));

  expect(travel.unit).toBe('MNI mm per display second');
  expect(travel.speedMmPerDisplaySecond).toBe(40);
  expect(travel.shortestLengthMm).toBeGreaterThan(0);
  expect(travel.longestLengthMm).toBeGreaterThan(travel.shortestLengthMm);
  expect(travel.shortestTransitDisplaySeconds).toBeCloseTo(
    travel.shortestLengthMm / travel.speedMmPerDisplaySecond,
    10,
  );
  expect(travel.longestTransitDisplaySeconds).toBeCloseTo(
    travel.longestLengthMm / travel.speedMmPerDisplaySecond,
    10,
  );
  expect(travel.shortestTransitDisplaySeconds).toBeLessThan(travel.longestTransitDisplaySeconds);
  expect(active.length).toBeGreaterThan(1);
  expect(active.every((event) => event.speedMmPerDisplaySecond === 40)).toBe(true);
  expect(active.every((event) => event.distanceMm >= 0 && event.distanceMm <= event.lengthMm)).toBe(true);
});

test('Skip, Pause, Play, and reduced motion retain distinct activity semantics', async ({ page }) => { // Tests INV-33, FAIL-31
  await ready(page, { width: 1440, height: 900 });
  await page.locator('#scene-next').click();
  await expect(page.locator('#scene-skip')).toBeVisible();
  await page.locator('#scene-skip').click();
  await expect(page.locator('#playTxt')).toHaveText('Play activity');
  const skipped = await activitySample(page);
  await page.waitForTimeout(500);
  const skippedLater = await activitySample(page);
  expect(skipped.state).toMatchObject({ playing: false, settled: true });
  expect(skippedLater.anterior.points.checksum).toBe(skipped.anterior.points.checksum);

  await page.locator('#scene-next').click();
  await waitForSettledCamera(page, 1);
  await expect(page.locator('#playTxt')).toHaveText('Pause activity');
  expect((await activitySample(page)).state).toMatchObject({ playing: true, settled: false });

  await page.locator('#back-to-atlas').click();
  await page.locator('#play').click();
  const paused = await activitySample(page);
  await page.waitForTimeout(500);
  const pausedLater = await activitySample(page);
  expect(paused.state).toMatchObject({ playing: false, settled: false });
  expect(pausedLater.optic.modelTime).toBe(paused.optic.modelTime);
  await page.locator('#play').click();
  await page.waitForTimeout(250);
  expect((await activitySample(page)).optic.modelTime).toBeGreaterThan(pausedLater.optic.modelTime);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#play')).toBeDisabled();
  await expect(page.locator('#playTxt')).toHaveText('Activity paused — reduced motion');
  expect((await activitySample(page)).state).toMatchObject({ playing: false, settled: true, reducedMotion: true });
});
