import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CheerHub, DEFAULT_CHEER_SETTINGS, validateCheerSettings, loadCheerSettings, renderTelop,
  rankChangeTelop, publicCheerSettings, SEND_INTERVAL_MS, BURST_INTERVAL_MS, TELOP_INTERVAL_MS,
} from './cheer.js';

// 時計とタイマーを手で進められるようにした CheerHub
function makeHub(overrides = {}) {
  let t = 10_000;
  let timers = [];
  const settings = { ...loadCheerSettings(null), ...overrides };
  const sent = [];
  const fakeTimers = {
    setTimeout: (fn, ms) => { const h = { fn, at: t + ms }; timers.push(h); return h; },
    clearTimeout: (h) => { timers = timers.filter(x => x !== h); },
  };
  const hub = new CheerHub({ emit: (ev, p) => sent.push([ev, p]), getSettings: () => settings, now: () => t, timers: fakeTimers });
  const advance = (ms) => {
    t += ms;
    for (;;) {
      const due = timers.filter(h => h.at <= t).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      timers = timers.filter(h => h !== due);
      due.fn();
    }
  };
  return { hub, sent, advance, settings };
}

const validInput = () => JSON.parse(JSON.stringify(DEFAULT_CHEER_SETTINGS));

test('初期値の設定はそのまま保存できる', () => {
  const r = validInput();
  assert.equal(validateCheerSettings(r).ok, true);
});

test('スタンプの数・文字・重複、メーターの目標、テロップの文字数を確かめる', () => {
  assert.equal(validateCheerSettings({ ...validInput(), stamps: [] }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), stamps: ['👏', '👏'] }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), stamps: ['<b>'] }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), stamps: ['a b'] }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), meterFirstGoal: 0 }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), meterFirstGoal: 1.5 }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), meterGoalStep: -1 }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), meterGoalStep: 0 }).ok, true);
  assert.equal(validateCheerSettings({ ...validInput(), stampsEnabled: 'yes' }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), telops: { ...validInput().telops, start: 'あ'.repeat(61) } }).ok, false);
  // 空のテロップは「そのテロップを出さない」として保存できる
  const r = validateCheerSettings({ ...validInput(), telops: { ...validInput().telops, start: '' } });
  assert.equal(r.ok, true);
  assert.equal(r.settings.telops.start, '');
});

test('保存済みの設定に無い項目や壊れた値は初期値で補う', () => {
  const s = loadCheerSettings({ stampsEnabled: false, stamps: ['🍣', '', '🍣'], meterGoal: 300, meterFirstGoal: -1, telops: { start: 'はじめ' } });
  assert.equal(s.stampsEnabled, false);
  assert.equal(s.clapEnabled, true);
  assert.deepEqual(s.stamps, ['🍣']);
  assert.equal(s.meterFirstGoal, 10);
  assert.equal(s.meterGoalStep, 10);
  assert.equal('meterGoal' in s, false); // 以前の 1 つの目標は使わない
  assert.equal(s.telops.start, 'はじめ');
  assert.equal(s.telops.leader, DEFAULT_CHEER_SETTINGS.telops.leader);
  assert.equal('telops' in publicCheerSettings(s), false);
});

test('テロップの文言に名前やスコアを差し込む', () => {
  assert.equal(renderTelop('{name} さん {score} {rank}位 {x}', { name: '山田', score: 300, rank: 2 }), '山田 さん 300 2位 {x}');
});

test('スタンプは 1 接続あたり 1 秒に 1 回まで。0.5 秒ごとにまとめて配る', () => {
  const { hub, sent, advance } = makeHub();
  assert.equal(hub.stamp('a', 0), true);
  assert.equal(hub.stamp('a', 0), false);    // 同じ人の連打は数えない
  assert.equal(hub.stamp('b', 2), true);
  assert.equal(hub.stamp('c', 99), false);   // 無いスタンプ
  assert.equal(sent.length, 0);
  advance(BURST_INTERVAL_MS);
  assert.deepEqual(sent, [['cheerBurst', { stamps: [1, 0, 1], meter: { value: 2, goal: 10, level: 0, maxLevel: 10 } }]]);
  advance(SEND_INTERVAL_MS);
  assert.equal(hub.stamp('a', 0), true);     // 1 秒たてばまた送れる
});

