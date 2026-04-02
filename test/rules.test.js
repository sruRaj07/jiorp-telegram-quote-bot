import test from 'node:test';
import assert from 'node:assert/strict';
import { detectUseCase, evaluateProductConstraint } from '../src/lib/rules.js';

test('detectUseCase detects submerged', () => {
  const result = detectUseCase('Quote WTZ-1800 for submerged pool');
  assert.equal(result, 'submerged');
});

test('evaluateProductConstraint blocks submerged use for above-waterline-only product', () => {
  const product = {
    sku: 'WTZ-1800',
    above_waterline_only: true
  };

  const result = evaluateProductConstraint(product, 'submerged');

  assert.equal(result.allowed, false);
  assert.equal(result.code, 'CONSTRAINT_ABOVE_WATERLINE_ONLY');
});

test('evaluateProductConstraint allows valid use case', () => {
  const product = {
    sku: 'WE-100',
    above_waterline_only: false
  };

  const result = evaluateProductConstraint(product, 'submerged');

  assert.equal(result.allowed, true);
  assert.equal(result.code, 'OK');
});