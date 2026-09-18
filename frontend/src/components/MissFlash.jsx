import React from 'react';

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
