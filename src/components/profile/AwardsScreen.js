import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, Award, Zap, ArrowLeft, ShieldCheck, UserCheck, Flame, Edit, Trash2, Plus, Users, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { API_ENDPOINTS } from '../../config';

export default function AwardsScreen() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [winWidth, setWinWidth] = React.useState(window.innerWidth);
    const [rewards, setRewards] = React.useState([]);
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
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const [selectedHistoryUser, setSelectedHistoryUser] = React.useState(null);
    const [showAllFeed, setShowAllFeed] = React.useState(false);
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
            } catch (e) {}
            
            try {
                const userRes = await fetch(API_ENDPOINTS.USERS, { headers: { 'Authorization': `Bearer ${user.token}` } });
                if (userRes.ok) {
                    const resJson = await userRes.json();
                    allStaff = [...allStaff, ...(Array.isArray(resJson) ? resJson : (resJson.data || []))];
                }
            } catch (e) {}

            // Deduplicate
            const unique = Array.from(new Map(allStaff.map(s => [s.id || s.employee_id || s.userId, s])).values());
            setEmployees(unique);

            // Fetch Leaderboard for Banner (Top Recognition)
            await fetchLeaderboard();

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
        } catch (err) {}
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

    const fetchLeaderboard = async () => {
        if (!user?.token) return;
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const res = await fetch(`${API_ENDPOINTS.LEADERBOARD_ALL}?${params.toString()}`, { 
                headers: { 'Authorization': `Bearer ${user.token}` } 
            });
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(data.data || []);
            }
        } catch (err) { setLeaderboard([]); }
    };

    React.useEffect(() => {
        fetchLeaderboard();
    }, [startDate, endDate]);

    const filteredRewards = rewards.filter(r => {
        if (!startDate && !endDate) return true;
        const rDate = (r.created_at || r.date || "").split('T')[0];
        if (!rDate) return true;
        if (startDate && rDate < startDate) return false;
        if (endDate && rDate > endDate) return false;
        return true;
    });

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
        } catch (err) {}
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

            <main style={{ flex: 1, padding: winWidth < 768 ? '20px 16px 40px' : '20px 26px 40px', marginTop: winWidth < 768 ? '85px' : '110px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ width: '100%' }}>
                    
                    {/* Header Controls */}
                    <div style={{ display: 'flex', flexDirection: winWidth < 600 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 600 ? 'flex-start' : 'flex-start', marginBottom: '32px', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div onClick={() => navigate(-1)} style={{ cursor: 'pointer', background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <ArrowLeft size={18} color="#64748b" />
                            </div>
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
                                    onClick={() => setView('leaderboard')}
                                    style={{ flex: winWidth < 480 ? 1 : 'none', padding: winWidth < 480 ? '8px 4px' : '8px 16px', borderRadius: '8px', fontSize: winWidth < 480 ? '10px' : '12px', fontWeight: '800', border: 'none', background: view === 'leaderboard' ? 'white' : 'transparent', color: view === 'leaderboard' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: view === 'leaderboard' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', whiteSpace: 'nowrap' }}>
                                    Leaderboard
                                </button>
                                <button 
                                    onClick={() => setView('points')}
                                    style={{ flex: winWidth < 480 ? 1 : 'none', padding: winWidth < 480 ? '8px 4px' : '8px 16px', borderRadius: '8px', fontSize: winWidth < 480 ? '10px' : '12px', fontWeight: '800', border: 'none', background: view === 'points' ? 'white' : 'transparent', color: view === 'points' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: view === 'points' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', whiteSpace: 'nowrap' }}>
                                    Reward Points
                                </button>
                            </div>

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
                        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '40%', height: '200%', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)', transform: 'rotate(-45deg)', opacity: 0.5 }}></div>

                        {/* Current Rank */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderRight: winWidth < 768 ? 'none' : '1.5px solid rgba(255,255,255,0.1)', borderBottom: winWidth < 768 ? '1.5px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: winWidth < 768 ? '20px' : '0' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Trophy size={winWidth < 768 ? 24 : 32} color="#facc15" />
                            </div>
                            <div>
                                <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Member Status</p>
                                <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '20px' : '24px', fontWeight: '950', color: '#ffffff' }}>Active Hub</h3>
                            </div>
                        </div>

                        {/* Points Display */}
                        <div style={{ textAlign: winWidth < 768 ? 'left' : 'center', borderRight: winWidth < 768 ? 'none' : '1.5px solid rgba(255,255,255,0.1)', borderBottom: winWidth < 768 ? '1.5px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: winWidth < 768 ? '20px' : '0' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Total Points Circulating</p>
                            <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '22px' : '28px', fontWeight: '950', color: '#facc15' }}>
                                {rewards.reduce((acc, r) => acc + (Number(r.points) || 0), 0).toLocaleString()} <span style={{ fontSize: '18px' }}>REP</span>
                            </h3>
                        </div>

                        {/* Leaderboard Score */}
                        <div style={{ textAlign: winWidth < 768 ? 'left' : 'right' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Top Recognition</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: winWidth < 768 ? 'flex-start' : 'flex-end', gap: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '950', color: '#ffffff' }}>
                                    {leaderboard[0] ? leaderboard[0].name : "Syncing..."}
                                </h3>
                                <Star size={20} color="#facc15" fill="#facc15" />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1200 ? '1fr' : '1fr 380px', gap: '30px' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '24px', padding: winWidth < 768 ? '15px' : '30px', border: '1.5px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>
                                    {view === 'feed' ? 'Global Rewards' : view === 'leaderboard' ? 'Organization Ranking' : 'Standard Recognition Tiers'}
                                </h3>
                                <div style={{ fontSize: '9px', fontWeight: '950', color: '#3863a8', background: '#e0f2fe', padding: '6px 12px', borderRadius: '10px', letterSpacing: '0.5px' }}>
                                    {view === 'feed' ? `${rewards.length} ENTRIES` : view === 'leaderboard' ? 'ALL STAFF' : `${availableAwards.length} TIERS`}
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
                                                const employeeStats = Array.from(new Set(filteredRewards.map(r => r.employee_id))).map(id => {
                                                    const userRewards = filteredRewards.filter(r => String(r.employee_id) === String(id));
                                                    const totalRep = userRewards.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
                                                    return { id, totalRep, userRewards };
                                                }).sort((a, b) => b.totalRep - a.totalRep);

                                                const displayedStats = showAllFeed ? employeeStats : employeeStats.slice(0, 5);
                                                
                                                return displayedStats.map(({ id: empId, totalRep, userRewards }) => {
                                                    const latest = userRewards.reduce((prev, current) => (new Date(prev.created_at || prev.date) > new Date(current.created_at || current.date)) ? prev : current, userRewards[0]);
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
                                                                <div style={{ width: winWidth < 768 ? '40px' : '45px', height: winWidth < 768 ? '40px' : '45px', borderRadius: '14px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #cbd5e1' }}><Award size={winWidth < 768 ? 20 : 22} color="#0369a1" /></div>
                                                                <div>
                                                                    <div style={{ fontSize: winWidth < 768 ? '14px' : '15px', fontWeight: '1000', color: '#0f172a' }}>{resolveEmployeeName(empId)}</div>
                                                                    <div style={{ fontSize: winWidth < 768 ? '10px' : '11px', color: '#64748b', fontWeight: '700' }}>
                                                                        {userRewards.length} recognitions • {latest.reward_name || 'Excellence'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', color: '#10b981' }}>+{totalRep}</div>
                                                                <div style={{ fontSize: '8px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>REP</div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <button onClick={() => setSelectedHistoryUser(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '800' }}><ChevronLeft size={16}/> Back to Feed</button>
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
                            ) : view === 'leaderboard' ? (
                                <div style={{ 
                                    maxHeight: '650px', 
                                    overflowY: 'auto', 
                                    paddingRight: '15px',
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '10px',
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#e2e8f0 transparent'
                                }} className="custom-scroll">
                                    {leaderboard.map((item, idx) => (
                                        <div key={idx} style={{ 
                                            background: idx === 0 ? 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)' : idx < 3 ? 'white' : '#f8fafc', 
                                            padding: winWidth < 768 ? (idx < 3 ? '15px 15px' : '12px 15px') : (idx < 3 ? '20px 25px' : '15px 20px'), 
                                            borderRadius: idx < 3 ? '20px' : '16px', 
                                            border: idx === 0 ? '4px solid #facc15' : '3px solid #cbd5e1', 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            boxShadow: idx === 0 ? '0 10px 15px -3px rgba(250, 204, 21, 0.1)' : 'none',
                                            transition: 'all 0.3s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-3px)';
                                            e.currentTarget.style.borderColor = '#3863a8';
                                            e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.06)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.borderColor = item.id === 0 ? '#facc15' : '#cbd5e1';
                                            e.currentTarget.style.boxShadow = item.id === 0 ? '0 10px 15px -3px rgba(250, 204, 21, 0.1)' : 'none';
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '12px' : (idx < 3 ? '20px' : '15px') }}>
                                                <div style={{ 
                                                    width: winWidth < 768 ? '30px' : (idx < 3 ? '40px' : '30px'), 
                                                    height: winWidth < 768 ? '30px' : (idx < 3 ? '40px' : '30px'), 
                                                    borderRadius: idx < 3 ? '12px' : '8px', 
                                                    background: idx === 0 ? '#facc15' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#ed8936' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: idx < 3 ? 'white' : '#94a3b8', 
                                                    fontWeight: '1000', 
                                                    fontSize: winWidth < 768 ? '13px' : (idx < 3 ? '18px' : '13px'),
                                                    boxShadow: idx < 3 ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                                                }}>
                                                    #{idx+1}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: winWidth < 768 ? '13px' : (idx < 3 ? '15px' : '13px'), fontWeight: '1000', color: idx < 3 ? '#0f172a' : '#334155' }}>{item.name}</div>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>{item.role}</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: winWidth < 768 ? '14px' : (idx < 3 ? '18px' : '14px'), fontWeight: '1000', color: idx < 3 ? '#0f172a' : '#475569' }}>{item.total_points}</div>
                                                <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800' }}>REP</div>
                                            </div>
                                        </div>
                                    ))}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', height: '100%' }}>
                            <div style={{ 
                                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
                                borderRadius: winWidth < 768 ? '30px' : '40px', padding: winWidth < 768 ? '40px 25px' : '50px 40px', color: 'white', 
                                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.4)',
                                position: 'relative', overflow: 'hidden',
                                height: '100%', minHeight: winWidth < 768 ? 'auto' : '520px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
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
                                    
                                    {leaderboard.length > 0 && (
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '24px', border: '1.5px solid rgba(255,255,255,0.1)', marginBottom: '40px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '900', color: '#facc15', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '15px' }}>Top Contributor</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                <div style={{ width: '55px', height: '55px', borderRadius: '18px', background: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '1000', color: '#0f172a' }}>
                                                    {leaderboard[0].name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '17px', fontWeight: '900', color: '#ffffff' }}>{leaderboard[0].name}</div>
                                                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>{leaderboard[0].total_points} Reputation Points</div>
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
                    </div>
                </div>
            </main>

            {showGrantModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '30px', padding: winWidth < 768 ? '25px' : '40px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a', marginBottom: '30px', textAlign: 'center' }}>Grant Recognition</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Select Recipient</label>
                                <select 
                                    value={selectedEmployee?.id || selectedEmployee?.employee_id || selectedEmployee?.userId || ''} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        const found = employees.find(emp => 
                                            String(emp.id) === val || 
                                            String(emp.employee_id) === val || 
                                            String(emp.userId) === val
                                        );
                                        setSelectedEmployee(found);
                                    }} 
                                    style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }}>
                                    <option value="">Select Recipient...</option>
                                    {employees.map(emp => {
                                        const stableId = emp.id || emp.employee_id || emp.userId;
                                        return <option key={stableId} value={stableId}>{emp.name || emp.employee_name || 'Anonymous'}</option>;
                                    })}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Reward Name (Mandatory)</label>
                                    <select 
                                        value={grantData.reward_name} 
                                        onChange={e => {
                                            const name = e.target.value;
                                            const pointsMap = {
                                                "Visionary Lead": 200,
                                                "Goal Achiever": 150,
                                                "Team Growth": 150,
                                                "Star Performer": 50,
                                                "Problem Solver": 30,
                                                "Collaborative Hero": 20
                                            };
                                            setGrantData({ ...grantData, reward_name: name, points: pointsMap[name] || grantData.points });
                                        }} 
                                        style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }}>
                                        <option value="">Select Reward Name...</option>
                                        {rewardNames.map(name => <option key={name} value={name}>{name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Points (REP)</label>
                                    <input type="number" value={grantData.points} onChange={e => setGrantData({ ...grantData, points: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700', outline: 'none' }} />
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
                                 onChange={e => setSelectedReward({ ...selectedReward, reward_name: e.target.value })}
                                 style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700', outline: 'none', marginBottom: '15px' }}>
                                 {rewardNames.map(name => <option key={name} value={name}>{name}</option>)}
                             </select>
                             <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Points (REP)</label>
                             <input type="number" value={selectedReward.points} onChange={e => setSelectedReward({...selectedReward, points: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9' }} />
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
