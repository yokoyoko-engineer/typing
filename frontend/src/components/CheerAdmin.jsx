import React, { useEffect, useMemo, useState } from 'react';

// 管理画面の「にぎやかし」: 開催中の操作（スポットライト）と設定

const API = '/admin/api/cheer-settings';

const FEATURES = [
  { key: 'telopEnabled', label: 'A. 実況テロップ', note: '1位の交代・3位以内への浮上・残り1分などをランキング欄の上に流す' },
  { key: 'stampsEnabled', label: 'B. リアクションスタンプ', note: 'タイピングを終えた人がスタンプを送り、画面に浮かべる' },
  { key: 'clapEnabled', label: 'C. 宛先つき拍手', note: 'ランキングの人を選んで拍手を送る。本人に「拍手が届きました」と出る' },
  { key: 'spotlightEnabled', label: 'D. スポットライト', note: '管理画面で選んだ人を大きく表示する' },
  { key: 'meterEnabled', label: 'E. 盛り上がりメーター', note: 'スタンプ・拍手・主張・いいねでたまる。Lv.10 まで、レベルが上がるほど演出が豪華に' },
  { key: 'claimsEnabled', label: 'F. 主張スタンプ', note: '「自己ベスト更新！」などを本人がランキングの自分の行に出し、ほかの人が「いいね」できる。出すと画面に浮かぶ' },
];

const TELOPS = [
  { key: 'start', label: 'イベント開始', vars: '' },
  { key: 'leader', label: '1位が替わったとき', vars: '{name} {id} {score}' },
  { key: 'rankUp', label: '3位以内に浮上したとき', vars: '{name} {id} {score} {rank}' },
  { key: 'oneMinute', label: '残り1分', vars: '' },
  { key: 'meterFull', label: '盛り上がりのレベルアップ', vars: '{level}' },
  { key: 'spotlight', label: 'スポットライト', vars: '{name} {id} {score} {rank}' },
  { key: 'claim', label: '主張スタンプを出したとき', vars: '{name} {id} {claim}' },
];

const cardStyle = { textAlign: 'left', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '30px' };
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '1em', boxSizing: 'border-box' };

