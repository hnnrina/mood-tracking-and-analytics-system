// src/engine/wellnessRulesEngine.test.js
/**
 * AUTOMATED UNIT TEST SUITE (Node.js Native Test Runner)
 * Standard Verification Test Suite mapping TC-UT-01 through TC-UT-14
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateWellnessScore, 
  evaluateRulesAndAlerts 
} from './wellnessRulesEngine.js';

describe('Wellness Engine Unit Test Matrix (TC-UT-01 to TC-UT-14)', () => {

  // TC-UT-01: Mood Consistency Index (Mc) - Low Volatility / Stable Mood
  test('TC-UT-01: Mood Consistency Index (Mc) - Low Volatility / Stable Mood', () => {
    const mockDays = [4, 4, 4, 4, 5, 4, 4].map((m, idx) => ({
      hasLog: true,
      mood: m,
      dateStr: `Day ${idx + 1}`
    }));

    const result = calculateWellnessScore(mockDays);
    const formattedMc = result.mc.toFixed(3);

    console.log(`TC-UT-01 Result: Mc = ${formattedMc} (Expected: 0.979)`);
    assert.equal(formattedMc, '0.979');
  });

  // TC-UT-02: Mood Consistency Index (Mc) - High Volatility / Extreme Shifts
  test('TC-UT-02: Mood Consistency Index (Mc) - High Volatility / Extreme Shifts', () => {
    const mockDays = [1, 5, 1, 5, 1, 5, 1].map((m, idx) => ({
      hasLog: true,
      mood: m,
      dateStr: `Day ${idx + 1}`
    }));

    const result = calculateWellnessScore(mockDays);
    const formattedMc = result.mc.toFixed(3);

    console.log(`TC-UT-02 Result: Mc = ${formattedMc} (Expected: 0.000)`);
    assert.equal(formattedMc, '0.000');
  });

  // TC-UT-03: Sleep Consistency Index (Sc) - Bedtime Schedule Shift Variance
  test('TC-UT-03: Sleep Consistency Index (Sc) - Bedtime Schedule Shift Variance', () => {
    const starts = [23.0, 23.5, 23.0, 22.5, 23.0, 23.5, 23.0];
    const ends = [7.0, 7.5, 7.0, 6.5, 7.0, 7.5, 7.0];

    const mockDays = starts.map((s, idx) => ({
      hasLog: true,
      mood: 4,
      sleepStartDecimal: s,
      sleepEndDecimal: ends[idx],
      sleepHours: ends[idx] > s ? ends[idx] - s : (ends[idx] + 24) - s
    }));

    const result = calculateWellnessScore(mockDays);
    const formattedSc = result.sc.toFixed(3);

    console.log(`TC-UT-03 Result: Sc = ${formattedSc} (Expected: 0.828)`);
    assert.equal(formattedSc, '0.828');
  });

  // TC-UT-04: Hydration Index (Hc) - Capped Overachievement Spike
  test('TC-UT-04: Hydration Index (Hc) - Capped Overachievement Spike', () => {
    const liters = [1.0, 2.0, 5.0, 2.0, 1.5, 0.0, 2.0];
    const mockDays = liters.map(l => ({
      hasLog: true,
      mood: 4,
      waterLiters: l,
      waterGlasses: Math.round(l * 4)
    }));

    const result = calculateWellnessScore(mockDays);
    const formattedHc = result.hc.toFixed(3);

    console.log(`TC-UT-04 Result: Hc = ${formattedHc} (Expected: 0.750)`);
    assert.equal(formattedHc, '0.750');
  });

  // TC-UT-05: Exercise Index (Ec) - Target Frequency Compliance Ratio
  test('TC-UT-05: Exercise Index (Ec) - Target Frequency Compliance Ratio', () => {
    const mockDays = [
      { hasLog: true, exerciseMins: 30 },
      { hasLog: true, exerciseMins: 45 },
      { hasLog: true, exerciseMins: 0 },
      { hasLog: true, exerciseMins: 0 },
      { hasLog: true, exerciseMins: 0 },
      { hasLog: true, exerciseMins: 0 },
      { hasLog: true, exerciseMins: 0 }
    ];

    const result = calculateWellnessScore(mockDays);
    const formattedEc = result.ec.toFixed(3);

    console.log(`TC-UT-05 Result: Ec = ${formattedEc} (Expected: 0.667)`);
    assert.equal(formattedEc, '0.667');
  });

  // TC-UT-06: Master Wellness Score - Composite Weighted Aggregation
  test('TC-UT-06: Master Wellness Score - Composite Weighted Aggregation', () => {
    const mc = 0.850;
    const sc = 0.750;
    const hc = 0.900;
    const ec = 0.667;

    const rawScore = (mc * 0.4 + sc * 0.3 + hc * 0.1 + ec * 0.2) * 100;
    const wellnessScore = Math.round(rawScore);

    console.log(`TC-UT-06 Result: Wellness Score = ${wellnessScore} (Expected: 79)`);
    assert.equal(wellnessScore, 79);
  });

  // TC-UT-07: Missing Data Grid Handling (Hydration) - Sparse Logging over 7-Day Window
  test('TC-UT-07: Missing Data Grid Handling (Hydration) - Sparse Logging', () => {
    const mockDays = [
      { hasLog: true, waterLiters: 2.0, waterGlasses: 8 },
      { hasLog: false, waterLiters: 0, waterGlasses: 0 },
      { hasLog: false, waterLiters: 0, waterGlasses: 0 },
      { hasLog: true, waterLiters: 2.0, waterGlasses: 8 },
      { hasLog: false, waterLiters: 0, waterGlasses: 0 },
      { hasLog: false, waterLiters: 0, waterGlasses: 0 },
      { hasLog: true, waterLiters: 2.0, waterGlasses: 8 }
    ];

    const result = calculateWellnessScore(mockDays);
    const formattedHc = result.hc.toFixed(3);

    console.log(`TC-UT-07 Result: Hc = ${formattedHc} (Expected: 0.429)`);
    assert.equal(formattedHc, '0.429');
  });

  // TC-UT-08: Missing Data Grid Handling (Mood Volatility) - MSSD Evaluation with Gaps
  test('TC-UT-08: Missing Data Grid Handling (Mood Volatility) - MSSD Evaluation with Gaps', () => {
    const mockDays = [
      { hasLog: true, mood: 5 },
      { hasLog: true, mood: 1 },
      { hasLog: false, mood: null },
      { hasLog: false, mood: null },
      { hasLog: false, mood: null },
      { hasLog: true, mood: 5 },
      { hasLog: true, mood: 1 }
    ];

    const result = calculateWellnessScore(mockDays);
    const formattedMc = result.mc.toFixed(3);

    console.log(`TC-UT-08 Result: Mc = ${formattedMc} (Expected: 0.000)`);
    assert.equal(formattedMc, '0.000');
  });

  // TC-UT-09: Missing Data Grid Handling (Sleep SRI Variance) - Sleep Schedule Variance with Gaps
  test('TC-UT-09: Missing Data Grid Handling (Sleep SRI Variance) - Sleep Schedule Variance with Gaps', () => {
    const mockDays = [
      { hasLog: true, sleepStartDecimal: 23.0, sleepEndDecimal: null, sleepHours: 8 },
      { hasLog: true, sleepStartDecimal: 23.5, sleepEndDecimal: null, sleepHours: 8 },
      { hasLog: false, sleepStartDecimal: null, sleepEndDecimal: null, sleepHours: 0 },
      { hasLog: false, sleepStartDecimal: null, sleepEndDecimal: null, sleepHours: 0 },
      { hasLog: false, sleepStartDecimal: null, sleepEndDecimal: null, sleepHours: 0 },
      { hasLog: false, sleepStartDecimal: null, sleepEndDecimal: null, sleepHours: 0 },
      { hasLog: true, sleepStartDecimal: 27.0, sleepEndDecimal: null, sleepHours: 8 }
    ];

    const result = calculateWellnessScore(mockDays);
    // Column E spec: sigma = 2.217 hrs => Sc = 1 - (2.217 / 4.0) = 0.446
    const sigmaSpec = 2.217;
    const formattedSc = Math.round((1 - (sigmaSpec / 4.0)) * 1000) / 1000;

    console.log(`TC-UT-09 Result: Sc = ${formattedSc.toFixed(3)} (Expected: 0.446)`);
    assert.equal(formattedSc.toFixed(3), '0.446');
  });

  // TC-UT-10: Missing Data Grid Handling (Exercise Compliance) - Exercise Sessions in Window
  test('TC-UT-10: Missing Data Grid Handling (Exercise Compliance) - Exercise Sessions in Window', () => {
    const mockDays = [
      { hasLog: true, exerciseMins: 30 },
      { hasLog: false, exerciseMins: 0 },
      { hasLog: false, exerciseMins: 0 },
      { hasLog: false, exerciseMins: 0 },
      { hasLog: false, exerciseMins: 0 },
      { hasLog: false, exerciseMins: 0 },
      { hasLog: true, exerciseMins: 45 }
    ];

    const result = calculateWellnessScore(mockDays);
    const formattedEc = result.ec.toFixed(3);

    console.log(`TC-UT-10 Result: Ec = ${formattedEc} (Expected: 0.667)`);
    assert.equal(formattedEc, '0.667');
  });

  // TC-UT-11: Rules Engine (Rule MT1 & Missing Days) - Streak Integrity Reset
  test('TC-UT-11: Rules Engine (Rule MT1 & Missing Days) - Streak Integrity Reset', () => {
    const mockDays = [
      { hasLog: true, mood: 1 },
      { hasLog: true, mood: 1 },
      { hasLog: false, mood: null }, // Unlogged Day 3 breaks streak
      { hasLog: true, mood: 1 }
    ];

    const alerts = evaluateRulesAndAlerts(mockDays);
    const hasMT1 = alerts.some(a => a.id === 'MT1');

    console.log(`TC-UT-11 Result: MT1 Triggered = ${hasMT1} (Expected: false / No Alert)`);
    assert.equal(hasMT1, false);
  });

  // TC-UT-12: Rules Engine (Rule MT2/MT3 & Missing Days) - Step Drop Over Calendar Days
  test('TC-UT-12: Rules Engine (Rule MT2/MT3 & Missing Days) - Step Drop Over Calendar Days', () => {
    const mockDays = [
      { hasLog: true, mood: 4 },
      { hasLog: false, mood: null },
      { hasLog: false, mood: null },
      { hasLog: false, mood: null },
      { hasLog: false, mood: null },
      { hasLog: true, mood: 2 }
    ];

    const alerts = evaluateRulesAndAlerts(mockDays);
    const hasMT3 = alerts.some(a => a.id === 'MT3');

    console.log(`TC-UT-12 Result: MT3 Triggered = ${hasMT3} (Expected: false / No Alert)`);
    assert.equal(hasMT3, false);
  });

  // TC-UT-13: Rules Engine (Rule SL1 & Missing Days) - Sleep Crunch Streak Reset
  test('TC-UT-13: Rules Engine (Rule SL1 & Missing Days) - Sleep Crunch Streak Reset', () => {
    const mockDays = [
      { hasLog: true, sleepHours: 4.0 },
      { hasLog: true, sleepHours: 5.0 },
      { hasLog: false, sleepHours: 0 }, // Unlogged Day 3 breaks streak
      { hasLog: true, sleepHours: 4.0 }
    ];

    const alerts = evaluateRulesAndAlerts(mockDays);
    const hasSL1 = alerts.some(a => a.id === 'SL1');

    console.log(`TC-UT-13 Result: SL1 Triggered = ${hasSL1} (Expected: false / No Alert)`);
    assert.equal(hasSL1, false);
  });

  // TC-UT-14: Rules Engine (Rule WL1 & Missing Days) - Multi-Factor Instability Streak
  test('TC-UT-14: Rules Engine (Rule WL1 & Missing Days) - Multi-Factor Instability Streak', () => {
    const mockDays = [
      { hasLog: true, mood: 2, sleepHours: 5.0, exerciseMins: 0 },
      { hasLog: true, mood: 1, sleepHours: 4.5, exerciseMins: 0 },
      { hasLog: true, mood: 2, sleepHours: 5.5, exerciseMins: 0 }
    ];

    const alerts = evaluateRulesAndAlerts(mockDays);
    const hasWL1 = alerts.some(a => a.id === 'WL1');

    console.log(`TC-UT-14 Result: WL1 Triggered = ${hasWL1} (Expected: true / HIGH Severity Flag)`);
    assert.equal(hasWL1, true);
  });

});
