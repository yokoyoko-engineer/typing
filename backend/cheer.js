// イベント BATTLE の「にぎやかし」機能（実況テロップ・スタンプ・拍手・スポットライト・盛り上がりメーター・主張スタンプといいね）。
//
// 方針
// - まだ打っている人の邪魔をしない: 演出を出すかどうかは画面側で決める（打っている間は出さない）。
//   サーバは送るだけ。
// - 連打で通信が増えないようにする: スタンプと拍手は 1 接続あたり 1 秒に 1 回まで。
//   スタンプは 0.5 秒ごとにまとめて配る。テロップも間隔をあけて 1 件ずつ配る。
// - 氏名はテロップにだけ載せ、イベント画面（社内 IP だけがつながる socket）へ送る。ログには出さない。
// - 設定（オンオフ・スタンプの種類・テロップの文言・メーターの目標）は管理画面から変える。

export const TELOP_KEYS = ['start', 'leader', 'rankUp', 'oneMinute', 'meterFull', 'spotlight', 'claim'];

export const DEFAULT_CHEER_SETTINGS = Object.freeze({
  telopEnabled: true,      // A. 実況テロップ
  stampsEnabled: true,     // B. リアクションスタンプ
  clapEnabled: true,       // C. 宛先つき拍手
  spotlightEnabled: true,  // D. スポットライト
  meterEnabled: true,      // E. 盛り上がりメーター
  claimsEnabled: true,     // F. 主張スタンプ（本人がスコアの横に出す。ほかの人が「いいね」できる）
  stamps: ['👏', '🎉', '🔥', '😲', '❤️'],
  claims: ['自己ベスト更新！', '初250！', '初300！', '初トップ10！'],
  meterGoal: 50,
  telops: {
    start: 'イベント開始！ 5分間の勝負です',
    leader: '{name} さんが1位に！ スコア {score}',
    rankUp: '{name} さんが{rank}位に浮上！ スコア {score}',
    oneMinute: '残り1分！ ラストスパート！',
    meterFull: '盛り上がりメーター満タン！ Lv.{level} 達成',
    spotlight: '{name} さんにスポットライト！',
    claim: '{name} さん「{claim}」',
  },
});

export const STAMP_MAX_COUNT = 8;
export const CLAIM_MAX_COUNT = 8;
export const CLAIM_MAX_LENGTH = 15;
export const STAMP_MAX_LENGTH = 8;   // 1 つのスタンプの文字数（絵文字は複数の文字でできていることがある）
export const TELOP_MAX_LENGTH = 60;
export const METER_GOAL_MIN = 10;
export const METER_GOAL_MAX = 10000;

const FLAGS = ['telopEnabled', 'stampsEnabled', 'clapEnabled', 'spotlightEnabled', 'meterEnabled', 'claimsEnabled'];
const BAD_CHARS = /[\u0000-\u001f\u007f<>]/;

function cloneDefaults() {
  return {
    ...DEFAULT_CHEER_SETTINGS, stamps: [...DEFAULT_CHEER_SETTINGS.stamps],
    claims: [...DEFAULT_CHEER_SETTINGS.claims], telops: { ...DEFAULT_CHEER_SETTINGS.telops },
  };
}

function checkStamp(s) {
  if (typeof s !== 'string') return null;
  const t = s.normalize('NFC').trim();
  const len = [...t].length;
  if (len < 1 || len > STAMP_MAX_LENGTH || /\s/.test(t) || BAD_CHARS.test(t)) return null;
  return t;
}

function checkClaim(s) {
  if (typeof s !== 'string') return null;
  const t = s.normalize('NFC').replace(/\s+/g, ' ').trim();
  const len = [...t].length;
  if (len < 1 || len > CLAIM_MAX_LENGTH || BAD_CHARS.test(t)) return null;
  return t;
}

function checkTelop(s) {
  if (typeof s !== 'string') return null;
  const t = s.normalize('NFC').replace(/\s+/g, ' ').trim();
  if ([...t].length > TELOP_MAX_LENGTH || BAD_CHARS.test(t)) return null;
  return t; // 空文字はそのテロップを出さない
}

/**
 * 管理画面から送られた設定を確かめる。
 * 戻り値: { ok: true, settings } | { ok: false, error }（error は画面に出す日本語）
 */
