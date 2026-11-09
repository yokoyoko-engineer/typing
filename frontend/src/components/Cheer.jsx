import React, { useEffect, useRef, useState } from 'react';
import './Cheer.css';

// イベント BATTLE の「にぎやかし」（実況テロップ・スタンプ・拍手・スポットライト・盛り上がりメーター）の画面部品。
// まだ打っている人の邪魔をしないよう、動く演出（浮かぶスタンプ・スポットライト・紙吹雪）は
// 打っていない間だけ表示する。打っている間はランキング欄のテロップと数字だけが静かに変わる。

export const SEND_COOLDOWN_MS = 1000; // サーバと同じ「1 秒に 1 回まで」
const TELOP_SHOW_MS = 8000;
const SPOTLIGHT_SHOW_MS = 8000;
const CONFETTI_SHOW_MS = 3500;
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

    // メーターの目標は設定を変えたらすぐ反映する
    const shownMeter = meter && settings ? { ...meter, goal: settings.meterGoal } : meter;
    return { settings, meter: shownMeter };
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

// E. 盛り上がりメーター（ランキング欄の上）
export function CheerMeter({ meter }) {
    if (!meter) return null;
    const pct = Math.min(100, Math.round((meter.value / Math.max(1, meter.goal)) * 100));
    return (
        <div className="cheer-meter" title={`スタンプと拍手でたまります（${meter.value} / ${meter.goal}）`}>
            <span className="cheer-meter-label">盛り上がり Lv.{meter.level}</span>
            <div className="cheer-meter-track" role="meter" aria-valuemin={0} aria-valuemax={meter.goal} aria-valuenow={meter.value} aria-label="盛り上がりメーター">
                <div className="cheer-meter-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="cheer-meter-num">{meter.value}/{meter.goal}</span>
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

// 打っていない間だけ表示する演出（浮かぶスタンプ・スポットライト・紙吹雪）。
// 表示している間だけ受け取るので、打っている間に届いた分はあとから出ない
export function CheerEffects({ socket, settings }) {
    const [floating, setFloating] = useState([]); // { id, label, left, delay }
    const [spotlight, setSpotlight] = useState(null);
    const [confetti, setConfetti] = useState(null); // { id, level }
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

        const onBurst = ({ stamps } = {}) => {
            const list = settingsRef.current?.stamps || [];
            if (!Array.isArray(stamps)) return;
            const items = [];
            stamps.forEach((n, i) => {
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
            setConfetti({ id, level });
            later(() => setConfetti(cur => (cur && cur.id === id ? null : cur)), CONFETTI_SHOW_MS);
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
                <span key={f.id} className="cheer-float" style={{ left: `${f.left}%`, animationDelay: `${f.delay}ms` }}>{f.label}</span>
            ))}
            {confetti && <Confetti key={confetti.id} level={confetti.level} />}
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

const CONFETTI_COLORS = ['#ff9800', '#5c6bc0', '#e53935', '#43a047', '#fdd835', '#8e24aa'];
function Confetti({ level }) {
    const pieces = useRef(Array.from({ length: 40 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 600,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.round(Math.random() * 360),
    }))).current;
    return (
        <>
            {pieces.map((p, i) => (
                <span key={i} className="cheer-confetti" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}ms`, transform: `rotate(${p.rotate}deg)` }} />
            ))}
            <div className="cheer-meterfull">盛り上がりメーター満タン！ Lv.{level}</div>
        </>
    );
}
