// src/components/sidebar/Sidebar.jsx
import "./sidebar.css";
import {
  RssFeed,
  Forum,
  Beenhere,
  AccountBox,
  ExitToApp,
} from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import ChatPopup from "../chatpopup/ChatPopup";
import { AuthApi, UsersApi } from "../../api/api";

export default function Sidebar() {
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [showChatBox, setShowChatBox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Load logged-in user + friends from backend
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        // 1) Who am I?
        const meRes = await fetch(`${import.meta.env.VITE_API_BASE}/auth/me`, {
          credentials: "include",
        });
        if (!meRes.ok) {
          if (isMounted) setErr("Not authenticated");
          return;
        }
        const me = await meRes.json(); // expect { id, username, ... }
        if (!isMounted) return;
        setCurrentUser(me);

        // 2) Friends of this user
        const frRes = await fetch(
          `${import.meta.env.VITE_API_BASE}/api/users/${me.id}/friends`,
          { credentials: "include" }
        );
        if (!frRes.ok) throw new Error("Failed to load friends");
        const fr = await frRes.json(); // expect [{ id, username, profilePicture }, ...]
        if (!isMounted) return;
        setFriends(Array.isArray(fr) ? fr : []);
      } catch (e) {
        if (isMounted) setErr(e.message || "Something went wrong");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return null; // or a small skeleton/loader
  if (err) {
    // You could also redirect to /login here if unauthenticated
    return <div className="sidebar">Error: {err}</div>;
  }
  if (!currentUser) return null;

  return (
    <div className="sidebar">
      <div className="sidebarWrapper">
        <ul className="sidebarList">
          <li
            className={`sidebarListItem${
              location.pathname === "/home" ? " active" : ""
            }`}
          >
            <Link to="/home" className="sidebarLink">
              <RssFeed className="sidebarIcon" />
              <span className="sidebarListItemText">Home</span>
            </Link>
          </li>

          <li
            className={`sidebarListItem${showChatBox ? " active" : ""}`}
            onClick={() => setShowChatBox(true)}
          >
            <Forum className="sidebarIcon" />
            <span className="sidebarListItemText">Chat</span>
          </li>

          <li
            className={`sidebarListItem${
              location.pathname === "/match" ? " active" : ""
            }`}
          >
            <Link to="/match" className="sidebarLink">
              <Beenhere className="sidebarIcon" />
              <span className="sidebarListItemText">Match</span>
            </Link>
          </li>

          <li
            className={`sidebarListItem${
              location.pathname === "/profile" ? " active" : ""
            }`}
          >
            <Link to="/profile" className="sidebarLink">
              <AccountBox className="sidebarIcon" />
              <span className="sidebarListItemText">Profile</span>
            </Link>
          </li>

          <li
            className="sidebarListItem"
            onClick={async () => {
              try {
                await fetch(`${import.meta.env.VITE_API_BASE}/auth/logout`, {
                  method: "POST",
                  credentials: "include",
                });
              } finally {
                window.location.href = "/login";
              }
            }}
          >
            <ExitToApp className="sidebarIcon" />
            <span className="sidebarListItemText">Logout</span>
          </li>
        </ul>

        <hr className="sidebarHr" />
        <h6 className="rightbarTitle">Your Friends</h6>
        <ul className="sidebarFriendList">
          {friends.length === 0 ? (
            <li>No friends yet.</li>
          ) : (
            friends.map((f) => (
              <li className="sidebarFriend" key={f.id}>
                <img
                  src={f.profilePicture}
                  alt={f.username}
                  className="sidebarFriendImg"
                />
                <span className="sidebarFriendName">{f.username}</span>
              </li>
            ))
          )}
        </ul>

        {showChatBox && (
          <ChatPopup
            friends={friends}
            currentUser={{ id: currentUser.id, username: currentUser.username }}
            onClose={() => setShowChatBox(false)}
          />
        )}
      </div>
    </div>
  );
}
