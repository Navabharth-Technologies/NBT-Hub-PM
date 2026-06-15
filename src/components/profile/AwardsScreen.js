import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, Star, Award, Zap, ArrowLeft, ShieldCheck, UserCheck, Flame, Edit, Trash2, Plus, Users, Search, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { API_ENDPOINTS, BASE_URL } from '../../config';

const parsePoints = (val) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/,/g, '').trim();
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
};

const parseToDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    const str = String(dateVal).trim();
    if (!str) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const normalized = str.includes(' ') ? str.replace(' ', 'T') : str;
        const d = new Date(normalized);
        if (!isNaN(d.getTime())) return d;
    }

    const dmY = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
    if (dmY) {
        const day = parseInt(dmY[1], 10);
        const month = parseInt(dmY[2], 10) - 1;
        const year = parseInt(dmY[3], 10);
        const timePart = str.split(/\s+/)[1] || '';
        if (timePart) {
            const t = timePart.split(':');
            const h = parseInt(t[0] || 0, 10);
            const m = parseInt(t[1] || 0, 10);
            const s = parseInt(t[2] || 0, 10);
            return new Date(year, month, day, h, m, s);
        }
        return new Date(year, month, day);
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    return null;
};

const formatPoints = (val) => {
    if (val === undefined || val === null) return '0';
    if (typeof val === 'string' && val.includes(',')) {
        return val;
    }
    const num = Number(val);
    if (isNaN(num)) return String(val);
    try {
        const str = String(num).trim();
        const parts = str.split('.');
        let integerPart = parts[0];
        const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
        let isNegative = false;
        if (integerPart.startsWith('-')) {
            isNegative = true;
            integerPart = integerPart.substring(1);
        }
        if (integerPart.length <= 3) {
            return (isNegative ? '-' : '') + integerPart + decimalPart;
        }
        const lastThree = integerPart.substring(integerPart.length - 3);
        const remaining = integerPart.substring(0, integerPart.length - 3);
        let formattedRemaining = '';
        let count = 0;
        for (let i = remaining.length - 1; i >= 0; i--) {
            formattedRemaining = remaining[i] + formattedRemaining;
            count++;
            if (count === 2 && i > 0) {
                formattedRemaining = ',' + formattedRemaining;
                count = 0;
            }
        }
        return (isNegative ? '-' : '') + formattedRemaining + ',' + lastThree + decimalPart;
    } catch (e) {
        return num.toLocaleString('en-IN');
    }
};

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
    const [isMounted, setIsMounted] = React.useState(true);
    React.useEffect(() => {
        return () => { setIsMounted(false); };
    }, []);

    // Fix for React Router getting stuck when using browser's back button
    React.useEffect(() => {
        const handleHashChange = () => {
            if (!window.location.hash.includes('awards') && document.getElementById('awards-screen-main')) {
                window.location.reload();
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);
    const [employees, setEmployees] = React.useState([]);
    const [grantData, setGrantData] = React.useState({ employee_id: '', reward_name: '', points: 50, note: '' });
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [selectedEmployee, setSelectedEmployee] = React.useState(null);
    const [selectedAward, setSelectedAward] = React.useState(null);
    const [granting, setGranting] = React.useState(false);
    const [history, setHistory] = React.useState({ pm: [] });
    const [feedback, setFeedback] = React.useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = React.useState(null);
    const [deleteSuccess, setDeleteSuccess] = React.useState(false);
    const [startDate, setStartDate] = React.useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        return `${year}-${String(month + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = React.useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastDayDate = new Date(year, month + 1, 0);
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
    });
    const [selectedHistoryUser, setSelectedHistoryUser] = React.useState(null);
    const [quizDateForSelectedUser, setQuizDateForSelectedUser] = React.useState(null);

    React.useEffect(() => {
        if (selectedHistoryUser && user?.token) {
            setQuizDateForSelectedUser(null);
            fetch(`${BASE_URL}/api/quiz_completion?employee_id=${selectedHistoryUser}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) {
                        const list = Array.isArray(data) ? data : (data.data || []);
                        let maxDateObj = null;
                        let latestDateStr = null;
                        list.forEach(q => {
                            const qdStr = q.created_at || q.completion_date || q.date || q.completed_at;
                            if (!qdStr) return;
                            const clean = String(qdStr).replace(/GMT[+-]\d{4}.*/, '').trim();
                            const qd = new Date(clean);
                            if (!isNaN(qd.getTime()) && (!maxDateObj || qd > maxDateObj)) {
                                maxDateObj = qd;
                                latestDateStr = qdStr;
                            }
                        });
                        if (latestDateStr) setQuizDateForSelectedUser(latestDateStr);
                    }
                }).catch(() => { });
        }
    }, [selectedHistoryUser, user?.token]);
    const [showAllFeed, setShowAllFeed] = React.useState(false);
    const [showRecipientDropdown, setShowRecipientDropdown] = React.useState(false);
    const [recipientSearch, setRecipientSearch] = React.useState('');
    const [auditSearch, setAuditSearch] = React.useState('');
    const [showRewardDropdown, setShowRewardDropdown] = React.useState(false);

    const recipientDropdownRef = React.useRef(null);
    const rewardDropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(event.target)) {
                setShowRecipientDropdown(false);
            }
            if (rewardDropdownRef.current && !rewardDropdownRef.current.contains(event.target)) {
                setShowRewardDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Removed fetchUserQuizCompletions effect - cumulative leaderboard handles it directly
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

            // Fetch ALL quiz completion records from the rewards leaderboard API (returns cumulative all-time quiz scores for all users)
            let qList = [];
            let fetchSuccess = false;
            try {
                const [allRes, rewHistoryRes, quizLboardRes] = await Promise.all([
                    fetch(API_ENDPOINTS.LEADERBOARD_ALL || `${BASE_URL}/api/employees/leaderboard/all`, { headers: { 'Authorization': `Bearer ${user.token}` } }),
                    fetch(API_ENDPOINTS.REWARDS_HISTORY || `${BASE_URL}/api/admin/rewards/history`, { headers: { 'Authorization': `Bearer ${user.token}` } }),
                    fetch(API_ENDPOINTS.QUIZ_LEADERBOARD || `${BASE_URL}/api/fun-quizzes/leaderboard`, { headers: { 'Authorization': `Bearer ${user.token}` } }).catch(() => null)
                ]);
                if (allRes.ok && rewHistoryRes.ok) {
                    const allJson = await allRes.json();
                    const employeesList = allJson.data || [];
                    const rewHistoryData = await rewHistoryRes.json();

                    const rewardSums = {};
                    rewHistoryData.forEach(r => {
                        const empId = String(r.employee_id || '');
                        if (empId) {
                            rewardSums[empId] = (rewardSums[empId] || 0) + parsePoints(r.points);
                        }
                    });

                    const cumulativeQuizPoints = employeesList.map(emp => {
                        const empId = String(emp.id || emp.employee_id || '');
                        const totalPoints = emp.totalPointsNum || emp.totalRepNum || parsePoints(emp.total_points || emp.total_rep || 0);
                        const rewardPoints = rewardSums[empId] || 0;
                        const quizPoints = Math.max(0, totalPoints - rewardPoints);
                        return {
                            employee_id: empId,
                            points: quizPoints,
                            created_at: emp.completion_date || emp.quiz_completion_date || emp.created_at || null
                        };
                    }).filter(item => item.employee_id && item.points > 0);

                    let datedQuizPoints = [];
                    if (quizLboardRes && quizLboardRes.ok) {
                        try {
                            const qData = await quizLboardRes.json();
                            const rawList = Array.isArray(qData) ? qData : (qData.data || []);
                            datedQuizPoints = rawList.map(item => {
                                return {
                                    employee_id: String(item.employee_id || item.user_id || item.id || ''),
                                    points: parsePoints(item.total_score || item.points || item.quiz_score || item.score || 0),
                                    created_at: item.created_at || item.completion_date || item.date || null
                                };
                            }).filter(item => item.employee_id && item.points > 0);
                        } catch (e) {
                            console.error('Error parsing quiz leaderboard data:', e);
                        }
                    }

                    qList = [...cumulativeQuizPoints, ...datedQuizPoints];
                    fetchSuccess = true;
                }
            } catch (e) { console.error('Quiz leaderboard fetch failed:', e); }

            // ── Cache & Merge: preserve ALL historical dated records, never overwrite ──
            const getLocalDateString = (dateVal) => {
                const d = dateVal ? new Date(dateVal) : null;
                if (!d || isNaN(d.getTime())) return null;
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            if (fetchSuccess) {
                try {
                    let cachedQuizScores = [];
                    const localData = localStorage.getItem('nbt_historical_quiz_scores');
                    if (localData) {
                        const parsed = JSON.parse(localData);
                        if (Array.isArray(parsed)) cachedQuizScores = parsed;
                    }

                    const mergedMap = new Map();
                    cachedQuizScores.forEach(item => {
                        if (!item) return;
                        const empId = String(item.employee_id || item.user_id || item.userId || item.id || '');
                        if (!empId) return;
                        const score = parsePoints(item.total_score || item.points || item.quiz_score || item.score || 0);
                        const dateStr = item.created_at || item.completion_date || item.date || null;
                        const dateKey = dateStr ? getLocalDateString(dateStr) : null;
                        const uniqueKey = dateKey ? `${empId}-${dateKey}` : `${empId}-cumulative`;
                        if (!mergedMap.has(uniqueKey) || score > parsePoints((mergedMap.get(uniqueKey) || {}).points || 0)) {
                            mergedMap.set(uniqueKey, { ...item, employee_id: empId, points: score, created_at: dateStr });
                        }
                    });

                    qList.forEach(item => {
                        if (!item) return;
                        const empId = String(item.employee_id || item.user_id || item.userId || item.id || '');
                        if (!empId) return;
                        const score = parsePoints(item.total_score || item.points || item.quiz_score || item.score || 0);
                        const dateStr = item.created_at || item.completion_date || item.date || null;
                        const dateKey = dateStr ? getLocalDateString(dateStr) : null;
                        const uniqueKey = dateKey ? `${empId}-${dateKey}` : `${empId}-cumulative`;
                        if (!mergedMap.has(uniqueKey) || score > parsePoints((mergedMap.get(uniqueKey) || {}).points || 0)) {
                            mergedMap.set(uniqueKey, { ...item, employee_id: empId, points: score, created_at: dateStr });
                        }
                    });

                    const mergedList = Array.from(mergedMap.values());
                    localStorage.setItem('nbt_historical_quiz_scores', JSON.stringify(mergedList.slice(-2000)));
                    qList = mergedList;
                } catch (cacheErr) {
                    console.error('Quiz score cache error:', cacheErr);
                }
            } else {
                try {
                    const localData = localStorage.getItem('nbt_historical_quiz_scores');
                    if (localData) {
                        const parsed = JSON.parse(localData);
                        if (Array.isArray(parsed)) qList = parsed;
                    }
                } catch (cacheErr) {
                    console.error('Quiz score cache fallback error:', cacheErr);
                }
            }

            setQuizScores(qList);

            // Leaderboard relies on local state effect

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

    const isSameEmployee = (id1, id2) => {
        if (!id1 || !id2) return false;
        if (String(id1) === String(id2)) return true;

        const emp1 = employees.find(e =>
            String(e.id) === String(id1) ||
            String(e.employee_id) === String(id1) ||
            String(e.userId) === String(id1) ||
            String(e.emp_id) === String(id1)
        );

        const emp2 = employees.find(e =>
            String(e.id) === String(id2) ||
            String(e.employee_id) === String(id2) ||
            String(e.userId) === String(id2) ||
            String(e.emp_id) === String(id2)
        );

        if (emp1 && emp2) {
            const uid1 = String(emp1.id || emp1.employee_id || emp1.userId || emp1.emp_id);
            const uid2 = String(emp2.id || emp2.employee_id || emp2.userId || emp2.emp_id);
            if (uid1 === uid2) return true;
        }

        const s1 = String(id1);
        const s2 = String(id2);
        if (s1.endsWith(s2) || s2.endsWith(s1)) {
            return true;
        }

        return false;
    };

    /* fetchLeaderboard replaced by local effect */

    const combinedRewards = React.useMemo(() => {
        // Group quizScores by employee ID to prevent double counting of cumulative and dated scores
        const employeeQuizGroups = {}; // empId -> { dated: Map, cumulative: 0, items: [] }

        quizScores.forEach(q => {
            const rawId = String(q.employee_id || q.user_id || q.userId || q.id || '');
            if (!rawId) return;
            const emp = employees.find(e =>
                String(e.id) === rawId ||
                String(e.employee_id) === rawId ||
                String(e.userId) === rawId ||
                String(e.emp_id) === rawId
            );
            const id = emp ? String(emp.id || emp.employee_id || emp.userId || rawId) : rawId;
            const score = parsePoints(q.total_score || q.points || q.quiz_score || q.score || 0);
            if (score <= 0) return;

            const dateStr = q.created_at || q.completion_date || q.date || null;
            const hasDate = !!dateStr;

            if (!employeeQuizGroups[id]) {
                employeeQuizGroups[id] = { dated: new Map(), cumulative: 0, items: [] };
            }

            const group = employeeQuizGroups[id];
            if (hasDate) {
                const dateKey = dateStr.split('T')[0];
                group.dated.set(dateKey, Math.max(group.dated.get(dateKey) || 0, score));
                group.items.push({
                    id: `quiz-${id}-${dateKey}`,
                    employee_id: id,
                    reward_name: 'Quiz Excellence',
                    points: score,
                    created_at: dateStr,
                    note: 'Earned from Quiz Hub',
                    isCumulative: false
                });
            } else {
                group.cumulative = Math.max(group.cumulative, score);
            }
        });

        const quizRewards = [];
        Object.keys(employeeQuizGroups).forEach(id => {
            const group = employeeQuizGroups[id];
            const uniqueDatedItems = [];
            const seenDates = new Set();
            group.items.sort((a, b) => b.points - a.points);
            group.items.forEach(item => {
                const dKey = item.created_at.split('T')[0];
                if (!seenDates.has(dKey)) {
                    seenDates.add(dKey);
                    uniqueDatedItems.push(item);
                    quizRewards.push(item);
                }
            });

            const datedSum = Array.from(group.dated.values()).reduce((sum, val) => sum + val, 0);
            if (group.cumulative > datedSum) {
                quizRewards.push({
                    id: `quiz-${id}-cumulative`,
                    employee_id: id,
                    reward_name: 'Quiz Excellence',
                    points: group.cumulative - datedSum,
                    created_at: null,
                    note: 'Earned from Quiz Hub',
                    isCumulative: true
                });
            }
        });

        return [...rewards, ...quizRewards];
    }, [rewards, quizScores, employees]);

    const filteredRewards = combinedRewards.filter(r => {
        const rDate = parseToDate(r.created_at || r.date);
        if (!rDate) return !startDate && !endDate;

        if (startDate) {
            const start = parseToDate(startDate);
            if (start) {
                const startOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
                if (rDate < startOfDay) return false;
            }
        }
        if (endDate) {
            const end = parseToDate(endDate);
            if (end) {
                const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
                if (rDate > endOfDay) return false;
            }
        }
        return true;
    });

    React.useEffect(() => {
        if (!user?.token) return;
        let filterType = 'range';
        let dateValue = '';
        let monthValue = '';

        if (startDate && endDate) {
            if (startDate === endDate) {
                filterType = 'date';
                dateValue = startDate;
            } else {
                const sDate = new Date(startDate);
                const eDate = new Date(endDate);
                if (sDate.getDate() === 1 && sDate.getMonth() === eDate.getMonth() && sDate.getFullYear() === eDate.getFullYear()) {
                    const lastDay = new Date(eDate.getFullYear(), eDate.getMonth() + 1, 0).getDate();
                    if (eDate.getDate() === lastDay) {
                        filterType = 'month';
                        monthValue = startDate.substring(0, 7);
                    }
                }
            }
        }

        const fetchLeaderboard = async () => {
            let url = `${BASE_URL}/api/employees/leaderboard/all`;
            if (filterType === 'date' && dateValue) {
                url += `?date=${dateValue}`;
            } else if (filterType === 'month' && monthValue) {
                url += `?month=${monthValue}`;
            } else if (startDate && endDate) {
                url += `?startDate=${startDate}&endDate=${endDate}`;
            }

            try {
                const response = await fetch(url, { headers: { 'Authorization': `Bearer ${user.token}` } });
                const data = await response.json();
                const list = Array.isArray(data) ? data : (data.data || []);
                const mappedList = list.map((item) => {
                    const empId = item.employee_id || item.id;
                    const emp = employees.find(e => String(e.id) === String(empId) || String(e.employee_id) === String(empId) || String(e.userId) === String(empId));

                    let itemHistory = [];
                    if (Array.isArray(item.history)) itemHistory = [...item.history];
                    else if (Array.isArray(item.reward_history)) itemHistory = [...item.reward_history];
                    else if (Array.isArray(item.logs)) itemHistory = [...item.logs];
                    else if (Array.isArray(item.records)) itemHistory = [...item.records];
                    
                    if (Array.isArray(item.quiz_history)) {
                        itemHistory = [...itemHistory, ...item.quiz_history];
                    }

                    return {
                        id: empId,
                        name: item.employee_name || item.name || (emp ? (emp.name || emp.employee_name) : 'Team Member'),
                        role: item.designation || item.role || (emp ? (emp.designation || emp.role) : 'Team Member'),
                        team: item.team || item.department || (emp ? (emp.team || emp.department) : 'Bytes Blasters✨'),
                        total_reward_points: parsePoints(item.reward_points || item.total_reward_points || item.rewardPoints || 0),
                        total_quiz_points: parsePoints(item.quiz_points || item.total_quiz_points || item.quizPoints || 0),
                        total_points: parsePoints(item.total_points || item.score || item.totalPoints || item.totalPointsNum || item.totalRepNum || item.total_rep || 0),
                        profile_picture: item.profile_picture || item.profile_pic || item.photo || (emp ? (emp.profile_picture || emp.profile_pic || emp.photo) : null),
                        history: itemHistory
                    };
                });
                mappedList.sort((a, b) => b.total_points - a.total_points);
                const rankedList = mappedList.map((item, index) => ({
                    ...item,
                    rank: String(index + 1)
                })).filter(item => item.total_points > 0);

                setLeaderboard(rankedList);
            } catch (err) {
                console.error('Error fetching backend leaderboard:', err);
            }
        };
        fetchLeaderboard();
    }, [startDate, endDate, user, employees]);


    const topContributor = React.useMemo(() => {
        if (!leaderboard || leaderboard.length === 0) return null;
        const sortedLeaderboard = [...leaderboard].sort((a, b) => b.total_points - a.total_points);
        const top = sortedLeaderboard[0];
        const emp = employees.find(e => String(e.id) === String(top.id) || String(e.employee_id) === String(top.id) || String(e.userId) === String(top.id));
        return {
            id: top.id,
            name: top.name || resolveEmployeeName(top.id),
            total_points: top.total_points,
            role: emp?.role || 'Team Member',
            profile_picture: emp?.profile_picture || emp?.profile_pic || emp?.photo
        };
    }, [leaderboard, employees, resolveEmployeeName]);

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

    const initiateDeleteReward = (id) => {
        setDeleteConfirmId(id);
    };

    const handleDeleteReward = async () => {
        const id = deleteConfirmId;
        if (!id) return;
        setDeleteConfirmId(null);
        try {
            const res = await fetch(API_ENDPOINTS.REWARD_DELETE(id), { method: 'DELETE', headers: { 'Authorization': `Bearer ${user.token}` } });
            if (res.ok) {
                setRewards(prev => prev.filter(r => r.id !== id));
                setDeleteSuccess(true);
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

    const auditLogsCount = React.useMemo(() => {
        if (!user) return 0;
        return filteredRewards.filter(r => {
            if (String(r.id).startsWith('quiz-')) return false;
            const recipientName = resolveEmployeeName(r.employee_id).toLowerCase();
            const giverName = resolveEmployeeName(r.granted_by).toLowerCase();
            const rewardName = (r.reward_name || '').toLowerCase();
            const search = auditSearch.toLowerCase();
            return recipientName.includes(search) || giverName.includes(search) || rewardName.includes(search);
        }).length;
    }, [filteredRewards, user, auditSearch, resolveEmployeeName]);

    return (
        <div id="awards-screen-main" style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif", overflowX: 'hidden', width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
            <AppHeader />

            <main style={{ flex: 1, padding: winWidth < 768 ? '100px 16px 100px' : '120px 26px 100px', width: '100%', boxSizing: 'border-box', marginTop: 0, overflowX: 'hidden' }}>
                <div style={{ width: '100%', boxSizing: 'border-box' }}>

                    {/* â”€â”€ Header Controls â”€â”€ */}
                    <div style={{ display: 'flex', flexDirection: winWidth < 600 ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate('/dashboard', { replace: true });
                                    setTimeout(() => {
                                        if (window.location.hash.includes('dashboard') && document.getElementById('awards-screen-main')) {
                                            window.location.reload();
                                        }
                                    }, 100);
                                }}
                                style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            >
                                <ArrowLeft size={18} color="#64748b" />
                            </button>
                            <div>
                                <h1 style={{ margin: 0, fontSize: winWidth < 768 ? '20px' : '24px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>Awards &amp; Recognition</h1>
                                <p style={{ margin: 0, fontSize: winWidth < 768 ? '11px' : '13px', color: '#94a3b8', fontWeight: '600' }}>Achievements at NBT HUB</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', width: winWidth < 768 ? '100%' : 'auto', alignItems: 'center' }}>
                            <button
                                onClick={() => setView(view === 'audit' ? 'feed' : 'audit')}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s ease', background: view === 'audit' ? '#eff6ff' : 'white', color: view === 'audit' ? '#1e40af' : '#334155', border: view === 'audit' ? '1.5px solid #3b82f6' : '1.5px solid #cbd5e1', whiteSpace: 'nowrap', height: '38px', width: winWidth < 480 ? '100%' : 'auto', justifyContent: 'center' }}>
                                <ShieldCheck size={14} />
                                Team Audit
                            </button>
                            <div style={{ display: 'flex', gap: '12px', width: winWidth < 480 ? '100%' : 'auto' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#f8fafc', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1 }}>
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
                            </div>
                        </div>
                    </div>

                    {/* ── Top Banner ── */}
                    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '24px', padding: winWidth < 768 ? '30px 20px' : '30px 60px', display: 'grid', gridTemplateColumns: winWidth < 768 ? 'minmax(0, 1fr)' : '1fr 1fr 1fr', gap: winWidth < 768 ? '30px' : '0', alignItems: 'center', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.4)', marginBottom: '40px', position: 'relative', overflow: 'hidden', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
                        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '40%', height: '200%', background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)', transform: 'rotate(-45deg)', opacity: 0.5 }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderRight: winWidth < 768 ? 'none' : '1.5px solid rgba(255,255,255,0.1)', borderBottom: winWidth < 768 ? '1.5px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: winWidth < 768 ? '20px' : '0' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Trophy size={winWidth < 768 ? 24 : 32} color="#facc15" />
                            </div>
                            <div>
                                <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Member Status</p>
                                <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '20px' : '24px', fontWeight: '950', color: '#ffffff' }}>Active Hub</h3>
                            </div>
                        </div>
                        <div style={{ textAlign: winWidth < 768 ? 'left' : 'center', borderRight: winWidth < 768 ? 'none' : '1.5px solid rgba(255,255,255,0.1)', borderBottom: winWidth < 768 ? '1.5px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: winWidth < 768 ? '20px' : '0' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Top Contributor Score</p>
                            <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '22px' : '28px', fontWeight: '950', color: '#facc15' }}>
                                {topContributor ? formatPoints(topContributor.total_points) : '0'} <span style={{ fontSize: '18px' }}></span>
                            </h3>
                        </div>
                        <div style={{ textAlign: winWidth < 768 ? 'left' : 'right' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Top Recognition</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: winWidth < 768 ? 'flex-start' : 'flex-end', gap: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '950', color: '#ffffff' }}>
                                    {topContributor ? topContributor.name : 'Syncing...'}
                                </h3>
                                <Star size={20} color="#facc15" fill="#facc15" />
                            </div>
                        </div>
                    </div>

                    {/* ── AUDIT VIEW ── */}
                    {view === 'audit' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', alignItems: 'start' }}>
                            <div style={{ background: '#f8fafc', borderRadius: '24px', padding: winWidth < 768 ? '15px' : '30px', border: '1.5px solid #f1f5f9', boxSizing: 'border-box' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>Team Recognition Audit</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input type="text" placeholder="Search by Recipient Name..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
                                            style={{ width: '100%', padding: '14px 20px 14px 50px', borderRadius: '16px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: '600', outline: 'none', color: '#1e293b', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', boxSizing: 'border-box' }} />
                                        <div style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                            <Search size={18} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {(() => {
                                            const auditLogs = filteredRewards.filter(r => {
                                                if (String(r.id).startsWith('quiz-')) return false;
                                                const rn = resolveEmployeeName(r.employee_id).toLowerCase();
                                                const s = auditSearch.trim().toLowerCase();
                                                if (!s) return true;

                                                return rn.startsWith(s);
                                            });
                                            if (auditLogs.length === 0) {
                                                return (
                                                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: 'white', borderRadius: '24px', border: '1.5px solid #f1f5f9' }}>
                                                        <ShieldCheck size={40} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
                                                        <div style={{ fontWeight: '800', fontSize: '14px', color: '#64748b' }}>No audit records found matching your query.</div>
                                                    </div>
                                                );
                                            }
                                            return auditLogs.map((r, i) => {
                                                const canRevoke = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'MANAGER' || String(r.granted_by) === String(user?.employee_id || user?.userId || user?.id);
                                                return (
                                                    <div key={r.id || i} style={{ background: 'white', padding: winWidth < 768 ? '12px' : '16px', borderRadius: '16px', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'all 0.3s ease' }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3863a8'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', fontSize: '14px' }}>
                                                                    {resolveEmployeeName(r.employee_id).charAt(0)}
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: winWidth < 768 ? '13px' : '14px', fontWeight: '900', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resolveEmployeeName(r.employee_id)}</div>
                                                                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>Employee ID: {r.employee_id}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ background: '#ecfdf5', color: '#10b981', fontWeight: '900', fontSize: '12px', padding: '4px 12px', borderRadius: '8px' }}>+{formatPoints(r.points)}</div>
                                                                {canRevoke && (
                                                                    <button onClick={() => initiateDeleteReward(r.id)} style={{ background: '#fef2f2', border: 'none', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }} title="Revoke Recognition">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px' }}>
                                                            <div>
                                                                <span style={{ fontSize: '8px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Recognition Tier</span>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', fontSize: '12px', color: '#1e293b' }}>
                                                                    <Award size={12} color="#3b82f6" />{r.reward_name || 'Excellence'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span style={{ fontSize: '8px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Granted By</span>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', fontSize: '12px', color: '#1e293b' }}>
                                                                    <UserCheck size={12} color="#10b981" />{resolveEmployeeName(r.granted_by)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {r.note && <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600', borderLeft: '3px solid #cbd5e1', paddingLeft: '10px', margin: '2px 0' }}>"{r.note}"</div>}
                                                        <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'right', fontWeight: '700' }}>
                                                            Awarded on: {(() => {
                                                                const d = parseToDate(r.created_at || r.date);
                                                                return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
                                                            })()}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                    ) : (
                        /* ── DASHBOARD — Two-Column Layout ── */
                        <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1024 ? 'minmax(0, 1fr)' : '480px minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>

                            {/* LEFT: Grant Recognition */}
                            <div style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1a2744 100%)', borderRadius: '24px', padding: winWidth < 768 ? '24px 20px' : '32px 28px', border: '1.5px solid rgba(255,255,255,0.07)', boxShadow: '0 20px 40px rgba(15,23,42,0.25)', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
                                <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                                    <div style={{ background: 'rgba(250,204,21,0.15)', padding: '10px', borderRadius: '14px', border: '1px solid rgba(250,204,21,0.2)' }}>
                                        <Trophy size={20} color="#facc15" />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '950', color: '#ffffff', letterSpacing: '-0.3px' }}>Grant Recognition</h2>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Award points to your team members</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                    {/* Recipient Picker */}
                                    <div style={{ position: 'relative' }} ref={recipientDropdownRef}>
                                        <label style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', display: 'block' }}>Select Recipient</label>
                                        <div onClick={() => setShowRecipientDropdown(!showRecipientDropdown)}
                                            style={{ width: '100%', padding: '13px 16px', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: selectedEmployee ? '#ffffff' : '#64748b', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', boxSizing: 'border-box' }}>
                                            <span>{selectedEmployee ? (selectedEmployee.name || selectedEmployee.employee_name) : 'Choose a team member...'}</span>
                                            <ChevronRight size={16} color="#64748b" style={{ transform: showRecipientDropdown ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                                        </div>
                                        {showRecipientDropdown && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '14px', border: '1.5px solid #f1f5f9', boxShadow: '0 16px 32px rgba(0,0,0,0.15)', zIndex: 100, marginTop: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                                                <div style={{ padding: '10px', position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '10px', padding: '0 10px' }}>
                                                        <Search size={14} color="#94a3b8" />
                                                        <input autoFocus placeholder="Search employee..." value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} onClick={e => e.stopPropagation()}
                                                            style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', fontWeight: '600', color: '#0f172a' }} />
                                                    </div>
                                                </div>
                                                {employees.filter(emp => {
                                                    const uid = user?.employee_id || user?.userId || user?.id;
                                                    const empId = emp.id || emp.employee_id || emp.userId;
                                                    const empName = emp.name || emp.employee_name || '';
                                                    return String(empId) !== String(uid) && empName.toLowerCase().includes(recipientSearch.toLowerCase()) && empName !== 'Anish V N' && empName !== 'Dinesh';
                                                }).map(emp => {
                                                    const stableId = emp.id || emp.employee_id || emp.userId;
                                                    return (
                                                        <div key={stableId} onClick={() => { setSelectedEmployee(emp); setShowRecipientDropdown(false); setRecipientSearch(''); }}
                                                            style={{ padding: '12px 15px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f8fafc' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            {emp.name || emp.employee_name || 'Anonymous'}
                                                        </div>
                                                    );
                                                })}
                                                {employees.length === 0 && <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>No employees found</div>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Select Tiers */}
                                    <div>
                                        <label style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', display: 'block' }}>Quick Select Tier</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
                                            {availableAwards.map((award, i) => {
                                                const isSelected = grantData.reward_name === award.title;
                                                return (
                                                    <div key={award.id} onClick={() => setGrantData({ ...grantData, reward_name: award.title, points: award.rep })}
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', background: isSelected ? 'rgba(56,99,168,0.25)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${isSelected ? 'rgba(56,99,168,0.6)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s ease' }}
                                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: i < 3 ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {i < 3 ? <Trophy size={14} color="#f59e0b" /> : <Star size={14} color="#3b82f6" />}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#ffffff' }}>{award.title}</div>
                                                                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>{award.desc}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: '13px', fontWeight: '950', color: '#facc15', whiteSpace: 'nowrap' }}>{formatPoints(award.rep)} R</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {feedback && (
                                        <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '800', padding: '10px 16px', borderRadius: '12px', background: feedback.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: feedback.type === 'success' ? '#10b981' : '#f87171', border: `1px solid ${feedback.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                                            {feedback.msg}
                                        </div>
                                    )}

                                    <button onClick={handleGrantAward} disabled={granting || !selectedEmployee || !grantData.reward_name}
                                        style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: (!selectedEmployee || !grantData.reward_name) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)', color: (!selectedEmployee || !grantData.reward_name) ? '#475569' : '#0f172a', fontWeight: '950', fontSize: '14px', cursor: (!selectedEmployee || !grantData.reward_name) ? 'not-allowed' : 'pointer', boxShadow: (!selectedEmployee || !grantData.reward_name) ? 'none' : '0 8px 20px rgba(250,204,21,0.25)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Zap size={16} />
                                        {granting ? 'Granting...' : 'Confirm Grant'}
                                    </button>
                                </div>
                            </div>

                            {/* RIGHT: Live Feed */}
                            <div style={{ background: '#ffffff', borderRadius: '24px', padding: winWidth < 768 ? '20px' : '32px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
                                {!selectedHistoryUser ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                            <div>
                                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.4px' }}>Live Feed</h2>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Recognition leaderboard by total points</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#3b82f6', background: '#eff6ff', padding: '6px 12px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                                                    {leaderboard.filter(l => (l.total_points || 0) > 0).length} Members
                                                </div>
                                            </div>
                                        </div>
                                        <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '580px', overflowY: 'auto', paddingRight: '8px' }}>
                                            {(() => {
                                                const employeeStats = leaderboard.map(l => {
                                                    const userRewards = filteredRewards.filter(r => String(r.employee_id) === String(l.id));
                                                    return { id: l.id, name: l.name, totalRep: l.total_points, userRewards };
                                                }).filter(stat => stat.totalRep > 0).sort((a, b) => b.totalRep - a.totalRep);
                                                const displayedStats = employeeStats;
                                                if (displayedStats.length === 0) {
                                                    return (
                                                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                                            <Trophy size={40} style={{ color: '#e2e8f0', marginBottom: '12px' }} />
                                                            <div style={{ fontWeight: '800', fontSize: '14px', color: '#64748b' }}>No recognitions yet in this period.</div>
                                                        </div>
                                                    );
                                                }
                                                const rankColors = ['#f59e0b', '#94a3b8', '#b45309'];
                                                return displayedStats.map(({ id: empId, name: empName, totalRep, userRewards }, index) => {
                                                    const latest = userRewards.length > 0 ? userRewards.reduce((prev, cur) => {
                                                        const dPrev = parseToDate(prev.created_at || prev.date);
                                                        const dCur = parseToDate(cur.created_at || cur.date);
                                                        if (!dPrev) return cur;
                                                        if (!dCur) return prev;
                                                        return dPrev > dCur ? prev : cur;
                                                    }, userRewards[0]) : null;
                                                    const isTop3 = index < 3;
                                                    return (
                                                        <div key={empId} onClick={() => setSelectedHistoryUser(empId)}
                                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: winWidth < 768 ? '14px' : '16px 20px', borderRadius: '16px', background: isTop3 ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : '#f8fafc', border: `1.5px solid ${isTop3 ? '#fde68a' : '#f1f5f9'}`, transition: 'all 0.2s ease' }}
                                                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '10px' : '14px', flex: 1, minWidth: 0, paddingRight: '10px' }}>
                                                                <div style={{ width: winWidth < 768 ? '32px' : '38px', height: winWidth < 768 ? '32px' : '38px', borderRadius: '12px', flexShrink: 0, background: isTop3 ? `${rankColors[index]}22` : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: winWidth < 768 ? '11px' : '13px', fontWeight: '950', color: isTop3 ? rankColors[index] : '#64748b' }}>
                                                                    {index === 0 ? <Trophy size={winWidth < 768 ? 14 : 16} color={rankColors[0]} /> : `#${index + 1}`}
                                                                </div>
                                                                <div style={{ width: winWidth < 768 ? '34px' : '40px', height: winWidth < 768 ? '34px' : '40px', borderRadius: '12px', flexShrink: 0, background: `hsl(${(Number(empId) * 47) % 360}, 60%, 92%)`, color: `hsl(${(Number(empId) * 47) % 360}, 70%, 35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '950' }}>
                                                                    {(empName || resolveEmployeeName(empId)).charAt(0).toUpperCase()}
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: winWidth < 768 ? '13px' : '14px', fontWeight: '900', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{empName || resolveEmployeeName(empId)}</div>
                                                                    <div style={{ fontSize: winWidth < 768 ? '10px' : '11px', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {userRewards.length} recognition{userRewards.length !== 1 ? 's' : ''}{" \u00B7 "}{latest?.reward_name || 'Excellence'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                <div style={{ fontSize: winWidth < 768 ? '14px' : '17px', fontWeight: '950', color: '#10b981' }}>+{formatPoints(totalRep)}</div>
                                                                <div style={{ fontSize: winWidth < 768 ? '8px' : '9px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>REP</div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <button onClick={() => setSelectedHistoryUser(null)} style={{ border: 'none', background: '#f8fafc', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '800', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', alignSelf: 'flex-start' }}>
                                            <ChevronLeft size={16} /> Back to Feed
                                        </button>
                                        <div style={{ fontSize: '16px', fontWeight: '950', color: '#0f172a', padding: '0 4px' }}>
                                            {resolveEmployeeName(selectedHistoryUser)}'s Recognitions
                                        </div>
                                        {(() => {
                                            const selectedUserObj = leaderboard.find(l => String(l.id) === String(selectedHistoryUser));

                                            let allUserHistory = [];
                                            const apiHistory = filteredRewards.filter(r => isSameEmployee(r.employee_id, selectedHistoryUser) && !String(r.id).startsWith('quiz-') && !String(r.reward_name).toLowerCase().includes('quiz'));
                                            
                                            let localQuizzes = [];
                                            if (selectedUserObj && selectedUserObj.history && selectedUserObj.history.length > 0) {
                                                localQuizzes = selectedUserObj.history.filter(r => String(r.id).startsWith('quiz-') || String(r.reward_name).toLowerCase().includes('quiz'));
                                            }
                                            
                                            if (localQuizzes.length === 0) {
                                                const rawQuizzes = quizScores.filter(q => isSameEmployee(q.employee_id || q.user_id || q.userId || q.id, selectedHistoryUser));
                                                localQuizzes = rawQuizzes.map((q, idx) => ({
                                                    id: `quiz-raw-${idx}`,
                                                    employee_id: q.employee_id || q.user_id || q.userId || q.id,
                                                    reward_name: q.quiz_title || q.quiz_name || 'Quiz Excellence',
                                                    points: parsePoints(q.total_score || q.points || q.quiz_score || q.score || 0),
                                                    created_at: q.created_at || q.completion_date || q.date || q.quiz_date || q.timestamp || quizDateForSelectedUser || new Date().toISOString(),
                                                    note: 'Earned from Quiz Hub'
                                                })).filter(q => q.points > 0);
                                            }
                                            
                                            allUserHistory = [...apiHistory, ...localQuizzes];

                                            allUserHistory.sort((a, b) => {
                                                const dA = parseToDate(a.created_at || a.date);
                                                const dB = parseToDate(b.created_at || b.date);
                                                if (!dA) return 1;
                                                if (!dB) return -1;
                                                return dB - dA;
                                            });

                                            return allUserHistory.map((r, i) => (
                                                <div key={i} style={{ padding: '18px 20px', borderRadius: '16px', background: '#f8fafc', border: '1.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontWeight: '900', fontSize: '14px', color: '#0f172a' }}>{r.reward_name || 'Excellence'}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginTop: '3px' }}>
                                                            {r.note || ''}{" \u00B7 "}{(() => {
                                                                const d = parseToDate(r.created_at || r.date);
                                                                return d ? d.toLocaleDateString() : 'N/A';
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '16px', fontWeight: '950', color: '#10b981' }}>+{formatPoints(r.points)} REP</div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Edit Modal */}
            {showEditModal && selectedReward && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '30px', padding: '40px', width: '90%', maxWidth: '500px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '950', marginBottom: '30px', textAlign: 'center' }}>Modify Reward</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Reward Name</label>
                            <select value={selectedReward.reward_name || selectedReward.reward_type}
                                onChange={e => {
                                    const pm = { "Visionary Lead": 200, "Goal Achiever": 150, "Team Growth": 150, "Star Performer": 50, "Problem Solver": 30, "Collaborative Hero": 20 };
                                    setSelectedReward({ ...selectedReward, reward_name: e.target.value, points: pm[e.target.value] || selectedReward.points });
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

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '28px', padding: '36px 40px', maxWidth: '440px', width: '90%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '28px' }}>
                            ⚠️
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.3px', fontFamily: "'Outfit', sans-serif" }}>
                            Revoke Recognition
                        </h3>
                        <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 24px', lineHeight: '1.6', fontWeight: '600', fontFamily: "'Outfit', sans-serif" }}>
                            Revoke this recognition?
                        </p>
                        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '12px 20px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif" }}>
                                Cancel
                            </button>
                            <button onClick={handleDeleteReward} style={{ flex: 1.2, padding: '12px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 6px 16px rgba(239, 68, 68, 0.35)', transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif" }}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Success Modal */}
            {deleteSuccess && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '28px', padding: '36px 40px', maxWidth: '440px', width: '90%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '28px' }}>
                            ✅
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.3px', fontFamily: "'Outfit', sans-serif" }}>
                            Success
                        </h3>
                        <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 24px', lineHeight: '1.6', fontWeight: '600', fontFamily: "'Outfit', sans-serif" }}>
                            deleted successfully
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteSuccess(false)} style={{ padding: '12px 32px', background: '#10b981', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)', transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif" }}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AppFooter />
        </div>
    );
}
