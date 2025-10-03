// src/components/sidebar/Sidebar.jsx
import "./sidebar.css";
import {
    RssFeed,
    Forum,
    Beenhere,
    AccountBox,
    ExitToApp,
} from "@mui/icons-material";
import JoinInner from "@mui/icons-material/JoinInner";
import GroupsSharpIcon from "@mui/icons-material/GroupsSharp";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import ChatPopup from "../chatpopup/ChatPopup";
import MatchChatBox from "../matchchatbox/MatchChatBox";
import { MatchApi } from "../../api/api";

export default function Sidebar() {
    const location = useLocation();

    const [currentUser, setCurrentUser] = useState(null);
    const [friends, setFriends] = useState([]);
    const [interestAcceptedUsers, setInterestAcceptedUsers] = useState([]);
    const [showChatBox, setShowChatBox] = useState(false);
    const [showMatchChatBox, setShowMatchChatBox] = useState(false);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    const [roles, setRoles] = useState([]); // Für Admin-Rollen
    const isAdmin = roles.includes("ROLE_ADMIN");

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                // 1) current user
                const meRes = await fetch(`${import.meta.env.VITE_API_BASE}/auth/me`, {
                    credentials: "include",
                });
                if (!meRes.ok) {
                    if (isMounted) setErr("Not authenticated");
                    return;
                }
                const me = await meRes.json();
                if (!isMounted) return;
                setCurrentUser(me);

                // 2) roles (optional)
                const rolesRes = await fetch(
                    `${import.meta.env.VITE_API_BASE}/auth/roles`,
                    {
                        credentials: "include",
                    }
                );
                if (rolesRes.ok && isMounted) {
                    const roleData = await rolesRes.json();
                    setRoles(roleData);
                }

                // 3) friends
                const frRes = await fetch(
                    `${import.meta.env.VITE_API_BASE}/api/users/${me.id}/friends`,
                    { credentials: "include" }
                );
                if (!frRes.ok) throw new Error("Failed to load friends");
                const fr = await frRes.json();
                if (!isMounted) return;
                setFriends(Array.isArray(fr) ? fr : []);

                // 4) current match id (204 => no match; 404 (legacy) => no match)
                let matchId = null;
                try {
                    const res = await MatchApi.currentMatchId(); // axios response
                    if (res.status !== 204) {
                        matchId = res.data ?? null; // expect a Long
                        console.log("Current matchId:", matchId);
                    } else {
                        console.log("No current match (204)" + "ID is :" + matchId);
                    }
                } catch (err) {
                    if (err?.response?.status === 404) {
                        console.log("No current match (404)");
                    } else {
                        throw err;
                    }
                }

                // 5) accepted peers for that match (normalize single object -> array)
                if (matchId != null) {
                    try {
                        const { data } = await MatchApi.acceptedPeer(matchId);

                        // normalize: allow object or array
                        const arr = Array.isArray(data) ? data : data ? [data] : [];

                        // map to the shape MatchChatBox expects (id, username, optional avatar)
                        const cleaned = arr
                            .map((u) => ({
                                id: Number(u?.id ?? u?.userId ?? u?.user?.id ?? u?.friendId),
                                username: String(
                                    u?.username ?? u?.user?.username ?? u?.friend?.username ?? ""
                                ).trim(),
                                profilePicture:
                                    u?.profilePicture ?? u?.user?.profilePicture ?? null,
                            }))
                            .filter((x) => Number.isFinite(x.id) && x.username);

                        if (isMounted) setInterestAcceptedUsers(cleaned);
                    } catch (e) {
                        if (e?.response?.status === 404) {
                            if (isMounted) setInterestAcceptedUsers([]); // no accepted peer yet
                        } else {
                            throw e;
                        }
                    }
                } else {
                    if (isMounted) setInterestAcceptedUsers([]);
                }
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

    if (loading) return null;
    if (err) {
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
                        className={`sidebarListItem${showMatchChatBox ? " active" : ""}`}
                        onClick={() => setShowMatchChatBox(true)}
                    >
                        <JoinInner className="sidebarIcon" />
                        <span className="sidebarListItemText">Match-Chat</span>
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

                    {isAdmin && (
                        <li
                            className={`sidebarListItem${
                                location.pathname === "/allUsers" ? " active" : ""
                            }`}
                        >
                            <Link to="/allUsers" className="sidebarLink">
                                <GroupsSharpIcon className="sidebarIcon" />
                                <span className="sidebarListItemText">All Users</span>
                            </Link>
                        </li>
                    )}
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
                {showMatchChatBox && (
                    <MatchChatBox
                        matchedUsers={interestAcceptedUsers}
                        currentUser={{ id: currentUser.id, username: currentUser.username }}
                        onClose={() => setShowMatchChatBox(false)}
                    />
                )}
            </div>
        </div>
    );
}
