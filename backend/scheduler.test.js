// node --test backend/scheduler.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  prevOccurrence, nextOccurrence, dueOccurrence, jstKey, validateSchedule, describeSchedule,
} from './scheduler.js';

// 日本時間を UTC の Date に変換するヘルパ
const jst = (y, mo, d, h, mi, s = 0) => new Date(Date.UTC(y, mo - 1, d, h - 9, mi, s));

// 2026-10-12 は月曜日
const MON_1200 = { day_of_week: 1, hour: 12, minute: 0, enabled: 1, last_run_key: null };

test('jstKey は日本時間で表す', () => {
  assert.equal(jstKey(jst(2026, 10, 12, 12, 0)), '2026-10-12 12:00');
  // UTC では前日 15:30 → 日本時間 0:30
  assert.equal(jstKey(new Date(Date.UTC(2026, 9, 11, 15, 30))), '2026-10-12 00:30');
});

test('prevOccurrence: 同じ曜日で時刻前なら先週の回', () => {
  assert.equal(jstKey(prevOccurrence(MON_1200, jst(2026, 10, 12, 11, 59))), '2026-10-05 12:00');
});

test('prevOccurrence: 同じ曜日で時刻ちょうど・後なら今日の回', () => {
  assert.equal(jstKey(prevOccurrence(MON_1200, jst(2026, 10, 12, 12, 0))), '2026-10-12 12:00');
  assert.equal(jstKey(prevOccurrence(MON_1200, jst(2026, 10, 12, 18, 0))), '2026-10-12 12:00');
});

test('prevOccurrence: 別の曜日なら直近の月曜', () => {
  assert.equal(jstKey(prevOccurrence(MON_1200, jst(2026, 10, 15, 9, 0))), '2026-10-12 12:00'); // 木曜
  assert.equal(jstKey(prevOccurrence(MON_1200, jst(2026, 10, 11, 23, 59))), '2026-10-05 12:00'); // 日曜
});

test('日本時間の深夜（UTC では前日）の予約も正しく扱う', () => {
  const tue_0030 = { day_of_week: 2, hour: 0, minute: 30, enabled: 1 };
  // 日本時間 火曜 0:31 = UTC 月曜 15:31
  assert.equal(jstKey(prevOccurrence(tue_0030, jst(2026, 10, 13, 0, 31))), '2026-10-13 00:30');
});

test('nextOccurrence は次の回', () => {
  assert.equal(jstKey(nextOccurrence(MON_1200, jst(2026, 10, 12, 11, 59))), '2026-10-12 12:00');
  assert.equal(jstKey(nextOccurrence(MON_1200, jst(2026, 10, 12, 12, 1))), '2026-10-19 12:00');
});

test('dueOccurrence: 予定時刻から 2 分以内・未実行なら実行対象', () => {
  assert.equal(jstKey(dueOccurrence(MON_1200, jst(2026, 10, 12, 12, 0, 5))), '2026-10-12 12:00');
  assert.equal(jstKey(dueOccurrence(MON_1200, jst(2026, 10, 12, 12, 1, 50))), '2026-10-12 12:00');
});

test('dueOccurrence: 予定時刻前・2 分以上過ぎた・実行済み・停止中は対象外', () => {
  assert.equal(dueOccurrence(MON_1200, jst(2026, 10, 12, 11, 59, 59)), null);
  assert.equal(dueOccurrence(MON_1200, jst(2026, 10, 12, 12, 2, 0)), null); // 夜間停止明けなど
  assert.equal(dueOccurrence({ ...MON_1200, last_run_key: '2026-10-12 12:00' }, jst(2026, 10, 12, 12, 0, 30)), null);
  assert.equal(dueOccurrence({ ...MON_1200, enabled: 0 }, jst(2026, 10, 12, 12, 0, 30)), null);
});

test('dueOccurrence: 先週分が実行済みでも今週の回は対象', () => {
  assert.ok(dueOccurrence({ ...MON_1200, last_run_key: '2026-10-05 12:00' }, jst(2026, 10, 12, 12, 0, 30)));
});

test('validateSchedule', () => {
  assert.ok(validateSchedule({ day_of_week: 0, hour: 0, minute: 0 }));
  assert.ok(validateSchedule({ day_of_week: 6, hour: 23, minute: 59 }));
  assert.ok(!validateSchedule({ day_of_week: 7, hour: 12, minute: 0 }));
  assert.ok(!validateSchedule({ day_of_week: 1, hour: 24, minute: 0 }));
  assert.ok(!validateSchedule({ day_of_week: 1, hour: 12, minute: 60 }));
  assert.ok(!validateSchedule({ day_of_week: 1, hour: 12.5, minute: 0 }));
  assert.ok(!validateSchedule({ day_of_week: NaN, hour: 12, minute: 0 }));
});

test('describeSchedule のラベル', () => {
  const d = describeSchedule({ id: 1, ...MON_1200, minute: 5 }, jst(2026, 10, 12, 9, 0));
  assert.equal(d.label, '毎週 月曜 12:05');
  assert.equal(d.enabled, true);
  assert.equal(jstKey(new Date(d.next_run_at)), '2026-10-12 12:05');
});
