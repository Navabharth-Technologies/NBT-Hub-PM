import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_ENDPOINTS, BASE_URL } from '../config';
import { useAuth } from './AuthContext';

const ThreadContext = createContext();

export const ThreadProvider = ({ children }) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastEventSum, setLastEventSum] = useState(0);
  const [pendingActions, setPendingActions] = useState({});
  const pendingActionsRef = React.useRef(pendingActions);
  pendingActionsRef.current = pendingActions;

  useEffect(() => {
    if (user) {
      fetchThreads(user.id);
      const interval = setInterval(() => fetchThreads(user.id, true), 4000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchThreads = async (isPolling = false) => {
    if (!user?.token) return;
    try {
      if (!isPolling) setLoading(true);
      const res = await fetch(API_ENDPOINTS.THREADS, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rawThreads = Array.isArray(data) ? data : (data.value || []);

        let activeReactions = {};
        try {
          activeReactions = JSON.parse(localStorage.getItem('nbt_active_reactions') || '{}');
        } catch { }

        const normalized = rawThreads.map(t => {
          const tid = t.id || t._id;
          const pending = pendingActionsRef.current[tid] || {};

          // Use the secure user_reactions object from backend (Authorization token based)
          const reactions = t.user_reactions || {};
          const reactors = t.reactors || t.likes_list || t.reaction_list || [];

          // CRITICAL: Match current user against both token-based reactions and raw reactor lists
          const currentUid = String(user?.employee_id || user?.id || '');
          const userLikedByList = Array.isArray(reactors) && reactors.some(r => {
            const rid = String(r.user_id || r.userId || r.id || r.employee_id || r.EmpID || '');
            return rid && rid === currentUid;
          });

          const localActiveEmoji = activeReactions[tid];
          const backendLikedVal = Object.values(reactions).some(v => v === true) || userLikedByList;
          const backendActiveEmojiVal = Object.keys(reactions).find(k => reactions[k] === true) || (userLikedByList ? 'like' : null);

          const hasLocalReact = localActiveEmoji !== undefined;
          const userLikedVal = hasLocalReact ? (localActiveEmoji !== null) : backendLikedVal;
          const activeEmojiVal = hasLocalReact ? localActiveEmoji : backendActiveEmojiVal;

          const userBadgeVal = !!(t.user_has_badged || t.userHasBadged || false);
          const badgeTypeVal = t.badge_type || t.badgeType || null;
          const badgeCountVal = Number(t.badge_count || t.badgeCount || 0);

          const displayReactions = {
            '❤️': Number(t.heart_count || 0) + Number(t.likes_count || 0),
            '👍': Number(t.thumbsup_count || 0),
            '😮': Number(t.shocked_count || 0),
            '😂': Number(t.laugh_count || 0),
            '🔥': Number(t.fire_count || 0),
            '👏': Number(t.clap_count || 0),
            '🎂': Number(t.cake_count || 0)
          };

          const totalLikes = displayReactions['❤️'];

          return {
            ...t,
            id: tid,
            tagline: t.tagline || t.tagLine || t.tag_line || null,
            likes: pending.likes !== undefined ? pending.likes : totalLikes,
            likeCount: pending.likes !== undefined ? pending.likes : totalLikes,
            userLiked: pending.userLiked !== undefined ? pending.userLiked : userLikedVal,
            userHasLiked: pending.userLiked !== undefined ? pending.userLiked : userLikedVal,
            activeEmoji: pending.activeEmoji !== undefined ? pending.activeEmoji : activeEmojiVal,
            badgeCount: pending.badgeCount !== undefined ? pending.badgeCount : badgeCountVal,
            userHasBadged: pending.userHasBadged !== undefined ? pending.userHasBadged : userBadgeVal,
            badge_type: pending.badgeType !== undefined ? pending.badgeType : badgeTypeVal,
            reactions: displayReactions
          };
        });

        // Priority Sorting: Ensure new threads show at the top (1st)
        const sorted = normalized.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at);
          const dateB = new Date(b.createdAt || b.created_at);
          return dateB - dateA;
        });

        // Standardized Notification Tracking
        const currentSum = sorted.length + sorted.reduce((sum, t) => {
          return sum + (t.likeCount || 0) + (t.badgeCount || 0) + (t.commentCount || 0);
        }, 0);

        setThreads(sorted);
        setLastEventSum(currentSum);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const clearNotifications = () => setUnreadCount(0);

  const addPost = async (postData) => {
    try {
      let body;
      const headers = {
        'Authorization': `Bearer ${user.token}`
      };

      if (postData instanceof FormData) {
        body = postData;
        const taglineVal = postData.get('tagline');
        if (taglineVal) {
          if (!postData.has('tagLine')) postData.append('tagLine', taglineVal);
          if (!postData.has('tag_line')) postData.append('tag_line', taglineVal);
        }
        // Do NOT set Content-Type for FormData; browser does it automatically with boundary
      } else {
        headers['Content-Type'] = 'application/json';
        let mediaData = null;
        if (postData.file) {
          mediaData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(postData.file);
          });
        }
        body = JSON.stringify({
          userId: user?.employee_id || user?.id,
          user_id: user?.employee_id || user?.id,
          employee_id: user?.employee_id || user?.id,
          EmpID: user?.employee_id || user?.id,
          userName: user?.name,
          tagline: postData.tagline || '',
          tagLine: postData.tagline || '',
          tag_line: postData.tagline || '',
          content: postData.content || '',
          media: mediaData,
          mediaType: postData.mediaType
        });
      }

      const res = await fetch(API_ENDPOINTS.THREADS, {
        method: 'POST',
        headers: headers,
        body: body
      });

      if (res.ok) {
        await fetchThreads(undefined, true);
        return true;
      } else {
        const err = await res.text();
        console.error("API Error (Post):", err);
        return false;
      }
    } catch (err) {
      console.error("AddPost Error:", err);
      return false;
    }
  };

  const toggleReaction = async (threadId, userId, emoji = '❤️') => {
    if (!user?.token) return;

    const emojiToNormalized = {
      '❤️': 'heart', 'heart': 'heart', 'love': 'heart', 'like': 'heart',
      '👍': 'thumbsup', 'thumbsup': 'thumbsup', 'thumb': 'thumbsup',
      '😮': 'shocked', 'shocked': 'shocked', 'wow': 'shocked',
      '😂': 'laugh', 'laugh': 'laugh', 'haha': 'laugh',
      '🔥': 'fire', 'fire': 'fire', 'lit': 'fire',
      '👏': 'clap', 'clap': 'clap', 'clapping': 'clap',
      '🎂': 'cake', 'cake': 'cake', 'birthday': 'cake'
    };

    const emojiFieldMap = {
      '❤️': 'heart_count', 'heart': 'heart_count', 'like': 'likes_count',
      '👍': 'thumbsup_count', 'thumbsup': 'thumbsup_count',
      '😮': 'shocked_count', 'shocked': 'shocked_count',
      '😂': 'laugh_count', 'laugh': 'laugh_count',
      '🔥': 'fire_count', 'fire': 'fire_count',
      '👏': 'clap_count', 'clap': 'clap_count',
      '🎂': 'cake_count', 'cake': 'cake_count'
    };

    const normalizedEmoji = emojiToNormalized[emoji] || emoji;

    const targetThread = threads.find(t => t.id === threadId);
    let newUserLikedVal = true;
    if (targetThread) {
      const currentUserLiked = !!(targetThread.userLiked || targetThread.userHasLiked || targetThread.user_has_liked || targetThread.user_liked);
      const currentActiveEmoji = targetThread.activeEmoji || 'like';
      const normalizedActiveEmoji = emojiToNormalized[currentActiveEmoji] || currentActiveEmoji;
      const isSameEmoji = normalizedActiveEmoji === normalizedEmoji;
      if (currentUserLiked && isSameEmoji) {
        newUserLikedVal = false;
      }
    }

    try {
      const activeReactions = JSON.parse(localStorage.getItem('nbt_active_reactions') || '{}');
      if (newUserLikedVal) {
        activeReactions[threadId] = emoji; // Save raw emoji symbol character (e.g. '👍')
      } else {
        delete activeReactions[threadId];
      }
      localStorage.setItem('nbt_active_reactions', JSON.stringify(activeReactions));
    } catch (e) {
      console.error(e);
    }

    let updatedPending = {};
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        const currentUserLiked = !!(t.userLiked || t.userHasLiked || t.user_has_liked || t.user_liked);
        const currentActiveEmoji = t.activeEmoji || 'like';
        const normalizedActiveEmoji = emojiToNormalized[currentActiveEmoji] || currentActiveEmoji;
        const isSameEmoji = normalizedActiveEmoji === normalizedEmoji;

        // Use the highest available count as the base
        const baseCount = Math.max(
          Number(t.likes || 0),
          Number(t.likeCount || 0),
          Number(t.likes_count || 0),
          Number(t.total_likes || 0)
        );

        const isHeartReaction = (em) => em === 'heart' || em === 'like' || em === '❤️';

        let newCount = baseCount;
        let newUserLiked = currentUserLiked;

        const field = emojiFieldMap[normalizedEmoji];
        const oldField = emojiFieldMap[normalizedActiveEmoji];

        let specificFields = {};
        if (field) {
          if (currentUserLiked && isSameEmoji) {
            if (isHeartReaction(normalizedActiveEmoji)) {
              newCount = Math.max(0, newCount - 1);
            }
            newUserLiked = false;
            specificFields[field] = Math.max(0, (t[field] || 0) - 1);
          } else if (currentUserLiked && !isSameEmoji) {
            // Switching emoji
            if (isHeartReaction(normalizedActiveEmoji) && !isHeartReaction(normalizedEmoji)) {
              newCount = Math.max(0, newCount - 1);
            } else if (!isHeartReaction(normalizedActiveEmoji) && isHeartReaction(normalizedEmoji)) {
              newCount = newCount + 1;
            }
            if (oldField) specificFields[oldField] = Math.max(0, (t[oldField] || 0) - 1);
            specificFields[field] = (t[field] || 0) + 1;
            newUserLiked = true;
          } else {
            if (isHeartReaction(normalizedEmoji)) {
              newCount = newCount + 1;
            }
            newUserLiked = true;
            specificFields[field] = (t[field] || 0) + 1;
          }
        }

        const newReactions = { ...(t.reactions || {}) };
        if (field) {
          const displayEmoji = (emoji === 'like' || emoji === 'heart' || emoji === '❤️') ? '❤️' : emoji;
          if (currentUserLiked && isSameEmoji) {
            newReactions[displayEmoji] = Math.max(0, (newReactions[displayEmoji] || 0) - 1);
          } else if (currentUserLiked && !isSameEmoji) {
            const oldDisplayEmoji = (currentActiveEmoji === 'like' || currentActiveEmoji === 'heart' || currentActiveEmoji === '❤️') ? '❤️' : currentActiveEmoji;
            newReactions[oldDisplayEmoji] = Math.max(0, (newReactions[oldDisplayEmoji] || 0) - 1);
            newReactions[displayEmoji] = (newReactions[displayEmoji] || 0) + 1;
          } else {
            newReactions[displayEmoji] = (newReactions[displayEmoji] || 0) + 1;
          }
        }

        updatedPending = { likes: newCount, userLiked: newUserLiked, activeEmoji: newUserLiked ? emoji : null, ...specificFields, reactions: newReactions };
        return {
          ...t,
          ...updatedPending,
          userHasLiked: newUserLiked,
          userLiked: newUserLiked,
          likeCount: newCount,
          activeEmoji: newUserLiked ? emoji : null,
          reactions: newReactions
        };
      }
      return t;
    }));

    setPendingActions(prev => ({ ...prev, [threadId]: { ...prev[threadId], ...updatedPending } }));

    try {
      await fetch(`${BASE_URL}/api/posts/${threadId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: user?.id || user?.employee_id || userId,
          user_id: user?.id || user?.employee_id || userId,
          employee_id: user?.id || user?.employee_id || userId,
          EmpID: user?.id || user?.employee_id || userId,
          userName: user?.name,
          reaction: normalizedEmoji, // e.g. 'thumbsup'
          emoji: emoji, // e.g. '👍'
          type: normalizedEmoji, // e.g. 'thumbsup'
          reactionType: emoji, // e.g. '👍'
          reaction_type: emoji, // e.g. '👍'
          reactionEmoji: emoji,
          reaction_emoji: emoji,
          emojiSymbol: emoji,
          emoji_symbol: emoji,
          symbol: emoji,
          value: normalizedEmoji,
          reactionVal: normalizedEmoji
        })
      });

      setTimeout(() => fetchThreads(true), 500);

      // Delay removing from pending actions to let background fetch complete
      setTimeout(() => {
        setPendingActions(prev => {
          const next = { ...prev };
          delete next[threadId];
          return next;
        });
      }, 15000);
    } catch {
      setPendingActions(prev => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
      setTimeout(() => fetchThreads(true), 1000);
    }
  };

  const toggleBadge = async (threadId, userId, badgeType = 'Top Player') => {
    let newBadgeCount = 0;
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        const isCurrentlyBadged = t.badge_type === badgeType;
        newBadgeCount = isCurrentlyBadged ? Math.max(0, (t.badgeCount || 0) - 1) : (t.badgeCount || 0) + 1;
        return {
          ...t,
          userHasBadged: !isCurrentlyBadged,
          badgeCount: newBadgeCount,
          badge_type: isCurrentlyBadged ? null : badgeType
        };
      }
      return t;
    }));

    setPendingActions(prev => ({ ...prev, [threadId]: { ...prev[threadId], badgeType, badgeCount: newBadgeCount } }));

    try {
      const uId = user?.id || user?.employee_id || userId;
      await fetch(API_ENDPOINTS.THREAD_BADGE(threadId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: user?.id || user?.employee_id,
          user_id: user?.id || user?.employee_id,
          badge: badgeType,
          type: badgeType,
          badge_count: newBadgeCount,
          badgeCount: newBadgeCount
        })
      });
      fetchThreads(user?.id, true);
      setTimeout(() => {
        setPendingActions(prev => {
          const next = { ...prev };
          delete next[threadId];
          return next;
        });
      }, 15000);
    } catch {
      setPendingActions(prev => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
      fetchThreads(user?.id, true);
    }
  };

  const addComment = async (threadId, content) => {
    try {
      const res = await fetch(API_ENDPOINTS.THREAD_COMMENT(threadId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: user?.id || user?.employee_id || user?.EmpID || user?.userId,
          user_id: user?.id || user?.employee_id || user?.EmpID || user?.userId,
          employee_id: user?.id || user?.employee_id || user?.EmpID || user?.userId,
          EmpID: user?.id || user?.employee_id || user?.EmpID || user?.userId,
          userName: user?.name,
          content
        })
      });
      if (res.ok) {
        await fetchThreads(undefined, true);
        return true;
      }
    } catch (err) { console.error("Comment Error:", err); }
    return false;
  };

  const fetchComments = async (threadId) => {
    try {
      const res = await fetch(API_ENDPOINTS.THREAD_COMMENTS(threadId), {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) return await res.json();
    } catch { }
    return [];
  };

  const fetchReactors = async (threadId, reactionType) => {
    try {
      const res = await fetch(API_ENDPOINTS.THREAD_REACTORS(threadId, reactionType));
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : (data.users || data.reactors || data.value || []);
      }
    } catch { }
    return [];
  };

  const deletePost = async (id, postAuthorId = null) => {
    if (!user?.token) return false;
    const post = threads.find(t => t.id === id);
    const authorId = postAuthorId || post?.userId || post?.user_id || post?.employee_id;
    const finalUserId = authorId || user?.id || user?.employee_id || user?.EmpID;
    try {
      const res = await fetch(API_ENDPOINTS.THREAD_DELETE(id), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: finalUserId,
          employee_id: finalUserId,
          user_id: finalUserId
        })
      });
      if (res.ok) {
        await fetchThreads(true);
        return true;
      }
    } catch { }
    return false;
  };

  const fetchSingleThread = async (id) => {
    if (!user?.token) return null;
    try {
      const res = await fetch(API_ENDPOINTS.THREAD_UPDATE(id), {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) return await res.json();
    } catch { }
    return null;
  };

  const fetchUserThreads = async (userId) => {
    if (!user?.token) return [];
    try {
      const res = await fetch(API_ENDPOINTS.THREAD_USER(userId), {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) return await res.json();
    } catch { }
    return [];
  };

  const deleteComment = async (threadId, commentId, commentAuthorId = null) => {
    if (!user?.token) return false;
    const finalUserId = commentAuthorId || user?.id || user?.employee_id || user?.EmpID;
    try {
      const res = await fetch(API_ENDPOINTS.COMMENT_DELETE(threadId, commentId), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: finalUserId,
          employee_id: finalUserId,
          user_id: finalUserId
        })
      });
      if (res.ok) {
        await fetchThreads(true);
        return true;
      }
    } catch { }
    return false;
  };

  const updateComment = async (threadId, commentId, content, commentAuthorId = null) => {
    if (!user?.token) return false;
    const finalUserId = commentAuthorId || user?.id || user?.employee_id || user?.EmpID;
    try {
      const res = await fetch(API_ENDPOINTS.COMMENT_UPDATE(threadId, commentId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          content,
          userId: finalUserId,
          employee_id: finalUserId,
          user_id: finalUserId
        })
      });
      if (res.ok) {
        await fetchThreads(true);
        return true;
      }
    } catch { }
    return false;
  };

  const updatePost = async (id, contentText, postAuthorId = null) => {
    if (!user?.token) return false;
    const post = threads.find(t => t.id === id);
    const authorId = postAuthorId || post?.userId || post?.user_id || post?.employee_id;
    const finalUserId = authorId || user?.id || user?.employee_id || user?.EmpID;
    try {
      let actualContent = contentText;
      let mediaData = undefined;
      let mediaType = undefined;
      let removeMedia = undefined;

      if (typeof contentText === 'object' && contentText !== null) {
        actualContent = contentText.content;
        removeMedia = contentText.removeMedia;
        if (contentText.file) {
          mediaData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(contentText.file);
          });
          mediaType = contentText.mediaType;
          removeMedia = true;
        }
      }

      const res = await fetch(API_ENDPOINTS.THREAD_UPDATE(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          content: actualContent,
          userId: finalUserId,
          employee_id: finalUserId,
          user_id: finalUserId,
          media: mediaData,
          mediaType: mediaType,
          removeMedia: removeMedia
        })
      });
      if (res.ok) {
        setThreads(threads.map(t => t.id === id ? { ...t, content: actualContent } : t));
        await fetchThreads(true);
        return true;
      }
    } catch (err) {
      console.error("updatePost Error:", err);
    }
    return false;
  };

  return (
    <ThreadContext.Provider
      value={{
        threads,
        unreadCount,
        loading: initialLoading,
        clearNotifications,
        addPost,
        deletePost,
        updatePost,
        fetchSingleThread,
        fetchUserThreads,
        deleteComment,
        updateComment,
        refreshThreads: () => fetchThreads(user?.id),
        toggleReaction,
        toggleBadge,
        addComment,
        fetchComments,
        fetchReactors,
      }}
    >
      {children}
    </ThreadContext.Provider>
  );
};

export const useThread = () => useContext(ThreadContext);
