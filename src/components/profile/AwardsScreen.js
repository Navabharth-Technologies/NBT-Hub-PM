import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, Award, Zap, ArrowLeft, ShieldCheck, UserCheck, Flame, Edit, Trash2, Plus, Users, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';

export default function AwardsScreen() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [winWidth, setWinWidth] = React.useState(window.innerWidth);
    const [rewards, setRewards] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [view, setView] = React.useState('feed'); // 'feed' or 'leaderboard'
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
            // 1. Fetch Rewards History
            const rewRes = await fetch(API_ENDPOINTS.REWARDS_HISTORY, { headers: { 'Authorization': `Bearer ${user.token}` } });
            if (rewRes.ok) {
                const data = await rewRes.json();
                setRewards(Array.isArray(data) ? data : []);
            }

            // 2. Set Professional Recognition Categories
            setRewardNames(["Visionary Lead", "Goal Achiever", "Team Growth", "Star Performer", "Problem Solver", "Collaborative Hero"]);


            // 3. Fetch All Employees (Try multiple sources for name resolution)
            let allStaff = [];
            try {
                const empRes = await fetch(API_ENDPOINTS.EMPLOYEES, { headers: { 'Authorization': `Bearer ${user.token}` } });
                if (empRes.ok) {
                    const resJson = await empRes.json();
                    const staffData = Array.isArray(resJson) ? resJson : (resJson.data || []);
                    allStaff = [...allStaff, ...staffData];
                }
            } catch (e) { console.error("EMPLOYEES fetch failed", e); }

            try {
                const userRes = await fetch(API_ENDPOINTS.USERS, { headers: { 'Authorization': `Bearer ${user.token}` } });
                if (userRes.ok) {
                    const resJson = await userRes.json();
                    const userData = Array.isArray(resJson) ? resJson : (resJson.data || []);
                    allStaff = [...allStaff, ...userData];
                }
            } catch (e) { console.error("USERS fetch failed", e); }

            // Deduplicate by ID and ensure we have names
            const uniqueStaff = Array.from(new Map(allStaff.map(s => [s.id || s.employee_id || s.userId, s])).values());
            console.log("Master Staff List Loaded:", uniqueStaff.length, "members found");
            setEmployees(uniqueStaff);

            // 4. Fetch Leaderboard for Banner (Top Recognition)
            await fetchLeaderboard();

        } catch (err) { 
            console.error("Data fetch error:", err);
            setRewards([]);
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
            // Try admin endpoint first
            let res = await fetch(API_ENDPOINTS.REWARDS_HISTORY, { headers: { 'Authorization': `Bearer ${user.token}` } });
            
            // Fallback to user-level rewards endpoint if admin is forbidden (403)
            if (res.status === 403) {
                res = await fetch(API_ENDPOINTS.REWARDS, { headers: { 'Authorization': `Bearer ${user.token}` } });
            }

            if (res.ok) {
                const data = await res.json();
                const uid = user?.employee_id || user?.userId || user?.id;
                // Filter to show only rewards GRANTED BY this manager (matching database 'granted_by' column)
                const myGrants = Array.isArray(data) ? data.filter(r => String(r.granted_by) === String(uid)) : [];
                setHistory({ pm: myGrants });
            }
        } catch (err) { console.error("History fetch error:", err); }
    };

    const showFeedback = (msg, type) => {
        setFeedback({ msg, type });
        setTimeout(() => setFeedback(null), 3000);
    };

    const resolveEmployeeName = (id) => {
        if (!id) return 'Anonymous Member';
        
        // Search across all possible ID fields (id, employee_id, userId)
        const emp = employees.find(e => 
            String(e.id) === String(id) || 
            String(e.employee_id) === String(id) || 
            String(e.userId) === String(id) ||
            String(e.uid) === String(id) ||
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
                // FIX: Backend returns { success: true, data: [...] }
                setLeaderboard(data.data || []);
            } else {
                setLeaderboard([]);
            }
        } catch (err) { 
            console.error("Leaderboard error:", err); 
            setLeaderboard([]);
        }
    };

    React.useEffect(() => {
        fetchLeaderboard();
    }, [startDate, endDate]);

    const handleGrantAward = async () => {
        if (!selectedEmployee) {
            showFeedback("Please select a recipient first.", "error");
            return;
        }
        setGranting(true);
        try {
            const token = user.token; 
            const uid = user?.employee_id || user?.userId || user?.id || 0;
            
            // Payload sanitization for 400 Bad Request prevention
            const payload = {
                employee_id: Number(selectedEmployee.id || selectedEmployee.employee_id || selectedEmployee.userId || selectedEmployee.emp_id),
                reward_name: String(selectedAward?.title || grantData.reward_name || "Standard Recognition"),
                points: Number(grantData.points || 50),
                reward_name_alt: grantData.reward_name || "Performance",
                granted_by: Number(uid),
                note: String(grantData.note || "Recognition Grant")
            };

            const res = await fetch(API_ENDPOINTS.REWARDS_GIVE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token?.trim()}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showFeedback(`Successfully awarded "${selectedAward?.title || grantData.reward_name || 'Recognition'}"!`, 'success');
                setSelectedEmployee(null);
                setSelectedAward(null);
                setGrantData({ ...grantData, note: '', reward_name: '' });
                setShowGrantModal(false);
                fetchInitialData(); // FIX: Refresh all data
                fetchGrantedHistory(); 
            } else {
                const errData = await res.json().catch(() => ({}));
                showFeedback(errData.error || errData.message || "Failed to grant reward", "error");
            }
        } catch (err) { 
            console.error(err); 
            showFeedback("Network error. Could not sync with database.", "error");
        }
        finally { setGranting(false); }
    };

    const handleDeleteReward = async (id) => {
        if (!window.confirm("Are you sure you want to revoke this recognition?")) return;
        try {
            const res = await fetch(API_ENDPOINTS.REWARD_DELETE(id), {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                setRewards(prev => prev.filter(r => r.id !== id));
                alert("Recognition revoked successfully.");
            }
        } catch (err) { console.error(err); }
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

            <main style={{ flex: 1, padding: '40px 20px', marginTop: '100px' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    
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
                        <div style={{ display: 'flex', gap: '20px', width: winWidth < 600 ? '100%' : 'auto', justifyContent: winWidth < 600 ? 'space-between' : 'flex-start', alignItems: 'center' }}>
                            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                                <button 
                                    onClick={() => setView('feed')}
                                    style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: 'none', background: view === 'feed' ? 'white' : 'transparent', color: view === 'feed' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: view === 'feed' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                                    Live Feed
                                </button>
                                <button 
                                    onClick={() => setView('leaderboard')}
                                    style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: 'none', background: view === 'leaderboard' ? 'white' : 'transparent', color: view === 'leaderboard' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: view === 'leaderboard' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                                    Leaderboard
                                </button>
                                <button 
                                    onClick={() => setView('points')}
                                    style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: 'none', background: view === 'points' ? 'white' : 'transparent', color: view === 'points' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: view === 'points' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                                    View Reward Points
                                </button>
                            </div>

                            {/* Date Range Filter Integrated into Top Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '6px 15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>From</span>
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', fontSize: '11px', fontWeight: '700', color: '#1e293b', outline: 'none' }} 
                                    />
                                </div>
                                <div style={{ width: '1px', height: '15px', background: '#cbd5e1' }}></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>To</span>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', fontSize: '11px', fontWeight: '700', color: '#1e293b', outline: 'none' }} 
                                    />
                                </div>
                            </div>
                            {(user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'MANAGER') && (
                                <button 
                                    onClick={() => setShowGrantModal(true)}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                                        background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', 
                                        fontSize: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(15,23,42,0.3)' 
                                    }}>
                                    <Plus size={16} /> Grant Award
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Main High-Fidelity Banner */}
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
                        {/* Static Glow decoration */}
                        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '40%', height: '200%', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)', transform: 'rotate(-45deg)' }}></div>

                        {/* Rank Section */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderRight: winWidth < 768 ? 'none' : '1.5px solid rgba(255,255,255,0.1)', borderBottom: winWidth < 768 ? '1.5px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: winWidth < 768 ? '20px' : '0' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Trophy size={winWidth < 768 ? 24 : 32} color="#facc15" />
                            </div>
                            <div>
                                <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Member Status</p>
                                <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '20px' : '24px', fontWeight: '950', color: '#ffffff' }}>Active PM Hub</h3>
                            </div>
                        </div>

                        {/* Points Section */}
                        <div style={{ textAlign: winWidth < 768 ? 'left' : 'center', borderRight: winWidth < 768 ? 'none' : '1.5px solid rgba(255,255,255,0.1)', borderBottom: winWidth < 768 ? '1.5px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: winWidth < 768 ? '20px' : '0' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Total Points Circulating</p>
                            <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '24px' : '28px', fontWeight: '950', color: '#facc15' }}>
                                {rewards.reduce((acc, r) => acc + (Number(r.points) || 0), 0).toLocaleString()} <span style={{ fontSize: '18px' }}>REP</span>
                            </h3>
                        </div>

                        {/* Score Section */}
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



                    <div style={{ marginTop: '60px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1200 ? '1fr' : '1fr 380px', gap: '30px', minHeight: '600px' }}>
                            {/* Left Column: Feed or Leaderboard */}
                             <div style={{ 
                                 background: '#f8fafc', 
                                 borderRadius: '24px', 
                                 padding: winWidth < 768 ? '15px' : '30px', 
                                 border: '1.5px solid #f1f5f9',
                                 height: 'fit-content'
                             }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>
                                        {view === 'feed' ? 'Global Rewards' : view === 'leaderboard' ? 'Organization Ranking' : 'Standard Recognition Tiers'}
                                    </h3>
                                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#3863a8', background: '#e0f2fe', padding: '4px 10px', borderRadius: '8px' }}>
                                        {view === 'feed' ? `${rewards.length} ENTRIES` : view === 'leaderboard' ? 'ALL STAFF' : `${availableAwards.length} TIERS`}
                                    </div>
                                </div>

                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '700', fontSize: '13px' }}>
                                        <div style={{ marginBottom: '10px' }}>⚡ Syncing with database...</div>
                                    </div>
                                ) : view === 'feed' ? (
                                    <>
                                        {!selectedHistoryUser ? (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                                    <div>
                                                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '1000', color: '#0f172a' }}>Recognition Glimpse</h2>
                                                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>Aggregated results per member</p>
                                                    </div>
                                                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6', background: '#eff6ff', padding: '6px 12px', borderRadius: '10px' }}>
                                                        {Array.from(new Set(rewards.map(r => r.employee_id))).length} Members Recognized
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                    {Array.from(new Set(rewards.map(r => r.employee_id))).length > 0 ? (
                                                        Array.from(new Set(rewards.map(r => r.employee_id))).map((empId) => {
                                                            const userRewards = rewards.filter(r => String(r.employee_id) === String(empId));
                                                            if (userRewards.length === 0) return null;
                                                            const totalRep = userRewards.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
                                                            const latest = userRewards.reduce((prev, current) => (new Date(prev.created_at || prev.date) > new Date(current.created_at || current.date)) ? prev : current);
                                                            const name = userRewards[0].employee_name || resolveEmployeeName(empId);

                                                            return (
                                                                <div 
                                                                    key={empId} 
                                                                    onClick={() => setSelectedHistoryUser(empId)}
                                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                                                    style={{ 
                                                                        background: 'white', padding: '20px', borderRadius: '24px', 
                                                                        border: '1.5px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s',
                                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                                    }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                        <div style={{ width: '45px', height: '45px', borderRadius: '15px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                                                                            <Award size={22} color="#0369a1" />
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: '15px', fontWeight: '1000', color: '#0f172a' }}>{name}</div>
                                                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>
                                                                                {userRewards.length} recognitions • Last: {latest.reward_name || latest.reward_type || 'Excellence'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ fontSize: '16px', fontWeight: '1000', color: '#10b981' }}>+{totalRep} REP</div>
                                                                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginTop: '2px' }}>Total Credit</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                                                            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🔭</div>
                                                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>No reconnaissance data found.</div>
                                                            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '5px 0' }}>Adjust your filters or grant a new reward to see results.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                                                    <button 
                                                        onClick={() => setSelectedHistoryUser(null)}
                                                        style={{ width: '36px', height: '36px', borderRadius: '12px', border: '1.5px solid #f1f5f9', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a' }}>
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                    <div>
                                                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '1000', color: '#0f172a' }}>{resolveEmployeeName(selectedHistoryUser)}</h2>
                                                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>Complete individual recognition history</p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                    {rewards.filter(r => String(r.employee_id) === String(selectedHistoryUser)).map((reward, i) => (
                                                        <div key={i} style={{ padding: '20px', borderRadius: '24px', border: '1.5px solid #f1f5f9', background: '#f8fafc66' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '14px', fontWeight: '1000', color: '#0f172a' }}>{reward.reward_name || reward.reward_type || 'Excellence'}</div>
                                                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginTop: '2px' }}>Issued by {reward.given_by || 'Admin'} • {new Date(reward.created_at || reward.date).toLocaleDateString()}</div>
                                                                </div>
                                                                <div style={{ background: 'white', padding: '6px 12px', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '13px', fontWeight: '1000', color: '#38bdf8' }}>
                                                                    +{reward.points || reward.rep} REP
                                                                </div>
                                                            </div>
                                                            {(reward.reason || reward.note) && (
                                                                <div style={{ marginTop: '15px', padding: '12px', borderRadius: '14px', background: 'white', border: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontStyle: 'italic', lineHeight: '1.6' }}>
                                                                    "{reward.reason || reward.note}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : view === 'leaderboard' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {leaderboard.map((item, idx) => (
                                            <div key={idx} style={{ 
                                                background: 'white', padding: '15px 20px', borderRadius: '16px', border: '1px solid #f1f5f9',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{ width: '30px', fontSize: '13px', fontWeight: '950', color: idx < 3 ? '#facc15' : '#94a3b8' }}>#{idx + 1}</div>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{item.name?.charAt(0)}</div>
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>{item.name}</div>
                                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>{item.role || 'Member'}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                                                    <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: '950', color: '#0f172a' }}>{item.total_points || 0}</div>
                                                        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800' }}>TOTAL REP</div>
                                                    </div>
                                                    <ChevronRight size={18} color="#cbd5e1" onClick={() => navigate(`/focus-logs?id=${item.id || item.EmpID}`)} style={{ cursor: 'pointer' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {availableAwards.map((award, i) => (
                                            <div key={award.id} style={{ 
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                                padding: '24px', borderRadius: '24px', background: 'white', border: '1.5px solid #f1f5f9',
                                                transition: 'all 0.2s', cursor: (user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'MANAGER') ? 'pointer' : 'default'
                                            }}
                                            onClick={() => {
                                                if (user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'MANAGER') {
                                                    setSelectedAward(award);
                                                    setGrantData(prev => ({ ...prev, points: award.rep, reward_name: award.title }));
                                                    setShowGrantModal(true);
                                                }
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                    <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: i < 3 ? '#fff7ed' : '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                                                        {i < 3 ? <Trophy size={24} color="#f59e0b" /> : <Star size={24} color="#3b82f6" />}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '16px', fontWeight: '1000', color: '#1e293b' }}>{award.title}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginTop: '4px' }}>{award.desc}</div>
                                                    </div>
                                                </div>
                                                <div style={{ background: '#eff6ff', padding: '10px 25px', borderRadius: '14px', border: '1px solid #dbeafe', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '16px', fontWeight: '1000', color: '#2563eb' }}>{award.rep} R</div>
                                                    <div style={{ fontSize: '9px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', marginTop: '2px' }}>Value</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Recognition Spotlight */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                {/* Spotlight Card */}
                                <div style={{ 
                                    background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)', 
                                    borderRadius: '35px', 
                                    padding: '50px 40px', 
                                    color: 'white',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    minHeight: '520px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <h3 style={{ margin: 0, fontSize: '26px', fontWeight: '950', letterSpacing: '-0.8px', lineHeight: '1.2' }}>Recognition Spotlight</h3>
                                        <p style={{ margin: '15px 0 40px 0', fontSize: '15px', color: '#a5b4fc', fontWeight: '600', lineHeight: '1.7' }}>Celebrate the champions pushing our organization forward with exceptional dedication.</p>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '24px', border: '1.5px solid rgba(255,255,255,0.1)' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '900', color: '#facc15', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Top Contributor</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#facc15', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', fontSize: '18px' }}>
                                                        {leaderboard[0]?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '16px', fontWeight: '900' }}>{leaderboard[0]?.name || 'Analyzing...'}</div>
                                                        <div style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: '700' }}>{leaderboard[0]?.total_points || 0} Life REP</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => setShowGrantModal(true)}
                                                style={{ 
                                                    width: '100%', padding: '20px', borderRadius: '25px', border: 'none', background: 'white', color: '#312e81', 
                                                    fontWeight: '1000', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', textTransform: 'uppercase', letterSpacing: '0.5px'
                                                }}>
                                                <Plus size={20} /> Grant Recognition
                                            </button>
                                        </div>
                                    </div>
                                  </div>


                            </div>
                        </div>
                    </div>

                </div>
            </main>

            {/* Grant Reward Modal */}
            {showGrantModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '30px', padding: '40px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a', marginBottom: '30px', textAlign: 'center' }}>Grant New Recognition</h2>
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
                                    style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700', outline: 'none' }}>
                                    <option value="">Choose Employee...</option>
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
                                        style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700', outline: 'none', cursor: 'pointer' }}>
                                        <option value="">Select Reward Name...</option>
                                        {rewardNames.map(name => <option key={name} value={name}>{name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Points (REP)</label>
                                    <input 
                                        type="number"
                                        value={grantData.points}
                                        onChange={e => setGrantData({ ...grantData, points: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700', outline: 'none' }}
                                    />
                                </div>
                            </div>
                            {feedback && (
                                <div style={{ fontSize: '11px', fontWeight: '800', textAlign: 'center', padding: '10px', borderRadius: '10px', background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2', color: feedback.type === 'success' ? '#059669' : '#ef4444' }}>
                                    {feedback.msg}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button onClick={() => setShowGrantModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '50px', border: '1.5px solid #f1f5f9', background: 'white', color: '#64748b', fontWeight: '900', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleGrantAward} disabled={granting} style={{ flex: 1, padding: '14px', borderRadius: '50px', border: 'none', background: '#0f172a', color: 'white', fontWeight: '900', cursor: 'pointer' }}>{granting ? 'Granting...' : 'Confirm Award'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Reward Modal */}
            {showEditModal && selectedReward && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '30px', padding: '40px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a', marginBottom: '30px', textAlign: 'center' }}>Modify Recognition</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Recipient</label>
                                <div style={{ width: '100%', padding: '14px', borderRadius: '14px', background: '#f1f5f9', fontWeight: '800', color: '#64748b' }}>{selectedReward.employee_name}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Reward Name</label>
                                    <select 
                                        value={selectedReward.reward_name || selectedReward.reward_type}
                                        onChange={e => setSelectedReward({ ...selectedReward, reward_name: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700', outline: 'none' }}>
                                        {rewardNames.map(name => <option key={name} value={name}>{name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Points (REP)</label>
                                    <input 
                                        type="number" 
                                        value={selectedReward.points}
                                        onChange={e => setSelectedReward({ ...selectedReward, points: parseInt(e.target.value) })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontWeight: '700', outline: 'none' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '50px', border: '1.5px solid #f1f5f9', background: 'white', color: '#64748b', fontWeight: '900', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleUpdateReward} disabled={isSubmitting} style={{ flex: 1, padding: '14px', borderRadius: '50px', border: 'none', background: '#0f172a', color: 'white', fontWeight: '900', cursor: 'pointer' }}>{isSubmitting ? 'Updating...' : 'Save Changes'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AppFooter />
        </div>
    );
}


