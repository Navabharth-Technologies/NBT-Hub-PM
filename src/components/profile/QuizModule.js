import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Zap, ArrowLeft, CheckCircle, Info, ChevronRight, Check as CheckIcon, X as XIcon, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL, API_ENDPOINTS } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
// import CartmanGif from '../../assets/images/cartman_no.gif';

const QuizModule = ({ onBack }) => {
  const { user } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState({ show: false, points: 0 });
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [quizActive, setQuizActive] = useState(false);
  const [customAlert, setCustomAlert] = useState({ show: false, message: '', type: 'success' });

  const showSuccessState = (pts) => {
    setSubmissionFeedback({ show: true, points: pts });
    setTimeout(() => setSubmissionFeedback({ show: false, points: 0 }), 3000);
  };

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const employeeId = user?.employee_id || user?.id || user?.userId;
      const res = await fetch(`${BASE_URL}/api/fun-quizzes?employee_id=${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);

        const mapped = list.filter(i => i !== null).map(item => ({
          id: item.id,
          question: item.question,
          options: [
            { letter: 'A', text: item.option_a },
            { letter: 'B', text: item.option_b },
            { letter: 'C', text: item.option_c },
            { letter: 'D', text: item.option_d }
          ],
          points_reward: item.points_reward,
          has_answered: item.has_answered || false,
          previous_result: item.previous_result ? (item.previous_result === true || item.previous_result === 'correct' ? 'correct' : 'wrong') : null,
          correct_answer: item.correct_answer || null,
          user_selected_letter: null
        }));
        setQuestions(mapped.filter(q => !q.has_answered));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  const fetchScores = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const uid = user?.employee_id || user?.userId || user?.id;
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch Users from both Rewards Leaderboard AND Subordinates for maximum coverage
      const [reRes, subRes, scoreRes] = await Promise.all([
        fetch(API_ENDPOINTS.REWARDS_LEADERBOARD || `${BASE_URL}/api/rewards/leaderboard`, { headers }),
        fetch(typeof API_ENDPOINTS.SUBORDINATES === 'function' ? API_ENDPOINTS.SUBORDINATES(uid) : `${BASE_URL}/api/subordinates/${uid}`, { headers }),
        fetch(`${BASE_URL}/api/fun-quizzes/leaderboard?employee_id=${uid}`, { headers })
      ]);

      const reData = reRes.ok ? await reRes.json() : [];
      const subData = subRes.ok ? await subRes.json() : [];
      const scoreData = scoreRes.ok ? await scoreRes.json() : [];

      const userList = [
        ...(Array.isArray(reData) ? reData : (reData.data || [])).map(u => ({ id: u.employee_id || u.id, name: u.employee_name || u.name })),
        ...(Array.isArray(subData) ? subData : (subData.data || [])).map(u => ({ id: u.employee_id || u.id, name: u.employee_name || u.name }))
      ];

      let scoreList = Array.isArray(scoreData) ? scoreData : (scoreData.data || []);

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
        scoreList.forEach(item => {
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
        scoreList = mergedList;
      } catch (cacheErr) {
        console.error("Local quiz score caching error:", cacheErr);
      }

      // 2. Map and Deduplicate precise quiz scores to exact employee name strings
      const deduplicatedMap = new Map();

      scoreList.forEach(s => {
        const targetId = s.employee_id || s.user_id || s.id;
        const userInfo = userList.find(u => String(u.id) === String(targetId));

        const name = userInfo?.name || s.employee_name || s.name || `Employee ${targetId || 'Resource'}`;
        const score = Number(s.total_score || s.points || s.quiz_score || s.score || 0);

        if (deduplicatedMap.has(name)) {
          deduplicatedMap.set(name, Math.max(deduplicatedMap.get(name), score));
        } else {
          deduplicatedMap.set(name, score);
        }
      });

      const merged = Array.from(deduplicatedMap, ([name, score]) => ({ name, score }));
      const sorted = merged.sort((a, b) => b.score - a.score);

      const list = sorted.slice(0, 5).map((u, i) => ({
        name: u.name,
        score: u.score,
        rank: i + 1,
        color: ['#FBBC05', '#EA4335', '#34A853', '#4285F4', '#FBBC05'][i % 5],
        initial: u.name ? u.name.charAt(0).toUpperCase() : 'U'
      }));

      if (list.length > 0) setLeaderboard(list);
    } catch (err) {
      console.error("Leaderboard Sync failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchScores();
  }, []);

  useEffect(() => {
    setSelectedOption(null);
  }, [currentIdx]);

  const handleSubmit = async () => {
    if (!selectedOption) return;
    const currentQ = questions[currentIdx];
    if (currentQ.has_answered) return;

    // LOCAL ASSESSMENT (Checking correct answer locally - handling both text and letter comparisons)
    const optObj = currentQ.options.find(o => o.letter === selectedOption);
    const isCorrect = optObj?.text === currentQ.correct_answer || optObj?.letter === currentQ.correct_answer;

    try {
      const token = localStorage.getItem('token');
      await fetch(API_ENDPOINTS.QUIZ_SUBMIT_ANSWER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_id: user?.employee_id || user?.id || user?.userId,
          quiz_id: currentQ.quiz_id || currentQ.id,
          question_id: currentQ.id,
          selected_option: selectedOption,
          is_correct: isCorrect,
          points: isCorrect ? (currentQ.points_reward || 0) : 0
        })
      });
    } catch (err) {
      console.error("Individual answer submission failed:", err);
    }

    setQuestions(prev => prev.map((q, i) => i === currentIdx ? {
      ...q,
      has_answered: true,
      previous_result: isCorrect ? 'correct' : 'wrong',
      user_selected_letter: selectedOption
    } : q));
  };

  const handleSendTotalResults = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      // Calculate final summary locally
      const totalQuestions = questions.length;
      const correctCount = questions.filter(q => q.previous_result === 'correct').length;
      const totalPoints = questions.reduce((sum, q) => {
        if (q.previous_result === 'correct') {
          return sum + Number(q.points_reward || 0);
        }
        return sum;
      }, 0);

      const response = await fetch(`${BASE_URL}/api/fun-quizzes/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim()}`
        },
        body: JSON.stringify({
          total_questions: totalQuestions,
          correct_count: correctCount,
          total_score: totalPoints,
          quiz_id: questions[0]?.quiz_id || questions[0]?.id
        })
      });

      if (response.ok) {
        // Refresh EVERYTHING to reflect on dashboard
        await Promise.all([fetchScores(), fetchQuestions()]);

        // Brief visual confirmation then redirect
        showSuccessState(totalPoints);
        setTimeout(() => {
          setQuizActive(false);
          setCustomAlert({ show: true, message: "Quiz submitted successfully! 🎉", type: 'success' });
        }, 1500);
      } else {
        const errData = await response.json().catch(() => ({}));
        setCustomAlert({ show: true, message: errData.message || `Submission failed (${response.status}). Please try again.`, type: 'error' });
        console.error("Submission failed:", errData);
      }
    } catch (err) {
      console.error("Batch submit failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[currentIdx];

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#F8F9FA', padding: isMobile ? '15px' : '30px', fontFamily: '"Nunito", "Segoe UI", sans-serif' },
    layout: { display: 'flex', gap: '25px', flexDirection: isTablet ? 'column' : 'row', marginBottom: '25px' },
    hero: {
      flex: 2, backgroundColor: '#B2DCE2', borderRadius: '24px', padding: isMobile ? '25px 20px' : '40px 50px',
      display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'center', position: 'relative', overflow: 'hidden', textAlign: isMobile ? 'center' : 'left'
    },
    heroTitle: { fontSize: isMobile ? '28px' : '42px', fontWeight: '900', color: '#0B1E3F', lineHeight: 1.2, marginBottom: '15px' },
    heroDesc: { fontSize: isMobile ? '12px' : '13px', fontWeight: '700', color: '#0B1E3F', opacity: 0.8, maxWidth: '350px', marginBottom: '30px', lineHeight: 1.5, marginLeft: isMobile ? 'auto' : '0', marginRight: isMobile ? 'auto' : '0' },
    heroBtn: { backgroundColor: '#0d676c', color: 'white', border: 'none', padding: '14px 30px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(13,103,108,0.2)', width: isMobile ? '100%' : 'auto' },
    leaderboard: {
      flex: 1, backgroundColor: 'white', borderRadius: '24px', padding: '25px', border: '1px solid #eef2f3',
      display: 'flex', flexDirection: 'column'
    },
    bottomSection: { backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: '1px solid #eef2f3' },
    option: (optObj, isAnswered) => {
      const isSelectedLocally = selectedOption === optObj.letter;
      const isUserPicked = currentQ?.user_selected_letter === optObj.letter;
      const isCorrectText = currentQ?.correct_answer === optObj.text;

      let borderColor = '#eef2f3';
      let bgColor = 'white';
      let textColor = '#64748b';

      if (isAnswered) {
        if (isCorrectText) {
          borderColor = '#22c55e'; bgColor = '#f0fdf4'; textColor = '#15803d';
        } else if (isUserPicked) {
          borderColor = '#ef4444'; bgColor = '#fef2f2'; textColor = '#b91c1c';
        }
      } else if (isSelectedLocally) {
        borderColor = '#0d676c'; bgColor = '#f0f9fa'; textColor = '#0d676c';
      }

      return {
        padding: '16px 20px', borderRadius: '14px', border: `1.5px solid ${borderColor}`, backgroundColor: bgColor,
        color: textColor, fontSize: '14px', fontWeight: '800', cursor: isAnswered ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '15px', transition: 'all 0.2s',
        borderColor: borderColor // Export border color for the letter box
      };
    }
  };

  const LandingMonster = (
    <div style={{ display: 'flex', alignItems: 'flex-end', position: 'relative', zIndex: 1, minWidth: isMobile ? '100px' : '150px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end', marginTop: isMobile ? '25px' : '0' }}>
      <img src="https://gifdb.com/images/high/quiz-question-eric-cartman-south-park-hrlfxd5qudqyw7n0.gif" alt="South Park Guide" style={{ height: isMobile ? '180px' : '250px', objectFit: 'contain', borderRadius: '24px' }} />
    </div>
  );

  const ReactiveMonster = (
    <div style={{ display: 'flex', alignItems: 'flex-end', position: 'relative', zIndex: 1, minWidth: isMobile ? '100px' : '150px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end', marginTop: isMobile ? '25px' : '0' }}>
      <img
        src={
          currentQ?.previous_result === 'wrong'
            ? "https://gifdb.com/images/high/sad-goodbye-crying-pikachu-emotional-anime-pokemon-s6o9gycbmkwj7xvy.gif"
            : currentQ?.previous_result === 'correct'
              ? "https://media1.tenor.com/m/yTtKMYMZ6agAAAAC/bunny-happy.gif"
              : "https://ugokawaii.com/wp-content/uploads/2022/12/QA-1024x1024.gif"
        }
        alt="Reaction"
        style={{ height: isMobile ? '160px' : '250px', objectFit: 'contain', borderRadius: '24px' }}
      />
    </div>
  );

  return (
    <div className="pm-dashboard-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      <main className="dashboard-content" style={{ flex: 1, padding: isMobile ? '100px 16px 100px' : '120px 26px 100px', width: '100%', boxSizing: 'border-box', margin: '0', fontFamily: '"Nunito", "Segoe UI", sans-serif' }}>
        <AnimatePresence>
          {submissionFeedback.show && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                zIndex: 10000, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '20px'
              }}
            >
              <div style={{ padding: '30px', borderRadius: '40px', backgroundColor: '#dcfce7', border: '2px solid #22c55e' }}>
                <CheckCircle size={80} color="#15803d" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '1000', color: '#0B1E3F', margin: '0 0 8px 0' }}>Success!</h1>
                <p style={{ fontSize: '18px', fontWeight: '800', color: '#15803d', margin: 0 }}>+{submissionFeedback.points} REP Points Stored</p>
                <div style={{ marginTop: '20px', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Returning to dashboard...</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {customAlert.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
                zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px'
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                style={{
                  backgroundColor: 'white', borderRadius: '24px', padding: '30px',
                  width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', textAlign: 'center',
                  boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                  border: '1px solid #cbd5e1'
                }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: customAlert.type === 'error' ? '#fee2e2' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>
                  {customAlert.type === 'error' ? '❌' : '🎉'}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: customAlert.type === 'error' ? '#b91c1c' : '#0F172A', margin: '0 0 10px 0' }}>
                  {customAlert.type === 'error' ? 'Submission Failed' : 'Success'}
                </h3>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>{customAlert.message}</p>
                <button
                  onClick={() => setCustomAlert({ show: false, message: '', type: 'success' })}
                  style={{
                    backgroundColor: customAlert.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white', border: 'none', padding: '12px 36px',
                    borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                    boxShadow: customAlert.type === 'error' ? '0 4px 12px rgba(239,68,68,0.2)' : '0 4px 12px rgba(16,185,129,0.2)',
                    width: '100%', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  OK
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!quizActive && (
          <div style={s.layout}>
            {/* LEFT COLUMN: HERO + PAST QUIZZES */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* Back Navigation Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '5px' }}>
                <button 
                  onClick={() => window.history.back()} 
                  style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ArrowLeft size={18} color="#64748b" />
                </button>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#0B1E3F' }}>Quiz Center</h3>
                </div>
              </div>

              {/* HERO SECTION */}
              <div style={{ ...s.hero, flex: 'none', minHeight: '380px' }}>
                <div style={{ position: 'relative', zIndex: 10, flex: 1 }}>
                  <h2 style={{ ...s.heroTitle, fontSize: isMobile ? '32px' : '48px', marginBottom: '20px' }}>Get Ready for<br />a Fun Quiz!</h2>
                  <p style={{ ...s.heroDesc, fontSize: '15px', maxWidth: '450px', marginBottom: '40px' }}>Train your brain with smart, scientifically backed games that enhance various cognitive functions.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 210px)', gap: '15px', marginBottom: '40px' }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '15px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '10px', fontWeight: '1000', color: '#1e40af', textTransform: 'uppercase' }}>Daily Questions</div>
                      <div style={{ fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>{questions.length}</div>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '15px', border: '1px solid #fef3c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '10px', fontWeight: '1000', color: '#92400e', textTransform: 'uppercase' }}>Points Remaining</div>
                      <div style={{ fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>
                        {questions.filter(q => !q.has_answered).reduce((sum, q) => sum + Number(q.points_reward || 0), 0)}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '15px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '10px', fontWeight: '1000', color: '#1e40af', textTransform: 'uppercase' }}>Overall Score</div>
                      <div style={{ fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>
                        {questions.reduce((sum, q) => sum + Number(q.points_reward || 0), 0)}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '15px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '10px', fontWeight: '1000', color: '#15803d', textTransform: 'uppercase' }}>Session Score</div>
                      <div style={{ fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>
                        {questions.reduce((sum, q) => {
                          if (q.previous_result === 'correct') return sum + Number(q.points_reward || 0);
                          return sum;
                        }, 0)}
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setQuizActive(true)} style={{ ...s.heroBtn, padding: '16px 45px', borderRadius: '12px', fontSize: '16px', letterSpacing: '0.5px' }}>Start Quiz</button>
                </div>

                {/* Monster Graphic for Landing */}
                <div style={{ flexShrink: 0, marginLeft: isMobile ? '0' : '40px', marginTop: isMobile ? '30px' : '0' }}>
                  <img 
                    src="https://gifdb.com/images/high/quiz-question-eric-cartman-south-park-hrlfxd5qudqyw7n0.gif" 
                    alt="South Park Guide" 
                    style={{ 
                      width: isMobile ? '200px' : '280px', 
                      height: 'auto', 
                      borderRadius: '30px',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <div style={{ 
                    marginTop: '15px', 
                    textAlign: 'center', 
                    fontSize: '18px', 
                    fontWeight: '1000', 
                    color: '#0B1E3F',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    ARE THERE ANY<br />QUESTIONS?
                  </div>
                </div>
              </div>

              {/* START QUIZ CTA */}
              <div style={{ backgroundColor: 'white', padding: isMobile ? '20px' : '30px', borderRadius: '24px', border: '1px solid #eef2f3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '200px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                  <Zap size={30} color="#0369a1" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F', margin: '0 0 10px 0' }}>Daily Quiz Challenge</h3>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', maxWidth: '300px', marginBottom: '20px' }}>Test your knowledge and earn score points! Answer the daily questions correctly to climb the leaderboard.</p>
                <button
                  onClick={() => setQuizActive(true)}
                  style={{
                    backgroundColor: '#0d676c', color: 'white', border: 'none', padding: '14px 40px',
                    borderRadius: '12px', fontWeight: '900', fontSize: '15px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(13,103,108,0.3)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Start Quiz <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* LEADERBOARD */}
            <div style={s.leaderboard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Trophy size={18} color="#0d676c" />
                  <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Daily Scores</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b' }}>Attended Users: {leaderboard.length}</div>
                  <div style={{ fontSize: '9px', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>LIVE</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {leaderboard.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '900' }}>
                      {p.initial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '900', color: '#0B1E3F' }}>{p.name}</div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>Rank #{p.rank}</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#0d676c' }}>{p.score}</div>
                  </div>
                ))}
              </div>

              <button style={{ marginTop: '15px', width: '100%', border: '1.5px solid #e2e8f0', backgroundColor: 'transparent', padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', color: '#64748b', cursor: 'pointer' }}>
                View Full List
              </button>
            </div>
          </div>
        )}

        {/* BRAIN TEASER / QUIZ AREA (NEW SCREEN) */}
        {quizActive && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={s.layout}>
            {/* LEFT COLUMN: QUIZ AREA */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: '1px solid #eef2f3' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button onClick={() => setQuizActive(false)} style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'white', border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={16} color="#0B1E3F" />
                  </button>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Zap size={20} color="#0d676c" fill="#0d676c" /> Daily Brain Teaser
                  </h3>
                </div>
              </div>

              {/* INNER PAGE MONSTER HERO */}
              <div style={{ backgroundColor: '#B2DCE2', borderRadius: '20px', padding: isMobile ? '25px 20px' : '30px 40px', marginBottom: '30px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'center', overflow: 'hidden', textAlign: isMobile ? 'center' : 'left' }}>
                <div>
                  <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '900', color: '#0B1E3F', margin: '0 0 10px 0' }}>Thinking Cap On!</h2>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#0B1E3F', opacity: 0.8, maxWidth: '300px', margin: isMobile ? '0 auto' : 0 }}>Answer these questions carefully. You only get one shot to earn those points!</p>
                </div>
                <div>
                  {ReactiveMonster}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '20px' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>
                    Q {questions.length > 0 ? currentIdx + 1 : 0}/{questions.length}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
                      disabled={currentIdx === 0}
                      style={{ backgroundColor: 'white', border: '1.5px solid #eef2f3', borderRadius: '10px', padding: '8px 12px', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', opacity: currentIdx === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: '800' }}
                    >
                      <ArrowLeft size={14} />
                    </button>

                    <button
                      onClick={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
                      disabled={currentIdx === questions.length - 1}
                      style={{ backgroundColor: 'white', border: '1.5px solid #eef2f3', borderRadius: '10px', padding: '8px 16px', cursor: currentIdx === questions.length - 1 ? 'not-allowed' : 'pointer', opacity: currentIdx === questions.length - 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px', color: '#0B1E3F', fontSize: '12px', fontWeight: '800' }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {isQuestionsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <Loader2 className="animate-spin" size={30} color="#0d676c" />
                </div>
              ) : questions.length > 0 && currentQ ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {/* Question Status Banner */}
                    {currentQ.has_answered && (
                      <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: currentQ.previous_result === 'correct' ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${currentQ.previous_result === 'correct' ? '#bbf7d0' : '#fecaca'}` }}>
                        {currentQ.previous_result === 'correct' ? <CheckIcon size={18} color="#15803d" /> : <XIcon size={18} color="#b91c1c" />}
                        <span style={{ fontSize: '14px', fontWeight: '800', color: currentQ.previous_result === 'correct' ? '#15803d' : '#b91c1c' }}>
                          {currentQ.previous_result === 'correct' ? 'You answered this correctly!' : 'You answered this incorrectly.'}
                        </span>
                      </div>
                    )}

                    <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '25px' }}>
                      Q{currentIdx + 1}. "{currentQ.question}"
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '15px' }}>
                      {currentQ.options.map((optObj, i) => {
                        const st = s.option(optObj, currentQ.has_answered);

                        return (
                          <div
                            key={i}
                            style={st}
                            onClick={() => {
                              if (!currentQ.has_answered) setSelectedOption(optObj.letter);
                            }}
                          >
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: st.borderColor === '#22c55e' ? '#22c55e' : (st.borderColor === '#ef4444' ? '#ef4444' : '#0d676c'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '900' }}>
                              {optObj.letter}
                            </div>
                            {optObj.text}

                            {currentQ.has_answered && currentQ.correct_answer === optObj.text && (
                              <div style={{ marginLeft: 'auto', backgroundColor: '#22c55e', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900' }}>CORRECT</div>
                            )}
                            {currentQ.has_answered && currentQ.user_selected_letter === optObj.letter && currentQ.correct_answer !== optObj.text && (
                              <div style={{ marginLeft: 'auto', backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900' }}>WRONG</div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      {currentQ.has_answered && currentIdx < questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentIdx(prev => prev + 1)}
                          style={{
                            backgroundColor: '#0d676c', color: 'white', border: 'none', padding: '12px 30px',
                            borderRadius: '12px', fontWeight: '900', fontSize: '14px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(13,103,108,0.2)'
                          }}
                        >
                          Next Question <ChevronRight size={18} />
                        </button>
                      ) : currentQ.has_answered && currentIdx === questions.length - 1 ? (
                        <button
                          disabled={isSubmitting}
                          onClick={handleSendTotalResults}
                          style={{
                            backgroundColor: '#34A853', color: 'white', border: 'none', padding: '12px 30px',
                            borderRadius: '12px', fontWeight: '900', fontSize: '14px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(52,168,83,0.2)'
                          }}
                        >
                          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={18} />}
                          Submit Final Score ({questions.reduce((sum, q) => {
                            if (q.previous_result === 'correct') {
                              return sum + Number(q.points_reward || 0);
                            }
                            return sum;
                          }, 0)} pts)
                        </button>
                      ) : (
                        <button
                          disabled={currentQ.has_answered || !selectedOption || isSubmitting}
                          onClick={handleSubmit}
                          style={{
                            backgroundColor: currentQ.has_answered || !selectedOption ? '#e2e8f0' : '#0d676c',
                            color: currentQ.has_answered || !selectedOption ? '#94a3b8' : 'white',
                            border: 'none', padding: '12px 30px', borderRadius: '12px',
                            fontWeight: '900', fontSize: '14px',
                            cursor: currentQ.has_answered || !selectedOption || isSubmitting ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            boxShadow: currentQ.has_answered || !selectedOption ? 'none' : '0 4px 12px rgba(13,103,108,0.2)'
                          }}
                        >
                          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                          Check Answer
                        </button>
                      )}
                    </div>

                  </motion.div>
                </AnimatePresence>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontWeight: '800' }}>
                  No quizzes available for today.
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: LEADERBOARD IN INNER SCREEN */}
            <div style={s.leaderboard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Trophy size={18} color="#0d676c" />
                  <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Daily Scores</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b' }}>Attended Users: {leaderboard.length}</div>
                  <div style={{ fontSize: '9px', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>LIVE</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {leaderboard.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '900' }}>
                      {p.initial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '900', color: '#0B1E3F' }}>{p.name}</div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>Rank #{p.rank}</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#0d676c' }}>{p.score}</div>
                  </div>
                ))}
              </div>

              <button style={{ marginTop: '15px', width: '100%', border: '1.5px solid #e2e8f0', backgroundColor: 'transparent', padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', color: '#64748b', cursor: 'pointer' }}>
                View Full List
              </button>
            </div>
          </motion.div>
        )}
      </main>
      <AppFooter />
    </div>
  );
};

export default QuizModule;
