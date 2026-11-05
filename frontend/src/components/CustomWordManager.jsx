import React, { useState, useEffect, useMemo } from 'react';
import { CATEGORIES, GENRES_BY_CATEGORY } from '../words';
import { TypingSession } from '../utils/typingEngine';

const WORDS_API = '/admin/api/custom-words';

const ALL_GENRES = '';

const inputStyle = { padding: '10px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '1em', width: '100%', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '6px' };
const cellStyle = { padding: '10px', borderBottom: '1px solid #eee', textAlign: 'left', verticalAlign: 'top' };

// 読み仮名から、受験者の画面に出るローマ字を作る
function romajiOf(ruby, text) {
  try {
    return ruby.trim() ? new TypingSession(ruby.trim(), text).state.targetRomaji : '';
  } catch {
    return '';
  }
}

export default function CustomWordManager() {
  const [words, setWords] = useState([]);
  const [genre, setGenre] = useState(CATEGORIES.BUSINESS);
  const [text, setText] = useState('');
  const [ruby, setRuby] = useState('');
  const [filter, setFilter] = useState(ALL_GENRES);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'ok', text }

  const load = async () => {
    try {
      const res = await fetch(WORDS_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setWords(await res.json());
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: '出題文の一覧を取得できませんでした。' });
    }
  };

  useEffect(() => { load(); }, []);

  const romaji = useMemo(() => romajiOf(ruby, text), [ruby, text]);
  const shown = useMemo(() => (filter === ALL_GENRES ? words : words.filter(w => w.genre === filter)), [words, filter]);

  const genreOptions = Object.entries(GENRES_BY_CATEGORY).map(([category, genres]) => (
    <optgroup key={category} label={category}>
      {genres.map(g => <option key={g} value={g}>{g}</option>)}
    </optgroup>
  ));

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(WORDS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre, text, ruby }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '出題文を追加できませんでした。' });
        return;
      }
      setMessage({ type: 'ok', text: `「${data.text}」を ${data.genre} に追加しました。` });
      setText('');
      setRuby('');
      load();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: '出題文を追加できませんでした。' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (w) => {
    if (!window.confirm(`「${w.text}」を削除しますか？`)) return;
    try {
      const res = await fetch(`${WORDS_API}/${w.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessage({ type: 'ok', text: `「${w.text}」を削除しました。` });
      load();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: '出題文を削除できませんでした。' });
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eaeaea', marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', marginTop: 0, borderBottom: '2px solid #00897b', paddingBottom: '10px', fontSize: '1.4em' }}>
          ➕ 出題文を追加
        </h2>
        <p style={{ color: '#666', fontSize: '0.9em', lineHeight: '1.6' }}>
          追加した問題は、CPU 対戦・オンライン対戦・イベントのうち、選んだジャンルが出題される場面で使われます。
          開いている画面にもすぐ反映されます。
        </p>

        <form onSubmit={handleAdd} style={{ display: 'grid', gap: '15px', maxWidth: '640px' }}>
          <div>
            <label style={labelStyle} htmlFor="word-genre">ジャンル</label>
            <select id="word-genre" value={genre} onChange={e => setGenre(e.target.value)} style={inputStyle}>
              {genreOptions}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="word-text">問題文</label>
            <input id="word-text" value={text} onChange={e => setText(e.target.value)} maxLength={60} placeholder="例: 明日の会議資料を送付します" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="word-ruby">読み仮名</label>
            <input id="word-ruby" value={ruby} onChange={e => setRuby(e.target.value)} maxLength={80} placeholder="例: あしたのかいぎしりょうをそうふします" style={inputStyle} />
            <div style={{ color: '#888', fontSize: '0.85em', marginTop: '6px' }}>
              ひらがな・長音（ー）・半角英数字・半角記号で入力してください。カタカナや全角文字は打てないため登録できません。
            </div>
          </div>
          <div>
            <div style={labelStyle}>入力するローマ字</div>
            <div data-testid="romaji-preview" style={{ padding: '10px', background: '#f5f5f5', borderRadius: '5px', fontFamily: 'monospace', minHeight: '1.2em', wordBreak: 'break-all' }}>
              {romaji || '—'}
            </div>
          </div>
          <div>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', fontSize: '1em', background: '#00897b', color: '#fff', border: 'none', borderRadius: '5px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              追加する
            </button>
          </div>
        </form>

        {message && (
          <p role="status" style={{ color: message.type === 'error' ? '#c62828' : '#2e7d32', marginBottom: 0, fontWeight: 'bold' }}>
            {message.text}
          </p>
        )}
      </div>

      <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '1.4em' }}>
            追加した出題文（{shown.length} 件）
          </h2>
          <select aria-label="ジャンルで絞り込み" value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
            <option value={ALL_GENRES}>すべてのジャンル</option>
            {genreOptions}
          </select>
        </div>

        {shown.length === 0 ? (
          <p style={{ color: '#888', margin: 0 }}>追加した出題文はまだありません。</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={cellStyle}>ジャンル</th>
                  <th style={cellStyle}>問題文</th>
                  <th style={cellStyle}>読み仮名</th>
                  <th style={cellStyle}></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(w => (
                  <tr key={w.id}>
                    <td style={cellStyle}>{w.genre}</td>
                    <td style={cellStyle}>{w.text}</td>
                    <td style={cellStyle}>{w.ruby}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <button onClick={() => handleDelete(w)} style={{ padding: '6px 14px', background: '#fff', color: '#c62828', border: '1px solid #c62828', borderRadius: '5px', cursor: 'pointer' }}>
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
