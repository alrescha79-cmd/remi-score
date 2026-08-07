import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTotals, rankByScore, validateScore, formatSignedScore, SCORE_STEP } from './score.ts';

test('validateScore accepts multiples of 5', () => {
  for (const n of [-1000, -25, -5, 0, 5, 25, 1000]) assert.equal(validateScore(n), true);
});

test('validateScore rejects non-multiples, decimals, out of range', () => {
  for (const n of [1, 4, 3.33, -1001, 1001, Number.NaN, Infinity, 7]) {
    assert.equal(validateScore(n), false, `expected ${n} rejected`);
  }
  assert.equal(validateScore('15'), false);
  assert.equal(SCORE_STEP, 5);
});

test('computeTotals takes cumulative at last round', () => {
  const scores = [
    { player_id: 1, round_number: 1, cumulative_total: 10 },
    { player_id: 1, round_number: 2, cumulative_total: -5 },
    { player_id: 2, round_number: 1, cumulative_total: 0 },
  ];
  assert.deepEqual(computeTotals(scores), new Map([[1, -5], [2, 0]]));
});

test('rankByScore: highest first, ties share rank and skip', () => {
  const ranked = rankByScore([
    { item: 'a', score: 30 },
    { item: 'b', score: 25 },
    { item: 'c', score: 30 },
    { item: 'd', score: 10 },
  ]);
  assert.deepEqual(
    ranked.map((r) => [r.item, r.rank]),
    [['a', 1], ['c', 1], ['b', 3], ['d', 4]]
  );
});

test('formatSignedScore renders + for positives, - and bare 0', () => {
  assert.equal(formatSignedScore(25), '+25');
  assert.equal(formatSignedScore(-15), '-15');
  assert.equal(formatSignedScore(0), '0');
});