export function validateCheerSettings(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: '設定の形式が正しくありません。' };
  const settings = cloneDefaults();
  for (const f of FLAGS) {
    if (typeof input[f] !== 'boolean') return { ok: false, error: '機能のオンオフの指定が正しくありません。' };
    settings[f] = input[f];
  }
  if (!Array.isArray(input.stamps) || input.stamps.length < 1 || input.stamps.length > STAMP_MAX_COUNT) {
    return { ok: false, error: `スタンプは 1〜${STAMP_MAX_COUNT} 個で指定してください。` };
  }
  const stamps = [];
  for (const s of input.stamps) {
    const t = checkStamp(s);
    if (!t) return { ok: false, error: `スタンプは 1 つあたり ${STAMP_MAX_LENGTH} 文字以内で、空白と < > は使えません。` };
    if (stamps.includes(t)) return { ok: false, error: `同じスタンプ（${t}）が 2 回入っています。` };
    stamps.push(t);
  }
  settings.stamps = stamps;
  if (!Array.isArray(input.claims) || input.claims.length < 1 || input.claims.length > CLAIM_MAX_COUNT) {
    return { ok: false, error: `主張スタンプは 1〜${CLAIM_MAX_COUNT} 個で指定してください。` };
  }
  const claims = [];
  for (const c of input.claims) {
    const t = checkClaim(c);
    if (!t) return { ok: false, error: `主張スタンプは 1 つあたり ${CLAIM_MAX_LENGTH} 文字以内で、< > は使えません。` };
    if (claims.includes(t)) return { ok: false, error: `同じ主張スタンプ（${t}）が 2 回入っています。` };
    claims.push(t);
  }
  settings.claims = claims;
  if (!Number.isInteger(input.meterGoal) || input.meterGoal < METER_GOAL_MIN || input.meterGoal > METER_GOAL_MAX) {
    return { ok: false, error: `メーターの目標は ${METER_GOAL_MIN}〜${METER_GOAL_MAX} の整数で指定してください。` };
  }
  settings.meterGoal = input.meterGoal;
  const telops = input.telops;
  if (!telops || typeof telops !== 'object') return { ok: false, error: 'テロップの文言の形式が正しくありません。' };
  for (const k of TELOP_KEYS) {
    const t = checkTelop(telops[k] ?? '');
    if (t === null) return { ok: false, error: `テロップの文言は ${TELOP_MAX_LENGTH} 文字以内で、< > は使えません。` };
    settings.telops[k] = t;
  }
  return { ok: true, settings };
}

/**
 * DB に保存してある設定を読み込む。足りない項目や壊れた値は初期値で補う
 * （項目を増やしても、保存済みの設定を手直しせずに使えるように）。
 */
export function loadCheerSettings(saved) {
  const merged = cloneDefaults();
  if (!saved || typeof saved !== 'object') return merged;
  for (const f of FLAGS) if (typeof saved[f] === 'boolean') merged[f] = saved[f];
  if (Array.isArray(saved.stamps)) {
    const stamps = [...new Set(saved.stamps.map(checkStamp).filter(Boolean))].slice(0, STAMP_MAX_COUNT);
    if (stamps.length > 0) merged.stamps = stamps;
  }
  if (Array.isArray(saved.claims)) {
    const claims = [...new Set(saved.claims.map(checkClaim).filter(Boolean))].slice(0, CLAIM_MAX_COUNT);
    if (claims.length > 0) merged.claims = claims;
  }
  if (Number.isInteger(saved.meterGoal) && saved.meterGoal >= METER_GOAL_MIN && saved.meterGoal <= METER_GOAL_MAX) {
    merged.meterGoal = saved.meterGoal;
  }
  if (saved.telops && typeof saved.telops === 'object') {
    for (const k of TELOP_KEYS) {
      const t = checkTelop(saved.telops[k]);
      if (t !== null) merged.telops[k] = t;
    }
  }
  return merged;
}

// 参加者の画面に配る設定（テロップの文言はサーバで組み立てるので渡さない）
export function publicCheerSettings(s) {
  return {
    telopEnabled: s.telopEnabled, stampsEnabled: s.stampsEnabled, clapEnabled: s.clapEnabled,
    spotlightEnabled: s.spotlightEnabled, meterEnabled: s.meterEnabled, claimsEnabled: s.claimsEnabled,
    stamps: s.stamps, claims: s.claims, meterGoal: s.meterGoal,
  };
}

// テロップの文言の {name} {id} {score} {rank} {level} {claim} を差し込む
export function renderTelop(template, vars = {}) {
  return String(template || '').replace(/\{(name|id|score|rank|level|claim)\}/g, (_, k) => (vars[k] ?? '').toString());
}

