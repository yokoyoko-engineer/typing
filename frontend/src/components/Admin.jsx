import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Admin() {
  const [minUser, setMinUser] = useState('');
  const [maxUser, setMaxUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rawData, setRawData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [userLines, setUserLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedUser, setSelectedUser] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const [topGrowthUser, setTopGrowthUser] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [rankingPage, setRankingPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (rawData.length === 0) {
      setTopGrowthUser(null);
      setRanking([]);
      return;
    }

    // Group by user
    const userGroups = {};
    rawData.forEach(row => {
      const uid = row.user_id.toString();
      if (!userGroups[uid]) userGroups[uid] = [];
      userGroups[uid].push(row);
    });

    let bestGrowth = -Infinity;
    let bestGrowthUserData = null;
    const rankingArray = [];

    for (const uid in userGroups) {
      const scores = userGroups[uid]; // already sorted chronologically by server
      
      // Calculate max for ranking
      const maxScore = Math.max(...scores.map(s => s.score));
      rankingArray.push({ userId: uid, maxScore });

      // Calculate growth
      if (scores.length > 0) {
        const first = scores[0].score;
        const last = scores[scores.length - 1].score;
        const growth = last - first;
        // Consider only positive growth or at least those who played more than once if we want to be strict.
        if (growth > bestGrowth) {
          bestGrowth = growth;
          bestGrowthUserData = {
            userId: uid,
            growth,
            firstDate: scores[0].date,
            lastDate: scores[scores.length - 1].date,
            firstScore: first,
            lastScore: last
          };
        }
      }
    }

    setTopGrowthUser(bestGrowthUserData);
    setRanking(rankingArray.sort((a, b) => b.maxScore - a.maxScore)); // Store all rankings
    setRankingPage(1); // Reset page on new data

  }, [rawData]);

  const fetchScores = async () => {
    if (!minUser || !maxUser) {
      setError('ユーザ番号の範囲を指定してください。');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSelectedUser('');
    setAnalysis(null);
    try {
      let url = `/api/scores/admin?min_user=${minUser}&max_user=${maxUser}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('API Error');
      }
      const data = await res.json();
      
      setRawData(data); // Store raw chronological data for accurate growth analysis

      const formattedData = {};
      const users = new Set();
      
      data.forEach(row => {
        const uid = row.user_id.toString();
        users.add(uid);
        if (!formattedData[row.date]) {
          formattedData[row.date] = { date: row.date };
        }
        // For the chart, keep the highest score of the day
        if (formattedData[row.date][uid] === undefined || row.score > formattedData[row.date][uid]) {
          formattedData[row.date][uid] = row.score;
        }
      });
      
      const sortedData = Object.values(formattedData).sort((a, b) => new Date(a.date) - new Date(b.date));
      setChartData(sortedData);
      setUserLines(Array.from(users).sort());
      
    } catch (err) {
      console.error(err);
      setError('データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    
    if (!userId || rawData.length === 0) {
      setAnalysis(null);
      return;
    }

    // Calculate growth analysis using raw chronological data
    const userScores = rawData.filter(d => d.user_id.toString() === userId);

    if (userScores.length > 0) {
      const firstPlay = userScores[0];
      const lastPlay = userScores[userScores.length - 1];
      const maxScore = Math.max(...userScores.map(s => s.score));
      const growth = lastPlay.score - firstPlay.score;

      setAnalysis({
        firstDate: firstPlay.date,
        lastDate: lastPlay.date,
        firstScore: firstPlay.score,
        lastScore: lastPlay.score,
        maxScore,
        growth,
        count: userScores.length
      });
    } else {
      setAnalysis(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchScores();
  };

  const handlePrevPage = () => {
    setRankingPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setRankingPage(prev => Math.min(prev + 1, Math.ceil(ranking.length / itemsPerPage)));
  };

  // Color generator for lines
  const getColor = (index) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1'];
    return colors[index % colors.length];
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '30px' }}>管理者ダッシュボード</h1>
      
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>スコア推移グラフ 検索</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div>
            <label style={{ marginRight: '10px' }}>Min ユーザ番号:</label>
            <input 
              type="number" 
              min="1" 
              max="9999" 
              value={minUser} 
              onChange={e => setMinUser(e.target.value)} 
              placeholder="例: 5000"
              style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
              required
            />
          </div>
          <div>
            <label style={{ marginRight: '10px' }}>Max ユーザ番号:</label>
            <input 
              type="number" 
              min="1" 
              max="9999" 
              value={maxUser} 
              onChange={e => setMaxUser(e.target.value)} 
              placeholder="例: 5100"
              style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', width: '100px' }}
              required
            />
          </div>
          <div>
            <label style={{ marginRight: '10px', marginLeft: '10px' }}>期間:</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            <span style={{ margin: '0 10px' }}>〜</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
          </div>
          <button type="submit" style={{ padding: '8px 20px', background: '#5c6bc0', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '10px' }}>
            検索
          </button>
        </form>
        {error && <p style={{ color: '#e53935', marginTop: '15px' }}>{error}</p>}
      </div>

      <div style={{ height: '400px', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        {loading ? (
          <p>Loading...</p>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: 'スコア', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {userLines.map((userId, index) => {
                // If a user is selected, highlight their line and fade others
                const isSelected = selectedUser === userId;
                const strokeOpacity = selectedUser ? (isSelected ? 1 : 0.2) : 1;
                const strokeWidth = isSelected ? 3 : 1;
                
                return (
                  <Line 
                    key={userId}
                    type="monotone" 
                    dataKey={userId} 
                    name={`ユーザ ${userId}`}
                    stroke={getColor(index)} 
                    strokeOpacity={strokeOpacity}
                    strokeWidth={strokeWidth}
                    activeDot={{ r: 8 }} 
                    connectNulls
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ textAlign: 'center', marginTop: '150px', color: '#888' }}>データがありません。ユーザ範囲を指定して検索してください。</p>
        )}
      </div>

      {/* Aggregate Analysis Section */}
      {rawData.length > 0 && (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          
          {/* Top Growth Highlight */}
          <div style={{ flex: '1 1 40%', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2em', marginRight: '8px' }}>🚀</span> 一番スコアが伸びたユーザ
            </h3>
            {topGrowthUser && topGrowthUser.growth > 0 ? (
              <div style={{ textAlign: 'center', background: '#f0f4f8', padding: '20px', borderRadius: '10px' }}>
                <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#5c6bc0', marginBottom: '10px' }}>
                  ユーザ {topGrowthUser.userId}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8em', color: '#888' }}>初回 ({topGrowthUser.firstDate})</div>
                    <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#2c3e50' }}>{topGrowthUser.firstScore}</div>
                  </div>
                  <div style={{ fontSize: '1.5em', color: '#ccc' }}>→</div>
                  <div>
                    <div style={{ fontSize: '0.8em', color: '#888' }}>最新 ({topGrowthUser.lastDate})</div>
                    <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#2c3e50' }}>{topGrowthUser.lastScore}</div>
                  </div>
                </div>
                <div style={{ marginTop: '15px', display: 'inline-block', background: '#e8f5e9', color: '#2e7d32', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '1.2em' }}>
                  +{topGrowthUser.growth} UP!!
                </div>
              </div>
            ) : (
              <p style={{ color: '#888', textAlign: 'center' }}>スコアが伸びたユーザがいません。</p>
            )}
          </div>

          {/* Top Score Ranking */}
          <div style={{ flex: '1 1 40%', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2em', marginRight: '8px' }}>👑</span> 最高スコアランキング
            </h3>
            {ranking.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ maxHeight: '250px', overflowY: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                      <tr style={{ borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '8px', color: '#888' }}>順位</th>
                        <th style={{ padding: '8px', color: '#888' }}>ユーザ</th>
                        <th style={{ padding: '8px', color: '#888', textAlign: 'right' }}>スコア</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.slice((rankingPage - 1) * itemsPerPage, rankingPage * itemsPerPage).map((r, index) => {
                        const globalIndex = (rankingPage - 1) * itemsPerPage + index;
                        return (
                          <tr key={r.userId} style={{ borderBottom: '1px solid #eee', background: globalIndex === 0 ? '#fffdf0' : 'transparent' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: globalIndex === 0 ? '#d4af37' : globalIndex === 1 ? '#9e9e9e' : globalIndex === 2 ? '#cd7f32' : '#5c6bc0' }}>
                              {globalIndex + 1}
                            </td>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: '#2c3e50' }}>{r.userId}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#e8734a' }}>{r.maxScore}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {ranking.length > itemsPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                    <button 
                      onClick={handlePrevPage} 
                      disabled={rankingPage === 1}
                      style={{ padding: '5px 15px', background: rankingPage === 1 ? '#e0e0e0' : '#5c6bc0', color: rankingPage === 1 ? '#9e9e9e' : '#fff', border: 'none', borderRadius: '5px', cursor: rankingPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      前へ
                    </button>
                    <span style={{ color: '#666', fontSize: '0.9em' }}>
                      {rankingPage} / {Math.ceil(ranking.length / itemsPerPage)} ページ ({ranking.length}件)
                    </span>
                    <button 
                      onClick={handleNextPage} 
                      disabled={rankingPage === Math.ceil(ranking.length / itemsPerPage)}
                      style={{ padding: '5px 15px', background: rankingPage === Math.ceil(ranking.length / itemsPerPage) ? '#e0e0e0' : '#5c6bc0', color: rankingPage === Math.ceil(ranking.length / itemsPerPage) ? '#9e9e9e' : '#fff', border: 'none', borderRadius: '5px', cursor: rankingPage === Math.ceil(ranking.length / itemsPerPage) ? 'not-allowed' : 'pointer' }}
                    >
                      次へ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: '#888', textAlign: 'center' }}>データがありません。</p>
            )}
          </div>

        </div>
      )}

      {/* Growth Analysis Panel */}
      {userLines.length > 0 && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50' }}>ユーザー成長分析</h3>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ marginRight: '10px', fontWeight: 'bold' }}>分析対象ユーザーを選択:</label>
            <select 
              value={selectedUser} 
              onChange={handleUserSelect}
              style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '1em' }}
            >
              <option value="">-- 選択してください --</option>
              {userLines.map(u => (
                <option key={u} value={u}>ユーザ {u}</option>
              ))}
            </select>
          </div>

          {analysis ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #5c6bc0' }}>
                <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '5px' }}>初回プレイ ({analysis.firstDate})</div>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2c3e50' }}>{analysis.firstScore}</div>
              </div>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #4caf50' }}>
                <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '5px' }}>最新プレイ ({analysis.lastDate})</div>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2c3e50' }}>{analysis.lastScore}</div>
              </div>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ff9800' }}>
                <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '5px' }}>期間内最高スコア</div>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2c3e50' }}>{analysis.maxScore}</div>
              </div>
              <div style={{ background: analysis.growth >= 0 ? '#e8f5e9' : '#ffebee', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${analysis.growth >= 0 ? '#4caf50' : '#f44336'}` }}>
                <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '5px' }}>スコア成長量</div>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: analysis.growth >= 0 ? '#2e7d32' : '#c62828' }}>
                  {analysis.growth > 0 ? '+' : ''}{analysis.growth}
                </div>
              </div>
            </div>
          ) : selectedUser ? (
            <p style={{ color: '#888' }}>このユーザーのデータは期間内にありません。</p>
          ) : (
            <p style={{ color: '#888' }}>ユーザーを選択すると、詳細な分析データが表示されます。</p>
          )}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <a href="/" style={{ color: '#5c6bc0', textDecoration: 'none' }}>← ゲームに戻る</a>
      </div>
    </div>
  );
}
