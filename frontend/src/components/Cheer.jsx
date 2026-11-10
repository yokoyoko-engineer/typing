import React, { useEffect, useRef, useState } from 'react';
import './Cheer.css';

// イベント BATTLE の「にぎやかし」（実況テロップ・スタンプ・拍手・スポットライト・盛り上がりメーター）の画面部品。
// まだ打っている人の邪魔をしないよう、動く演出（浮かぶスタンプ・スポットライト・紙吹雪）は
// 打っていない間だけ表示する。打っている間はランキング欄のテロップと数字だけが静かに変わる。

export const SEND_COOLDOWN_MS = 1000; // サーバと同じ「1 秒に 1 回まで」
const TELOP_SHOW_MS = 8000;
const SPOTLIGHT_SHOW_MS = 8000;
const MAX_FLOATING = 24;

// 設定と盛り上がりメーターの値（画面を開いたとき・つながり直したときにサーバへ聞く）
export function useCheerState(socket) {
    const [settings, setSettings] = useState(null);
    const [meter, setMeter] = useState(null);

    useEffect(() => {
        if (!socket) return;
        const fetchState = () => {
            socket.emit('getCheerState', (res) => {
                if (!res) return;
                setSettings(res.settings);
                setMeter(res.meter);
            });
        };
        const onSettings = (s) => setSettings(s);
        const onBurst = (b) => { if (b && b.meter) setMeter(b.meter); };
        const onFull = ({ level }) => setMeter(m => (m ? { ...m, value: 0, level } : m));
        socket.on('cheerSettings', onSettings);
        socket.on('cheerBurst', onBurst);
        socket.on('cheerMeterFull', onFull);
        socket.on('connect', fetchState);
        if (socket.connected) fetchState();
        return () => {
            socket.off('cheerSettings', onSettings);
            socket.off('cheerBurst', onBurst);
            socket.off('cheerMeterFull', onFull);
            socket.off('connect', fetchState);
        };
    }, [socket]);

    // メーターの目標は設定を変えたらすぐ反映する（Lv.1 は 10、Lv.2 は 20 … のようにレベルで変わる）
    const shownMeter = meter && settings ? { ...meter, goal: meterGoalFor(settings, meter.level) } : meter;
    return { settings, meter: shownMeter };
}

// 次のレベル（level + 1）に上がるまでの目標。最大レベルなら null（サーバと同じ計算）
export function meterGoalFor(settings, level) {
    const max = settings.meterMaxLevel || 10;
    if (level >= max) return null;
    return settings.meterFirstGoal + settings.meterGoalStep * level;
}

// 1 秒に 1 回までの送信。押せない間は cooling が true
export function useCooldown() {
    const [cooling, setCooling] = useState(false);
    const timerRef = useRef(null);
    useEffect(() => () => clearTimeout(timerRef.current), []);
    const run = (fn) => {
        if (cooling) return;
        fn();
        setCooling(true);
        timerRef.current = setTimeout(() => setCooling(false), SEND_COOLDOWN_MS);
    };
    return [cooling, run];
}

// A. 実況テロップ（ランキング欄の上）。高さは固定して、出入りで画面が揺れないようにする
export function CheerTelop({ socket, animate }) {
    const [telop, setTelop] = useState(null); // { text, seq }
    const seqRef = useRef(0);

    useEffect(() => {
        if (!socket) return;
        let timer = null;
        const onTelop = ({ text }) => {
            if (!text) return;
            clearTimeout(timer);
            setTelop({ text, seq: ++seqRef.current });
            timer = setTimeout(() => setTelop(null), TELOP_SHOW_MS);
        };
        socket.on('cheerTelop', onTelop);
        return () => { socket.off('cheerTelop', onTelop); clearTimeout(timer); };
    }, [socket]);

    return (
        <div className="cheer-telop" role="status" aria-live="polite">
            {telop && (
                <span key={telop.seq} className={`cheer-telop-text${animate ? ' is-animated' : ''}`} title={telop.text}>
                    📣 {telop.text}
                </span>
            )}
        </div>
    );
}

