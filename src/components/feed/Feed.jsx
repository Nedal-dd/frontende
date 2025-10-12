import { useState, useMemo, useEffect } from "react";
import Share from "../share/Share";
import "./feed.css";
import Post from "../post/Post";
import { PostsApi } from "../../api/api"; // <- uses shared axios

export default function Feed() {
  const [posts, setPosts] = useState([]); // PostDTO[]
  const [filter, setFilter] = useState("all"); // "all" | "friends"
  const [page, setPage] = useState(0); // simple paging
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  // load posts from backend
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const params = { page, size: pageSize, sort: "createdAt,DESC" };
        const { data } =
          filter === "friends"
            ? await PostsApi.listFriends(params)
            : await PostsApi.list(params);

         // Spring Page has { content, totalElements, totalPages, ... }
        if (!cancelled) {
          const list = Array.isArray(data) ? data : data.content ?? [];
          setPosts(list);
          setHasMore((data.totalPages ?? 1) > page + 1);
        }
      } catch (e) {
        if (!cancelled) console.error("Load posts failed:", e);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [filter, page]);

  // actions
  const addPost = async (newPostDraft) => {
    // newPostDraft should match your CreatePostDTO
    try {
      const { data } = await PostsApi.create(newPostDraft);
      setPosts((prev) => [data, ...prev]);
    } catch (e) {
      console.error("Create post failed:", e);
    }
  };

  const deletePost = async (postId) => {
    try {
      await PostsApi.delete(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.error("Delete post failed:", e);
    }
  };

  const editPost = async (postId, updateFields) => {
    try {
      const { data } = await PostsApi.update(postId, updateFields);
      setPosts((prev) => prev.map((p) => (p.id === postId ? data : p)));
    } catch (e) {
      console.error("Update post failed:", e);
    }
  };

  const renderedPosts = useMemo(
    () =>
      posts.map((p) => (

       //   console.log("p ist ",p),
        <Post key={p.id} post={p} onDelete={deletePost} onEdit={editPost} />

      )),
    [posts]
  );

  return (
    <div className="feed">
      <div className="feedWrapper">
        {/* Filter */}
        <div className="feedFilter">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => {
              setFilter("all");
              setPage(0);
            }}
          >
            All Posts
          </button>
          <button
            className={filter === "friends" ? "active" : ""}
            onClick={() => {
              setFilter("friends");
              setPage(0);
            }}
          >
            Friends’ Posts
          </button>
        </div>

        {/* Share box (should call addPost with CreatePostDTO) */}
        <Share addPost={addPost} />


        {/* Posts */}
        {renderedPosts}

        {/* simple pagination controls (optional) */}
        <div className="feedPager">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>
          <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
