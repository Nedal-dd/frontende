// src/components/post/Post.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./post.css";
import { FavoriteBorder, Comment } from "@mui/icons-material";
import { PostsApi ,ProfileApi } from "../../api/api";
import { useAuth } from "../../AuthContext";

function Post({ post, onDelete, onEdit }) {
  const { user: currentUser } = useAuth();

  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [isLiked, setIsLiked] = useState(false); // set from backend if you add likedByMe
    const [authorAvatar, setAuthorAvatar] = useState("/assets/person/noAvatar.png");



  // ----- keep editForm in sync with the incoming post -----
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editForm, setEditForm] = useState({
    content: post.content || "",
    imageUrl: post.imageUrl || "",
    Feeling: post.Feeling || "",
    Location: post.Location || "",
    Caption: post.Caption || "",
  });
  useEffect(() => {
    setEditForm({
      content: post.content || "",
      imageUrl: post.imageUrl || "",
      Feeling: post.Feeling || "",
      Location: post.Location || "",
      Caption: post.Caption || "",
    });
    setLikeCount(post.likeCount ?? 0);
  }, [post]); // ✅ sync when parent gives a new/updated post


    const DEFAULT_AVATAR = "/assets/person/noAvatar.png";
    const normalizeAvatar = (u) => (u && u.trim() ? u : DEFAULT_AVATAR);



    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!post.authorId) return;
                const { data } = await ProfileApi.getByUserId(post.authorId);
                if (!cancelled) setAuthorAvatar(normalizeAvatar(data?.urlProfilePicture));
            } catch {
                if (!cancelled) setAuthorAvatar(DEFAULT_AVATAR);
            }
        })();
        return () => { cancelled = true; };
    }, [post.authorId]);


    // ----- comments -----
  const [comments, setComments] = useState([]); // CommentDTO[]
  const [commentInput, setCommentInput] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [editingCommentIndex, setEditingCommentIndex] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!showComments) return;
      try {
        const { data } = await PostsApi.comments(post.id, {
          page: 0,
          size: 20,
          sort: "createdAt,DESC",
        });
        const list = Array.isArray(data) ? data : data?.content ?? [];
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

  const toggleLike = async () => {
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikeCount((n) => Math.max(0, n - 1));
        await PostsApi.unlike(post.id);
      } else {
        setIsLiked(true);
        setLikeCount((n) => n + 1);
        await PostsApi.like(post.id);
      }
    } catch (e) {
      setIsLiked((v) => !v);
      setLikeCount((n) => (isLiked ? n + 1 : Math.max(0, n - 1)));
      console.error("like/unlike failed", e);
    }
  };

  const handleAddComment = async () => {
    const text = commentInput.trim();
    if (!text) return;
    try {
      const { data: saved } = await PostsApi.addComment(post.id, {
        content: text,
      });
      setComments((prev) => [...prev, saved]);
      setCommentInput("");
    } catch (e) {
      console.error("addComment failed", e);
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

  const handleDeleteComment = async (idx) => {
    const target = comments[idx];
    if (!target) return;
    try {
      await PostsApi.deleteComment(post.id, target.id);
      setComments((list) => list.filter((_, i) => i !== idx));
    } catch (e) {
      console.error("deleteComment failed", e);
    }
  };

  const submitEditPost = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        content: editForm.content ?? "",
        imageUrl: editForm.imageUrl ?? "",
        Feeling: editForm.Feeling ?? null,
        Location: editForm.Location ?? null,
        Caption: editForm.Caption ?? null,
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
        const canEdit = currentUser?.id === c.userId;
        return (
          <li
            key={c.id ?? `${c.authorUsername}-${idx}`}
            className="commentItem commentItemFlex"
          >
            <img
              src={"/assets/person/noAvatar.png"}
              alt=""
              className="commentProfileImg"
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
    [comments, editingCommentIndex, editingCommentText, currentUser]
  );

  return (
    <div className="post">
      <div className="postWrapper">
        {/* Header */}
        <div className="postTop">
          <div className="postTopLeft">
            <img className="postProfileImg" src={authorAvatar} alt="" onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)} />
            <span className="postUsername">{authorName}</span>
            <span className="postDate">{createdAt}</span>
          </div>
          <div className="postTopRight">
            {post.Feeling && (
              <span className="postFeeling">feeling {post.Feeling}</span>
            )}
            {post.Location && (
              <span className="postLocation">in {post.Location}</span>
            )}
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
                ["Caption", "Caption"],
                ["content", "Content"],
                ["Feeling", "Feeling"],
                ["Location", "Location"],
                ["imageUrl", "Image URL"],
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
              {post.Caption && (
                <div className="postCaption">{post.Caption}</div>
              )}
              {post.content && <div className="postText">{post.content}</div>}
              {post.imageUrl && (
                <img className="postImg" src={post.imageUrl} alt="" />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="postBottom">
          <div className="postBottomLeft">
            <div className="shareOptions">
              <div className="shareOption">
                <FavoriteBorder
                  htmlColor={isLiked ? "red" : "OrangeRed"}
                  className={isLiked ? "shareIcon liked" : "shareIcon"}
                  onClick={toggleLike}
                  style={{
                    transform: isLiked ? "scale(1.2)" : "scale(1)",
                    transition: "color 0.2s, transform 0.2s",
                  }}
                />
                <span className="shareOptionText">Like</span>
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
            <div className="postLikesCounter">{likeCount} Likes</div>
            <div className="postCommentsCounter">
              {comments.length} Comments
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
