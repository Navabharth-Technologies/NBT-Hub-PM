import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, Award, Zap, ArrowLeft, ShieldCheck, UserCheck, Flame, Edit, Trash2, Plus, Users, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { API_ENDPOINTS, BASE_URL } from '../../config';

export default function AwardsScreen() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [winWidth, setWinWidth] = React.useState(window.innerWidth);
    const [rewards, setRewards] = React.useState([]);
    const [quizScores, setQuizScores] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [view, setView] = React.useState('feed'); // 'feed', 'leaderboard', 'points'
    const [leaderboard, setLeaderboard] = React.useState([]);
    const [rewardNames, setRewardNames] = React.useState([]);
    const [showGrantModal, setShowGrantModal] = React.useState(false);
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [selectedReward, setSelectedReward] = React.useState(null);
    const [employees, setEmployees] = React.useState([]);
    const [grantData, setGrantData] = React.useState({ employee_id: '', reward_name: '', points: 50, note: '' });
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [selectedEmployee, setSelectedEmployee] = React.useState(null);
    const [selectedAward, setSelectedAward] = React.useState(null);
    const [granting, setGranting] = React.useState(false);
    const [history, setHistory] = React.useState({ pm: [] });
    const [feedback, setFeedback] = React.useState(null);
    const [startDate, setStartDate] = React.useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    });
    const [endDate, setEndDate] = React.useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [selectedHistoryUser, setSelectedHistoryUser] = React.useState(null);
    const [showAllFeed, setShowAllFeed] = React.useState(false);
    const [showRecipientDropdown, setShowRecipientDropdown] = React.useState(false);
    const [recipientSearch, setRecipientSearch] = React.useState('');
    const [auditSearch, setAuditSearch] = React.useState('');
    const [showRewardDropdown, setShowRewardDropdown] = React.useState(false);
    const [availableAwards] = React.useState([
        { id: 'visionary', title: "Visionary Lead", rep: 200, desc: "Acknowledge exceptional leadership and vision." },
        { id: 'achiever', title: "Goal Achiever", rep: 150, desc: "Recognize consistent goal hitting and performance." },
        { id: 'growth', title: "Team Growth", rep: 150, desc: "Reward contributions to team development." },
        { id: 'star', title: "Star Performer", rep: 50, desc: "Acknowledge exceptional output and dedication." },
        { id: 'solver', title: "Problem Solver", rep: 30, desc: "Recognize innovative solutions and quick thinking." },
        { id: 'collaborator', title: "Collaborative Hero", rep: 20, desc: "Reward great teamwork and unselfish assistance." }
    ]);

    React.useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchInitialData = async () => {
        if (!user?.token) return;
        try {
            const rewRes = await fetch(API_ENDPOINTS.REWARDS_HISTORY, { headers: { 'Authorization': `Bearer ${user.token}` } });
            if (rewRes.ok) {
                const data = await rewRes.json();
                setRewards(Array.isArray(data) ? data : []);
            }

            setRewardNames(["Visionary Lead", "Goal Achiever", "Team Growth", "Star Performer", "Problem Solver", "Collaborative Hero"]);

            let allStaff = [];
            try {
                const empRes = await fetch(API_ENDPOINTS.EMPLOYEES, { headers: { 'Authorization': `Bearer ${user.token}` } });
                if (empRes.ok) {
                    const resJson = await empRes.json();
                    allStaff = [...allStaff, ...(Array.isArray(resJson) ? resJson : (resJson.data || []))];
                }
            } catch (e) { }

            try {
                const userRes = await fetch(API_ENDPOINTS.USERS, { headers: { 'Authorization': `Bearer ${user.token}` } });
                if (userRes.ok) {
                    const resJson = await userRes.json();
                    allStaff = [...allStaff, ...(Array.isArray(resJson) ? resJson : (resJson.data || []))];
                }
            } catch (e) { }

            // Deduplicate
            const unique = Array.from(new Map(allStaff.map(s => [s.id || s.employee_id || s.userId, s])).values());
            setEmployees(unique);

            // Fetch Quiz Scores to aggregate
            let qList = [];
            try {
                const qRes = await fetch(API_ENDPOINTS.QUIZ_LEADERBOARD, { headers: { 'Authorization': `Bearer ${user.token}` } });
                if (qRes.ok) {
                    const qData = await qRes.json();
                    qList = Array.isArray(qData) ? qData : (qData.data || []);
                }
            } catch (e) { }

            // Local Cache & Merge Strategy to prevent historical score loss when quiz is deleted
            try {
                let cachedQuizScores = [];
                const localData = localStorage.getItem('nbt_historical_quiz_scores');
                if (localData) {
                    const parsed = JSON.parse(localData);
                    if (Array.isArray(parsed)) {
                        cachedQuizScores = parsed;
                    }
                }

                const mergedMap = new Map();
                // 1. Load historical cache first
                cachedQuizScores.forEach(item => {
                    if (item) {
                        const empId = item.employee_id || item.user_id || item.userId || item.id || '';
                        const score = Number(item.total_score || item.points || item.quiz_score || item.score || 0);
                        const qId = item.quiz_id || item.quizId || '';
                        const date = item.created_at || item.completion_date || item.date || '';
                        const datePart = (date || '').split('T')[0];
                        const uniqueKey = `${empId}-${qId || 'default'}-${score}-${datePart}`;
                        mergedMap.set(uniqueKey, item);
                    }
                });

                // 2. Overlay new active quiz scores
                qList.forEach(item => {
                    if (item) {
                        const empId = item.employee_id || item.user_id || item.userId || item.id || '';
                        const score = Number(item.total_score || item.points || item.quiz_score || item.score || 0);
                        const qId = item.quiz_id || item.quizId || '';
                        const date = item.created_at || item.completion_date || item.date || '';
                        const datePart = (date || '').split('T')[0];
                        const uniqueKey = `${empId}-${qId || 'default'}-${score}-${datePart}`;
                        mergedMap.set(uniqueKey, item);
                    }
                });

                const mergedList = Array.from(mergedMap.values());
                localStorage.setItem('nbt_historical_quiz_scores', JSON.stringify(mergedList));
                qList = mergedList;
            } catch (cacheErr) {
                console.error("Local quiz score caching error:", cacheErr);
            }

            setQuizScores(qList);

            // Fetch Leaderboard for Banner (Top Recognition) - Pass fresh quiz scores to avoid state lag
            await fetchLeaderboard(qList);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchInitialData();
        fetchGrantedHistory();
    }, [user]);

    const fetchGrantedHistory = async () => {
        if (!user?.token) return;
        try {
            const res = await fetch(API_ENDPOINTS.REWARDS_HISTORY, { headers: { 'Authorization': `Bearer ${user.token}` } });
            if (res.ok) {
                const data = await res.json();
                const uid = user?.employee_id || user?.userId || user?.id;
                const myGrants = Array.isArray(data) ? data.filter(r => String(r.granted_by) === String(uid)) : [];
                setHistory({ pm: myGrants });
            }
        } catch (err) { }
    };

    const showFeedback = (msg, type) => {
        setFeedback({ msg, type });
        setTimeout(() => setFeedback(null), 3000);
    };

    const resolveEmployeeName = (id) => {
        if (!id) return 'Anonymous Member';
        const emp = employees.find(e =>
            String(e.id) === String(id) ||
            String(e.employee_id) === String(id) ||
            String(e.userId) === String(id) ||
            String(e.emp_id) === String(id)
        );
        return emp ? (emp.name || emp.employee_name || 'Anonymous Member') : 'Anonymous Member';
    };

    const fetchLeaderboard = async (overrideQuizScores = null) => {
        if (!user?.token) return;
        const activeQuizScores = overrideQuizScores || quizScores;
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`${API_ENDPOINTS.LEADERBOARD_ALL}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const resJson = await res.json();
                const baseLeaderboard = Array.isArray(resJson.data) ? resJson.data : (Array.isArray(resJson) ? resJson : []);

                // Merge quiz scores into leaderboard
                const mergedMap = new Map();

                // First add base reward points
                baseLeaderboard.forEach(item => {
                    const id = String(item.employee_id || item.id || item.userId);
                    mergedMap.set(id, {
                        id: isNaN(id) ? id : Number(id),
                        name: item.name || item.employee_name || resolveEmployeeName(id),
                        total_reward_points: Number(item.total_reward_points || item.total_points || 0),
                        total_quiz_points: 0
                    });
                });

                // Then add quiz points
                activeQuizScores.forEach(q => {
                    const id = String(q.employee_id || q.user_id || q.userId || q.id);
                    const score = Number(q.total_score || q.points || q.quiz_score || q.score || 0);
                    if (mergedMap.has(id)) {
                        const existing = mergedMap.get(id);
                        existing.total_quiz_points += score;
                    } else {
                        mergedMap.set(id, {
                            id: isNaN(id) ? id : Number(id),
                            name: resolveEmployeeName(id),
                            total_reward_points: 0,
                            total_quiz_points: score
                        });
                    }
                });

                const finalLeaderboard = Array.from(mergedMap.values()).map(item => {
                    const empId = String(item.id);
                    const emp = employees.find(e =>
                        String(e.id) === empId ||
                        String(e.employee_id) === empId ||
                        String(e.userId) === empId ||
                        String(e.emp_id) === empId
                    );
                    const total_points = item.total_reward_points + item.total_quiz_points;
                    return {
                        id: item.id,
                        name: emp ? (emp.name || emp.employee_name || item.name) : item.name,
                        role: emp ? (emp.designation || emp.role || 'Team Member') : 'Team Member',
                        team: emp ? (emp.team || emp.department || 'Bytes Blasters✨') : 'Bytes Blasters✨',
                        total_reward_points: item.total_reward_points,
                        total_quiz_points: item.total_quiz_points,
                        total_points: total_points
                    };
                });

                // Sort descending by total_points
                finalLeaderboard.sort((a, b) => b.total_points - a.total_points);

                // Add ranks
                const rankedLeaderboard = finalLeaderboard.map((item, index) => ({
                    ...item,
                    rank: String(index + 1)
                }));

                setLeaderboard(rankedLeaderboard);
            }
        } catch (err) {
            console.error("Leaderboard fetch error:", err);
            setLeaderboard([]);
        }
    };

    React.useEffect(() => {
        fetchLeaderboard();
    }, [startDate, endDate]);

    const combinedRewards = React.useMemo(() => {
        const quizRewards = quizScores.map((q, index) => ({
            id: `quiz-${q.employee_id || q.user_id || q.userId || q.id}-${q.id || index}`,
            employee_id: q.employee_id || q.user_id || q.userId || q.id,
            reward_name: 'Quiz Excellence',
            points: Number(q.total_score || q.points || q.quiz_score || q.score || 0),
            created_at: q.created_at || q.completion_date || q.date || new Date().toISOString(),
            note: 'Earned from Quiz Hub'
        })).filter(q => q.points > 0);

        return [...rewards, ...quizRewards];
    }, [rewards, quizScores]);

    const filteredRewards = combinedRewards.filter(r => {
        if (!startDate && !endDate) return true;
        const rDate = (r.created_at || r.date || "").split('T')[0];
        if (!rDate) return true;
        if (startDate && rDate < startDate) return false;
        if (endDate && rDate > endDate) return false;
        return true;
    });

    const topContributor = React.useMemo(() => {
        if (!leaderboard || leaderboard.length === 0) return null;
        const leader = leaderboard[0];
        const emp = employees.find(e =>
            String(e.id) === String(leader.id) ||
            String(e.employee_id) === String(leader.id) ||
            String(e.userId) === String(leader.id)
        );
        return {
            ...leader,
            role: emp?.role || leader.role || 'Team Member',
            profile_picture: emp?.profile_picture || emp?.profile_pic || emp?.photo
        };
    }, [leaderboard, employees]);

    const myRank = React.useMemo(() => {
        if (!leaderboard || leaderboard.length === 0 || !user) return null;
        const uid = String(user.employee_id || user.userId || user.id);
        const match = leaderboard.find(item => String(item.id) === uid);
        return match ? match.rank : null;
    }, [leaderboard, user]);

    const handleGrantAward = async () => {
        if (!selectedEmployee) {
            showFeedback("Please select a recipient first.", "error");
            return;
        }
        setGranting(true);
        try {
            const uid = user?.employee_id || user?.userId || user?.id;

            // Sanitized payload for database persistence
            const payload = {
                employee_id: Number(selectedEmployee.id || selectedEmployee.employee_id || selectedEmployee.userId || selectedEmployee.emp_id),
                reward_name: String(selectedAward?.title || grantData.reward_name || "Standard Recognition"),
                points: Number(grantData.points || 50),
                reward_name_alt: grantData.reward_name || "Performance",
                granted_by: Number(uid),
                note: String(grantData.note || "Recognition Grant (Hub)")
            };

            const res = await fetch(API_ENDPOINTS.REWARDS_GIVE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showFeedback(`Successfully awarded recognition!`, 'success');
                setShowGrantModal(false);
                setSelectedEmployee(null);
                setSelectedAward(null);
                setGrantData({ ...grantData, note: '' });
                fetchInitialData();
            } else {
                const errJson = await res.json().catch(() => ({}));
                showFeedback(errJson.error || errJson.message || "Failed to save to database.", "error");
            }
        } catch (err) {
            console.error("Grant Error:", err);
            showFeedback("Network error. Could not connect to database.", "error");
        }
        finally { setGranting(false); }
    };

    const handleDeleteReward = async (id) => {
        if (!window.confirm("Revoke this recognition?")) return;
        try {
            const res = await fetch(API_ENDPOINTS.REWARD_DELETE(id), { method: 'DELETE', headers: { 'Authorization': `Bearer ${user.token}` } });
            if (res.ok) {
                setRewards(prev => prev.filter(r => r.id !== id));
            }
        } catch (err) { }
    };

    const handleUpdateReward = async () => {
        if (!selectedReward) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(API_ENDPOINTS.REWARD_EDIT(selectedReward.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify(selectedReward)
            });
            if (res.ok) {
                setRewards(prev => prev.map(r => r.id === selectedReward.id ? selectedReward : r));
                setShowEditModal(false);
            }
        } catch (err) { console.error(err); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
            <AppHeader />

            <main style={{ flex: 1, padding: winWidth < 768 ? '100px 16px 40px' : '120px 26px 40px', width: '100%', boxSizing: 'border-box', marginTop: 0 }}>
                <div style={{ width: '100%' }}>

                    {/* Header Controls */}
                    <div style={{ display: 'flex', flexDirection: winWidth < 600 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 600 ? 'flex-start' : 'flex-start', marginBottom: '32px', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button
                                onClick={() => navigate(-1)}
                                style={{
                                    background: 'white',
                                    padding: '10px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}
                            >
                                <ArrowLeft size={18} color="#64748b" />
                            </button>
                            <div>
                                <h1 style={{ margin: 0, fontSize: winWidth < 768 ? '20px' : '24px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>Awards & Recognition</h1>
                                <p style={{ margin: 0, fontSize: winWidth < 768 ? '11px' : '13px', color: '#94a3b8', fontWeight: '600' }}>Live achievements at NBT Hub</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', width: winWidth < 768 ? '100%' : 'auto', justifyContent: winWidth < 600 ? 'flex-start' : 'flex-start', alignItems: 'center' }}>
                            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', width: winWidth < 480 ? '100%' : 'auto', overflowX: 'auto' }}>
                                <button
                                    onClick={() => setView('feed')}
                                    style={{ flex: winWidth < 480 ? 1 : 'none', padding: winWidth < 480 ? '8px 4px' : '8px 16px', borderRadius: '8px', fontSize: winWidth < 480 ? '10px' : '12px', fontWeight: '800', border: 'none', background: view === 'feed' ? 'white' : 'transparent', color: view === 'feed' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: view === 'feed' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', whiteSpace: 'nowrap' }}>
                                    Live Feed
                                </button>

                                <button
                                    onClick={() => setView('points')}
                                    style={{ flex: winWidth < 480 ? 1 : 'none', padding: winWidth < 480 ? '8px 4px' : '8px 16px', borderRadius: '8px', fontSize: winWidth < 480 ? '10px' : '12px', fontWeight: '800', border: 'none', background: view === 'points' ? 'white' : 'transparent', color: view === 'points' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: view === 'points' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', whiteSpace: 'nowrap' }}>
                                    Reward Points
                                </button>
                            </div>

                            <button
                                onClick={() => setView(view === 'audit' ? 'feed' : 'audit')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    background: view === 'audit' ? '#eff6ff' : 'white',
                                    color: view === 'audit' ? '#2563eb' : '#64748b',
                                    border: view === 'audit' ? '3px solid #3b82f6' : '3px solid #cbd5e1',
                                    boxShadow: view === 'audit' ? '0 2px 4px rgba(59, 130, 246, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                                    whiteSpace: 'nowrap',
                                    height: '38px',
                                    width: winWidth < 480 ? '100%' : 'auto',
                                    justifyContent: 'center'
                                }}>
                                <ShieldCheck size={14} color={view === 'audit' ? '#2563eb' : '#64748b'} />
                                Team Audit
                            </button>

                            {/* Date Filter Integrated into Top Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', width: winWidth < 480 ? '100%' : 'auto', justifyContent: winWidth < 480 ? 'center' : 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>From</span>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '10px', fontWeight: '700', outline: 'none', width: '90px' }} />
                                </div>
                                <div style={{ width: '1px', height: '15px', background: '#cbd5e1' }}></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>To</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '10px', fontWeight: '700', outline: 'none', width: '90px' }} />
                                </div>
                            </div>
                            {(user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'MANAGER') && (
                                <button
                                    onClick={() => setShowGrantModal(true)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: winWidth < 480 ? '12px' : '10px 20px',
                                        background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px',
                                        fontSize: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(15,23,42,0.3)',
                                        width: winWidth < 480 ? '100%' : 'auto', justifyContent: 'center'
                                    }}>
                                    <Plus size={16} /> Grant Award
                                </button>
                            )}
                        </div>
                    </div>

                    {/* High-Fidelity Top Banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        borderRadius: '24px',
                        padding: winWidth < 768 ? '30px 20px' : '30px 60px',
                        display: 'grid',
                        gridTemplateColumns: winWidth < 768 ? '1fr' : '1fr 1fr 1fr',
                        gap: winWidth < 768 ? '30px' : '0',
                        alignItems: 'center',
                        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.4)',
                        marginBottom: '40px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '40%', height: '200%', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)', transform: 'rotate(-45deg)', opacity: 0.5 }}></div>                        {/* Current Rank / My Reputation */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderRight: winWidth < 768 ? 'none' : '1.5px solid rgba(255,255,255,0.1)', borderBottom: winWidth < 768 ? '1.5px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: winWidth < 768 ? '20px' : '0' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Trophy size={winWidth < 768 ? 24 : 32} color="#38bdf8" />
                            </div>
                            <div>
                                <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px' }}>My Reputation</p>
                                <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '20px' : '24px', fontWeight: '950', color: '#ffffff' }}>
                                    {(user?.totalPoints ?? user?.total_points ?? user?.totalRep ?? 0).toLocaleString()} <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '800' }}>PTS</span>
                                </h3>
                                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                                    {myRank ? `Ranked #${myRank} overall` : 'Active Hub'}
                                </p>
                            </div>
                        </div>

                        {/* Points Display */}
                        <div style={{ textAlign: winWidth < 768 ? 'left' : 'center', borderRight: winWidth < 768 ? 'none' : '1.5px solid rgba(255,255,255,0.1)', borderBottom: winWidth < 768 ? '1.5px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: winWidth < 768 ? '20px' : '0' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Top Contributor Score</p>
                            <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '22px' : '28px', fontWeight: '950', color: '#facc15' }}>
                                {topContributor ? Number(topContributor.total_points || 0).toLocaleString() : "0"} <span style={{ fontSize: '18px' }}>REP</span>
                            </h3>
                        </div>

                        {/* Leaderboard Score */}
                        <div style={{ textAlign: winWidth < 768 ? 'left' : 'right' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Top Recognition</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: winWidth < 768 ? 'flex-start' : 'flex-end', gap: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '950', color: '#ffffff' }}>
                                    {topContributor ? topContributor.name : "Syncing..."}
                                </h3>
                                <Star size={20} color="#facc15" fill="#facc15" />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: (winWidth < 1200 || view === 'audit') ? '1fr' : '1fr 380px', gap: '30px', alignItems: 'start' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '24px', padding: winWidth < 768 ? '15px' : '30px', border: '1.5px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>
                                    {view === 'feed' ? 'Global Rewards' : view === 'audit' ? 'Team Recognition Audit' : 'Standard Recognition Tiers'}
                                </h3>
                                <div style={{ fontSize: '9px', fontWeight: '950', color: '#3863a8', background: '#e0f2fe', padding: '6px 12px', borderRadius: '10px', letterSpacing: '0.5px' }}>
                                    {view === 'feed' ? `${selectedHistoryUser ? filteredRewards.filter(r => String(r.employee_id) === String(selectedHistoryUser)).length : filteredRewards.length} ENTRIES` : view === 'audit' ? `${filteredRewards.length} LOGS` : `${availableAwards.length} TIERS`}
                                </div>
                            </div>

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>⚡ Syncing database...</div>
                            ) : view === 'feed' ? (
                                <>
                                    {!selectedHistoryUser ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <div>
                                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '1000', color: '#0f172a' }}>Recognition Glimpse</h2>
                                                    <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>Aggregated results per member</p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    {Array.from(new Set(filteredRewards.map(r => r.employee_id))).length > 5 && (
                                                        <button
                                                            onClick={() => setShowAllFeed(!showAllFeed)}
                                                            style={{
                                                                background: 'none', border: 'none', color: '#3863a8', fontSize: '11px', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase', textDecoration: 'underline'
                                                            }}>
                                                            {showAllFeed ? 'View Less' : 'View All'}
                                                        </button>
                                                    )}
                                                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6', background: '#eff6ff', padding: '6px 12px', borderRadius: '10px' }}>
                                                        {Array.from(new Set(filteredRewards.map(r => r.employee_id))).length} Members Recognized
                                                    </div>
                                                </div>
                                            </div>
                                            {(() => {
                                                const activeLeaderboard = leaderboard.filter(item => item.total_points > 0);
                                                const displayedStats = showAllFeed ? activeLeaderboard : activeLeaderboard.slice(0, 5);

                                                return displayedStats.map((item, index) => {
                                                    const empId = item.id;
                                                    return (
                                                        <div key={empId} onClick={() => setSelectedHistoryUser(empId)} style={{ background: 'white', padding: winWidth < 768 ? '16px' : '20px', borderRadius: winWidth < 768 ? '20px' : '24px', border: '3px solid #cbd5e1', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s ease' }}
                                                            onMouseEnter={e => {
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                                e.currentTarget.style.borderColor = '#3863a8';
                                                                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '12px' : '15px' }}>
                                                                <div style={{ width: winWidth < 768 ? '40px' : '45px', height: winWidth < 768 ? '40px' : '45px', borderRadius: '14px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #cbd5e1', fontSize: '14px', fontWeight: '950', color: '#0369a1' }}>#{item.rank}</div>
                                                                <div>
                                                                    <div style={{ fontSize: winWidth < 768 ? '14px' : '15px', fontWeight: '1000', color: '#0f172a' }}>{item.name}</div>
                                                                    <div style={{ fontSize: winWidth < 768 ? '10px' : '11px', color: '#64748b', fontWeight: '700', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '6px' }}>🏆 Awards: {item.total_reward_points} pts</span>
                                                                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '6px' }}>📝 Quizzes: {item.total_quiz_points} pts</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', color: '#10b981' }}>+{item.total_points}</div>
                                                                <div style={{ fontSize: '8px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>PTS</div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <button onClick={() => setSelectedHistoryUser(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '800' }}><ChevronLeft size={16} /> Back to Feed</button>
                                            {filteredRewards.filter(r => String(r.employee_id) === String(selectedHistoryUser)).map((r, i) => (
                                                <div key={i} style={{ padding: '20px', borderRadius: '24px', background: 'white', border: '3px solid #cbd5e1' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <div style={{ fontWeight: '1000' }}>{r.reward_name || 'Excellence'}</div>
                                                        <div style={{ color: '#38bdf8', fontWeight: '1000' }}>+{r.points} REP</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : view === 'audit' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Audit Search Bar */}
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type="text"
                                            placeholder="Search by Recipient, Giver, or Recognition Tier..."
                                            value={auditSearch}
                                            onChange={e => setAuditSearch(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '14px 20px 14px 50px',
                                                borderRadius: '16px',
                                                border: '3px solid #cbd5e1',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                outline: 'none',
                                                color: '#1e293b',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                                            }}
                                        />
                                        <div style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                            <Search size={18} />
                                        </div>
                                    </div>                                    {/* Stats Summary Cards for Audit */}
                                    <div style={{ display: 'grid', gridTemplateColumns: winWidth < 576 ? '1fr' : '1fr 1fr', gap: '15px' }}>
                                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '3px solid #cbd5e1' }}>
                                            <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned points</div>
                                            <div style={{ fontSize: '20px', fontWeight: '950', color: '#10b981' }}>
                                                {(() => {
                                                    const uid = user?.employee_id || user?.userId || user?.id;
                                                    const myGrants = filteredRewards.filter(r => String(r.granted_by) === String(uid));
                                                    return myGrants.reduce((sum, r) => sum + (Number(r.points) || 0), 0).toLocaleString();
                                                })()} REP
                                            </div>
                                        </div>
                                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '3px solid #cbd5e1' }}>
                                            <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Employee of the month</div>
                                            <div style={{ fontSize: '20px', fontWeight: '950', color: '#8b5cf6' }}>
                                                {topContributor ? topContributor.name : "N/A"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Audit Logs List */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {(() => {
                                            const uid = user?.employee_id || user?.userId || user?.id;
                                            const auditLogs = filteredRewards.filter(r => {
                                                if (String(r.granted_by) !== String(uid)) return false;
                                                const recipientName = resolveEmployeeName(r.employee_id).toLowerCase();
                                                const giverName = resolveEmployeeName(r.granted_by).toLowerCase();
                                                const rewardName = (r.reward_name || '').toLowerCase();
                                                const search = auditSearch.toLowerCase();
                                                return recipientName.includes(search) || giverName.includes(search) || rewardName.includes(search);
                                            });

                                            if (auditLogs.length === 0) {
                                                return (
                                                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: 'white', borderRadius: '24px', border: '3px solid #cbd5e1' }}>
                                                        <ShieldCheck size={40} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
                                                        <div style={{ fontWeight: '800', fontSize: '14px', color: '#64748b' }}>No audit records found matching your query.</div>
                                                    </div>
                                                );
                                            }

                                            return auditLogs.map((r, i) => {
                                                const canRevoke = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'MANAGER' || String(r.granted_by) === String(user?.employee_id || user?.userId || user?.id);
                                                return (
                                                    <div
                                                        key={r.id || i}
                                                        style={{
                                                            background: 'white',
                                                            padding: winWidth < 768 ? '16px' : '24px',
                                                            borderRadius: '24px',
                                                            border: '3px solid #cbd5e1',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '15px',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                        onMouseEnter={e => {
                                                            e.currentTarget.style.borderColor = '#3863a8';
                                                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
                                                        }}
                                                        onMouseLeave={e => {
                                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                                            e.currentTarget.style.boxShadow = 'none';
                                                        }}
                                                    >
                                                        {/* Top row: Recipient Info & Points */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', fontSize: '16px' }}>
                                                                    {resolveEmployeeName(r.employee_id).charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '15px', fontWeight: '1000', color: '#0f172a' }}>{resolveEmployeeName(r.employee_id)}</div>
                                                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Recipient ID: {r.employee_id}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ background: '#ecfdf5', color: '#10b981', fontWeight: '1000', fontSize: '14px', padding: '6px 16px', borderRadius: '10px' }}>
                                                                    +{r.points} REP
                                                                </div>
                                                                {canRevoke && (
                                                                    <button
                                                                        onClick={() => handleDeleteReward(r.id)}
                                                                        style={{
                                                                            background: '#fef2f2',
                                                                            border: 'none',
                                                                            padding: '8px',
                                                                            borderRadius: '10px',
                                                                            cursor: 'pointer',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            color: '#ef4444'
                                                                        }}
                                                                        title="Revoke Recognition"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Middle Row: Badge, Giver & Timestamp */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px' }}>
                                                            <div>
                                                                <span style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Recognition Tier</span>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '13px', color: '#1e293b' }}>
                                                                    <Award size={14} color="#3b82f6" />
                                                                    {r.reward_name || 'Excellence'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Granted By</span>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '13px', color: '#1e293b' }}>
                                                                    <UserCheck size={14} color="#10b981" />
                                                                    {resolveEmployeeName(r.granted_by)}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Reason Note */}
                                                        {r.note && (
                                                            <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600', fontStyle: 'italic', borderLeft: '3px solid #cbd5e1', paddingLeft: '12px', margin: '4px 0' }}>
                                                                "{r.note}"
                                                            </div>
                                                        )}

                                                        {/* Timestamp */}
                                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textAlign: 'right' }}>
                                                            Awarded on: {new Date(r.created_at || r.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {availableAwards.map((award, i) => (
                                        <div key={award.id} onClick={() => { setSelectedAward(award); setGrantData({ ...grantData, reward_name: award.title, points: award.rep }); setShowGrantModal(true); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: winWidth < 768 ? '16px' : '24px', borderRadius: '24px', background: 'white', border: '3px solid #cbd5e1', cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '12px' : '20px' }}>
                                                <div style={{ width: winWidth < 768 ? '40px' : '50px', height: winWidth < 768 ? '40px' : '50px', borderRadius: '14px', background: i < 3 ? '#fff7ed' : '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i < 3 ? <Trophy size={winWidth < 768 ? 20 : 24} color="#f59e0b" /> : <Star size={winWidth < 768 ? 20 : 24} color="#3b82f6" />}</div>
                                                <div>
                                                    <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000' }}>{award.title}</div>
                                                    <div style={{ fontSize: winWidth < 768 ? '10px' : '12px', color: '#64748b', fontWeight: '700' }}>{award.desc}</div>
                                                </div>
                                            </div>
                                            <div style={{ background: '#eff6ff', padding: winWidth < 768 ? '6px 12px' : '10px 25px', borderRadius: '12px', color: '#2563eb', fontWeight: '1000', fontSize: winWidth < 768 ? '12px' : '14px' }}>{award.rep} R</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar */}
                        {view !== 'audit' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                                    borderRadius: winWidth < 768 ? '30px' : '40px', padding: winWidth < 768 ? '40px 25px' : '50px 40px', color: 'white',
                                    boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.4)',
                                    position: 'relative', overflow: 'hidden',
                                    minHeight: winWidth < 768 ? 'auto' : '520px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                                }}>
                                    {/* Decorative elements */}
                                    <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '150px', height: '150px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
                                    <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '200px', height: '200px', background: 'rgba(250, 204, 21, 0.05)', borderRadius: '50%', filter: 'blur(60px)' }}></div>

                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: winWidth < 768 ? '20px' : '30px' }}>
                                            <Trophy size={30} color="#facc15" />
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '24px' : '28px', fontWeight: '1000', letterSpacing: '-0.8px', color: '#ffffff', lineHeight: '1.2' }}>Recognition Spotlight</h3>
                                        <p style={{ margin: winWidth < 768 ? '10px 0 30px 0' : '15px 0 40px 0', fontSize: winWidth < 768 ? '14px' : '15px', color: '#94a3b8', fontWeight: '600', lineHeight: '1.7' }}>Celebrate the champions pushing our organization forward with exceptional dedication and vision.</p>

                                        {user && (
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px 25px', borderRadius: '24px', border: '1.5px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '15px' }}>My Points Profile</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                                                    <div style={{ width: '55px', height: '55px', borderRadius: '18px', background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                        {(() => {
                                                            const empId = user.employee_id || user.id;
                                                            const rawPic = user.profile_pic || user.profile_picture;
                                                            const photoUrl = rawPic ? (rawPic.startsWith('http') || rawPic.startsWith('data:') ? rawPic : `${BASE_URL}${rawPic.startsWith('/') ? '' : '/'}${rawPic}`) : `${BASE_URL}/api/users/${empId}/photo`;
                                                            return (
                                                                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                                    <img
                                                                        src={photoUrl}
                                                                        alt=""
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '18px' }}
                                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                                    />
                                                                    <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#38bdf8', color: '#0f172a', fontSize: '22px', fontWeight: '1000' }}>
                                                                        {(user.name || 'U').charAt(0)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '17px', fontWeight: '900', color: '#ffffff' }}>{user.name || 'NBT User'}</div>
                                                        <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: '800', marginTop: '2px' }}>
                                                            🏆 {(user.totalPoints ?? user.total_points ?? user.totalRep ?? 0).toLocaleString()} PTS
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                                                        <span>Awards Endorsements:</span>
                                                        <span style={{ color: '#ffffff', fontWeight: '750' }}>{user.rewardPoints ?? user.reward_points ?? 0} Pts</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                                                        <span>Quiz Completions:</span>
                                                        <span style={{ color: '#ffffff', fontWeight: '750' }}>{user.quizPoints ?? user.quiz_points ?? 0} Pts</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {topContributor && (
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px 25px', borderRadius: '24px', border: '1.5px solid rgba(255,255,255,0.1)', marginBottom: '30px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '900', color: '#facc15', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '15px' }}>Top Contributor</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                    <div style={{ width: '55px', height: '55px', borderRadius: '18px', background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                        {(() => {
                                                            const cleanId = (val) => String(val || '').replace(/[^0-9]/g, '').trim();
                                                            const empId = cleanId(topContributor.id || topContributor.employee_id);
                                                            const rawPic = topContributor.profile_picture;
                                                            const photoUrl = rawPic ? (rawPic.startsWith('http') || rawPic.startsWith('data:') ? rawPic : `${BASE_URL}${rawPic.startsWith('/') ? '' : '/'}${rawPic}`) : `${BASE_URL}/api/users/${empId}/photo`;
                                                            return (
                                                                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                                    <img
                                                                        src={photoUrl}
                                                                        alt=""
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '18px' }}
                                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                                    />
                                                                    <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#facc15', color: '#0f172a', fontSize: '22px', fontWeight: '1000' }}>
                                                                        {topContributor.name.charAt(0)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '17px', fontWeight: '900', color: '#ffffff' }}>{topContributor.name}</div>
                                                        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>{(topContributor.total_points ?? topContributor.totalPoints ?? topContributor.totalRep ?? 0)} Total Points</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setShowGrantModal(true)}
                                            style={{
                                                width: '100%', padding: '22px', borderRadius: '25px', border: 'none',
                                                background: '#ffffff', color: '#0f172a', fontWeight: '1000',
                                                fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                                textTransform: 'uppercase', letterSpacing: '0.8px'
                                            }}>
                                            Grant Recognition
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {showGrantModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '30px', padding: winWidth < 768 ? '25px' : '50px', width: '100%', maxWidth: '680px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a', marginBottom: '30px', textAlign: 'center' }}>Grant Recognition</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Select Recipient</label>
                                <div
                                    onClick={() => setShowRecipientDropdown(!showRecipientDropdown)}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9',
                                        background: '#f8fafc', fontWeight: '700', cursor: 'pointer', display: 'flex',
                                        justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                    <span>{selectedEmployee ? (selectedEmployee.name || selectedEmployee.employee_name) : 'Select Recipient...'}</span>
                                    <ChevronRight size={18} style={{ transform: showRecipientDropdown ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                </div>

                                {showRecipientDropdown && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                                        borderRadius: '14px', border: '1.5px solid #f1f5f9', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                        zIndex: 10, marginTop: '8px', maxHeight: '250px', overflowY: 'auto'
                                    }}>
                                        <div style={{ padding: '10px', position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '10px', padding: '0 10px' }}>
                                                <Search size={14} color="#64748b" />
                                                <input
                                                    autoFocus
                                                    placeholder="Search employee..."
                                                    value={recipientSearch}
                                                    onChange={e => setRecipientSearch(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ width: '100%', padding: '10px', border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', fontWeight: '600' }}
                                                />
                                            </div>
                                        </div>
                                        {employees.filter(emp => {
                                            const uid = user?.employee_id || user?.userId || user?.id;
                                            const empId = emp.id || emp.employee_id || emp.userId;
                                            return String(empId) !== String(uid) && (emp.name || emp.employee_name || '').toLowerCase().includes(recipientSearch.toLowerCase());
                                        }).map(emp => {
                                            const stableId = emp.id || emp.employee_id || emp.userId;
                                            return (
                                                <div
                                                    key={stableId}
                                                    onClick={() => {
                                                        setSelectedEmployee(emp);
                                                        setShowRecipientDropdown(false);
                                                        setRecipientSearch('');
                                                    }}
                                                    style={{ padding: '12px 15px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f8fafc' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    {emp.name || emp.employee_name || 'Anonymous'}
                                                </div>
                                            );
                                        })}
                                        {employees.length === 0 && <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>No employees found</div>}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Reward Name (Mandatory)</label>
                                    <div
                                        onClick={() => setShowRewardDropdown(!showRewardDropdown)}
                                        style={{
                                            width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9',
                                            background: '#f8fafc', fontWeight: '700', cursor: 'pointer', display: 'flex',
                                            justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                        <span>{grantData.reward_name || 'Select Reward...'}</span>
                                        <ChevronRight size={18} style={{ transform: showRewardDropdown ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </div>

                                    {showRewardDropdown && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                                            borderRadius: '14px', border: '1.5px solid #f1f5f9', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                            zIndex: 10, marginTop: '8px', maxHeight: '200px', overflowY: 'auto'
                                        }}>
                                            {rewardNames.map(name => (
                                                <div
                                                    key={name}
                                                    onClick={() => {
                                                        const pointsMap = {
                                                            "Visionary Lead": 200,
                                                            "Goal Achiever": 150,
                                                            "Team Growth": 150,
                                                            "Star Performer": 50,
                                                            "Problem Solver": 30,
                                                            "Collaborative Hero": 20
                                                        };
                                                        setGrantData({ ...grantData, reward_name: name, points: pointsMap[name] || grantData.points });
                                                        setShowRewardDropdown(false);
                                                    }}
                                                    style={{ padding: '12px 15px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f8fafc' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    {name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Points (REP)</label>
                                    <input type="number" value={grantData.points} readOnly style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700', outline: 'none', cursor: 'not-allowed' }} />
                                </div>
                            </div>
                            {feedback && <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '800', color: feedback.type === 'success' ? '#10b981' : '#ef4444' }}>{feedback.msg}</div>}
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button onClick={() => setShowGrantModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '50px', border: '1.5px solid #f1f5f9', background: 'white', fontWeight: '900', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleGrantAward} disabled={granting} style={{ flex: 1, padding: '14px', borderRadius: '50px', border: 'none', background: '#0f172a', color: 'white', fontWeight: '900', cursor: 'pointer' }}>{granting ? 'Granting...' : 'Confirm'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && selectedReward && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '30px', padding: '40px', width: '90%', maxWidth: '500px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '950', marginBottom: '30px', textAlign: 'center' }}>Modify Reward</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Reward Name</label>
                            <select
                                value={selectedReward.reward_name || selectedReward.reward_type}
                                onChange={e => {
                                    const pointsMap = {
                                        "Visionary Lead": 200,
                                        "Goal Achiever": 150,
                                        "Team Growth": 150,
                                        "Star Performer": 50,
                                        "Problem Solver": 30,
                                        "Collaborative Hero": 20
                                    };
                                    setSelectedReward({
                                        ...selectedReward,
                                        reward_name: e.target.value,
                                        points: pointsMap[e.target.value] || selectedReward.points
                                    });
                                }}
                                style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700', outline: 'none', marginBottom: '15px' }}>
                                {rewardNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                            <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Points (REP)</label>
                            <input type="number" value={selectedReward.points} readOnly style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700', outline: 'none', cursor: 'not-allowed' }} />
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '50px', background: 'white', fontWeight: '900' }}>Cancel</button>
                                <button onClick={handleUpdateReward} disabled={isSubmitting} style={{ flex: 1, padding: '14px', borderRadius: '50px', background: '#0f172a', color: 'white', fontWeight: '900' }}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AppFooter />
        </div>
    );
}
