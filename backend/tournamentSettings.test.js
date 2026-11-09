import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTournamentSettings, loadTournamentSettings } from './tournamentSettings.js';

test('1〜60 分の整数なら受け付ける', () => {
  assert.deepEqual(validateTournamentSettings({ durationMinutes: 1 }), { ok: true, settings: { durationMinutes: 1 } });
  assert.deepEqual(validateTournamentSettings({ durationMinutes: 60 }), { ok: true, settings: { durationMinutes: 60 } });
});

test('範囲外・小数・文字列は断る', () => {
  for (const v of [0, 61, 2.5, '5', null, undefined]) {
    assert.equal(validateTournamentSettings({ durationMinutes: v }).ok, false, String(v));
  }
  assert.equal(validateTournamentSettings(null).ok, false);
});

test('保存がない・壊れているときは 5 分', () => {
  assert.deepEqual(loadTournamentSettings(null), { durationMinutes: 5 });
  assert.deepEqual(loadTournamentSettings({ durationMinutes: 999 }), { durationMinutes: 5 });
  assert.deepEqual(loadTournamentSettings({ durationMinutes: 10 }), { durationMinutes: 10 });
});
