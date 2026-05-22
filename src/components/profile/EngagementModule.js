import React, { useState, useEffect, useRef } from 'react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useThread } from '../../context/ThreadContext';
import { useAuth } from '../../context/AuthContext';
import {
    Heart, MessageSquare, Smile,
    Send, MoreHorizontal, User, Share2, Cake, Gift, Plus, ArrowLeft,
    Trash2, Edit3, X, Check, Image as ImageIcon, Film, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_ENDPOINTS, BASE_URL } from '../../config';

const EMOJI_LIST = ['❤️', '👍', '😮', '😂', '🔥', '👏', '🎂'];

export default function EngagementModule() {
    const navigate = useNavigate();
    const { threads, loading, addPost, deletePost, updatePost, deleteComment, updateComment, toggleReaction, toggleBadge, addComment, fetchComments } = useThread();
    const { user } = useAuth();
    
    const [fullscreenMedia, setFullscreenMedia] = useState(null);
    const [tagline, setTagline] = useState('');
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

    useEffect(() => {
        fetchProfiles();
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // AUTO-FETCH COMMENT COUNTS ON LOAD
    useEffect(() => {
        const fetchAllCommentCounts = async () => {
            if (threads && threads.length > 0) {
                for (const post of threads) {
                    // Check if we already have comments for this post to avoid redundant API calls
                    if (postComments[post.id] === undefined) {
                        try {
                            const comments = await fetchComments(post.id);
                            setPostComments(prev => ({ ...prev, [post.id]: Array.isArray(comments) ? comments : [] }));
                        } catch (err) {
                            console.error("Error auto-fetching comments for count:", err);
                        }
                    }
                }
            }
        };
        fetchAllCommentCounts();
    }, [threads, fetchComments]);

    const fetchProfiles = async () => {
        try {
            const resp = await fetch(API_ENDPOINTS.USERS || `${BASE_URL}/api/users`);
            if (resp.ok) {
                const data = await resp.json();
                const userList = Array.isArray(data) ? data : (data.value || []);
                const map = {};
                userList.forEach(u => {
                    const uid = String(u.id || u.empId || u.userId || u.employee_id);
                    if (uid) map[uid] = u;
                });
                setUserProfiles(map);
            }
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
            const payload = {
                content: newPost,
                tagline: tagline,
                user: user?.name || 'User',
                user_name: user?.name || 'User',
                role: user?.role?.toUpperCase() || 'EMPLOYEE',
                userId: user?.id || user?.employee_id || user?.EmpID || 0,
                user_id: user?.id || user?.employee_id || user?.EmpID || 0,
                file: mediaFile,
                mediaType: mediaType
            };

            const success = await addPost(payload);
            if (success) {
                setNewPost('');
                setTagline('');
                clearMedia();
                // Optional success notification
            } else {
                alert("Failed to Publish: The server rejected the request. Please ensure your backend team has updated the API to handle the social fields correctly.");
            }
        } catch (err) {
            console.error("Post Error:", err);
            alert("Error: Server is unreachable. Please check your backend PC.");
        } finally {
            setUploading(false);
        }
    };

    const onToggleLike = (id) => toggleReaction(id, user?.employee_id || user?.id || user?.EmpID, '❤️');

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
        toggleReaction(id, user?.employee_id || user?.id || user?.EmpID, emoji);
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

    const getFullUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('http') || url.startsWith('data:')) return url;
      return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const styles = {
        container: { minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '20px', padding: winWidth < 768 ? '85px 16px 120px' : '100px 26px 150px', marginTop: 0, width: '100%', maxWidth: '100%', margin: '0', boxSizing: 'border-box' },
        card: { backgroundColor: 'white', borderRadius: '40px', padding: winWidth < 768 ? '20px' : '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', border: '1px solid #eef2f6' },
        tagInput: { width: '100%', padding: '12px 20px', borderRadius: '15px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontSize: '14px', fontWeight: '900', color: '#315A9E', outline: 'none', marginBottom: '12px' },
        mainInput: { width: '100%', padding: '20px', borderRadius: '20px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontSize: '16px', fontWeight: '600', color: '#0B1E3F', outline: 'none', resize: 'none', minHeight: '100px' },
        mediaBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '30px', border: '1.5px solid #eef2f6', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '800', color: '#64748b', transition: 'all 0.2s' },
        postBtn: { padding: '12px 30px', backgroundColor: '#315A9E', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase' },
        threadCard: { backgroundColor: 'white', borderRadius: '40px', padding: winWidth < 768 ? '20px' : '30px', border: '1px solid #f1f5f9', position: 'relative', boxShadow: '0 5px 20px rgba(0,0,0,0.02)' },
        taglineBadge: { display: 'inline-block', padding: '5px 12px', borderRadius: '8px', background: '#f0f9ff', color: '#315A9E', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '15px', border: '1px solid #e0f2fe' },
        
        postMedia: { 
            marginTop: '15px', 
            borderRadius: '16px', 
            overflow: 'hidden', 
            border: '1px solid #eef2f6', 
            backgroundColor: '#f8fafc', 
            width: '100%',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center'
        },
        imageStyle: {
            width: '100%',
            height: 'auto',
            maxHeight: '500px',
            display: 'block',
            objectFit: 'contain', 
            cursor: 'pointer'
        },
        
        footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '18px', marginTop: '20px', flexWrap: 'wrap', gap: '15px' },
        action: (active, color) => ({ display: 'flex', alignItems: 'center', gap: '8px', color: active ? 'white' : color, fontSize: '13px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }),
        commentBadge: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#315A9E', fontSize: '12px', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase' }
    };

    return (
        <div className="pm-dashboard-container">
            <AppHeader />
            
            <main style={styles.container}>
                {/* BACK BUTTON */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-start', 
                    width: '100%',
                    position: 'sticky', 
                    top: winWidth < 768 ? '70px' : '85px', 
                    zIndex: 1000, 
                    backgroundColor: '#f8fafc', 
                    paddingTop: '10px',
                    marginTop: '-10px',
                    paddingBottom: '5px' 
                }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'white',
                            padding: '10px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            marginBottom: '20px'
                        }}
                    >
                        <ArrowLeft size={18} color="#64748b" />
                    </button>
                </div>

                {/* CREATE THREAD */}
                <div style={{ ...styles.card, borderTop: '5px solid #FDB913' }}>
                    <input style={styles.tagInput} placeholder="Add a tagline..." value={tagline} onChange={e => setTagline(e.target.value)} />
                    <textarea style={styles.mainInput} placeholder="Share an update with the team..." value={newPost} onChange={e => setNewPost(e.target.value)} />

                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*,video/*" />
                    
                    <div style={{ display: 'flex', gap: '15px', marginTop: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={styles.mediaBtn} onClick={() => fileInputRef.current?.click()}><ImageIcon size={18} color="#10b981" /> Photo</div>
                        <div style={styles.mediaBtn} onClick={() => fileInputRef.current?.click()}><Film size={18} color="#ef4444" /> Video</div>
                        <div style={{ flex: 1 }} />
                        <button style={styles.postBtn} onClick={handlePost} disabled={uploading}>
                            {uploading ? 'Publishing...' : 'Publish Thread'}
                        </button>
                    </div>

                    {mediaPreview && (
                        <div style={{ ...styles.postMedia, marginTop: '20px' }}>
                            <XCircle size={24} color="white" style={{ position: 'absolute', top: '10px', right: '10px', cursor: 'pointer', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} onClick={clearMedia} />
                            {mediaType === 'video' ? ( <video src={mediaPreview} controls style={styles.imageStyle} /> ) : ( <img src={mediaPreview} alt="Preview" style={styles.imageStyle} /> )}
                        </div>
                    )}
                </div>

                {loading && threads.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Refreshing social feed...</div>
                )}

                {/* THREAD FEED */}
                {threads.map(post => {
                    const authorId = user?.email || user?.name;
                    const uid = post.user_email || post.user_id || post.userId;
                    const isAuthor = String(uid) === String(authorId) || post.user_name === user?.name;
                    const pLiked = post.userLiked || false;
                    const ts = post.createdAt || post.created_at;
                    const isEditing = editingPostId === post.id;

                    return (
                        <div key={post.id} style={styles.threadCard}>
                            {post.tagline && <div style={styles.taglineBadge}>{post.tagline}</div>}
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '15px', backgroundColor: '#f1f5f9', border: '1px solid #315A9E', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: '18px', fontWeight: '900', color: '#315A9E' }}>
                                        {userProfiles[uid]?.profile_pic || userProfiles[uid]?.profile_picture ? (
                                            <img 
                                                src={getFullUrl(userProfiles[uid]?.profile_pic || userProfiles[uid]?.profile_picture)} 
                                                alt="User" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            />
                                        ) : (
                                            userProfiles[uid]?.name?.charAt(0) || post.user_name?.charAt(0) || 'U'
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#0B1E3F' }}>{userProfiles[uid]?.name || post.user_name || 'Member'}</div>
                                        <div style={{ fontSize: '11px', color: '#315A9E', fontWeight: '800', textTransform: 'uppercase' }}>{userProfiles[uid]?.role || post.user_role || 'Member'} • {formatTime(ts)}</div>
                                    </div>
                                </div>

                                {isAuthor && (
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button 
                                            className="btn-ghost"
                                            onClick={() => {
                                                setEditingPostId(post.id);
                                                setEditContent(post.content);
                                            }} 
                                            style={{ color: '#315A9E' }}
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button 
                                            className="btn-ghost"
                                            onClick={() => deletePost(post.id)} 
                                            style={{ color: '#ef4444' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '20px', fontSize: '16px', color: '#0B1E3F', lineHeight: '1.6', fontWeight: '600', whiteSpace: 'pre-wrap' }}>
                                {isEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <textarea 
                                            style={{ ...styles.mainInput, minHeight: '80px', padding: '15px' }}
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                        />
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                onClick={async () => {
                                                    await updatePost(post.id, editContent);
                                                    setEditingPostId(null);
                                                }}
                                                style={{ backgroundColor: '#315A9E', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
                                            >
                                                SAVE
                                            </button>
                                            <button 
                                                onClick={() => setEditingPostId(null)}
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

                            {post.media_url && (
                                <div style={styles.postMedia} onClick={() => {
                                    const isVid = post.media_url.match(/\.(mp4|webm|ogg)$/i) || post.media_url.includes('video');
                                    setFullscreenMedia({ src: getFullUrl(post.media_url), type: isVid ? 'video' : 'image' });
                                }}>
                                    {post.media_url.match(/\.(mp4|webm|ogg)$/i) || post.media_url.includes('video') ? ( 
                                      <video src={getFullUrl(post.media_url)} style={styles.imageStyle} /> 
                                    ) : ( 
                                      <img src={getFullUrl(post.media_url)} alt="Thread media" style={styles.imageStyle} /> 
                                    )}
                                    <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '20px', color: 'white', fontSize: '11px', fontWeight: 'bold' }}>
                                        {post.media_url.match(/\.(mp4|webm|ogg)$/i) || post.media_url.includes('video') ? '▶ Video' : '⛶ Fullscreen'}
                                    </div>
                                </div>
                            )}

                            {/* REACTION BADGES */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px' }}>
                                {post.reactions && Object.entries(post.reactions).map(([emoji, count]) => {
                                    if (count <= 0) return null;
                                    return (
                                        <div key={emoji} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px', 
                                            backgroundColor: 'white', 
                                            padding: '6px 14px', 
                                            borderRadius: '20px',
                                            border: '1.5px solid #f1f5f9',
                                            fontSize: '13px',
                                            fontWeight: '800',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                        }}>
                                            <span>{emoji}</span>
                                            <span style={{ color: '#315A9E' }}>{count}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={styles.footer}>
                                <div 
                                    style={{ position: 'relative' }}
                                    onMouseEnter={() => setActiveEmojiPicker(post.id)}
                                    onMouseLeave={() => setActiveEmojiPicker(null)}
                                >
                                    <div 
                                        style={{
                                            ...styles.action(pLiked, '#64748b'),
                                            backgroundColor: pLiked ? '#ef4444' : 'transparent',
                                            color: pLiked ? 'white' : '#64748b',
                                            border: pLiked ? 'none' : '1.5px solid #eef2f6',
                                            padding: '12px 25px',
                                            borderRadius: '15px',
                                            boxShadow: pLiked ? '0 5px 15px rgba(239, 68, 68, 0.3)' : 'none',
                                            minWidth: '120px',
                                            justifyContent: 'center'
                                        }} 
                                        onClick={() => onToggleLike(post.id)}
                                    >
                                        <Heart size={20} fill={pLiked ? "white" : "none"} stroke={pLiked ? "white" : "currentColor"} /> 
                                        <span style={{ textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.5px' }}>{pLiked ? 'LIKED' : 'Like'} ({post.likes || 0})</span>
                                    </div>

                                    <AnimatePresence>
                                        {activeEmojiPicker === post.id && (
                                            <motion.div 
                                                initial={{ y: 20, opacity: 0, scale: 0.8 }} 
                                                animate={{ y: 0, opacity: 1, scale: 1 }} 
                                                exit={{ y: 10, opacity: 0, scale: 0.8 }} 
                                                style={{ 
                                                    position: 'absolute', 
                                                    bottom: '50px', 
                                                    left: '0', 
                                                    background: 'white', 
                                                    padding: '8px 12px', 
                                                    borderRadius: '20px', 
                                                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)', 
                                                    display: 'flex', 
                                                    gap: '12px', 
                                                    zIndex: 100,
                                                    border: '1px solid #f1f5f9' 
                                                }}
                                            >
                                                {EMOJI_LIST.map(e => (
                                                    <span 
                                                        key={e} 
                                                        style={{ cursor: 'pointer', fontSize: '24px', transition: 'transform 0.2s' }} 
                                                        className="emoji-hover"
                                                        onClick={(ev) => { ev.stopPropagation(); onReact(post.id, e, ev); }}
                                                    >
                                                        {e}
                                                    </span>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div 
                                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px' }}
                                >
                                    <div style={styles.commentBadge} onClick={() => handleOpenComments(post.id)}>
                                        <MessageSquare size={16} /> 
                                        <span>COMMENT ({Math.max(post.commentCount || post.comment_count || 0, (postComments[post.id] || []).length)})</span>
                                    </div>

                                    <Smile 
                                        size={20} 
                                        color="#64748b" 
                                        style={{ cursor: 'pointer' }} 
                                        onClick={() => setActiveEmojiPicker(activeEmojiPicker === post.id ? null : post.id)}
                                    />
                                </div>
                            </div>

                            {activeCommentPost === post.id && (
                                <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '25px' }}>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                        <input style={{ flex: 1, padding: '12px 18px', borderRadius: '12px', border: '1.5px solid #eef2f6', fontSize: '14px', outline: 'none' }} placeholder="Add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)} />
                                        <button style={{ padding: '0 20px', background: '#315A9E', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }} onClick={() => handleAddComment(post.id)}>Post</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {loadingComments[post.id] ? (
                                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Loading comments...</div>
                                        ) : (postComments[post.id] || []).map(c => {
                                            const cUid = c.userId || c.user_id || c.employee_id || c.EmpID;
                                            const profile = userProfiles[cUid] || Object.values(userProfiles).find(p => p.name === (c.userName || c.user_name || c.name));
                                            const cUser = profile?.name || c.userName || c.user_name || c.name || 'User';
                                            const cText = c.content || c.comment_text || c.text_content || c.text || c.comment || c.message || '...';
                                            
                                            return (
                                                <div key={c.id} style={{ display: 'flex', gap: '12px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900', color: '#315A9E', overflow: 'hidden', flexShrink: 0 }}>
                                                        {(() => {
                                                            const pic = profile?.profileImage || profile?.profilePicture || profile?.profile_image || profile?.profile_picture || profile?.avatar;
                                                            if (pic) {
                                                                return <img src={getFullUrl(pic)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />;
                                                            }
                                                            return cUser.charAt(0).toUpperCase();
                                                        })()}
                                                    </div>
                                                    <div style={{ flex: 1, padding: '12px', background: 'white', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: '900', color: '#315A9E' }}>{cUser}</div>
                                                            {editingCommentId !== c.id && (
                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                    <button
                                                                        onClick={() => { setEditingCommentId(c.id); setEditCommentContent(cText); }}
                                                                        title="Edit comment"
                                                                        style={{ border: 'none', background: '#f0f7ff', color: '#315A9E', padding: '5px 8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                    >
                                                                        <Edit3 size={13} />
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => { await deleteComment(post.id, c.id); const updated = await fetchComments(post.id); setPostComments(prev => ({ ...prev, [post.id]: updated })); }}
                                                                        title="Delete comment"
                                                                        style={{ border: 'none', background: '#fef2f2', color: '#ef4444', padding: '5px 8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {editingCommentId === c.id ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                                                                <textarea
                                                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #315A9E', fontSize: '13px', outline: 'none', minHeight: '60px', background: '#f8fafc', boxSizing: 'border-box' }}
                                                                    value={editCommentContent}
                                                                    onChange={e => setEditCommentContent(e.target.value)}
                                                                    autoFocus
                                                                />
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <button onClick={() => { updateComment(post.id, c.id, editCommentContent); setEditingCommentId(null); }} style={{ fontSize: '11px', fontWeight: '900', color: 'white', background: '#315A9E', border: 'none', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer' }}>UPDATE</button>
                                                                    <button onClick={() => setEditingCommentId(null)} style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', background: 'none', border: '1.5px solid #e2e8f0', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer' }}>CANCEL</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontSize: '13px', color: '#0B1E3F', fontWeight: '600' }}>{cText}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </main>

            <AnimatePresence>
                {flyingEmoji && (
                    <motion.div initial={{ left: flyingEmoji.x, top: flyingEmoji.y, opacity: 0 }} animate={{ y: [0, -100, -200], x: [0, 50, -50], opacity: [0, 1, 0], scale: [1, 2, 1] }} transition={{ duration: 2 }} style={{ position: 'fixed', fontSize: '50px', zIndex: 9999 }}>{flyingEmoji.emoji}</motion.div>
                )}
            </AnimatePresence>

            {/* FULLSCREEN LIGHTBOX MODAL */}
            <AnimatePresence>
                {fullscreenMedia && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setFullscreenMedia(null)}
                    >
                        <div style={{ position: 'absolute', top: '25px', right: '30px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%', color: 'white', display: 'flex' }} onClick={() => setFullscreenMedia(null)}>
                            <X size={24} />
                        </div>
                        {fullscreenMedia.type === 'video' ? (
                            <video src={fullscreenMedia.src} controls autoPlay style={{ maxWidth: '95vw', maxHeight: '90vh', outline: 'none', borderRadius: '10px' }} onClick={e => e.stopPropagation()} />
                        ) : (
                            <img src={fullscreenMedia.src} style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AppFooter />
        </div>
    );
}
