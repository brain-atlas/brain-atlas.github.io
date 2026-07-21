import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSwmVibration,
  structuralVibrationAmplitude,
  vibrationContourParameter,
} from '../src/activity/swm-vibration.js';

test('structural amplitude preserves the documented local-length mapping and bounds', () => {
  assert.equal(structuralVibrationAmplitude(2, 100), 0.08);
  assert.equal(structuralVibrationAmplitude(25, 50), 0.25);
  assert.equal(structuralVibrationAmplitude(50, 50), 0.45);
});

test('sampled home keeps the complete sinusoid inside endpoint margins', () => {
  for (const randomValue of [0, 0.25, 0.5, 0.75, 0.999999]) {
    const dot = createSwmVibration({
      ownLength: 50,
      localMeanLength: 50,
      random: () => randomValue,
    });

    assert.ok(dot.home - dot.amplitude >= 0.03 - 1e-12);
    assert.ok(dot.home + dot.amplitude <= 0.97 + 1e-12);
  }
});

test('bounded vibration is symmetric about home with zero cycle mean and no clipping', () => {
  const dot = createSwmVibration({
    ownLength: 50,
    localMeanLength: 50,
    random: () => 0,
  });
  const samples = 100_000;
  let offsetSum = 0;
  let minimum = Infinity;
  let maximum = -Infinity;
  for (let index = 0; index < samples; index++) {
    const time = index / (samples * dot.frequency);
    const parameter = vibrationContourParameter(dot, time);
    offsetSum += parameter - dot.home;
    minimum = Math.min(minimum, parameter);
    maximum = Math.max(maximum, parameter);
  }

  assert.ok(Math.abs(offsetSum / samples) < 1e-12);
  assert.ok(Math.abs((dot.home - minimum) - dot.amplitude) < 1e-12);
  assert.ok(Math.abs((maximum - dot.home) - dot.amplitude) < 1e-9);
  assert.ok(minimum >= 0.03 - 1e-12);
  assert.ok(maximum <= 0.97 + 1e-12);
});

test('settled reduced-motion parameter is the fixed home position', () => {
  const dot = createSwmVibration({
    ownLength: 30,
    localMeanLength: 20,
    random: () => 0.75,
  });

  assert.equal(vibrationContourParameter(dot, 123, { settled: true }), dot.home);
});