// 開催中: 盛り上がりメーター・流れたテロップ・スポットライトを当てる人の一覧
export function CheerLivePanel({ socket }) {
  const [ranking, setRanking] = useState([]);
  const [telops, setTelops] = useState([]); // 新しい順に 5 件
  const [meter, setMeter] = useState(null);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState(null); // { ok, text }

  useEffect(() => {
    if (!socket) return;
    // 管理画面向けの配信（admin_room）に入り、今の状態をもらう。つながり直したときも入り直す
    const subscribe = () => {
      socket.emit('adminGetLobby');
      socket.emit('getTournamentLiveRanking');
      socket.emit('getCheerState', (res) => { if (res) setMeter(res.meter); });
    };
    socket.on('connect', subscribe);
    if (socket.connected) subscribe();
    const onRanking = (list) => setRanking(Array.isArray(list) ? list : []);
    const onTelop = ({ text }) => setTelops(prev => [{ text, at: new Date() }, ...prev].slice(0, 5));
    const onBurst = (b) => { if (b?.meter) setMeter(b.meter); };
    const onFull = ({ level }) => setMeter(m => (m ? { ...m, value: 0, level } : m));
    socket.on('tournamentLiveRanking', onRanking);
    socket.on('cheerTelop', onTelop);
    socket.on('cheerBurst', onBurst);
    socket.on('cheerMeterFull', onFull);
    return () => {
      socket.off('connect', subscribe);
      socket.off('tournamentLiveRanking', onRanking);
      socket.off('cheerTelop', onTelop);
      socket.off('cheerBurst', onBurst);
      socket.off('cheerMeterFull', onFull);
    };
  }, [socket]);

  const shown = useMemo(() => {
    const q = filter.trim();
    const list = ranking.map((r, i) => ({ ...r, rank: i + 1 }));
    if (!q) return list;
    return list.filter(r => r.user_id.includes(q) || (r.name || '').includes(q));
  }, [ranking, filter]);

  const spotlight = (row) => {
    setMessage(null);
    socket?.timeout(5000).emit('adminSpotlight', row.user_id, (err, res) => {
      if (err) return setMessage({ ok: false, text: 'サーバから返事がありません。もう一度押してください。' });
      if (res?.error) return setMessage({ ok: false, text: res.error });
      setMessage({ ok: true, text: `${row.user_id}${row.name ? ` ${row.name}` : ''} さんを表示しました。` });
    });
  };

  return (
    <div style={{ ...cardStyle, borderLeft: '5px solid #fdd835', borderRadius: 0 }}>
      <h3 style={{ marginTop: 0, color: '#2c3e50', textAlign: 'center' }}>🎉 にぎやかし（開催中の操作）</h3>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start', textAlign: 'left' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h4 style={{ margin: '0 0 8px', color: '#5c6bc0' }}>盛り上がりメーター</h4>
          {meter ? (
            <div style={{ marginBottom: '15px' }}>
              Lv.{meter.level}　{meter.goal == null ? 'MAX' : `${meter.value} / ${meter.goal}`}
              <div style={{ height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden', marginTop: '5px' }}>
                <div style={{ width: `${meter.goal == null ? 100 : Math.min(100, (meter.value / Math.max(1, meter.goal)) * 100)}%`, height: '100%', background: '#ff9800' }} />
              </div>
            </div>
          ) : <p style={{ color: '#aaa' }}>—</p>}
          <h4 style={{ margin: '0 0 8px', color: '#5c6bc0' }}>流れたテロップ（新しい順）</h4>
          {telops.length === 0 ? (
            <p style={{ color: '#aaa', margin: 0 }}>まだありません</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '18px', color: '#444' }}>
              {telops.map((t, i) => (
                <li key={i} style={{ overflowWrap: 'anywhere' }}>
                  <span style={{ color: '#999', marginRight: '6px' }}>{t.at.toLocaleTimeString('ja-JP')}</span>{t.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ flex: '2 1 380px', minWidth: 0 }}>
          <h4 style={{ margin: '0 0 8px', color: '#5c6bc0' }}>スポットライトを当てる（参加者の画面に大きく表示）</h4>
          <input
            type="search"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="社員番号・氏名で絞り込み"
            style={{ ...inputStyle, marginBottom: '8px' }}
          />
          {message && (
            <p role="status" style={{ margin: '0 0 8px', fontWeight: 'bold', color: message.ok ? '#2e7d32' : '#c62828' }}>{message.text}</p>
          )}
          <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '5px' }}>
            {shown.length === 0 ? (
              <p style={{ color: '#aaa', textAlign: 'center' }}>{ranking.length === 0 ? 'イベントの開催中に、スコアが出た人がここに並びます' : '該当する人がいません'}</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <tbody>
                  {shown.map(r => (
                    <tr key={r.user_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ width: '45px', padding: '6px', color: '#888' }}>{r.rank}位</td>
                      <td style={{ padding: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${r.user_id} ${r.name || ''}`}>
                        {r.jobType ? `[${r.jobType}] ` : ''}{r.user_id} {r.name || ''}
                        {r.claim && <span style={{ marginLeft: '6px', fontSize: '0.85em', color: '#3949ab' }}>「{r.claim.text}」👍{r.claim.likes}</span>}
                      </td>
                      <td style={{ width: '60px', padding: '6px', textAlign: 'right', fontWeight: 'bold', color: '#e8734a' }}>{r.score}</td>
                      <td style={{ width: '55px', padding: '6px', textAlign: 'right', color: '#e65100' }}>👏{r.claps || 0}</td>
                      <td style={{ width: '130px', padding: '6px', textAlign: 'right' }}>
                        <button type="button" onClick={() => spotlight(r)} style={{ whiteSpace: 'nowrap', padding: '5px 10px', border: 'none', borderRadius: '5px', background: '#fdd835', color: '#5d4037', fontWeight: 'bold', cursor: 'pointer' }}>
                          スポットライト
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 設定: 機能のオンオフ・スタンプの種類・メーターの目標・テロップの文言（まとめて保存）
export function CheerSettingsPanel() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [stampText, setStampText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }

  const [claimText, setClaimText] = useState('');
  const applyLoaded = (s) => {
    setSaved(s);
    setForm(s);
    setStampText(s.stamps.join(' '));
    setClaimText(s.claims.join('\n'));
  };

  useEffect(() => {
    let stale = false;
    fetch(API)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(s => { if (!stale) applyLoaded(s); })
      .catch(err => { console.error(err); if (!stale) setMessage({ ok: false, text: 'にぎやかしの設定を取得できませんでした。' }); });
    return () => { stale = true; };
  }, []);

  if (!form) {
    return (
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#2c3e50', textAlign: 'center' }}>🎉 にぎやかしの設定</h3>
        {message ? <p role="alert" style={{ color: '#c62828', fontWeight: 'bold' }}>{message.text}</p> : <p style={{ color: '#888' }}>読み込み中…</p>}
      </div>
    );
  }

  const stamps = stampText.split(/\s+/).filter(Boolean);
  const claims = claimText.split('\n').map(c => c.trim()).filter(Boolean);
  const draft = { ...form, stamps, claims };
  const dirty = saved && JSON.stringify(draft) !== JSON.stringify(saved);
  const set = (patch) => { setForm(f => ({ ...f, ...patch })); setMessage(null); };
  const setTelop = (key, value) => { setForm(f => ({ ...f, telops: { ...f.telops, [key]: value } })); setMessage(null); };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, meterFirstGoal: Number(form.meterFirstGoal), meterGoalStep: Number(form.meterGoalStep) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      applyLoaded(body);
      setMessage({ ok: true, text: '保存しました。参加者の画面にすぐ反映されます。' });
    } catch (err) {
      setMessage({ ok: false, text: err.message.startsWith('HTTP') ? '保存できませんでした。もう一度お試しください。' : err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, color: '#2c3e50', textAlign: 'center' }}>🎉 にぎやかしの設定</h3>
      <p style={{ color: '#666', fontSize: '0.9em', marginTop: 0 }}>
        動く演出は、タイピング中の人には出しません（ランキング欄のテロップと数字だけ変わります）。スタンプ・拍手・主張スタンプは 1 人 1 秒に 1 回まで、いいねは 1 つの主張に 1 人 1 回（もう一度押すと取り消し）です。
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '8px', marginBottom: '20px' }}>
        {FEATURES.map(f => (
          <label key={f.key} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', background: form[f.key] ? '#fffde7' : '#f5f5f5', cursor: 'pointer' }}>
            <input type="checkbox" role="switch" checked={form[f.key]} onChange={e => set({ [f.key]: e.target.checked })} style={{ flex: 'none', width: '18px', height: '18px', margin: '2px 0 0' }} />
            <span>
              <span style={{ fontWeight: 'bold', color: form[f.key] ? '#2c3e50' : '#888' }}>{f.label}</span>
              <span style={{ marginLeft: '8px', fontSize: '0.85em', color: form[f.key] ? '#2e7d32' : '#888' }}>{form[f.key] ? 'オン' : 'オフ'}</span>
              <span style={{ display: 'block', fontSize: '0.85em', color: '#777' }}>{f.note}</span>
            </span>
          </label>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <label>
          <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>スタンプ（空白で区切る・8 個まで・左から順に並ぶ）</span>
          <input value={stampText} onChange={e => { setStampText(e.target.value); setMessage(null); }} style={inputStyle} placeholder="👏 🎉 🔥 😲 ❤️" />
          <span style={{ display: 'block', fontSize: '0.85em', color: '#777', marginTop: '4px' }}>
            表示: {stamps.length ? stamps.join('　') : '—'}
          </span>
        </label>
        <div>
          <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>盛り上がりメーターの目標（スタンプ・拍手・主張・いいねの回数）</span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Lv.1 まで
              <input type="number" min="1" max="10000" step="1" value={form.meterFirstGoal} onChange={e => set({ meterFirstGoal: e.target.value === '' ? '' : Number(e.target.value) })} style={{ ...inputStyle, width: '90px' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              1 レベルごとに +
              <input type="number" min="0" max="10000" step="1" value={form.meterGoalStep} onChange={e => set({ meterGoalStep: e.target.value === '' ? '' : Number(e.target.value) })} style={{ ...inputStyle, width: '90px' }} />
            </label>
          </div>
          <span style={{ display: 'block', fontSize: '0.85em', color: '#777', marginTop: '4px' }}>
            {Number.isInteger(form.meterFirstGoal) && Number.isInteger(form.meterGoalStep)
              ? `Lv.1: ${form.meterFirstGoal}、Lv.2: ${form.meterFirstGoal + form.meterGoalStep}、… Lv.10: ${form.meterFirstGoal + form.meterGoalStep * 9}（Lv.10 まで合計 ${form.meterFirstGoal * 10 + form.meterGoalStep * 45} 回。Lv.10 で打ち止め）`
              : '整数で入力してください'}
          </span>
        </div>
      </div>

      <label style={{ display: 'block', marginBottom: '20px' }}>
        <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>主張スタンプ（1 行に 1 つ・8 個まで・15 文字まで・上から順に並ぶ）</span>
        <textarea value={claimText} onChange={e => { setClaimText(e.target.value); setMessage(null); }} rows={Math.max(5, claimText.split('\n').length + 1)} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} placeholder={'自己ベスト更新！\n初250！'} />
      </label>

      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>テロップの文言（空にするとそのテロップは出ません・60 文字まで）</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, max-content) minmax(0, 1fr)', gap: '8px 12px', alignItems: 'center', marginBottom: '20px' }}>
        {TELOPS.map(t => (
          <React.Fragment key={t.key}>
            <span style={{ color: '#555' }}>
              {t.label}
              {t.vars && <span style={{ display: 'block', fontSize: '0.8em', color: '#999' }}>使える: {t.vars}</span>}
            </span>
            <input value={form.telops[t.key]} onChange={e => setTelop(t.key, e.target.value)} maxLength={60} style={inputStyle} aria-label={`テロップ: ${t.label}`} />
          </React.Fragment>
        ))}
      </div>
      <p style={{ fontSize: '0.85em', color: '#777', marginTop: '-10px' }}>
        {'{name}'} は氏名（未入力なら社員番号）、{'{id}'} は社員番号、{'{score}'} はスコア、{'{rank}'} は順位、{'{level}'} はメーターのレベル、{'{claim}'} は主張スタンプの文言に置き換わります。
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <button type="button" onClick={save} disabled={saving || !dirty} style={{ padding: '10px 24px', fontSize: '1em', border: 'none', borderRadius: '6px', background: dirty ? '#ff9800' : '#ccc', color: '#fff', fontWeight: 'bold', cursor: dirty && !saving ? 'pointer' : 'default' }}>
          {saving ? '保存中…' : 'まとめて保存'}
        </button>
        {dirty && !saving && <span style={{ color: '#e65100' }}>保存していない変更があります</span>}
        {message && <span role={message.ok ? 'status' : 'alert'} style={{ fontWeight: 'bold', color: message.ok ? '#2e7d32' : '#c62828' }}>{message.text}</span>}
      </div>
    </div>
  );
}