// E. 盛り上がりメーター（ランキング欄の上）。レベルが上がるほどバーの色が派手になる。
// animate（打っていないとき）は伸びを目立たせる: 増えた分の「+3」が飛び出し、バーの先が光り、
// もうすぐレベルアップのときは脈打つ。打っている間は、バーが静かに伸びるだけにする
const METER_BUMP_MS = 900;
const METER_NEAR_PCT = 70; // ここから「もうすぐ」の表示にする
export function CheerMeter({ meter, animate }) {
    const level = meter?.level ?? 0;
    const value = meter?.value ?? 0;
    const [bump, setBump] = useState(null);    // { seq, gain }: 直前に増えた分
    const [levelUp, setLevelUp] = useState(false); // レベルアップ直後は、満タンのバーを少しの間見せる
    const prevRef = useRef(null);
    const seqRef = useRef(0);
    const bumpTimerRef = useRef(null);
    const levelTimerRef = useRef(null);
    const hasMeter = !!meter;

    useEffect(() => {
        if (!hasMeter) return;
        const prev = prevRef.current;
        prevRef.current = { level, value };
        if (!prev) return;
        if (level > prev.level) {
            setBump(null);
            setLevelUp(true);
            clearTimeout(levelTimerRef.current);
            levelTimerRef.current = setTimeout(() => setLevelUp(false), METER_BUMP_MS);
        } else if (level === prev.level && value > prev.value) {
            setBump({ seq: ++seqRef.current, gain: value - prev.value });
            clearTimeout(bumpTimerRef.current);
            bumpTimerRef.current = setTimeout(() => setBump(null), METER_BUMP_MS);
        }
    }, [hasMeter, level, value]);
    useEffect(() => () => { clearTimeout(bumpTimerRef.current); clearTimeout(levelTimerRef.current); }, []);

    if (!meter) return null;
    const isMax = meter.goal === null || meter.goal === undefined;
    const realPct = isMax ? 100 : Math.min(100, Math.round((value / Math.max(1, meter.goal)) * 100));
    const pct = levelUp ? 100 : realPct;
    const remain = isMax ? 0 : Math.max(0, meter.goal - value);
    const near = !isMax && !levelUp && realPct >= METER_NEAR_PCT;
    const tier = Math.min(3, Math.floor(level / 3)); // Lv.0-2 / 3-5 / 6-8 / 9-10
    let next;
    if (levelUp) next = 'レベルアップ！';
    else if (isMax) next = 'MAX！ 最高潮';
    else if (near) next = `あと ${remain} で Lv.${level + 1}！`;
    else next = `Lv.${level + 1} まで あと ${remain}`;
    const cls = ['cheer-meter', `tier-${tier}`, animate && 'is-animated', near && 'is-near', levelUp && 'is-levelup', isMax && 'is-max'].filter(Boolean).join(' ');

    return (
        <div className={cls} title={isMax ? '盛り上がりは最高レベルです' : `スタンプ・拍手・主張・いいねでたまります（${value} / ${meter.goal}）`}>
            <div className="cheer-meter-head">
                <span className="cheer-meter-title">盛り上がり</span>
                <span key={level} className="cheer-meter-level">Lv.{level}</span>
                <span className="cheer-meter-next">{next}</span>
            </div>
            <div className="cheer-meter-bar">
                <div className="cheer-meter-track" role="meter" aria-valuemin={0} aria-valuemax={isMax ? 1 : meter.goal} aria-valuenow={isMax ? 1 : value} aria-label="盛り上がりメーター">
                    <div className="cheer-meter-fill" style={{ width: `${pct}%` }}>
                        {animate && bump && <span key={bump.seq} className="cheer-meter-tip" />}
                    </div>
                    <span className="cheer-meter-num">{levelUp ? 'LEVEL UP！' : isMax ? 'MAX' : `${value} / ${meter.goal}`}</span>
                </div>
                {animate && bump && <span key={`p${bump.seq}`} className="cheer-meter-pulse" />}
                {animate && bump && (
                    <span key={`g${bump.seq}`} className="cheer-meter-gain" style={{ left: `${Math.min(94, Math.max(6, realPct))}%` }}>+{bump.gain}</span>
                )}
            </div>
        </div>
    );
}

