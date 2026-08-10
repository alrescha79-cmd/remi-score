import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateShareCode, validateShareCode } from './cloudSyncCore.ts';

describe('generateShareCode', () => {
  it('produces 6-char lowercase alphanumeric code', () => {
    const code = generateShareCode();
    assert.equal(code.length, 6);
    assert.ok(validateShareCode(code), `invalid code: ${code}`);
  });

  it('excludes ambiguous chars (0, 1, o, l)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateShareCode();
      assert.ok(!/[01ol]/.test(code), `ambiguous char in: ${code}`);
    }
  });
});

describe('validateShareCode', () => {
  it('accepts valid codes', () => {
    assert.ok(validateShareCode('abc234'));
    assert.ok(validateShareCode('zzz999'));
  });
  it('rejects invalid codes', () => {
    assert.ok(!validateShareCode(''));
    assert.ok(!validateShareCode('abc'));
    assert.ok(!validateShareCode('ABC234'));
    assert.ok(!validateShareCode('abc23!'));
  });
});
