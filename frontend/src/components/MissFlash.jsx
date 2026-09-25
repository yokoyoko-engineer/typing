import React, { useCallback, useEffect, useRef, useState } from 'react';

// CSSアニメーション (missFlash / missPop) の長さと合わせる
const MISS_FLASH_MS = 450;

// タイポ時のフラッシュ表示を管理するフック。
// triggerMiss() を呼ぶと seq が増え、アニメーション終了後に 0 へ戻る。
// 0 に戻すことで、次のバトルで typing-area が再マウントされても
// 古い seq が残って MISS! が再生されてしまうのを防ぐ。
export function useMissFlash() {
  const [missSeq, setMissSeq] = useState(0);
  const timerRef = useRef(null);

  const triggerMiss = useCallback(() => {
    setMissSeq(n => n + 1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setMissSeq(0);
    }, MISS_FLASH_MS);
  }, []);

  // 即座にフラッシュを消す（バトル開始時などのリセット用）
  const clearMiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMissSeq(0);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { missSeq, triggerMiss, clearMiss };
}

// タイポ時に typing-area 全体を赤くフラッシュさせるオーバーレイ。
// seq はミスごとに増える連番。key に使うことで連続ミスでもアニメーションが毎回再生される。
export default function MissFlash({ seq }) {
  if (!seq) return null;
  return (
    <div key={seq} className="miss-flash" aria-hidden="true">
      <span className="miss-flash-label">MISS!</span>
    </div>
  );
}