export const SEND_INTERVAL_MS = 1000;  // スタンプ・拍手・主張は 1 接続あたり 1 秒に 1 回まで
export const LIKE_INTERVAL_MS = 300;   // いいねは何人かに続けて押せるよう短めにする
export const BURST_INTERVAL_MS = 500;  // スタンプをまとめて配る間隔
export const TELOP_INTERVAL_MS = 2500; // テロップを配る最短の間隔
export const TELOP_QUEUE_MAX = 3;      // 配りきれないテロップは新しいものを 3 件まで残す
export const SPOTLIGHT_COOLDOWN_MS = 3000;

/**
 * にぎやかしの状態（イベント 1 回分）。
 * emit(event, payload) で参加者の画面（と管理画面）へ配る。
 */
export class CheerHub {
  constructor({ emit, getSettings, now = () => Date.now(), timers = globalThis }) {
    this.emit = emit;
    this.getSettings = getSettings;
    this.now = now;
    this.timers = timers;
    this.lastSend = new Map(); // `${socketId}:種類` -> 時刻
    this.burstTimer = null;
    this.telopTimer = null;
    this.reset();
  }

  // イベント開始時に呼ぶ。拍手の数やメーターを 0 に戻す
  reset() {
    this.pendingStamps = [];
    this.meterDirty = false;
    this.meter = { value: 0, level: 0 };
    this.claps = new Map(); // 社員番号 -> もらった拍手の数
    this.claims = new Map(); // 社員番号 -> { seq, text, likers: Set(いいねした社員番号), counted: Set(メーターに足した社員番号) }
    this.claimSeq = 0;
    this.telopQueue = [];
    this.lastTelopAt = 0;
    this.lastSpotlightAt = 0;
  }

  meterState() {
    return { value: this.meter.value, goal: this.getSettings().meterGoal, level: this.meter.level };
  }

  clapsOf(userId) {
    return this.claps.get(userId) || 0;
  }

  // ランキングに載せる主張（無ければ null）
  claimOf(userId) {
    const c = this.claims.get(userId);
    return c ? { seq: c.seq, text: c.text, likes: c.likers.size } : null;
  }

  forget(socketId) {
    for (const kind of ['stamp', 'clap', 'claim', 'like']) this.lastSend.delete(`${socketId}:${kind}`);
  }

  // 送る間隔の制限（既定は 1 秒に 1 回まで）。送ってよければ true
  allow(socketId, kind, interval = SEND_INTERVAL_MS) {
    const key = `${socketId}:${kind}`;
    const t = this.now();
    if (t - (this.lastSend.get(key) || 0) < interval) return false;
    this.lastSend.set(key, t);
    return true;
  }

  // B. スタンプ。index は設定のスタンプの何番目か
  stamp(socketId, index) {
    const s = this.getSettings();
    if (!s.stampsEnabled || !Number.isInteger(index) || index < 0 || index >= s.stamps.length) return false;
    if (!this.allow(socketId, 'stamp')) return false;
    this.pendingStamps[index] = (this.pendingStamps[index] || 0) + 1;
    this.addMeter(1);
    this.scheduleBurst();
    return true;
  }

  // C. 拍手。数えたら相手のもらった拍手の合計を返す（送れなければ null）
  clap(socketId, toUserId) {
    if (!this.getSettings().clapEnabled) return null;
    if (!this.allow(socketId, 'clap')) return null;
    const total = this.clapsOf(toUserId) + 1;
    this.claps.set(toUserId, total);
    this.addMeter(1);
    this.scheduleBurst();
    return total;
  }

  // F. 主張スタンプ。index は設定の主張の何番目か。出せたらその文言を返す（出せなければ null）。
  // 1 人 1 つだけ表示し、別の主張を出すと置き換わる（いいねは 0 から）。同じ主張を押し直しても何もしない
  postClaim(socketId, userId, index) {
    const s = this.getSettings();
    if (!s.claimsEnabled || !Number.isInteger(index) || index < 0 || index >= s.claims.length) return null;
    const text = s.claims[index];
    if (this.claims.get(userId)?.text === text) return null;
    if (!this.allow(socketId, 'claim')) return null;
    this.claims.set(userId, { seq: ++this.claimSeq, text, likers: new Set(), counted: new Set() });
    this.addMeter(1);
    this.scheduleBurst();
    return text;
  }

