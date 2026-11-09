import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestPerPlayer, addRecord, RANKING_LIMIT } from './cpuRankings.js';

const rec = (username, score, time, extra = {}) => ({ username, score, time, ...extra });

test('同じ社員番号は一番スコアの高い記録だけが残る', () => {
  const list = [rec('100', 200, 30), rec('200', 250, 28), rec('100', 300, 25), rec('100', 150, 40)];
  assert.deepEqual(bestPerPlayer(list).map(r => [r.username, r.score]), [['100', 300], ['200', 250]]);
});

test('同点なら時間が短い方、それも同じなら先の記録を残す', () => {
  const list = [rec('100', 200, 30, { date: 'a' }), rec('100', 200, 25, { date: 'b' }), rec('100', 200, 25, { date: 'c' })];
  assert.equal(bestPerPlayer(list)[0].date, 'b');
});

test('自己ベストに届かない記録を足しても、自分の行は自己ベストのまま 1 行', () => {
  const list = [rec('100', 300, 25), rec('200', 250, 28)];
  const next = addRecord(list, rec('100', 100, 50));
  assert.deepEqual(next.map(r => [r.username, r.score]), [['100', 300], ['200', 250]]);
});

test('自己ベストを更新したら古い記録と入れ替わる', () => {
  const next = addRecord([rec('100', 300, 25), rec('200', 250, 28)], rec('200', 400, 20));
  assert.deepEqual(next.map(r => [r.username, r.score]), [['200', 400], ['100', 300]]);
});

test('同じ人が何度遊んでも、上位は別々の人で埋まる', () => {
  let list = [];
  for (let i = 0; i < 50; i++) list = addRecord(list, rec('999', 500 + i, 20));
  for (let i = 0; i < 40; i++) list = addRecord(list, rec(String(i), 100 + i, 30));
  assert.equal(list.length, RANKING_LIMIT);
  assert.equal(new Set(list.map(r => r.username)).size, RANKING_LIMIT);
  assert.deepEqual(list[0], rec('999', 549, 20));
});
