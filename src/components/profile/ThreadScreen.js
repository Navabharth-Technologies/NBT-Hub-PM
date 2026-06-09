import React, { useState, useEffect, useRef } from 'react';
import { useThread } from '../../context/ThreadContext';
import { useAuth } from '../../context/AuthContext';
import {
    Heart, MessageSquare, Award, Smile,
    Send, MoreHorizontal, User, Share2, Cake, Gift, Plus, ChevronLeft,
    Trash2, Edit3, X, Check, Image as ImageIcon, Film, XCircle, Trash
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { API_ENDPOINTS, BASE_URL } from '../../config';

const EMOJI_LIST = ['❤️', '👍', '😮', '😂', '🔥', '👏', '🎂'];

export default function ThreadScreen() {
    const navigate = useNavigate();
    const { threads, unreadCount, loading, clearNotifications, addPost, deletePost, updatePost, deleteComment, updateComment, toggleReaction, toggleBadge, addComment, fetchComments, fetchReactors } = useThread();
    const { user } = useAuth();
    
    const [fullscreenMedia, setFullscreenMedia] = useState(null);
    const [newPost, setNewPost] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaType, setMediaType] = useState(null); 
    const [mediaPreview, setMediaPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
    const [activeCommentPost, setActiveCommentPost] = useState(null);
    const [flyingEmoji, setFlyingEmoji] = useState(null);
    const [userProfiles, setUserProfiles] = useState({});
    const [postComments, setPostComments] = useState({});
    const [loadingComments, setLoadingComments] = useState({});
    const [editingPostId, setEditingPostId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentContent, setEditCommentContent] = useState('');
    const [winWidth, setWinWidth] = useState(window.innerWidth);

    const [editMediaFile, setEditMediaFile] = useState(null);
    const [editMediaType, setEditMediaType] = useState(null);
    const [editMediaPreview, setEditMediaPreview] = useState(null);
    const [editRemoveMedia, setEditRemoveMedia] = useState(false);
    const editFileInputRef = useRef(null);
    const [reactorModal, setReactorModal] = useState(null); // { postId, emoji, users, count }
    const [loadingReactors, setLoadingReactors] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, postId: null, userId: null });
    const [replaceConfirmPost, setReplaceConfirmPost] = useState(null);

    const handleReplaceMediaClick = (post) => {
        const hasExistingMedia = !!(post.media_url || post.mediaUrl || post.media || post.image || post.media_path || post.file_path);
        if (hasExistingMedia && !editRemoveMedia) {
            setReplaceConfirmPost(post);
        } else {
            editFileInputRef.current?.click();
        }
    };

    useEffect(() => {
        if (clearNotifications) clearNotifications();
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (user?.token) {
            fetchProfiles();
        }
    }, [user]);

    // Clear notifications in real-time as threads update while user is on this screen
    useEffect(() => {
        if (threads.length > 0 && clearNotifications) clearNotifications();
    }, [threads]);

    useEffect(() => {
        if (!activeCommentPost) return;
        const interval = setInterval(async () => {
            try {
                const comments = await fetchComments(activeCommentPost);
                setPostComments(prev => ({ ...prev, [activeCommentPost]: comments }));
            } catch (err) {
                console.error("Comments poll error:", err);
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [activeCommentPost, fetchComments]);

    const fetchProfiles = async () => {
        if (!user?.token) return;
        try {
            // 1. Fetch from Users API
            const resp = await fetch(API_ENDPOINTS.USERS, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const map = {};
            if (resp.ok) {
                const data = await resp.json();
                const userList = Array.isArray(data) ? data : (data.value || []);
                userList.forEach(u => {
                    const idKey = String(u.id || u.empId || u.userId || u.employee_id || '').toLowerCase();
                    const emailKey = String(u.email || '').toLowerCase();
                    const nameKey = String(u.name || '').toLowerCase();
                    
                    const cleanUser = {
                        ...u,
                        profile_pic: u.profile_pic || u.profile_picture || u.profileImage || u.profilePicture || u.profile_image || u.avatar
                    };
                    
                    if (idKey) map[idKey] = cleanUser;
                    if (emailKey) map[emailKey] = cleanUser;
                    if (nameKey) map[nameKey] = cleanUser;
                });
            }

            // 2. Fetch from Employees API to enrich pictures & designations
            try {
                const empResp = await fetch(API_ENDPOINTS.EMPLOYEES || `${BASE_URL}/api/employees`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (empResp.ok) {
                    const empData = await empResp.json();
                    const empList = Array.isArray(empData) ? empData : [];
                    empList.forEach(emp => {
                        const empId = String(emp.id || emp.employee_id || emp.empId || '').toLowerCase();
                        const empEmail = String(emp.email || emp.official_email || emp.personal_email || '').toLowerCase();
                        const empName = String(emp.name || emp.emp_name || '').toLowerCase();
                        
                        const pic = emp.profile_pic || emp.profile_picture || emp.photo || emp.ProfilePic || emp.Profile_Picture || emp.ProfilePicture || emp.profileImage || emp.profile_image;
                        const designation = emp.designation || emp.role || emp.designation_name;
                        
                        const keys = [empId, empEmail, empName].filter(Boolean);
                        keys.forEach(k => {
                            if (map[k]) {
                                map[k] = {
                                    ...map[k],
                                    profile_pic: pic || map[k].profile_pic,
                                    profile_picture: pic || map[k].profile_picture,
                                    designation: designation || map[k].designation || map[k].role,
                                    name: map[k].name || emp.name || emp.emp_name,
                                    email: map[k].email || emp.email || emp.official_email
                                };
                            } else {
                                map[k] = {
                                    ...emp,
                                    profile_pic: pic,
                                    profile_picture: pic,
                                    designation: designation,
                                    name: emp.name || emp.emp_name,
                                    email: emp.email || emp.official_email
                                };
                            }
                        });
                    });
                }
            } catch (empErr) {
                console.error("Employees enrich error:", empErr);
            }

            setUserProfiles(map);
        } catch (err) { console.error("Profiles error:", err); }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMediaFile(file);
        setMediaType(file.type.startsWith('video') ? 'video' : 'image');
        const reader = new FileReader();
        reader.onloadend = () => setMediaPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleEditFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setEditMediaFile(file);
        setEditMediaType(file.type.startsWith('video') ? 'video' : 'image');
        const reader = new FileReader();
        reader.onloadend = () => setEditMediaPreview(reader.result);
        reader.readAsDataURL(file);
        setEditRemoveMedia(false);
    };

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setMediaType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePost = async () => {
        if (!newPost.trim() && !mediaFile) return;
        setUploading(true);
        try {
            await addPost({
                userId: user?.id,
                user: user?.name || 'User',
                role: user?.role?.toUpperCase() || 'EMPLOYEE',
                tagline: '',
                content: newPost,
                file: mediaFile,
                mediaType: mediaType
            });
            setNewPost('');
            clearMedia();
        } catch (err) {
            console.error("Post Error:", err);
        } finally {
            setUploading(false);
        }
    };

    const onToggleLike = async (id, type = 'like') => await toggleReaction(id, user?.id, type);
    const onToggleBadge = async (id) => await toggleBadge(id, user?.id);

    const [commentText, setCommentText] = useState('');
    const handleAddComment = async (id) => {
        if (!commentText.trim()) return;
        const success = await addComment(id, commentText);
        if (success) {
            setCommentText('');
            const comments = await fetchComments(id);
            setPostComments(prev => ({ ...prev, [id]: comments }));
        }
    };

    const handleOpenComments = async (postId) => {
        if (activeCommentPost === postId) { setActiveCommentPost(null); return; }
        setActiveCommentPost(postId);
        setLoadingComments(prev => ({ ...prev, [postId]: true }));
        const comments = await fetchComments(postId);
        setPostComments(prev => ({ ...prev, [postId]: comments }));
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
    };

    const onReact = (id, emoji, e) => {
        const x = e.clientX;
        const y = e.clientY;
        setFlyingEmoji({ emoji, x, y, postId: id });
        setActiveEmojiPicker(null);
        
        // Emotional Reaction - Distinct from the footer 'Like' action
        onToggleLike(id, emoji); 
        
        setTimeout(() => setFlyingEmoji(null), 3500);
    };

    const formatTime = (ts) => {
        if (!ts) return ''; 
        // Use YYYY/MM/DD format to force local time interpretation across all browsers
        const d = new Date(typeof ts === 'string' ? ts.replace(/-/g, '/').replace('T', ' ').split('.')[0] : ts);
        if (isNaN(d.getTime())) return '...'; 
        
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const openReactorsModal = async (post, emoji) => {
        const cachedData = post.reactionUsers?.[emoji] || post.reactionDetails?.[emoji] || [];
        const fallbackCount = emoji === 'like'
            ? (post.likeCount || 0)
            : (post.reactions?.[emoji] || 0);
        const dynamicCount = cachedData.length > 0 ? cachedData.length : fallbackCount;

        // Open modal immediately with cached/count data
        setReactorModal({ 
            postId: post.id, 
            emoji: emoji === 'like' ? '❤️' : emoji, 
            users: cachedData,
            count: dynamicCount
        });

        // Fetch live reactor list from API
        setLoadingReactors(true);
        try {
            let liveUsers = await fetchReactors(post.id, emoji);

            // If 'like' returns empty, the backend may store likes as '❤️' — retry
            if ((!liveUsers || liveUsers.length === 0) && emoji === 'like') {
                liveUsers = await fetchReactors(post.id, '❤️');
            }

            if (liveUsers && liveUsers.length > 0) {
                setReactorModal(prev => prev ? { ...prev, users: liveUsers, count: liveUsers.length } : null);
            }
        } catch {}
        setLoadingReactors(false);
    };

    const isMobile = winWidth < 768;
    const isTablet = winWidth < 1024;

    const confirmDelete = async (confirmed) => {
      if (confirmed && deleteConfirm.postId) {
        await deletePost(deleteConfirm.postId, deleteConfirm.userId);
      }
      setDeleteConfirm({ show: false, postId: null, userId: null });
    };

    const styles = {
        container: { minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', padding: isMobile ? '100px 15px 40px' : (isTablet ? '125px 26px 50px' : '125px 40px 50px'), marginTop: 0, width: '100%', maxWidth: '100%', margin: '0', boxSizing: 'border-box' },
        card: { backgroundColor: 'white', borderRadius: isMobile ? '25px' : '40px', padding: isMobile ? '20px' : '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', border: '3px solid #cbd5e1' },
        tagInput: { width: '100%', padding: '12px 20px', borderRadius: '15px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontSize: isMobile ? '12px' : '14px', fontWeight: '900', color: '#315A9E', outline: 'none', marginBottom: '12px' },
        mainInput: { width: '100%', padding: isMobile ? '15px' : '20px', borderRadius: '20px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontSize: isMobile ? '14px' : '16px', fontWeight: '600', color: '#0B1E3F', outline: 'none', resize: 'none', minHeight: isMobile ? '80px' : '100px' },
        mediaBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: isMobile ? '8px 12px' : '10px 18px', borderRadius: '12px', border: '1.5px solid #eef2f6', background: 'white', cursor: 'pointer', fontSize: isMobile ? '10px' : '12px', fontWeight: '800', color: '#64748b' },
        postBtn: { padding: isMobile ? '10px 15px' : '12px 30px', backgroundColor: '#315A9E', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '1000', cursor: 'pointer', fontSize: isMobile ? '11px' : '13px', textTransform: 'uppercase' },
        threadCard: { backgroundColor: 'white', borderRadius: isMobile ? '25px' : '40px', padding: isMobile ? '20px' : '24px 30px', border: '3px solid #cbd5e1', position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', marginBottom: '20px', transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
        taglineBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '8px', background: '#f0f9ff', color: '#315A9E', fontSize: isMobile ? '8px' : '9px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '12px', border: '1px solid #e0f2fe' },
        postMedia: { marginTop: '20px', borderRadius: '25px', overflow: 'hidden', border: '1.5px solid #f8fafc', maxHeight: isMobile ? '300px' : '380px', maxWidth: '100%', width: 'fit-content', backgroundColor: '#fdfdfd', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' },
        footer: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '18px', marginTop: '20px', gap: isMobile ? '5px' : '10px', flexWrap: isMobile ? 'wrap' : 'nowrap' },
        action: (active, color) => ({ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '4px' : '8px', 
            color: active ? 'white' : color, 
            backgroundColor: active ? color : '#f8fafc',
            padding: isMobile ? '6px 8px' : '8px 16px',
            borderRadius: '12px',
            fontSize: isMobile ? '9px' : (isTablet ? '11px' : '12px'), 
            fontWeight: '900', 
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: active ? `1.5px solid ${color}` : '1.5px solid #f1f5f9',
            position: 'relative',
            flex: isMobile ? '1 1 auto' : 'none',
            justifyContent: 'center'
        }),
        emojiPicker: {
            position: 'absolute',
            bottom: '100%',
            left: '0',
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            gap: '8px',
            marginBottom: '10px',
            border: '1px solid #eef2f6',
            zIndex: 100
        },
        reactionBadge: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'white',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '800',
            border: '3px solid #cbd5e1',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
        },
        modalOverlay: {
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
        },
        modalContent: {
            backgroundColor: 'white',
            borderRadius: '30px',
            width: '90%',
            maxWidth: '400px',
            padding: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            border: '3px solid #cbd5e1',
            position: 'relative'
        }
    };

    if (loading) {
        return (
            <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        style={{ 
                            width: '80px', 
                            height: '80px', 
                            border: '4px solid rgba(49, 90, 158, 0.1)', 
                            borderTop: '4px solid #315A9E', 
                            borderRight: '4px solid #315A9E',
                            borderRadius: '50%',
                            boxShadow: '0 0 20px rgba(49, 90, 158, 0.1)'
                        }} 
                    />
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{ 
                            marginTop: '30px', 
                            color: '#315A9E', 
                            fontWeight: '900', 
                            fontSize: '14px', 
                            letterSpacing: '3px',
                            textTransform: 'uppercase'
                        }}
                    >
                        Syncing Team Feed
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <AppHeader />
            {deleteConfirm.show && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={{ marginBottom: '1rem' }}>Confirm Deletion</h2>
                        <p>Are you sure you want to delete this post?</p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                            <button onClick={() => confirmDelete(true)} style={{ flex: 1, padding: '8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px' }}>Delete</button>
                            <button onClick={() => confirmDelete(false)} style={{ flex: 1, padding: '8px', backgroundColor: '#cbd5e1', color: '#0B1E3F', border: 'none', borderRadius: '8px' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {/* CREATE THREAD */}
            <div style={{ ...styles.card, borderTop: '5px solid #FDB913' }}>
                <textarea style={styles.mainInput} placeholder="Share an update with the team..." value={newPost} onChange={e => setNewPost(e.target.value)} />

                <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*,video/*" />
                
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px', alignItems: 'center' }}>
                    <div style={styles.mediaBtn} onClick={() => fileInputRef.current?.click()}><ImageIcon size={18} color="#10b981" /> Photo</div>
                    <div style={styles.mediaBtn} onClick={() => fileInputRef.current?.click()}><Film size={18} color="#ef4444" /> Video</div>
                    <div style={{ flex: 1 }} />
                    <button style={styles.postBtn} onClick={handlePost} disabled={uploading}>
                        {uploading ? 'Publishing...' : 'Publish Thread'}
                    </button>
                </div>

                {mediaPreview && (
                    <div style={{ marginTop: '20px', position: 'relative', borderRadius: '25px', overflow: 'hidden', maxWidth: '400px' }}>
                        <XCircle size={24} color="white" style={{ position: 'absolute', top: '10px', right: '10px', cursor: 'pointer', zIndex: 10 }} onClick={clearMedia} />
                        {mediaType === 'video' ? ( <video src={mediaPreview} controls style={{ width: '100%', display: 'block' }} /> ) : ( <img src={mediaPreview} alt="" style={{ width: '100%', display: 'block' }} /> )}
                    </div>
                )}
            </div>

            {/* THREAD FEED */}
            <AnimatePresence>
                {uploading && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{ ...styles.card, background: '#f0f9ff', border: '3px dashed #315A9E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            style={{ width: '20px', height: '20px', border: '3px solid rgba(49, 90, 158, 0.1)', borderTop: '3px solid #315A9E', borderRadius: '50%' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#315A9E', letterSpacing: '1px', textTransform: 'uppercase' }}>Broadcasting your update...</span>
                    </motion.div>
                )}
            </AnimatePresence>
            {threads.map(post => {
                const authorId = user?.id || user?.empId || user?.userId || user?.employee_id || user?.email || user?.name;
                const uid = post.userId || post.user_id || post.user_email || post.user_name || post.user;
                const ts = post.createdAt || post.created_at;
                const authorIdMatch = authorId && uid && String(authorId).toLowerCase() === String(uid).toLowerCase();
                const nameMatch = user?.name && (post.userName || post.user || post.user_name) && (String(user.name).toLowerCase() === String(post.userName || post.user || post.user_name).toLowerCase());
                const isAuthor = authorIdMatch || nameMatch;
                
                const canManage = isAuthor;
                const isHr = String(user?.role || '').toLowerCase().includes('hr') ||
                             String(user?.designation || '').toLowerCase().includes('human resource') ||
                             String(user?.designation || '').toLowerCase().includes('hr') ||
                             String(user?.name || '').toLowerCase().includes('ravikumar');
                const isPm = String(user?.role || '').toLowerCase().includes('pm') ||
                             String(user?.designation || '').toLowerCase().includes('project manager') ||
                             String(user?.designation || '').toLowerCase().includes('pm');
                const isLead = user?.role === 'TEAMLEADER' || user?.role === 'ADMIN' || user?.role === 'MANAGER' || isHr || isPm;
                const isEditing = editingPostId === post.id;
                const pLiked = post.userHasLiked || false;
                const pBadged = post.userHasBadged || false;
                const likeCount = post.likeCount || 0;
                const badgeCount = post.badgeCount || 0;
                const commentCount = Math.max(post.commentCount || 0, (postComments[post.id] || []).length);

                const getActiveReactionChar = (activeEmoji, pLiked) => {
                  if (!activeEmoji) return pLiked ? '❤️' : null;
                  const nameToEmoji = {
                    'heart': '❤️', 'love': '❤️', 'like': '❤️', 'heart_count': '❤️', 'likes_count': '❤️', '❤️': '❤️',
                    'thumbsup': '👍', 'thumbsup_count': '👍', '👍': '👍',
                    'shocked': '😮', 'shocked_count': '😮', '😮': '😮',
                    'laugh': '😂', 'laugh_count': '😂', '😂': '😂',
                    'fire': '🔥', 'fire_count': '🔥', '🔥': '🔥',
                    'clap': '👏', 'clap_count': '👏', '👏': '👏',
                    'cake': '🎂', 'cake_count': '🎂', '🎂': '🎂'
                  };
                  return nameToEmoji[String(activeEmoji).toLowerCase()] || activeEmoji;
                };
                const activeReaction = getActiveReactionChar(post.activeEmoji, pLiked);

                return (
                    <div key={post.id} style={styles.threadCard}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#315A9E'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                        {post.tagline && <div style={styles.taglineBadge}>{post.tagline}</div>}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '15px', backgroundColor: '#0B1E3F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(11, 30, 63, 0.15)', position: 'relative' }}>
                                    {(() => {
                                        const lookupKey = String(uid || '').toLowerCase();
                                        const profile = userProfiles[lookupKey] || 
                                                        userProfiles[String(post.userName || post.user || '').toLowerCase()] ||
                                                        Object.values(userProfiles).find(p => String(p.name || '').toLowerCase() === String(post.userName || post.user || '').toLowerCase());
                                        const pic = profile?.profile_pic || profile?.profile_picture || profile?.profileImage || profile?.profilePicture || profile?.profile_image || profile?.avatar || profile?.photo || post.userImage;
                                        const empIdForPhoto = profile?.employee_id || profile?.id || profile?.empId || post.userId || post.user_id;
                                        const finalPicUrl = pic ? (pic.startsWith('http') ? pic : `${BASE_URL}${pic.startsWith('/') ? pic : '/' + pic}`) : (empIdForPhoto ? `${BASE_URL}/api/users/${empIdForPhoto}/photo` : null);
                                        return (
                                            <>
                                                {finalPicUrl && (
                                                    <img 
                                                        src={finalPicUrl} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                                                        alt="" 
                                                        onLoad={(e) => { if (e.target.nextSibling) e.target.nextSibling.style.display = 'none'; }}
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                )}
                                                <span>
                                                    {(profile?.name || post.userName || post.user || '?').charAt(0).toUpperCase()}
                                                </span>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ fontSize: '15px', fontWeight: '1000', color: '#0B1E3F', letterSpacing: '-0.3px' }}>{userProfiles[uid]?.name || post.userName || post.user || 'Collaborator'}</div>
                                    <div style={{ fontSize: '10px', color: '#315A9E', fontWeight: '900', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px' }}>{userProfiles[uid]?.role || post.role || 'Member'} • {formatTime(ts)}</div>
                                </div>
                            </div>

                            {canManage && (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button 
                                        onClick={() => {
                                            setEditingPostId(post.id);
                                            setEditContent(post.content);
                                            setEditMediaFile(null);
                                            setEditMediaPreview(null);
                                            setEditRemoveMedia(false);
                                        }} 
                                        style={{ border: 'none', background: '#f8fafc', color: '#315A9E', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Edit post"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => setDeleteConfirm({ show: true, postId: post.id, userId: post.userId || post.user_id || post.employee_id })}
                                        style={{ border: 'none', background: '#fef2f2', color: '#ef4444', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Delete post"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '14px', fontSize: '15px', color: '#0B1E3F', lineHeight: '1.6', fontWeight: '600', whiteSpace: 'pre-wrap' }}>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <textarea 
                                        style={{ ...styles.mainInput, minHeight: '80px', padding: '15px' }}
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                    />

                                    {(editMediaPreview && !editRemoveMedia) && (
                                        <div style={{ marginTop: '10px', position: 'relative', borderRadius: '15px', overflow: 'hidden', maxWidth: '300px' }}>
                                            <XCircle size={24} color="white" style={{ position: 'absolute', top: '10px', right: '10px', cursor: 'pointer', zIndex: 10 }} onClick={() => { setEditMediaFile(null); setEditMediaPreview(null); }} />
                                            {editMediaType === 'video' ? (<video src={editMediaPreview} controls style={{ width: '100%', display: 'block' }} />) : (<img src={editMediaPreview} alt="" style={{ width: '100%', display: 'block' }} />)}
                                        </div>
                                    )}

                                    {(!editMediaPreview && !editRemoveMedia) && (() => {
                                        const mediaPath = post.media_url || post.mediaUrl || post.media || post.image;
                                        if (!mediaPath || typeof mediaPath !== 'string') return null;
                                        const isVideo = post.media_type === 'video' || post.mediaType === 'video' || mediaPath.toLowerCase().includes('video') || mediaPath.endsWith('.mp4');
                                        let src = mediaPath.startsWith('data:') ? mediaPath : `${BASE_URL}${mediaPath}`;
                                        return (
                                            <div style={{ marginTop: '10px', borderRadius: '15px', overflow: 'hidden', maxWidth: '300px', opacity: 0.5 }}>
                                                {isVideo ? (<video src={src} controls style={{ width: '100%', display: 'block' }} />) : (<img src={src} style={{ width: '100%', display: 'block' }} alt="" />)}
                                            </div>
                                        );
                                    })()}

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            onClick={async () => {
                                                await updatePost(post.id, {
                                                    content: editContent,
                                                    file: editMediaFile,
                                                    mediaType: editMediaType,
                                                    removeMedia: editRemoveMedia || !!editMediaFile
                                                }, post.userId || post.user_id || post.employee_id);
                                                setEditingPostId(null);
                                                setEditMediaFile(null);
                                                setEditMediaPreview(null);
                                                setEditRemoveMedia(false);
                                            }}
                                            style={{ backgroundColor: '#315A9E', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
                                        >
                                            SAVE
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditingPostId(null);
                                                setEditMediaFile(null);
                                                setEditMediaPreview(null);
                                                setEditRemoveMedia(false);
                                            }}
                                            style={{ background: 'none', border: '1.5px solid #e2e8f0', color: '#64748b', padding: '8px 20px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                post.content
                            )}
                        </div>

                        {/* Support multiple field names and direct base64/relative URLs with type safety */}
                        {!isEditing && (() => {
                            const mediaPath = post.media_url || post.mediaUrl || post.media || post.image;
                            if (!mediaPath || typeof mediaPath !== 'string') return null;
                            const isVideo = post.media_type === 'video' || post.mediaType === 'video' || mediaPath.includes('video') || mediaPath.endsWith('.mp4');
                            const src = mediaPath.startsWith('data:') ? mediaPath : `${BASE_URL}${mediaPath}`;
                            return (
                                <div style={{ ...styles.postMedia, cursor: 'pointer' }} onClick={() => setFullscreenMedia({ src, type: isVideo ? 'video' : 'image' })}>
                                    {isVideo ? ( <video src={src} style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain', display: 'block' }} /> ) : ( <img src={src} style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain', display: 'block' }} /> )}
                                    <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '20px', color: 'white', fontSize: '11px', fontWeight: 'bold' }}>
                                        {isVideo ? '▶ Video' : '⛶ Fullscreen'}
                                    </div>
                                </div>
                            );
                        })()}



                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                            {post.reactions && Object.entries(post.reactions).map(([emoji, count]) => {
                                // Only render actual emoji reactions — skip metadata keys like 'like', 'badge', 'total', 'count'
                                if (!EMOJI_LIST.includes(emoji)) return null;
                                if (!count || count <= 0) return null;
                                const hasReacted = activeReaction === emoji;
                                return (
                                    <div 
                                        key={emoji} 
                                        style={{ ...styles.reactionBadge, backgroundColor: hasReacted ? '#f0f9ff' : 'white', borderColor: hasReacted ? '#315A9E' : '#f1f5f9' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openReactorsModal(post, emoji);
                                        }}
                                    >
                                        <span>{emoji}</span>
                                        <span style={{ color: hasReacted ? '#315A9E' : '#64748b' }}>{count}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={styles.footer}>
                            <div 
                                onClick={() => onToggleLike(post.id)} 
                                onMouseEnter={() => setActiveEmojiPicker(post.id)}
                                onMouseLeave={() => setActiveEmojiPicker(null)}
                                style={{
                                    ...styles.action(!!activeReaction, '#ef4444'),
                                    padding: '12px 25px',
                                    borderRadius: '15px',
                                    boxShadow: activeReaction ? '0 5px 15px rgba(239, 68, 68, 0.3)' : 'none',
                                    minWidth: '120px',
                                    justifyContent: 'center'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {activeReaction ? (
                                        <span style={{ fontSize: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {activeReaction}
                                        </span>
                                    ) : (
                                        <Heart size={20} fill="none" stroke="#ef4444" strokeWidth={2.5} />
                                    )}
                                    <span style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '14px' }}>
                                        {activeReaction ? 'REACTED' : 'LIKE'} 
                                    </span>
                                </div>

                                <AnimatePresence>
                                    {activeEmojiPicker === post.id && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.8 }} 
                                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                                            exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                            style={styles.emojiPicker}
                                        >
                                            {EMOJI_LIST.map(emoji => (
                                                <div 
                                                    key={emoji} 
                                                    style={{ fontSize: '24px', cursor: 'pointer', transition: 'transform 0.1s' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onReact(post.id, emoji, e);
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.3)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    {emoji}
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div onClick={() => handleOpenComments(post.id)} style={styles.action(activeCommentPost === post.id, '#315A9E')}>
                                <MessageSquare size={18} strokeWidth={2.5} /> 
                                {activeCommentPost === post.id ? 'CLOSE' : 'COMMENT'} ({commentCount})
                            </div>
                            <div onClick={() => onToggleBadge(post.id)} style={styles.action(pBadged, '#FDB913')}>
                                <Award size={18} fill={pBadged ? "white" : "none"} stroke={pBadged ? "white" : "#FDB913"} strokeWidth={2.5} /> 
                                {pBadged ? 'BADGED' : 'BADGE'} ({badgeCount})
                            </div>

                        </div>

                        {activeCommentPost === post.id && (
                            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '25px' }}>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                    <input 
                                        style={{ flex: 1, padding: '12px 18px', borderRadius: '12px', border: '1.5px solid #eef2f6', fontSize: '14px', outline: 'none' }} 
                                        placeholder="Add a comment..." 
                                        value={commentText} 
                                        onChange={e => setCommentText(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)} 
                                    />
                                    <button 
                                        style={{ padding: '0 20px', background: '#315A9E', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }} 
                                        onClick={() => handleAddComment(post.id)}
                                    >
                                        Post
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                    {loadingComments[post.id] ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }}>
                                            <div className="pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#315A9E' }} />
                                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Fetching conversations...</div>
                                        </div>
                                    ) : (postComments[post.id] || []).length > 0 ? (
                                        <>
                                            <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '-5px' }}>Conversation Thread</div>
                                            {(postComments[post.id] || []).map(c => {
                                                const cUid = c.userId || c.user_id || c.employee_id || c.EmpID;
                                                const profile = userProfiles[cUid] || Object.values(userProfiles).find(p => p.name === (c.userName || c.user_name || c.name));
                                                const cUser = profile?.name || c.userName || c.user_name || c.name || 'User';
                                                const cText = c.content || c.comment_text || c.text_content || c.text || c.comment || c.message || '...';
                                                const isMyComment = (user?.id && cUid && String(user.id) === String(cUid)) || (user?.employee_id && cUid && String(user.employee_id) === String(cUid)) || (user?.name === cUser);
                                                
                                                return (
                                                    <div key={c.id} style={{ display: 'flex', gap: '12px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#315A9E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '1000', flexShrink: 0, boxShadow: '0 4px 10px rgba(49, 90, 158, 0.2)', overflow: 'hidden', position: 'relative' }}>
                                                            {(() => {
                                                                const pic = profile?.profile_pic || profile?.profile_picture || profile?.profileImage || profile?.profilePicture || profile?.profile_image || profile?.avatar || profile?.photo;
                                                                const empIdForPhoto = profile?.employee_id || profile?.id || profile?.empId || cUid;
                                                                const finalPicUrl = pic ? (pic.startsWith('http') ? pic : `${BASE_URL}${pic.startsWith('/') ? pic : '/' + pic}`) : (empIdForPhoto ? `${BASE_URL}/api/users/${empIdForPhoto}/photo` : null);
                                                                return (
                                                                    <>
                                                                        {finalPicUrl && (
                                                                            <img 
                                                                                src={finalPicUrl} 
                                                                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                                                                                alt="" 
                                                                                onLoad={(e) => { if (e.target.nextSibling) e.target.nextSibling.style.display = 'none'; }}
                                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                                            />
                                                                        )}
                                                                        <span>
                                                                            {cUser.charAt(0).toUpperCase()}
                                                                        </span>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div style={{ flex: 1, padding: '15px', background: 'white', borderRadius: '20px', border: '3px solid #cbd5e1', position: 'relative' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '12px', fontWeight: '1000', color: '#0B1E3F' }}>{cUser}</span>
                                                                {editingCommentId !== c.id && (isMyComment || isLead) && (
                                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                                        <button
                                                                            onClick={() => { setEditingCommentId(c.id); setEditCommentContent(cText); }}
                                                                            title="Edit comment"
                                                                            style={{ border: 'none', background: '#f8fafc', color: '#315A9E', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                        >
                                                                            <Edit3 size={13} />
                                                                        </button>
                                                                        <button
                                                                            onClick={async () => {
                                                                                const success = await deleteComment(post.id, c.id, c.userId || c.user_id || c.employee_id || c.EmpID);
                                                                                if (success) {
                                                                                    const updated = await fetchComments(post.id);
                                                                                    setPostComments(prev => ({ ...prev, [post.id]: updated }));
                                                                                }
                                                                            }}
                                                                            title="Delete comment"
                                                                            style={{ border: 'none', background: '#fef2f2', color: '#ef4444', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {editingCommentId === c.id ? (
                                                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    <textarea 
                                                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #315A9E', fontSize: '13px', outline: 'none', minHeight: '60px', background: '#f8fafc' }}
                                                                        value={editCommentContent}
                                                                        onChange={e => setEditCommentContent(e.target.value)}
                                                                        autoFocus
                                                                    />
                                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                                        <button onClick={async () => {
                                                                            const success = await updateComment(post.id, c.id, editCommentContent, c.userId || c.user_id || c.employee_id || c.EmpID);
                                                                            if (success) {
                                                                                const updated = await fetchComments(post.id);
                                                                                setPostComments(prev => ({ ...prev, [post.id]: updated }));
                                                                                setEditingCommentId(null);
                                                                            }
                                                                        }} style={{ fontSize: '11px', fontWeight: '900', color: 'white', background: '#315A9E', border: 'none', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer' }}>UPDATE</button>
                                                                        <button onClick={() => setEditingCommentId(null)} style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', background: 'none', border: '1.5px solid #e2e8f0', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer' }}>CANCEL</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '13px', color: '#475569', fontWeight: '600', lineHeight: '1.5' }}>{cText}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8', fontSize: '12px', fontWeight: '800', border: '1.5px dashed #eef2f6', borderRadius: '20px' }}>
                                            No comments yet. Start the conversation!
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            <AnimatePresence>
                {flyingEmoji && (
                    <motion.div initial={{ left: flyingEmoji.x, top: flyingEmoji.y, opacity: 0 }} animate={{ y: [0, -100, -200], x: [0, 50, -50], opacity: [0, 1, 0], scale: [1, 2, 1] }} transition={{ duration: 2 }} style={{ position: 'fixed', fontSize: '50px', zIndex: 999 }}>{flyingEmoji.emoji}</motion.div>
                )}

                {fullscreenMedia && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        style={styles.modalOverlay}
                        onClick={() => setFullscreenMedia(null)}
                    >
                        <div style={{ position: 'absolute', top: '25px', right: '30px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%', color: 'white', display: 'flex', zIndex: 3000 }} onClick={() => setFullscreenMedia(null)}>
                            <X size={24} />
                        </div>
                        {fullscreenMedia.type === 'video' ? (
                            <video src={fullscreenMedia.src} controls autoPlay style={{ maxWidth: '95vw', maxHeight: '90vh', outline: 'none', borderRadius: '10px' }} onClick={e => e.stopPropagation()} />
                        ) : (
                            <img src={fullscreenMedia.src} style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
                        )}
                    </motion.div>
                )}

                {reactorModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        style={styles.modalOverlay}
                        onClick={() => setReactorModal(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} 
                            animate={{ scale: 1, y: 0 }} 
                            exit={{ scale: 0.9, y: 20 }}
                            style={styles.modalContent} 
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ fontSize: '18px', fontWeight: '1000', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '24px' }}>{reactorModal.emoji}</span>
                                    <span style={{ background: '#f0f9ff', color: '#315A9E', borderRadius: '8px', padding: '2px 10px', fontSize: '14px' }}>
                                        {reactorModal.users.length > 0 ? reactorModal.users.length : reactorModal.count}
                                    </span>
                                </div>
                                <X size={24} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => setReactorModal(null)} />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                                {loadingReactors ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {[1, 2, 3].map(i => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '15px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e2e8f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                                <div style={{ height: '14px', width: '120px', backgroundColor: '#e2e8f0', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                            </div>
                                        ))}
                                    </div>
                                ) : reactorModal.users && reactorModal.users.length > 0 ? reactorModal.users.map((reactor, idx) => {
                                    const name = typeof reactor === 'string' ? reactor
                                        : (reactor?.name || reactor?.userName || reactor?.user_name
                                            || reactor?.username || reactor?.fullName || reactor?.full_name
                                            || reactor?.displayName || reactor?.display_name
                                            || reactor?.emp_name || reactor?.employee_name || 'Unknown');
                                    const role = typeof reactor === 'object'
                                        ? (reactor?.role || reactor?.designation || reactor?.userRole || '') : '';
                                    return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '15px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#315A9E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '13px', flexShrink: 0 }}>
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0B1E3F' }}>{name}</div>
                                                {role && <div style={{ fontSize: '11px', color: '#315A9E', fontWeight: '700', textTransform: 'uppercase' }}>{role}</div>}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8', fontSize: '13px' }}>
                                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{reactorModal.emoji}</div>
                                        <div style={{ fontWeight: '700', color: '#64748b' }}>{reactorModal.count} {reactorModal.count === 1 ? 'person' : 'people'} reacted</div>
                                        <div style={{ marginTop: '4px', fontSize: '12px' }}>Detailed list not available from server</div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {replaceConfirmPost && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ background: 'white', borderRadius: '24px', padding: '36px 32px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1.5px solid #cbd5e1' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <ImageIcon size={24} color="#ef4444" />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F', margin: '0 0 8px 0', fontFamily: "'Outfit', sans-serif" }}>Replace Media</h3>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px 0', lineHeight: '1.5', fontWeight: '700', fontFamily: "'Outfit', sans-serif" }}>
                                First remove the uploaded image then upload new image.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    onClick={() => setReplaceConfirmPost(null)} 
                                    style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setReplaceConfirmPost(null);
                                        setEditRemoveMedia(true);
                                        setEditMediaFile(null);
                                        setEditMediaPreview(null);
                                        setTimeout(() => {
                                            editFileInputRef.current?.click();
                                        }, 100);
                                    }}
                                    style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#315A9E', color: 'white', fontSize: '14px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(49, 90, 158, 0.3)', fontFamily: "'Outfit', sans-serif" }}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
