import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../words';

const API = '/admin/api/cpu-categories';

// CPU BATTLE のカテゴリ選択画面に出すカテゴリを切り替える
export default function CpuCategorySettings() {
  const [hidden, setHidden] = useState(null); // 読み込み前は null
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    fetch(API)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => { if (!stale) setHidden(data.hidden); })
      .catch(err => {
        console.error(err);
        if (!stale) setError('カテゴリの設定を取得できませんでした。');
      });
    return () => { stale = true; };
  }, []);

  const toggle = async (category, visible) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(API, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, visible }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHidden((await res.json()).hidden);
    } catch (err) {
      console.error(err);
      setError('設定を変更できませんでした。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const allHidden = hidden && Object.values(CATEGORIES).every(c => hidden.includes(c));

  return (
    <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eaeaea', marginBottom: '30px' }}>
      <h2 style={{ color: '#2c3e50', marginTop: 0, borderBottom: '2px solid #00897b', paddingBottom: '10px', fontSize: '1.4em' }}>
        🎮 CPU BATTLE のカテゴリ表示
      </h2>
      <p style={{ color: '#666', fontSize: '0.9em', lineHeight: '1.6' }}>
        オフにしたカテゴリは、CPU BATTLE のカテゴリ選択画面に表示されなくなります。変更はすぐに反映されます。
      </p>
      {error && <p role="alert" style={{ color: '#c62828', fontWeight: 'bold' }}>{error}</p>}
      {hidden && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {Object.values(CATEGORIES).map(category => {
            const visible = !hidden.includes(category);
            return (
              <label key={category} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', border: '1px solid #ddd', borderRadius: '8px', background: visible ? '#e0f2f1' : '#f5f5f5', color: visible ? '#00695c' : '#888', fontWeight: 'bold', cursor: saving ? 'wait' : 'pointer' }}>
                <input
                  type="checkbox"
                  role="switch"
                  checked={visible}
                  disabled={saving}
                  onChange={(e) => toggle(category, e.target.checked)}
                  style={{ width: '18px', height: '18px', margin: 0 }}
                />
                {category}
                <span style={{ fontSize: '0.85em', fontWeight: 'normal' }}>{visible ? '表示中' : '非表示'}</span>
              </label>
            );
          })}
        </div>
      )}
      {allHidden && (
        <p style={{ color: '#c62828', marginBottom: 0 }}>すべてオフのため、CPU BATTLE ではカテゴリを選べません。</p>
      )}
    </div>
  );
}