test('拍手は相手ごとに数え、メーターにも足す', () => {
  const { hub } = makeHub();
  assert.equal(hub.clap('a', '100'), 1);
  assert.equal(hub.clap('a', '100'), null);  // 1 秒に 1 回まで
  assert.equal(hub.clap('b', '100'), 2);
  assert.equal(hub.clapsOf('100'), 2);
  assert.equal(hub.meterState().value, 2);
  hub.reset();
  assert.equal(hub.clapsOf('100'), 0);
});

test('メーターは Lv.1 が 10、Lv.2 が 20 … と目標が増え、Lv.10 で打ち止め', () => {
  const { hub, sent, advance } = makeHub();
  for (let i = 0; i < 10; i++) hub.stamp(`s${i}`, 0);
  assert.deepEqual(sent.find(([ev]) => ev === 'cheerMeterFull'), ['cheerMeterFull', { level: 1, maxLevel: 10 }]);
  assert.deepEqual(sent.find(([ev]) => ev === 'cheerTelop'), ['cheerTelop', { text: '盛り上がり Lv.1 達成！' }]);
  advance(BURST_INTERVAL_MS);
  assert.deepEqual(hub.meterState(), { value: 0, goal: 20, level: 1, maxLevel: 10 });
  // 残りの目標（20 + 30 + … + 100 = 540）をためると Lv.10
  for (let i = 0; i < 540; i++) hub.addMeter(1);
  assert.equal(hub.meterState().level, 10);
  assert.equal(hub.meterState().goal, null);
  assert.deepEqual(sent.filter(([ev]) => ev === 'cheerMeterFull').map(([, p]) => p.level), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  hub.addMeter(100);
  assert.deepEqual(hub.meterState(), { value: 0, goal: null, level: 10, maxLevel: 10 });
});

test('主張スタンプを出すと、浮かべる文言もまとめて配る', () => {
  const { hub, sent, advance } = makeHub();
  hub.postClaim('a', '100', 2);
  hub.postClaim('b', '200', 2);
  advance(BURST_INTERVAL_MS);
  const burst = sent.find(([ev]) => ev === 'cheerBurst')[1];
  assert.deepEqual(burst.claims, ['初300！', '初300！']);
  assert.equal(burst.meter.value, 2);
});

test('オフにした機能は数えない', () => {
  const { hub, sent, advance } = makeHub({ stampsEnabled: false, clapEnabled: false, meterEnabled: false, telopEnabled: false, spotlightEnabled: false, claimsEnabled: false });
  assert.equal(hub.stamp('a', 0), false);
  assert.equal(hub.clap('a', '100'), null);
  assert.equal(hub.telop('start'), false);
  assert.equal(hub.canSpotlight(), false);
  advance(BURST_INTERVAL_MS);
  assert.equal(sent.length, 0);
});

test('テロップは間隔をあけて 1 件ずつ配り、たまりすぎたら古いものを捨てる', () => {
  const { hub, sent, advance } = makeHub();
  hub.telop('start', { minutes: 10 });
  for (let i = 1; i <= 5; i++) hub.telop('leader', { name: `人${i}`, score: i });
  assert.deepEqual(sent.map(([, p]) => p.text), ['イベント開始！ 10分間の勝負です']);
  advance(TELOP_INTERVAL_MS);
  advance(TELOP_INTERVAL_MS);
  advance(TELOP_INTERVAL_MS);
  advance(TELOP_INTERVAL_MS);
  assert.deepEqual(sent.map(([, p]) => p.text).slice(1), [
    '人3 さんが1位に！ スコア 3', '人4 さんが1位に！ スコア 4', '人5 さんが1位に！ スコア 5',
  ]);
});

test('空のテロップは出さない', () => {
  const { hub, sent, settings } = makeHub();
  settings.telops = { ...settings.telops, start: '' };
  assert.equal(hub.telop('start'), false);
  assert.equal(sent.length, 0);
});

test('スポットライトは続けて押されたら 3 秒あける', () => {
  const { hub, advance } = makeHub();
  assert.equal(hub.canSpotlight(), true);
  assert.equal(hub.canSpotlight(), false);
  advance(3000);
  assert.equal(hub.canSpotlight(), true);
});

test('1 位の交代と 3 位以内への浮上をテロップにする', () => {
  const s = (n) => ({ score: n });
  assert.deepEqual(rankChangeTelop({}, { a: s(100) }, 'a'), { key: 'leader', rank: 1 });
  assert.deepEqual(rankChangeTelop({ a: s(100) }, { a: s(200) }, 'a'), null); // 1 位のまま自己ベスト
  assert.deepEqual(rankChangeTelop({ a: s(100) }, { a: s(100), b: s(150) }, 'b'), { key: 'leader', rank: 1 });
  assert.deepEqual(rankChangeTelop({ a: s(300), b: s(200) }, { a: s(300), b: s(200), c: s(250) }, 'c'), { key: 'rankUp', rank: 2 });
  const many = { a: s(500), b: s(400), c: s(300), d: s(200) };
  assert.equal(rankChangeTelop(many, { ...many, e: s(100) }, 'e'), null); // 4 位以下
  assert.deepEqual(rankChangeTelop(many, { ...many, d: s(350) }, 'd'), { key: 'rankUp', rank: 3 });
});

test('主張スタンプの文言を確かめる', () => {
  assert.equal(validateCheerSettings({ ...validInput(), claims: [] }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), claims: ['あ'.repeat(16)] }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), claims: ['初300！', '初300！'] }).ok, false);
  assert.equal(validateCheerSettings({ ...validInput(), claims: ['<b>'] }).ok, false);
  assert.deepEqual(validateCheerSettings({ ...validInput(), claims: [' 初 400！ '] }).settings.claims, ['初 400！']);
  // 主張スタンプの項目が無い古い保存内容でも、初期値で補って使える
  assert.deepEqual(loadCheerSettings({ stamps: ['👏'] }).claims, DEFAULT_CHEER_SETTINGS.claims);
});

