// src/components/post/Post.jsx
import React, { useEffect, useState, useMemo , useRef } from "react";
import "./post.css";
import { FavoriteBorder, Comment , Favorite } from "@mui/icons-material";
import { PostsApi ,ProfileApi } from "../../api/api";
import { resolveAvatarSrc, DEFAULT_AVATAR_URL } from "../../utils/image";
import { useAuth } from "../../AuthContext";

function Post({ post, onDelete, onEdit }) {
  const { user: currentUser } = useAuth();

  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [isLiked, setIsLiked] = useState(false); // set from backend if you add likedByMe
    const [authorAvatar, setAuthorAvatar] = useState( resolveAvatarSrc(post.authorProfilePictureUrl) || DEFAULT_AVATAR_URL);
// Cache & State für Kommentar-Avatare (userId -> url)
    const commentAvatarCache = useRef(new Map());
    const [commentAvatars, setCommentAvatars] = useState({});



  // ----- keep editForm in sync with the incoming post -----
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editForm, setEditForm] = useState({
    content: post.content || "",
   // imageUrl: post.imageUrl || "",
    feeling: post.feeling || "",
    location: post.location || "",
    caption: post.caption || "",
  });

  useEffect(() => {
    setEditForm({
      content: post.content || "",
     // imageUrl: post.imageUrl || "",
      feeling: post.feeling || "",
      location: post.location || "",
      caption: post.caption || "",
    });
    setLikeCount(post.likeCount ?? 0);
  }, [post]); // ✅ sync when parent gives a new/updated post



    // ----- comments -----
  const [comments, setComments] = useState([]); // CommentDTO[]
  const [commentInput, setCommentInput] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [editingCommentIndex, setEditingCommentIndex] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
    const [commentCount, setCommentCount] = useState(
        typeof post.commentCount === "number" ? post.commentCount : 0
    );
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await PostsApi.comments(post.id, { page: 0, size: 1 });
                const cnt =
                    typeof data?.totalElements === "number"
                        ? data.totalElements
                        : Array.isArray(data)
                            ? data.length
                            : Array.isArray(data?.content)
                                ? data.content.length
                                : 0;
                if (!cancelled) setCommentCount(cnt);
            } catch {}
        })();
        return () => { cancelled = true; };
    }, [post.id]);



    useEffect(() => {
    let cancelled = false;
    const load = async () => {
        console.log("useEffect for comments, showComments:", showComments);
      if (!showComments) return;
      try {
        const { data } = await PostsApi.comments (post.id, {
          page: 0,
          size: 20,
          sort: "createdAt,DESC",
        })
        console.log(post.id , " : post id and showcomment : "  , showComments );
        const list = Array.isArray(data) ? data : data?.content ?? [];
        console.log("list ist : ", list);
        if (!cancelled) setComments(list.reverse());
      } catch (e) {
        console.error("Failed to load comments", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [showComments, post.id]);

// 2) Kommentar-Avatare nachladen (NEU, ZUSÄTZLICH)
    useEffect(() => {
        if (!showComments || comments.length === 0) return;

        let cancelled = false;

        (async () => {
            const ids = [...new Set(
                comments.map(c => c.userId ?? c.authorId).filter(Boolean)
            )];

            const missing = ids.filter(id => !commentAvatarCache.current.has(id));
            if (missing.length === 0) return;

            const results = await Promise.all(missing.map(async (id) => {
                try {
                    const { data } = await ProfileApi.getByUserId(id);
                    const url = resolveAvatarSrc(data?.urlProfilePicture);
                    return [id, url || DEFAULT_AVATAR_URL];
                } catch {
                    return [id, DEFAULT_AVATAR_URL];
                }
            }));

            if (cancelled) return;

            results.forEach(([id, url]) => commentAvatarCache.current.set(id, url));
            setCommentAvatars(prev => ({ ...prev, ...Object.fromEntries(results) }));
        })();

        return () => { cancelled = true; };
    }, [showComments, comments]);




    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!post.authorId) return;
                const { data } = await ProfileApi.getByUserId(post.authorId);
                if (cancelled) return;
                const url = resolveAvatarSrc(data?.urlProfilePicture);
                setAuthorAvatar(url || DEFAULT_AVATAR_URL); // <-- HARTE FALLBACK
            } catch {
                if (!cancelled) setAuthorAvatar(DEFAULT_AVATAR_URL); // <-- FALLBACK BEI FEHLER
            }
        })();
        return () => { cancelled = true; };
    }, [post.authorId]);




    // Anfangszustand: likedByMe + likeCount vom Backend holen
    useEffect(() => {
       // console.log("...." , post?.id || currentUser?.id) ;
        // Nie Ausgeführt wenn post.id oder currentUser.id nicht da ist
        //

        if (!post?.id || !currentUser?.id)
        {
            alert("...")
            console.log(post.id , " ......: post id and current user id : "  , currentUser?.id );
            console.log(!post.id  );

            return; // warten, bis beides da ist
        }

        let cancelled = false;

        (async () => {
            try {
                const [usersRes, countRes] = await Promise.all([
                    PostsApi.likeUsers(post.id),   // -> Array<User>
                    PostsApi.likeCount(post.id),   // -> Zahl oder { count: n }
                ]);
          //      console.log("users",usersRes);
            //    console.log("countres",countRes);

                if (cancelled) return;

                // liked by me?
                const liked = Array.isArray(usersRes?.data)
                    ? usersRes.data.some(u => String(u.id) === String(currentUser.id))
                    : false;
                console.log("liked" , liked);
                setIsLiked(liked);

                // aktueller Count
                const cnt =
                    typeof countRes?.data === "number"
                        ? countRes.data
                        : (countRes?.data?.count ?? post.likeCount ?? 0);
                setLikeCount(cnt);
            } catch {
                // still & silent
            }
        })();

        return () => { cancelled = true; };
    }, [post.id, currentUser?.id]);






    const [likeBusy, setLikeBusy] = useState(false);

    const toggleLike = async () => {
        if (likeBusy || !post?.id) return;
        setLikeBusy(true);

        const prevLiked = isLiked;
        const prevCount = likeCount;

        try {
            // Optimistic UI
            if (prevLiked) {
                setIsLiked(false);
                setLikeCount((c) => Math.max(0, c - 1));
                await PostsApi.unlike(post.id);
            } else {
                setIsLiked(true);
                setLikeCount((c) => c + 1);
                await PostsApi.like(post.id);
            }

            // Nach jedem Klick Count sicherheitshalber vom Server synchronisieren
            const { data } = await PostsApi.likeCount(post.id);
            const serverCount =
                typeof data === "number" ? data : (data?.count ?? null);
            if (serverCount !== null) setLikeCount(serverCount);

        } catch (e) {
            // Rollback bei Fehler
            setIsLiked(prevLiked);
            setLikeCount(prevCount);

            const status = e?.response?.status;
            const msg = e?.response?.data?.message || e?.message || "Unknown error";
            console.error("like/unlike failed", status, msg);
            // Optional: UI-Fehlermeldung
             alert(`Like fehlgeschlagen (${status || "500"}): ${msg}`);
        } finally {
            setLikeBusy(false);
        }
    };


    const handleAddComment = async () => {
        const text = commentInput.trim();
        if (!text) return;
        try {
            const { data: saved } = await PostsApi.addComment(post.id, { content: text });
            setComments(prev => [...prev, saved]);
            setCommentInput("");
            setCommentCount(c => c + 1);            // ✅ Zähler erhöhen
        } catch (e) {
            console.error("addComment failed", e);
        }
    };

    const handleDeleteComment = async (idx) => {
        const target = comments[idx];
        if (!target) return;
        try {
            await PostsApi.deleteComment(post.id, target.id);
            setComments(list => list.filter((_, i) => i !== idx));
            setCommentCount(c => Math.max(0, c - 1)); // ✅ Zähler senken
        } catch (e) {
            console.error("deleteComment failed", e);
        }
    };




    const handleUpdateComment = async (idx) => {
    const target = comments[idx];
    if (!target) return;
    try {
      const { data: upd } = await PostsApi.updateComment(post.id, target.id, {
        content: editingCommentText,
      });
      setComments((list) =>
        list.map((c, i) =>
          i === idx ? upd ?? { ...c, content: editingCommentText } : c
        )
      );
      setEditingCommentIndex(null);
    } catch (e) {
      console.error("updateComment failed", e);
    }
  };



  const submitEditPost = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        content: editForm.content ?? "",
       // imageUrl: editForm.imageUrl ?? "",
        feeling: editForm.feeling ?? null,
        location: editForm.location ?? null,
        caption: editForm.caption ?? null,
      };
      const { data } = await PostsApi.update(post.id, payload);
      onEdit?.(post.id, data ?? payload); // parent updates post prop
      setIsEditingPost(false);
    } catch (e2) {
      console.error("update post failed", e2);
    }
  };

  const authorName = post.authorUsername ?? "User";
  const createdAt = post.createdAt
    ? new Date(post.createdAt).toLocaleString()
    : "";

    const renderedComments = useMemo(
        () =>
            comments.map((c, idx) => {
                const isEditing = editingCommentIndex === idx;
                const cid = c.userId ?? c.authorId;          // Kommentar-Autor-ID
                const canEdit = currentUser?.id === cid;
                const avatar = commentAvatars[cid] || DEFAULT_AVATAR_URL;

                return (
                    <li
                        key={c.id ?? `${c.authorUsername}-${idx}`}
                        className="commentItem commentItemFlex"
                    >
                        <img
                            className="commentProfileImg"
                            src={avatar}
                            alt=""
                            onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR_URL)}
                        />
                        <span style={{ fontWeight: 500, marginRight: 6 }}>
            {c.authorUsername}
          </span>

                        {isEditing ? (
                            <input
                                className="editCommentInput"
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleUpdateComment(idx);
                                    else if (e.key === "Escape") setEditingCommentIndex(null);
                                }}
                                onBlur={() => setEditingCommentIndex(null)}
                                autoFocus
                            />
                        ) : (
                            <span>{c.content}</span>
                        )}

                        {canEdit && !isEditing && (
                            <>
                                <button
                                    className="editCommentButton"
                                    onClick={() => {
                                        setEditingCommentIndex(idx);
                                        setEditingCommentText(c.content);
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    className="deleteCommentButton"
                                    onClick={() => handleDeleteComment(idx)}
                                >
                                    Delete
                                </button>
                            </>
                        )}
                    </li>
                );
            }),
        [comments, editingCommentIndex, editingCommentText, currentUser, commentAvatars]
    );


  return (
    <div className="post">
      <div className="postWrapper">
        {/* Header */}
        <div className="postTop">
          <div className="postTopLeft">
            <img className="postProfileImg" src={authorAvatar} alt=""  onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR_URL)} />
            <span className="postUsername">{authorName}</span>
            <span className="postDate">{createdAt}</span>
          </div>
          <div className="postTopRight">

            {currentUser?.id === post.authorId && (
              <div className="postOptionsMenu">
                <button
                  className="postOptionBtn"
                  onClick={() => setIsEditingPost(true)}
                >
                  Edit
                </button>
                <button
                  className="postOptionBtn"
                  onClick={() => onDelete?.(post.id)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="postCenter">
          {isEditingPost ? (
            <form onSubmit={submitEditPost} className="editPostForm">
              {[
                ["caption", "caption"],
                ["content", "content"],
                ["feeling", "feeling"],
                ["location", "location"],
            //    ["imageUrl", "Image URL"],
              ].map(([field, label]) => (
                <input
                  key={field}
                  className="editPostInput"
                  value={editForm[field] ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, [field]: e.target.value })
                  }
                  placeholder={`Edit ${label}`}
                  style={{ marginBottom: 6 }}
                />
              ))}
              <div className="editPostButtonGroup">
                <button type="submit" className="editPostButton">
                  Save
                </button>
                <button
                  type="button"
                  className="editPostButton"
                  onClick={() => setIsEditingPost(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
                {post.feeling && <span className="postFeeling">feeling {post.feeling}</span>}
                {post.location && <span className="postLocation">in {post.location}</span>}
                {post.caption && <div className="postCaption">{post.caption}</div>}
                               {post.content && (
                                 <div className="postContent">{post.content}</div>
                               )}
                { /* post.imageUrl && (
                    <img
                        className="postImg"
                        src={resolveAvatarSrc(post.imageUrl)}
                        alt=""
                        onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )} */}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="postBottom">
          <div className="postBottomLeft">
            <div className="shareOptions">
                <div className="shareOption" onClick={!likeBusy ? toggleLike : undefined} title={isLiked ? "Unlike" : "Like"}>
                    {isLiked ? (
                        <Favorite className="shareIcon liked" />
                    ) : (
                        <FavoriteBorder className="shareIcon" />
                    )}
                    <span className="shareOptionText">{isLiked ? "Unlike" : "Like"}</span>
                </div>
                <div className="shareOption">
                <Comment
                  htmlColor="Sienna"
                  className="shareIcon"
                  onClick={() => setShowComments((v) => !v)}
                />
                <span
                  className="shareOptionText"
                  onClick={() => setShowComments((v) => !v)}
                  style={{ cursor: "pointer" }}
                >
                  Comment
                </span>
              </div>
            </div>

            {showComments && (
              <div className="commentInputSection">
                <input
                  id={`comment-input-${post.id}`}
                  type="text"
                  className="commentInput"
                  placeholder="Write a comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <button
                  className="commentButton"
                  onClick={handleAddComment}
                  disabled={!commentInput.trim()}
                >
                  Post
                </button>
              </div>
            )}
          </div>

          <div className="postBottomRight">
              <div className="postLikesCounter">
                  {likeCount} {likeCount === 1 ? "Like" : "Likes"}
              </div>

              <div className="postCommentsCounter">
              {commentCount} Comments
            </div>
          </div>
        </div>

        {showComments && comments.length > 0 && (
          <div className="commentsBox">
            <ul className="commentsList">{renderedComments}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(Post);