  // 主張への「いいね」。1 つの主張に 1 人 1 回で、もう一度押すと取り消す。
  // seq は押したときに見えていた主張（置き換わっていたら無効）。戻り値: { liked, likes } または null
  toggleLike(socketId, likerId, targetId, seq) {
    if (!this.getSettings().claimsEnabled || likerId === targetId) return null;
    const c = this.claims.get(targetId);
    if (!c || c.seq !== seq) return null;
    if (!this.allow(socketId, 'like', LIKE_INTERVAL_MS)) return null;
    let liked;
    if (c.likers.has(likerId)) {
      c.likers.delete(likerId);
      liked = false;
    } else {
      c.likers.add(likerId);
      liked = true;
      // 押す・取り消すを繰り返してメーターをためられないよう、メーターには 1 人 1 回だけ足す
      if (!c.counted.has(likerId)) {
        c.counted.add(likerId);
        this.addMeter(1);
        this.scheduleBurst();
      }
    }
    return { liked, likes: c.likers.size };
  }

  // D. スポットライト。続けて押されたときは 3 秒あける
  canSpotlight() {
    if (!this.getSettings().spotlightEnabled) return false;
    if (this.now() - this.lastSpotlightAt < SPOTLIGHT_COOLDOWN_MS) return false;
    this.lastSpotlightAt = this.now();
    return true;
  }

  // E. 盛り上がりメーター。目標に届いたら満タンの演出を配り、0 から次のレベルへ
  addMeter(n) {
    const s = this.getSettings();
    if (!s.meterEnabled) return;
    this.meter.value += n;
    this.meterDirty = true;
    if (this.meter.value >= s.meterGoal) {
      this.meter.level += 1;
      this.meter.value = 0;
      this.emit('cheerMeterFull', { level: this.meter.level });
      this.telop('meterFull', { level: this.meter.level });
    }
  }

  scheduleBurst() {
    if (this.burstTimer) return;
    this.burstTimer = this.timers.setTimeout(() => {
      this.burstTimer = null;
      this.flushBurst();
    }, BURST_INTERVAL_MS);
  }

  flushBurst() {
    const stamps = this.pendingStamps;
    const hasStamps = stamps.some(n => n > 0);
    if (!hasStamps && !this.meterDirty) return;
    this.pendingStamps = [];
    this.meterDirty = false;
    const payload = { stamps: Array.from(stamps, n => n || 0) };
    if (this.getSettings().meterEnabled) payload.meter = this.meterState();
    this.emit('cheerBurst', payload);
  }

  // A. 実況テロップ。間隔をあけて 1 件ずつ配り、たまりすぎたら古いものから捨てる
  telop(key, vars = {}) {
    const s = this.getSettings();
    if (!s.telopEnabled) return false;
    const text = renderTelop(s.telops[key], vars).trim();
    if (!text) return false;
    this.telopQueue.push(text);
    if (this.telopQueue.length > TELOP_QUEUE_MAX) this.telopQueue.shift();
    this.drainTelop();
    return true;
  }

  drainTelop() {
    if (this.telopTimer || this.telopQueue.length === 0) return;
    const wait = this.lastTelopAt + TELOP_INTERVAL_MS - this.now();
    if (wait <= 0) {
      this.lastTelopAt = this.now();
      this.emit('cheerTelop', { text: this.telopQueue.shift() });
      if (this.telopQueue.length === 0) return;
    }
    this.telopTimer = this.timers.setTimeout(() => {
      this.telopTimer = null;
      this.drainTelop();
    }, wait > 0 ? wait : TELOP_INTERVAL_MS);
  }

  // サーバ終了時やテスト後に、残っているタイマーを止める
  stop() {
    if (this.burstTimer) this.timers.clearTimeout(this.burstTimer);
    if (this.telopTimer) this.timers.clearTimeout(this.telopTimer);
    this.burstTimer = null;
    this.telopTimer = null;
  }
}

/**
 * スコア更新で順位がどう変わったかから、出すテロップを決める。
 * before / after: 更新前と更新後の { 社員番号: { score } }
 * 戻り値: { key: 'leader' | 'rankUp', rank } または null
 * - 1 位が別の人に替わった → leader
 * - 3 位以内に新しく入った、または順位が上がった → rankUp
 */
export function rankChangeTelop(before, after, userId) {
  const rankIn = (map) => {
    const list = Object.entries(map).sort((a, b) => b[1].score - a[1].score);
    const i = list.findIndex(([id]) => id === userId);
    return { rank: i < 0 ? null : i + 1, leader: list[0]?.[0] ?? null };
  };
  const prev = rankIn(before);
  const next = rankIn(after);
  if (next.rank === 1 && prev.leader !== userId) return { key: 'leader', rank: 1 };
  if (next.rank !== null && next.rank <= 3 && (prev.rank === null || next.rank < prev.rank)) {
    return { key: 'rankUp', rank: next.rank };
  }
  return null;
}