test('主張は 1 人 1 つ。別の主張で置き換わり、同じ主張の押し直しは何もしない', () => {
  const { hub, sent, advance } = makeHub();
  assert.equal(hub.postClaim('a', '100', 1), '初250！');
  assert.deepEqual(hub.claimOf('100'), { seq: 1, text: '初250！', likes: 0 });
  advance(SEND_INTERVAL_MS);
  assert.equal(hub.postClaim('a', '100', 1), null);
  assert.equal(hub.postClaim('a', '100', 9), null);
  assert.equal(hub.postClaim('a', '100', 2), '初300！');
  assert.equal(hub.claimOf('100').seq, 2);
  assert.equal(hub.claimOf('200'), null);
  assert.equal(sent.filter(([ev]) => ev === 'cheerTelop').length, 0); // 主張のテロップはサーバ側（server.js）で出す
});

test('いいねは 1 つの主張に 1 人 1 回。押し直すと取り消し、メーターには 1 人 1 回だけ足す', () => {
  const { hub, advance } = makeHub();
  hub.postClaim('a', '100', 0);
  const meter0 = hub.meterState().value;
  assert.deepEqual(hub.toggleLike('b', '200', '100', 1), { liked: true, likes: 1 });
  advance(300);
  assert.deepEqual(hub.toggleLike('b', '200', '100', 1), { liked: false, likes: 0 });
  advance(300);
  assert.deepEqual(hub.toggleLike('b2', '200', '100', 1), { liked: true, likes: 1 }); // 別のタブからでも同じ人は 1 回
  assert.equal(hub.meterState().value, meter0 + 1);
  advance(300);
  assert.equal(hub.toggleLike('a', '100', '100', 1), null);  // 自分の主張には押せない
  assert.equal(hub.toggleLike('c', '300', '100', 99), null); // 置き換わった後の古い主張
  assert.equal(hub.toggleLike('c', '300', '999', 1), null);  // 主張していない人
  // 別の主張に置き換えると、いいねは 0 から
  advance(SEND_INTERVAL_MS);
  hub.postClaim('a', '100', 3);
  assert.equal(hub.claimOf('100').likes, 0);
  hub.reset();
  assert.equal(hub.claimOf('100'), null);
});

test('開始テロップが以前の初期値（5分間 固定）のままなら {minutes} 入りの初期値に置き換え、書き換えた文言はそのまま残す', () => {
  assert.equal(loadCheerSettings({ telops: { start: 'イベント開始！ 5分間の勝負です' } }).telops.start, 'イベント開始！ {minutes}分間の勝負です');
  assert.equal(loadCheerSettings({ telops: { start: 'スタート！' } }).telops.start, 'スタート！');
});