// B. スタンプを送るボタン（タイピングを終えた人の画面）
export function StampBar({ socket, settings }) {
    const [cooling, run] = useCooldown();
    if (!settings || !settings.stampsEnabled || !settings.stamps?.length) return null;
    return (
        <div className="cheer-stampbar">
            <div className="cheer-stampbar-label">
                スタンプを送る
                {settings.clapEnabled && <small>右のランキングの 👏 で、その人に拍手</small>}
            </div>
            <div className="cheer-stampbar-buttons">
                {settings.stamps.map((s, i) => (
                    <button
                        key={`${i}-${s}`}
                        type="button"
                        className="cheer-stamp-btn"
                        aria-label={`スタンプ ${s} を送る`}
                        aria-disabled={cooling}
                        onClick={() => run(() => socket?.emit('sendCheerStamp', i))}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}

// F. 主張スタンプを出すボタン（タイピングを終えた人の画面）。押すとランキングの自分のスコアの横に付く。
// current: いま出している主張（押し直しても何も起きないので、選択中として見せる）
export function ClaimBar({ socket, settings, current }) {
    const [cooling, run] = useCooldown();
    if (!settings || !settings.claimsEnabled || !settings.claims?.length) return null;
    return (
        <div className="cheer-claimbar">
            <div className="cheer-stampbar-label">ランキングで主張する</div>
            <div className="cheer-claimbar-buttons">
                {settings.claims.map((c, i) => {
                    const selected = c === current;
                    return (
                        <button
                            key={`${i}-${c}`}
                            type="button"
                            className={`cheer-claim-btn${selected ? ' is-selected' : ''}`}
                            aria-pressed={selected}
                            aria-disabled={cooling && !selected}
                            onClick={() => { if (!selected) run(() => socket?.emit('sendClaim', i)); }}
                        >
                            {selected ? '✓ ' : ''}{c}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ランキングの主張バッジ。canLike のときは押して「いいね」（もう一度押すと取り消し）
export function ClaimBadge({ claim, canLike, liked, onLike }) {
    const body = (
        <>
            <span className="cheer-claim-text">{claim.text}</span>
            <span className="cheer-claim-likes">👍{claim.likes}</span>
        </>
    );
    if (!canLike) return <span className="cheer-claim">{body}</span>;
    return (
        <button
            type="button"
            className={`cheer-claim is-button${liked ? ' is-liked' : ''}`}
            aria-pressed={liked}
            aria-label={`「${claim.text}」に${liked ? 'いいね済み（押すと取り消し）' : 'いいねする'}`}
            onClick={onLike}
        >
            {body}
        </button>
    );
}

// 打っていない間だけ表示する演出（浮かぶスタンプ・主張・スポットライト・レベルアップ）。
// 表示している間だけ受け取るので、打っている間に届いた分はあとから出ない
export function CheerEffects({ socket, settings }) {
    const [floating, setFloating] = useState([]); // { id, label, left, delay }
    const [spotlight, setSpotlight] = useState(null);
    const [levelUp, setLevelUp] = useState(null); // { id, level }
    const idRef = useRef(0);
    const settingsRef = useRef(settings);
    settingsRef.current = settings;

    useEffect(() => {
        if (!socket) return;
        const timers = new Set();
        const later = (fn, ms) => {
            const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
            timers.add(t);
        };

        const onBurst = ({ stamps, claims } = {}) => {
            const list = settingsRef.current?.stamps || [];
            const items = [];
            // 主張スタンプ（「初300！」など）も浮かべる。たくさん来ても 4 個まで
            (Array.isArray(claims) ? claims : []).slice(0, 4).forEach(text => {
                items.push({ id: ++idRef.current, label: text, claim: true, left: 5 + Math.random() * 75, delay: Math.random() * 400 });
            });
            (Array.isArray(stamps) ? stamps : []).forEach((n, i) => {
                if (!n || !list[i]) return;
                // 同じスタンプが大量に来ても 4 個までにして、残りは「×数」で見せる
                const shown = Math.min(n, 4);
                for (let k = 0; k < shown; k++) {
                    items.push({
                        id: ++idRef.current,
                        label: k === 0 && n > shown ? `${list[i]}×${n}` : list[i],
                        left: 5 + Math.random() * 90,
                        delay: Math.random() * 400,
                    });
                }
            });
            if (items.length === 0) return;
            setFloating(prev => [...prev, ...items].slice(-MAX_FLOATING));
            const ids = new Set(items.map(x => x.id));
            later(() => setFloating(prev => prev.filter(x => !ids.has(x.id))), 3200);
        };
        const onSpotlight = (data) => {
            const id = ++idRef.current;
            setSpotlight({ ...data, id });
            later(() => setSpotlight(cur => (cur && cur.id === id ? null : cur)), SPOTLIGHT_SHOW_MS);
        };
        const onFull = ({ level }) => {
            const id = ++idRef.current;
            setLevelUp({ id, level });
            later(() => setLevelUp(cur => (cur && cur.id === id ? null : cur)), levelFx(level).duration);
        };

        socket.on('cheerBurst', onBurst);
        socket.on('cheerSpotlight', onSpotlight);
        socket.on('cheerMeterFull', onFull);
        return () => {
            socket.off('cheerBurst', onBurst);
            socket.off('cheerSpotlight', onSpotlight);
            socket.off('cheerMeterFull', onFull);
            timers.forEach(clearTimeout);
        };
    }, [socket]);

    return (
        <div className="cheer-effects" aria-hidden={!spotlight}>
            {floating.map(f => (
                <span key={f.id} className={`cheer-float${f.claim ? ' is-claim' : ''}`} style={{ left: `${f.left}%`, animationDelay: `${f.delay}ms` }}>{f.label}</span>
            ))}
            {levelUp && <LevelUp key={levelUp.id} level={levelUp.level} stamps={settings?.stamps || []} />}
            {spotlight && (
                <div key={spotlight.id} className="cheer-spotlight" role="status">
                    <div className="cheer-spotlight-eyebrow">🔦 スポットライト</div>
                    <div className="cheer-spotlight-name">
                        {spotlight.jobType ? <span className="cheer-spotlight-job">[{spotlight.jobType}]</span> : null}
                        {spotlight.name || spotlight.user_id}
                        {spotlight.name ? <span className="cheer-spotlight-id">{spotlight.user_id}</span> : null}
                    </div>
                    <div className="cheer-spotlight-stats">
                        {spotlight.rank ? <span>{spotlight.rank}位</span> : null}
                        <span>スコア {spotlight.score}</span>
                        {spotlight.claps > 0 ? <span>👏 {spotlight.claps}</span> : null}
                    </div>
                </div>
            )}
        </div>
    );
}

const FX_COLORS = ['#ff9800', '#5c6bc0', '#e53935', '#43a047', '#fdd835', '#8e24aa', '#00acc1', '#ec407a'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 盛り上がりのレベルごとの演出。レベルが上がるほど豪華にする
//  Lv.1-2 紙吹雪と帯 / Lv.3- 花火 / Lv.5- 画面のふちが光る / Lv.6- スタンプの雨
//  Lv.7- 中央に大きく「Lv.7」 / Lv.8- 金色 / Lv.10 虹色で「MAX」
export function levelFx(level) {
    const L = Math.max(1, Math.min(10, level || 1));
    return {
        level: L,
        confetti: 12 + L * 12,                 // 24 … 132 枚
        fireworks: L >= 3 ? Math.min(6, L - 2) : 0,
        flash: L >= 5,
        emojiRain: L >= 6 ? (L - 5) * 6 : 0,   // 6 … 30 個
        big: L >= 7,
        gold: L >= 8,
        rainbow: L >= 10,
        duration: 3000 + L * 400,              // 3.4 … 7 秒
    };
}

function LevelUp({ level, stamps }) {
    const fx = levelFx(level);
    // 位置や色は最初の 1 回だけ決める（描き直しで散らばり方が変わらないように）
    const parts = useRef(null);
    if (!parts.current) {
        const spread = Math.max(600, fx.duration - 3000); // 長い演出ほど後からも降らせる
        parts.current = {
            confetti: Array.from({ length: fx.confetti }, () => ({
                left: Math.random() * 100, delay: Math.random() * spread,
                color: fx.gold && Math.random() < 0.5 ? '#ffd700' : pick(FX_COLORS),
                rotate: Math.round(Math.random() * 360), wide: Math.random() < 0.3,
            })),
            fireworks: Array.from({ length: fx.fireworks }, (_, i) => ({
                left: 10 + Math.random() * 80, top: 12 + Math.random() * 40, delay: i * 450,
                color: fx.gold ? '#ffd700' : pick(FX_COLORS),
                sparks: Array.from({ length: 14 }, (_, k) => {
                    const a = (Math.PI * 2 * k) / 14;
                    const r = 60 + Math.random() * 40 + fx.level * 4;
                    return { dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r) };
                }),
            })),
            rain: Array.from({ length: fx.emojiRain }, () => ({
                left: Math.random() * 95, delay: Math.random() * spread, label: stamps.length ? pick(stamps) : '🎉',
            })),
        };
    }
    const { confetti, fireworks, rain } = parts.current;
    const isMax = fx.level >= 10;
    return (
        <div className={`cheer-levelup lv-${fx.level}${fx.gold ? ' is-gold' : ''}${fx.rainbow ? ' is-rainbow' : ''}`}>
            {fx.flash && <div className="cheer-levelup-flash" />}
            {confetti.map((p, i) => (
                <span key={`c${i}`} className="cheer-confetti" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}ms`, width: p.wide ? '14px' : '10px', transform: `rotate(${p.rotate}deg)` }} />
            ))}
            {fireworks.map((f, i) => (
                <span key={`f${i}`} className="cheer-firework" style={{ left: `${f.left}%`, top: `${f.top}%` }}>
                    {f.sparks.map((sp, k) => (
                        <span key={k} className="cheer-spark" style={{ '--dx': `${sp.dx}px`, '--dy': `${sp.dy}px`, background: f.color, animationDelay: `${f.delay}ms` }} />
                    ))}
                </span>
            ))}
            {rain.map((r, i) => (
                <span key={`r${i}`} className="cheer-rain" style={{ left: `${r.left}%`, animationDelay: `${r.delay}ms` }}>{r.label}</span>
            ))}
            {fx.big && <div className="cheer-levelup-big">{isMax ? 'MAX' : `Lv.${fx.level}`}</div>}
            <div className="cheer-meterfull" style={{ fontSize: `${1 + fx.level * 0.1}em` }}>
                {isMax ? '盛り上がり MAX！！ 最高潮です！' : `盛り上がり Lv.${fx.level}${fx.level >= 7 ? '！！' : '！'}`}
            </div>
        </div>
    );
}
