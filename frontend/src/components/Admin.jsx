import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { io } from 'socket.io-client';

const COHORT_202604 = {
  CL: [3319, 5905, 5906, 5907, 5908, 5909, 5910, 5911, 5912, 5913, 5914, 5915, 5916, 5917, 5918, 5919, 5920, 5921, 5922, 5923, 5924, 5944, 5964, 5980, 5981],
  JAVA: [5887, 5888, 5889, 5890, 5891, 5892, 5893, 5894, 5895, 5896, 5897, 5898, 5899, 5900, 5901, 5902, 5903, 5904, 5961],
  ML: [5925, 5926, 5927, 5928, 5929, 5930, 5931, 5932, 5933, 5934, 5935, 5936, 5937, 5938, 5939, 5940, 5941, 5942, 5943, 5962, 5963],
  QA: [5945, 5946, 5947, 5948, 5949, 5950, 5951, 5978, 5979, 5982],
  FR: [5952, 5953, 5954, 5955, 5956, 5957, 5958, 5959, 5960]
};

const COHORT_MAP = {};
Object.entries(COHORT_202604).forEach(([job, ids]) => {
  ids.forEach(id => {
    COHORT_MAP[id.toString()] = job;
  });
});

const JOB_COLORS = {
  CL: '#ff9800',
  JAVA: '#2196f3',
  ML: '#4caf50',
  FR: '#e91e63',
  QA: '#9c27b0'
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' or 'tournament'

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  // --- Analysis Tab State ---
  const [minUser, setMinUser] = useState('1');
  const [maxUser, setMaxUser] = useState('9999');
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [cohort, setCohort] = useState('すべて');
  const [jobType, setJobType] = useState('すべて');
  const [rawData, setRawData] = useState([]);
  const [averageScores, setAverageScores] = useState([]);
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

  // --- Tournament Tab State ---
  const [socket, setSocket] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournamentScores, setTournamentScores] = useState([]);
  const [lobbyCount, setLobbyCount] = useState(0);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [adminCpuLevel, setAdminCpuLevel] = useState(5);
  const [compareTourneyA, setCompareTourneyA] = useState('');
  const [compareTourneyB, setCompareTourneyB] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [comparisonResults, setComparisonResults] = useState([]);
  const [compareSearchUser, setCompareSearchUser] = useState('');
  const [compareJobType, setCompareJobType] = useState('すべて');
  const [compareSortField, setCompareSortField] = useState('user_id');
  const [compareSortOrder, setCompareSortOrder] = useState('asc');

  // --- Tournament Analysis State ---
  const [tMinUser, setTMinUser] = useState('1');
  const [tMaxUser, setTMaxUser] = useState('9999');
  const [tStartDate, setTStartDate] = useState(firstDay);
  const [tEndDate, setTEndDate] = useState(lastDay);
  const [tCohort, setTCohort] = useState('すべて');
  const [tJobType, setTJobType] = useState('すべて');
  const [tSearchStartTournamentId, setTSearchStartTournamentId] = useState('all');
  const [tSearchEndTournamentId, setTSearchEndTournamentId] = useState('all');
  const [tDisplayAverageTournamentId, setTDisplayAverageTournamentId] = useState('all');
  const [tRawData, setTRawData] = useState([]);
  const [tAverageScores, setTAverageScores] = useState([]);
  const [tChartData, setTChartData] = useState([]);
  const [tUserLines, setTUserLines] = useState([]);
  const [tLoading, setTLoading] = useState(false);
  const [tError, setTError] = useState(null);
  
  const [tSelectedUser, setTSelectedUser] = useState('');
  const [tAnalysis, setTAnalysis] = useState(null);

  const [tTopGrowthUser, setTTopGrowthUser] = useState(null);
  const [tRanking, setTRanking] = useState([]);
  const [tRankingPage, setTRankingPage] = useState(1);
  
  // Setup Socket for Admin
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    
    newSocket.on('tournamentLobbyUpdate', (data) => {
      setLobbyCount(data.count);
      setLobbyPlayers(data.players);
    });
    
    return () => newSocket.close();
  }, []);

  // Fetch past tournaments
  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments');
      const data = await res.json();
      setTournaments(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'tournament') {
      fetchTournaments();
      if (socket) {
        socket.emit('adminGetLobby');
      }
    }
  }, [activeTab, socket]);

  useEffect(() => {
    if (selectedTournament) {
      fetch(`/api/tournaments/${selectedTournament}/scores`)
        .then(res => res.json())
        .then(data => setTournamentScores(data))
        .catch(err => console.error(err));
    } else {
      setTournamentScores([]);
    }
  }, [selectedTournament]);

  const handleStartTournament = () => {
    if (socket) {
      if (window.confirm(`CPUレベル ${adminCpuLevel} でタイピングイベントを開始しますか？（待機中の全ユーザーの画面でカウントダウンが始まります）`)) {
        socket.emit('adminStartTournament', { cpuLevel: adminCpuLevel });
        alert(`イベント開始シグナル（CPUレベル ${adminCpuLevel}）を送信しました。5分後に自動終了します。`);
        setTimeout(fetchTournaments, 2000); // Wait a bit to fetch the newly created tournament
      }
    }
  };

  const handleCompareTournaments = async () => {
    if (!compareTourneyA || !compareTourneyB) {
      setCompareError('比較する2つの大会を選択してください。');
      return;
    }
    if (compareTourneyA.toString() === compareTourneyB.toString()) {
      setCompareError('異なる大会を選択してください。');
      return;
    }
    
    setCompareLoading(true);
    setCompareError(null);
    setComparisonResults([]);
    
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/tournaments/${compareTourneyA}/scores`),
        fetch(`/api/tournaments/${compareTourneyB}/scores`)
      ]);
      
      if (!resA.ok || !resB.ok) {
        throw new Error('スコアデータの取得に失敗しました。');
      }
      
      const scoresA = await resA.json();
      const scoresB = await resB.json();
      
      const userMap = {};
      
      scoresA.forEach(s => {
        const uid = s.user_id;
        userMap[uid] = {
          user_id: uid,
          job_type: s.job_type || COHORT_MAP[uid] || '',
          scoreA: s.score,
          scoreB: null
        };
      });
      
      scoresB.forEach(s => {
        const uid = s.user_id;
        if (userMap[uid]) {
          userMap[uid].scoreB = s.score;
          if (!userMap[uid].job_type && s.job_type) {
            userMap[uid].job_type = s.job_type;
          }
        } else {
          userMap[uid] = {
            user_id: uid,
            job_type: s.job_type || COHORT_MAP[uid] || '',
            scoreA: null,
            scoreB: s.score
          };
        }
      });
      
      const merged = Object.values(userMap).map(u => {
        let diff = null;
        if (u.scoreA !== null && u.scoreB !== null) {
          diff = u.scoreB - u.scoreA;
        } else if (u.scoreA === null && u.scoreB !== null) {
          diff = u.scoreB;
        } else if (u.scoreA !== null && u.scoreB === null) {
          diff = -u.scoreA;
        }
        return {
          ...u,
          diff
        };
      });
      
      setComparisonResults(merged);
    } catch (err) {
      console.error(err);
      setCompareError(err.message || 'エラーが発生しました。');
    } finally {
      setCompareLoading(false);
    }
  };

  // --- Tournament Analysis Logic ---
  const fetchTournamentScores = async () => {
    if (!tMinUser || !tMaxUser) {
      setTError('社員番号の範囲を指定してください。');
      return;
    }
    
    setTLoading(true);
    setTError(null);
    setTSelectedUser('');
    setTAnalysis(null);
    try {
      let url = `/api/tournaments/scores/admin?min_user=${tMinUser}&max_user=${tMaxUser}`;
      if (tStartDate) url += `&start_date=${tStartDate}`;
      if (tEndDate) url += `&end_date=${tEndDate}`;
      if (tJobType !== 'すべて' && tCohort !== '202604') url += `&job_type=${tJobType}`;
      if (tSearchStartTournamentId !== 'all') url += `&start_tournament_id=${tSearchStartTournamentId}`;
      if (tSearchEndTournamentId !== 'all') url += `&end_tournament_id=${tSearchEndTournamentId}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('API Error');
      let data = await res.json();
      
      if (tCohort === '202604') {
        data = data.filter(row => COHORT_MAP[row.user_id.toString()] !== undefined);
        data = data.map(row => ({ ...row, job_type: COHORT_MAP[row.user_id.toString()] }));
        
        if (tJobType !== 'すべて') {
          data = data.filter(row => row.job_type === tJobType);
        }
      }
      
      setTRawData(data); 

      // Group by tournament first
      const tournamentGroups = {};
      data.forEach(row => {
        const key = row.tournament_name || `大会 #${row.tournament_id}`;
        if (!tournamentGroups[key]) {
          tournamentGroups[key] = [];
        }
        tournamentGroups[key].push(row);
      });

      const formattedData = {};
      const users = new Set();
      
      Object.entries(tournamentGroups).forEach(([key, rows]) => {
        const firstRow = rows[0];
        formattedData[key] = { 
          name: key, 
          date: firstRow.tournament_date, 
          id: firstRow.tournament_id 
        };

        // User scores
        rows.forEach(row => {
          const uid = row.user_id.toString();
          users.add(uid);
          if (formattedData[key][uid] === undefined || row.score > formattedData[key][uid]) {
            formattedData[key][uid] = row.score;
          }
        });

        // Job type average scores for this tournament
        const jobScores = {};
        rows.forEach(row => {
          const jt = row.job_type || '未設定';
          if (!jobScores[jt]) jobScores[jt] = [];
          jobScores[jt].push(row.score);
        });

        Object.entries(jobScores).forEach(([jt, scores]) => {
          const sum = scores.reduce((sumVal, s) => sumVal + s, 0);
          formattedData[key][jt + '平均'] = Math.round(sum / scores.length);
        });
      });
      
      const sortedData = Object.values(formattedData).sort((a, b) => a.id - b.id);
      setTChartData(sortedData);
      setTUserLines(Array.from(users).sort());
      
    } catch (err) {
      console.error(err);
      setTError('データの取得に失敗しました。');
    } finally {
      setTLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tournament') {
      fetchTournamentScores();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tRawData.length === 0) {
      setTTopGrowthUser(null);
      setTRanking([]);
      return;
    }

    const userGroups = {};
    tRawData.forEach(row => {
      const uid = row.user_id.toString();
      if (!userGroups[uid]) userGroups[uid] = [];
      userGroups[uid].push(row);
    });

    let bestGrowth = -Infinity;
    let bestGrowthUserData = null;
    const rankingArray = [];

    for (const uid in userGroups) {
      const scores = userGroups[uid];
      const maxScore = Math.max(...scores.map(s => s.score));
      rankingArray.push({ userId: uid, maxScore });

      if (scores.length > 0) {
        const first = scores[0].score;
        const last = scores[scores.length - 1].score;
        const growth = last - first;
        if (growth > bestGrowth) {
          bestGrowth = growth;
          bestGrowthUserData = {
            userId: uid,
            growth,
            firstDate: scores[0].tournament_name,
            lastDate: scores[scores.length - 1].tournament_name,
            firstScore: first,
            lastScore: last
          };
        }
      }
    }

    setTTopGrowthUser(bestGrowthUserData);
    setTRanking(rankingArray.sort((a, b) => b.maxScore - a.maxScore)); 
    setTRankingPage(1); 
  }, [tRawData]);

  useEffect(() => {
    if (tRawData.length === 0) {
      setTAverageScores([]);
      return;
    }

    let averageSourceData = tRawData;
    if (tDisplayAverageTournamentId !== 'all') {
      averageSourceData = tRawData.filter(row => row.tournament_id.toString() === tDisplayAverageTournamentId);
    }

    const jobAverages = {};
    const jobCounts = {};
    averageSourceData.forEach(row => {
      const jt = row.job_type || '未設定';
      if (!jobAverages[jt]) { jobAverages[jt] = 0; jobCounts[jt] = 0; }
      jobAverages[jt] += row.score;
      jobCounts[jt]++;
    });

    const averageArray = Object.keys(jobAverages).map(jt => ({
      jobType: jt,
      average: Math.round(jobAverages[jt] / jobCounts[jt])
    })).sort((a, b) => b.average - a.average);

    setTAverageScores(averageArray);
  }, [tRawData, tDisplayAverageTournamentId]);

  const handleTUserSelect = (e) => {
    const userId = e.target.value;
    setTSelectedUser(userId);
    
    if (!userId || tRawData.length === 0) {
      setTAnalysis(null);
      return;
    }

    const userScores = tRawData.filter(d => d.user_id.toString() === userId);

    if (userScores.length > 0) {
      const firstPlay = userScores[0];
      const lastPlay = userScores[userScores.length - 1];
      const maxScore = Math.max(...userScores.map(s => s.score));
      const growth = lastPlay.score - firstPlay.score;

      setTAnalysis({
        firstDate: firstPlay.tournament_name,
        lastDate: lastPlay.tournament_name,
        firstScore: firstPlay.score,
        lastScore: lastPlay.score,
        maxScore,
        growth,
        count: userScores.length
      });
    } else {
      setTAnalysis(null);
    }
  };

  const handleTSearch = (e) => {
    e.preventDefault();
    fetchTournamentScores();
  };

  // --- Analysis Logic ---
  useEffect(() => {
    if (rawData.length === 0) {
      setTopGrowthUser(null);
      setRanking([]);
      return;
    }

    const userGroups = {};
    rawData.forEach(row => {
      const uid = row.user_id.toString();
      if (!userGroups[uid]) userGroups[uid] = [];
      userGroups[uid].push(row);
    });

    let bestGrowth = -Infinity;
    let bestGrowthUserData = null;
    const rankingArray = [];

    const jobAverages = {};
    const jobCounts = {};

    for (const uid in userGroups) {
      const scores = userGroups[uid];
      const maxScore = Math.max(...scores.map(s => s.score));
      rankingArray.push({ userId: uid, maxScore });

      if (scores.length > 0) {
        const first = scores[0].score;
        const last = scores[scores.length - 1].score;
        const growth = last - first;
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

    rawData.forEach(row => {
      const jt = row.job_type || '未設定';
      if (!jobAverages[jt]) { jobAverages[jt] = 0; jobCounts[jt] = 0; }
      jobAverages[jt] += row.score;
      jobCounts[jt]++;
    });

    const averageArray = Object.keys(jobAverages).map(jt => ({
      jobType: jt,
      average: Math.round(jobAverages[jt] / jobCounts[jt])
    })).sort((a, b) => b.average - a.average);

    setTopGrowthUser(bestGrowthUserData);
    setRanking(rankingArray.sort((a, b) => b.maxScore - a.maxScore)); 
    setRankingPage(1); 
    setAverageScores(averageArray);
  }, [rawData]);

  const fetchScores = async () => {
    if (!minUser || !maxUser) {
      setError('社員番号の範囲を指定してください。');
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
      if (jobType !== 'すべて' && cohort !== '202604') url += `&job_type=${jobType}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('API Error');
      let data = await res.json();
      
      if (cohort === '202604') {
        data = data.filter(row => COHORT_MAP[row.user_id.toString()] !== undefined);
        data = data.map(row => ({ ...row, job_type: COHORT_MAP[row.user_id.toString()] }));
        
        if (jobType !== 'すべて') {
          data = data.filter(row => row.job_type === jobType);
        }
      }
      
      setRawData(data); 

      const formattedData = {};
      const users = new Set();
      
      data.forEach(row => {
        const uid = row.user_id.toString();
        users.add(uid);
        if (!formattedData[row.date]) {
          formattedData[row.date] = { date: row.date };
        }
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

  useEffect(() => {
    // 初回マウント時にデフォルト検索を実行
    fetchScores();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUserSelect = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    
    if (!userId || rawData.length === 0) {
      setAnalysis(null);
      return;
    }

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

  const getColor = (index) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1'];
    return colors[index % colors.length];
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>管理者ダッシュボード</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('analysis')}
          style={{ padding: '10px 20px', fontSize: '1.1em', background: activeTab === 'analysis' ? '#5c6bc0' : '#eee', color: activeTab === 'analysis' ? '#fff' : '#333', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          📈 通常スコア分析
        </button>
        <button 
          onClick={() => setActiveTab('tournament')}
          style={{ padding: '10px 20px', fontSize: '1.1em', background: activeTab === 'tournament' ? '#ff9800' : '#eee', color: activeTab === 'tournament' ? '#fff' : '#333', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          🏆 イベント管理
        </button>
      </div>

      {activeTab === 'analysis' && (
        <div>
          <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
            <h3 style={{ marginTop: 0 }}>スコア推移グラフ 検索</h3>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ marginRight: '10px' }}>Min 社員番号:</label>
                <input 
                  type="number" min="1" max="9999" value={minUser} onChange={e => setMinUser(e.target.value)} 
                  placeholder="例: 5000" style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }} required
                />
              </div>
              <div>
                <label style={{ marginRight: '10px' }}>Max 社員番号:</label>
                <input 
                  type="number" min="1" max="9999" value={maxUser} onChange={e => setMaxUser(e.target.value)} 
                  placeholder="例: 5100" style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', width: '100px' }} required
                />
              </div>
              <div>
                <label style={{ marginRight: '10px', marginLeft: '10px' }}>期間:</label>
                <input 
                  type="date" value={startDate} onChange={e => setStartDate(e.target.value)} 
                  style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                />
                <span style={{ margin: '0 10px' }}>〜</span>
                <input 
                  type="date" value={endDate} onChange={e => setEndDate(e.target.value)} 
                  style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ marginRight: '10px', marginLeft: '10px' }}>入社時期:</label>
                <select 
                  value={cohort} onChange={e => setCohort(e.target.value)}
                  style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                >
                  <option value="すべて">すべて</option>
                  <option value="202604">202604</option>
                </select>
              </div>
              <div>
                <label style={{ marginRight: '10px', marginLeft: '10px' }}>職種:</label>
                <select 
                  value={jobType} onChange={e => setJobType(e.target.value)}
                  style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                >
                  <option value="すべて">すべて</option>
                  <option value="CL">CL</option>
                  <option value="JAVA">JAVA</option>
                  <option value="ML">ML</option>
                  <option value="FR">FR</option>
                  <option value="QA">QA</option>
                </select>
              </div>
              <button type="submit" style={{ padding: '8px 20px', background: '#5c6bc0', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '10px' }}>
                検索
              </button>
            </form>
            {error && <p style={{ color: '#e53935', marginTop: '15px' }}>{error}</p>}
          </div>

          {averageScores.length > 0 && (
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {/* 職種別 平均スコア */}
              <div style={{ flex: '2 1 500px', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2em', marginRight: '8px' }}>📊</span> 職種別 平均スコア
                </h3>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {averageScores.map((item, idx) => (
                    <div key={idx} style={{ flex: '1 1 120px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center', borderBottom: '4px solid #ff9800' }}>
                      <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>{item.jobType}</div>
                      <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#2c3e50' }}>{item.average}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 一般オフィスワーク基準 (209) 達成状況 */}
              <div style={{ flex: '1 1 300px', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2em', marginRight: '8px' }}>🎯</span> オフィスワーク基準 (スコア 209) 達成状況
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '3px' }}>達成者</div>
                    <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#4caf50' }}>
                      {ranking.filter(u => u.maxScore >= 209).length} <span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#666' }}>人</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '3px' }}>未達成者</div>
                    <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#e53935' }}>
                      {ranking.filter(u => u.maxScore < 209).length} <span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#666' }}>人</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '3px' }}>達成率</div>
                    <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#5c6bc0' }}>
                      {ranking.length > 0 ? Math.round((ranking.filter(u => u.maxScore >= 209).length / ranking.length) * 100) : 0} <span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#666' }}>%</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '15px' }}>
                  <div style={{ background: '#e8e8e8', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${ranking.length > 0 ? (ranking.filter(u => u.maxScore >= 209).length / ranking.length) * 100 : 0}%`,
                      backgroundColor: '#4caf50',
                      height: '100%'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ height: '500px', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            {loading ? (
              <p>Loading...</p>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'スコア', angle: -90, position: 'insideLeft' }} domain={[0, 'auto']} ticks={[0, 100, 200, 300, 400, 500, 600, 700, 800]} />
                  <ReferenceLine y={209} stroke="#e53935" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'オフィス基準 (209)', fill: '#e53935', position: 'top' }} />
                  <Tooltip />
                  <Legend />
                  {userLines.map((userId, index) => {
                    const isSelected = selectedUser === userId;
                    const strokeOpacity = selectedUser ? (isSelected ? 1 : 0.2) : 1;
                    const strokeWidth = isSelected ? 3 : 1;
                    const legendType = selectedUser ? (isSelected ? 'line' : 'none') : (userLines.length > 10 ? 'none' : 'line');
                    return (
                      <Line 
                        key={userId} type="monotone" dataKey={userId} name={`ユーザ ${userId}`}
                        stroke={getColor(index)} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth}
                        activeDot={{ r: 8 }} connectNulls legendType={legendType}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', marginTop: '150px', color: '#888' }}>データがありません。ユーザ範囲を指定して検索してください。</p>
            )}
          </div>

          {rawData.length > 0 && (
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 40%', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2em', marginRight: '8px' }}>🚀</span> 一番スコアが伸びたユーザ
                </h3>
                {topGrowthUser && topGrowthUser.growth > 0 ? (
                  <div style={{ textAlign: 'center', background: '#f0f4f8', padding: '20px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#5c6bc0', marginBottom: '10px' }}>ユーザ {topGrowthUser.userId}</div>
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
                    {ranking.length > itemsPerPage && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                        <button onClick={() => setRankingPage(p => Math.max(p - 1, 1))} disabled={rankingPage === 1} style={{ padding: '5px 15px', background: rankingPage === 1 ? '#e0e0e0' : '#5c6bc0', color: rankingPage === 1 ? '#9e9e9e' : '#fff', border: 'none', borderRadius: '5px', cursor: rankingPage === 1 ? 'not-allowed' : 'pointer' }}>前へ</button>
                        <span style={{ color: '#666', fontSize: '0.9em' }}>{rankingPage} / {Math.ceil(ranking.length / itemsPerPage)} ページ ({ranking.length}件)</span>
                        <button onClick={() => setRankingPage(p => Math.min(p + 1, Math.ceil(ranking.length / itemsPerPage)))} disabled={rankingPage === Math.ceil(ranking.length / itemsPerPage)} style={{ padding: '5px 15px', background: rankingPage === Math.ceil(ranking.length / itemsPerPage) ? '#e0e0e0' : '#5c6bc0', color: rankingPage === Math.ceil(ranking.length / itemsPerPage) ? '#9e9e9e' : '#fff', border: 'none', borderRadius: '5px', cursor: rankingPage === Math.ceil(ranking.length / itemsPerPage) ? 'not-allowed' : 'pointer' }}>次へ</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: '#888', textAlign: 'center' }}>データがありません。</p>
                )}
              </div>
            </div>
          )}

          {userLines.length > 0 && (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50' }}>ユーザー成長分析</h3>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ marginRight: '10px', fontWeight: 'bold' }}>分析対象ユーザーを選択:</label>
                <select value={selectedUser} onChange={handleUserSelect} style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '1em' }}>
                  <option value="">-- 選択してください --</option>
                  {userLines.map(u => <option key={u} value={u}>ユーザ {u}</option>)}
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
        </div>
      )}

      {activeTab === 'tournament' && (
        <div>
          {/* 大会開催パネル */}
          <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '10px', marginBottom: '30px', borderLeft: '5px solid #ff9800' }}>
            <h3 style={{ marginTop: 0, color: '#e65100' }}>イベント開催コントロール</h3>
            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>現在の待機室</h4>
                <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#5c6bc0' }}>
                  {lobbyCount} <span style={{ fontSize: '0.4em', color: '#666' }}>人</span>
                </div>
              </div>
              <div style={{ flex: 2, background: '#f5f5f5', padding: '10px', borderRadius: '5px', maxHeight: '100px', overflowY: 'auto' }}>
                <h5 style={{ margin: '0 0 5px 0', color: '#666' }}>参加者一覧 {lobbyCount > lobbyPlayers.length ? `(最新 ${lobbyPlayers.length}件)` : ''}</h5>
                {lobbyPlayers.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {lobbyPlayers.map((p, idx) => (
                      <span key={idx} style={{ background: '#e0e0e0', padding: '3px 8px', borderRadius: '12px', fontSize: '0.9em', color: '#333' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#aaa', fontSize: '0.9em' }}>待機中の参加者はいません</span>
                )}
              </div>
            </div>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontWeight: 'bold', color: '#2c3e50' }}>CPUレベルを選択 (大会中のCPU強さ):</label>
              <select
                value={adminCpuLevel}
                onChange={e => setAdminCpuLevel(parseInt(e.target.value, 10))}
                style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '180px', fontWeight: 'bold' }}
              >
                <option value="1">レベル1 (C)</option>
                <option value="2">レベル2 (C+)</option>
                <option value="3">レベル3 (B-)</option>
                <option value="4">レベル4 (B)</option>
                <option value="5">レベル5 (B+) 【デフォルト】</option>
                <option value="6">レベル6 (A-)</option>
                <option value="7">レベル7 (A)</option>
                <option value="8">レベル8 (A+)</option>
                <option value="9">レベル9 (S)</option>
                <option value="10">レベル10 (Fast)</option>
              </select>
            </div>
            <p style={{ color: '#666' }}>現在待機室にいるすべてのプレイヤーを対象にイベント（5分間）を開始します。</p>
            <button 
              onClick={handleStartTournament}
              style={{ padding: '15px 30px', fontSize: '1.2em', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              disabled={lobbyCount === 0}
            >
              🚀 イベントをスタートする
            </button>
            {lobbyCount === 0 && <p style={{ color: '#f44336', fontSize: '0.9em', marginTop: '10px' }}>参加者が0人のため開始できません</p>}
          </div>

          {/* 大会履歴パネル */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>過去のイベント履歴</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ marginRight: '10px', fontWeight: 'bold' }}>イベントを選択:</label>
              <select 
                value={selectedTournament} 
                onChange={e => setSelectedTournament(e.target.value)}
                style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '300px' }}
              >
                <option value="">-- 選択してください --</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (開催日: {t.date})</option>
                ))}
              </select>
            </div>

            {selectedTournament && (
              <div>
                <h4 style={{ color: '#5c6bc0' }}>最終ランキング</h4>
                {tournamentScores.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '10px' }}>
                    <thead style={{ background: '#f5f5f5' }}>
                      <tr>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>順位</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>社員番号</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd', textAlign: 'right' }}>スコア</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentScores.map((row, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee', background: index < 3 ? '#fffdf0' : '#fff' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: index === 0 ? '#d4af37' : index === 1 ? '#9e9e9e' : index === 2 ? '#cd7f32' : '#555' }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: '#2c3e50' }}>{row.user_id}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#e8734a' }}>{row.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#888' }}>このイベントには記録がありません。</p>
                )}
              </div>
            )}
          </div>

          {/* 大会間スコア比較パネル */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginTop: '30px' }}>
            <h3 style={{ marginTop: 0, color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2em', marginRight: '8px' }}>⚖️</span> 大会間スコア比較
            </h3>
            <p style={{ color: '#666', fontSize: '0.9em' }}>2つの大会を選択し、社員番号ごとのスコアの変化や全体傾向を比較・分析できます。</p>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <div>
                <label style={{ marginRight: '10px', fontWeight: 'bold' }}>大会A (基準):</label>
                <select 
                  value={compareTourneyA} 
                  onChange={e => setCompareTourneyA(e.target.value)}
                  style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '220px' }}
                >
                  <option value="">-- 大会Aを選択 --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ fontSize: '1.2em', color: '#888' }}>↔</div>
              
              <div>
                <label style={{ marginRight: '10px', fontWeight: 'bold' }}>大会B (比較先):</label>
                <select 
                  value={compareTourneyB} 
                  onChange={e => setCompareTourneyB(e.target.value)}
                  style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '220px' }}
                >
                  <option value="">-- 大会Bを選択 --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={handleCompareTournaments}
                disabled={compareLoading || !compareTourneyA || !compareTourneyB}
                style={{ 
                  padding: '8px 20px', 
                  background: '#5c6bc0', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '5px', 
                  cursor: (compareLoading || !compareTourneyA || !compareTourneyB) ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold',
                  opacity: (compareLoading || !compareTourneyA || !compareTourneyB) ? 0.7 : 1
                }}
              >
                {compareLoading ? '比較中...' : '比較する'}
              </button>
            </div>
            
            {compareError && (
              <div style={{ color: '#e53935', background: '#ffebee', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
                ⚠️ {compareError}
              </div>
            )}
            
            {comparisonResults.length > 0 && (
              <div>
                {/* 比較サマリーカード */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', flexWrap: 'wrap' }}>
                  {/* 大会Aの概要 */}
                  <div style={{ flex: '1 1 200px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #9e9e9e' }}>
                    <div style={{ fontWeight: 'bold', color: '#555', marginBottom: '8px', fontSize: '0.9em' }}>
                      大会A: {tournaments.find(t => t.id.toString() === compareTourneyA.toString())?.name || ''}
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#666' }}>参加人数: <strong>{comparisonResults.filter(r => r.scoreA !== null).length}</strong> 人</div>
                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                      平均スコア: <strong>
                        {(() => {
                          const valid = comparisonResults.filter(r => r.scoreA !== null);
                          return valid.length > 0 ? Math.round(valid.reduce((acc, r) => acc + r.scoreA, 0) / valid.length) : 0;
                        })()}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                      基準(209)達成率: <strong>
                        {(() => {
                          const valid = comparisonResults.filter(r => r.scoreA !== null);
                          const met = valid.filter(r => r.scoreA >= 209);
                          return valid.length > 0 ? Math.round((met.length / valid.length) * 100) : 0;
                        })()}%
                      </strong> ({comparisonResults.filter(r => r.scoreA >= 209).length}人)
                    </div>
                  </div>
                  
                  {/* 大会Bの概要 */}
                  <div style={{ flex: '1 1 200px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #5c6bc0' }}>
                    <div style={{ fontWeight: 'bold', color: '#555', marginBottom: '8px', fontSize: '0.9em' }}>
                      大会B: {tournaments.find(t => t.id.toString() === compareTourneyB.toString())?.name || ''}
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#666' }}>参加人数: <strong>{comparisonResults.filter(r => r.scoreB !== null).length}</strong> 人</div>
                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                      平均スコア: <strong>
                        {(() => {
                          const valid = comparisonResults.filter(r => r.scoreB !== null);
                          return valid.length > 0 ? Math.round(valid.reduce((acc, r) => acc + r.scoreB, 0) / valid.length) : 0;
                        })()}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                      基準(209)達成率: <strong>
                        {(() => {
                          const valid = comparisonResults.filter(r => r.scoreB !== null);
                          const met = valid.filter(r => r.scoreB >= 209);
                          return valid.length > 0 ? Math.round((met.length / valid.length) * 100) : 0;
                        })()}%
                      </strong> ({comparisonResults.filter(r => r.scoreB >= 209).length}人)
                    </div>
                  </div>
                  
                  {/* スコア増減・成長傾向 */}
                  <div style={{ flex: '1 1 250px', background: '#e8f5e9', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #4caf50' }}>
                    <div style={{ fontWeight: 'bold', color: '#2e7d32', marginBottom: '8px', fontSize: '0.9em' }}>📈 スコア変化サマリー (大会A → 大会B)</div>
                    {(() => {
                      const both = comparisonResults.filter(r => r.scoreA !== null && r.scoreB !== null);
                      const up = both.filter(r => r.diff > 0).length;
                      const down = both.filter(r => r.diff < 0).length;
                      const same = both.filter(r => r.diff === 0).length;
                      const newPlayers = comparisonResults.filter(r => r.scoreA === null && r.scoreB !== null).length;
                      const quitPlayers = comparisonResults.filter(r => r.scoreA !== null && r.scoreB === null).length;
                      
                      return (
                        <div style={{ fontSize: '0.85em', color: '#333' }}>
                          <div>両大会に参加: <strong>{both.length}</strong> 人</div>
                          <div style={{ marginTop: '4px' }}>
                            ├ 向上: <strong style={{ color: '#2e7d32' }}>{up}</strong> 人 / 
                            低下: <strong style={{ color: '#c62828' }}>{down}</strong> 人 / 
                            変化なし: <strong>{same}</strong> 人
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            新規参加（Bのみ）: <strong>{newPlayers}</strong> 人 / 
                            不参加（Aのみ）: <strong>{quitPlayers}</strong> 人
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* フィルター・検索バー */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', background: '#fafafa', padding: '10px', borderRadius: '5px', border: '1px solid #eee' }}>
                  <div>
                    <label style={{ marginRight: '8px', fontSize: '0.9em' }}>社員番号検索:</label>
                    <input 
                      type="text" 
                      placeholder="社員番号を入力..." 
                      value={compareSearchUser}
                      onChange={e => setCompareSearchUser(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '150px', fontSize: '0.9em' }}
                    />
                  </div>
                  <div>
                    <label style={{ marginRight: '8px', fontSize: '0.9em' }}>職種で絞り込み:</label>
                    <select 
                      value={compareJobType}
                      onChange={e => setCompareJobType(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9em' }}
                    >
                      <option value="すべて">すべて</option>
                      <option value="CL">CL</option>
                      <option value="JAVA">JAVA</option>
                      <option value="ML">ML</option>
                      <option value="FR">FR</option>
                      <option value="QA">QA</option>
                    </select>
                  </div>
                  <div style={{ color: '#888', fontSize: '0.85em', marginLeft: 'auto' }}>
                    該当件数: {
                      comparisonResults.filter(r => {
                        const matchUser = r.user_id.toString().includes(compareSearchUser);
                        const matchJob = compareJobType === 'すべて' || r.job_type === compareJobType;
                        return matchUser && matchJob;
                      }).length
                    } 件
                  </div>
                </div>

                {/* スコア比較詳細テーブル */}
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 }}>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th 
                          onClick={() => {
                            const isAsc = compareSortField === 'user_id' && compareSortOrder === 'asc';
                            setCompareSortField('user_id');
                            setCompareSortOrder(isAsc ? 'desc' : 'asc');
                          }}
                          style={{ padding: '12px', borderBottom: '2px solid #ddd', cursor: 'pointer', userSelect: 'none' }}
                        >
                          社員番号 {compareSortField === 'user_id' ? (compareSortOrder === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>職種</th>
                        <th 
                          onClick={() => {
                            const isAsc = compareSortField === 'scoreA' && compareSortOrder === 'asc';
                            setCompareSortField('scoreA');
                            setCompareSortOrder(isAsc ? 'desc' : 'asc');
                          }}
                          style={{ padding: '12px', borderBottom: '2px solid #ddd', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        >
                          大会A スコア {compareSortField === 'scoreA' ? (compareSortOrder === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th 
                          onClick={() => {
                            const isAsc = compareSortField === 'scoreB' && compareSortOrder === 'asc';
                            setCompareSortField('scoreB');
                            setCompareSortOrder(isAsc ? 'desc' : 'asc');
                          }}
                          style={{ padding: '12px', borderBottom: '2px solid #ddd', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        >
                          大会B スコア {compareSortField === 'scoreB' ? (compareSortOrder === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th 
                          onClick={() => {
                            const isAsc = compareSortField === 'diff' && compareSortOrder === 'asc';
                            setCompareSortField('diff');
                            setCompareSortOrder(isAsc ? 'desc' : 'asc');
                          }}
                          style={{ padding: '12px', borderBottom: '2px solid #ddd', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        >
                          スコア差分 {compareSortField === 'diff' ? (compareSortOrder === 'asc' ? '▲' : '▼') : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let list = comparisonResults.filter(r => {
                          const matchUser = r.user_id.toString().includes(compareSearchUser);
                          const matchJob = compareJobType === 'すべて' || r.job_type === compareJobType;
                          return matchUser && matchJob;
                        });
                        
                        list.sort((a, b) => {
                          let valA, valB;
                          if (compareSortField === 'user_id') {
                            valA = parseInt(a.user_id, 10) || 0;
                            valB = parseInt(b.user_id, 10) || 0;
                          } else if (compareSortField === 'scoreA') {
                            valA = a.scoreA === null ? -9999 : a.scoreA;
                            valB = b.scoreA === null ? -9999 : b.scoreA;
                          } else if (compareSortField === 'scoreB') {
                            valA = a.scoreB === null ? -9999 : a.scoreB;
                            valB = b.scoreB === null ? -9999 : b.scoreB;
                          } else if (compareSortField === 'diff') {
                            valA = a.diff === null ? -9999 : a.diff;
                            valB = b.diff === null ? -9999 : b.diff;
                          }
                          
                          if (valA < valB) return compareSortOrder === 'asc' ? -1 : 1;
                          if (valA > valB) return compareSortOrder === 'asc' ? 1 : -1;
                          return 0;
                        });
                        
                        return list.map((row, idx) => {
                          let diffElement = null;
                          if (row.scoreA !== null && row.scoreB !== null) {
                            if (row.diff > 0) {
                              diffElement = <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>+{row.diff}</span>;
                            } else if (row.diff < 0) {
                              diffElement = <span style={{ color: '#c62828', fontWeight: 'bold' }}>{row.diff}</span>;
                            } else {
                              diffElement = <span style={{ color: '#777' }}>0</span>;
                            }
                          } else if (row.scoreA === null && row.scoreB !== null) {
                            diffElement = <span style={{ color: '#1565c0', fontStyle: 'italic', fontSize: '0.85em' }}>Bのみ参加</span>;
                          } else if (row.scoreA !== null && row.scoreB === null) {
                            diffElement = <span style={{ color: '#e65100', fontStyle: 'italic', fontSize: '0.85em' }}>Aのみ参加</span>;
                          }
                          
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#2c3e50' }}>{row.user_id}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ background: JOB_COLORS[row.job_type] || '#eee', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold' }}>
                                  {row.job_type || 'N/A'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: row.scoreA >= 209 ? 'bold' : 'normal', color: row.scoreA >= 209 ? '#2e7d32' : '#333' }}>
                                {row.scoreA !== null ? row.scoreA : '-'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: row.scoreB >= 209 ? 'bold' : 'normal', color: row.scoreB >= 209 ? '#2e7d32' : '#333' }}>
                                {row.scoreB !== null ? row.scoreB : '-'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                {diffElement}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* イベントスコア分析パネル */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginTop: '30px' }}>
            <h3 style={{ marginTop: 0, color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2em', marginRight: '8px' }}>📈</span> イベントスコア推移分析
            </h3>
            
            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '15px' }}>過去大会スコア 検索</h4>
              <form onSubmit={handleTSearch} style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ marginRight: '10px' }}>Min 社員番号:</label>
                  <input 
                    type="number" min="1" max="9999" value={tMinUser} onChange={e => setTMinUser(e.target.value)} 
                    placeholder="例: 5000" style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }} required
                  />
                </div>
                <div>
                  <label style={{ marginRight: '10px' }}>Max 社員番号:</label>
                  <input 
                    type="number" min="1" max="9999" value={tMaxUser} onChange={e => setTMaxUser(e.target.value)} 
                    placeholder="例: 5100" style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', width: '100px' }} required
                  />
                </div>
                <div>
                  <label style={{ marginRight: '10px', marginLeft: '10px' }}>期間:</label>
                  <input 
                    type="date" value={tStartDate} onChange={e => setTStartDate(e.target.value)} 
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                  />
                  <span style={{ margin: '0 10px' }}>〜</span>
                  <input 
                    type="date" value={tEndDate} onChange={e => setTEndDate(e.target.value)} 
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                  />
                </div>
                <div>
                  <label style={{ marginRight: '10px', marginLeft: '10px' }}>入社時期:</label>
                  <select 
                    value={tCohort} onChange={e => setTCohort(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                  >
                    <option value="すべて">すべて</option>
                    <option value="202604">202604</option>
                  </select>
                </div>
                <div>
                  <label style={{ marginRight: '10px', marginLeft: '10px' }}>職種:</label>
                  <select 
                    value={tJobType} onChange={e => setTJobType(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                  >
                    <option value="すべて">すべて</option>
                    <option value="CL">CL</option>
                    <option value="JAVA">JAVA</option>
                    <option value="ML">ML</option>
                    <option value="FR">FR</option>
                    <option value="QA">QA</option>
                  </select>
                </div>
                <div>
                  <label style={{ marginRight: '10px', marginLeft: '10px' }}>開始大会:</label>
                  <select 
                    value={tSearchStartTournamentId} onChange={e => setTSearchStartTournamentId(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '150px' }}
                  >
                    <option value="all">すべて(最初)</option>
                    {tournaments.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ marginRight: '10px', marginLeft: '10px' }}>終了大会:</label>
                  <select 
                    value={tSearchEndTournamentId} onChange={e => setTSearchEndTournamentId(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '150px' }}
                  >
                    <option value="all">すべて(最新)</option>
                    {tournaments.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" style={{ padding: '8px 20px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '10px', fontWeight: 'bold' }}>
                  検索
                </button>
              </form>
              {tError && <p style={{ color: '#e53935', marginTop: '15px' }}>{tError}</p>}
            </div>

            {tAverageScores.length > 0 && (
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {/* 職種別 平均スコア */}
                <div style={{ flex: '2 1 500px', background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ margin: 0, color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2em', marginRight: '8px' }}>📊</span> 職種別 平均スコア (イベント)
                    </h4>
                    {tRawData.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#555' }}>表示大会:</span>
                        <select 
                          value={tDisplayAverageTournamentId} 
                          onChange={e => setTDisplayAverageTournamentId(e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: '5px', border: '1px solid #ccc', background: '#fff' }}
                        >
                          <option value="all">全表示対象の平均</option>
                          {Array.from(new Map(tRawData.map(item => [item.tournament_id, item.tournament_name])).entries()).map(([id, name]) => (
                            <option key={id} value={id.toString()}>{name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {tAverageScores.map((item, idx) => (
                      <div key={idx} style={{ flex: '1 1 120px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center', borderBottom: '4px solid #ff9800' }}>
                        <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>{item.jobType}</div>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#2c3e50' }}>{item.average}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 一般オフィスワーク基準 (209) 達成状況 */}
                <div style={{ flex: '1 1 300px', background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2em', marginRight: '8px' }}>🎯</span> オフィスワーク基準 (スコア 209) 達成状況
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '3px' }}>達成者</div>
                      <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#4caf50' }}>
                        {tRanking.filter(u => u.maxScore >= 209).length} <span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#666' }}>人</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '3px' }}>未達成者</div>
                      <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#e53935' }}>
                        {tRanking.filter(u => u.maxScore < 209).length} <span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#666' }}>人</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '3px' }}>達成率</div>
                      <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#5c6bc0' }}>
                        {tRanking.length > 0 ? Math.round((tRanking.filter(u => u.maxScore >= 209).length / tRanking.length) * 100) : 0} <span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#666' }}>%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ background: '#e8e8e8', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${tRanking.length > 0 ? (tRanking.filter(u => u.maxScore >= 209).length / tRanking.length) * 100 : 0}%`,
                        backgroundColor: '#4caf50',
                        height: '100%'
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ height: '500px', background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #eee', marginBottom: '20px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50' }}>大会ごとのスコア推移</h4>
              {tLoading ? (
                <p>Loading...</p>
              ) : tChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="95%">
                  <LineChart data={tChartData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'スコア', angle: -90, position: 'insideLeft' }} domain={[0, 'auto']} ticks={[0, 100, 200, 300, 400, 500, 600, 700, 800]} />
                    <ReferenceLine y={209} stroke="#e53935" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'オフィス基準 (209)', fill: '#e53935', position: 'top' }} />
                    <Tooltip />
                    <Legend />
                    {/* Job Average Lines */}
                    {['CL', 'JAVA', 'ML', 'FR', 'QA'].map((job) => (
                      <Line 
                        key={`${job}平均`} 
                        type="monotone" 
                        dataKey={`${job}平均`} 
                        name={`${job}平均`}
                        stroke={JOB_COLORS[job] || '#9e9e9e'} 
                        strokeDasharray="5 5" 
                        strokeWidth={3}
                        dot={{ r: 4 }} 
                        connectNulls
                      />
                    ))}
                    {/* Individual User Lines */}
                    {tUserLines.map((userId, index) => {
                      const isSelected = tSelectedUser === userId;
                      const strokeOpacity = tSelectedUser ? (isSelected ? 1 : 0.05) : 0.3;
                      const strokeWidth = isSelected ? 3 : 1;
                      return (
                        <Line 
                          key={userId} type="monotone" dataKey={userId} name={`ユーザ ${userId}`}
                          stroke={getColor(index)} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth}
                          dot={isSelected ? { r: 6 } : false} activeDot={{ r: 8 }} connectNulls
                          legendType="none"
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ textAlign: 'center', marginTop: '120px', color: '#888' }}>データがありません。条件を指定して検索してください。</p>
              )}
            </div>

            {tRawData.length > 0 && (
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 40%', background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #eee' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2em', marginRight: '8px' }}>🚀</span> 最もスコアが伸びたユーザ (イベント)
                  </h4>
                  {tTopGrowthUser && tTopGrowthUser.growth > 0 ? (
                    <div style={{ textAlign: 'center', background: '#f0f4f8', padding: '20px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#ff9800', marginBottom: '10px' }}>ユーザ {tTopGrowthUser.userId}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.8em', color: '#888' }}>初回 ({tTopGrowthUser.firstDate})</div>
                          <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#2c3e50' }}>{tTopGrowthUser.firstScore}</div>
                        </div>
                        <div style={{ fontSize: '1.5em', color: '#ccc' }}>→</div>
                        <div>
                          <div style={{ fontSize: '0.8em', color: '#888' }}>最新 ({tTopGrowthUser.lastDate})</div>
                          <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#2c3e50' }}>{tTopGrowthUser.lastScore}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '15px', display: 'inline-block', background: '#e8f5e9', color: '#2e7d32', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '1.2em' }}>
                        +{tTopGrowthUser.growth} UP!!
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#888', textAlign: 'center' }}>スコアが伸びたユーザがいません。</p>
                  )}
                </div>

                <div style={{ flex: '1 1 40%', background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #eee' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2em', marginRight: '8px' }}>👑</span> 最高スコアランキング (イベント)
                  </h4>
                  {tRanking.length > 0 ? (
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
                            {tRanking.slice((tRankingPage - 1) * itemsPerPage, tRankingPage * itemsPerPage).map((r, index) => {
                              const globalIndex = (tRankingPage - 1) * itemsPerPage + index;
                              return (
                                <tr key={r.userId} style={{ borderBottom: '1px solid #eee', background: globalIndex === 0 ? '#fffdf0' : 'transparent' }}>
                                  <td style={{ padding: '8px', fontWeight: 'bold', color: globalIndex === 0 ? '#d4af37' : globalIndex === 1 ? '#9e9e9e' : globalIndex === 2 ? '#cd7f32' : '#ff9800' }}>
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
                      {tRanking.length > itemsPerPage && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                          <button onClick={() => setTRankingPage(p => Math.max(p - 1, 1))} disabled={tRankingPage === 1} style={{ padding: '5px 15px', background: tRankingPage === 1 ? '#e0e0e0' : '#ff9800', color: tRankingPage === 1 ? '#9e9e9e' : '#fff', border: 'none', borderRadius: '5px', cursor: tRankingPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>前へ</button>
                          <span style={{ color: '#666', fontSize: '0.9em' }}>{tRankingPage} / {Math.ceil(tRanking.length / itemsPerPage)} ページ ({tRanking.length}件)</span>
                          <button onClick={() => setTRankingPage(p => Math.min(p + 1, Math.ceil(tRanking.length / itemsPerPage)))} disabled={tRankingPage === Math.ceil(tRanking.length / itemsPerPage)} style={{ padding: '5px 15px', background: tRankingPage === Math.ceil(tRanking.length / itemsPerPage) ? '#e0e0e0' : '#ff9800', color: tRankingPage === Math.ceil(tRanking.length / itemsPerPage) ? '#9e9e9e' : '#fff', border: 'none', borderRadius: '5px', cursor: tRankingPage === Math.ceil(tRanking.length / itemsPerPage) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>次へ</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: '#888', textAlign: 'center' }}>データがありません。</p>
                  )}
                </div>
              </div>
            )}

            {tUserLines.length > 0 && (
              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #eee' }}>
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50' }}>ユーザー成長分析 (イベント)</h4>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ marginRight: '10px', fontWeight: 'bold' }}>分析対象ユーザーを選択:</label>
                  <select value={tSelectedUser} onChange={handleTUserSelect} style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '1em' }}>
                    <option value="">-- 選択してください --</option>
                    {tUserLines.map(u => <option key={u} value={u}>ユーザ {u}</option>)}
                  </select>
                </div>
                {tAnalysis ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #5c6bc0' }}>
                      <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '5px' }}>初回大会 ({tAnalysis.firstDate})</div>
                      <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2c3e50' }}>{tAnalysis.firstScore}</div>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #4caf50' }}>
                      <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '5px' }}>最新大会 ({tAnalysis.lastDate})</div>
                      <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2c3e50' }}>{tAnalysis.lastScore}</div>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ff9800' }}>
                      <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '5px' }}>期間内最高スコア</div>
                      <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2c3e50' }}>{tAnalysis.maxScore}</div>
                    </div>
                    <div style={{ background: tAnalysis.growth >= 0 ? '#e8f5e9' : '#ffebee', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${tAnalysis.growth >= 0 ? '#4caf50' : '#f44336'}` }}>
                      <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '5px' }}>スコア成長量</div>
                      <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: tAnalysis.growth >= 0 ? '#2e7d32' : '#c62828' }}>
                        {tAnalysis.growth > 0 ? '+' : ''}{tAnalysis.growth}
                      </div>
                    </div>
                  </div>
                ) : tSelectedUser ? (
                  <p style={{ color: '#888' }}>このユーザーのデータは期間内にありません。</p>
                ) : (
                  <p style={{ color: '#888' }}>ユーザーを選択すると、詳細な分析データが表示されます。</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <a href="/" style={{ color: '#5c6bc0', textDecoration: 'none' }}>← ゲームに戻る</a>
      </div>
    </div>
  );
}
