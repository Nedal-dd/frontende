// src/components/topbar/Topbar.jsx
import "./topbar.css";
import { Search, Person, Beenhere, Chat, Notifications } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { UsersApi, ProfileApi, NotificationsApi, FriendshipsApi } from "../../api/api";

export default function Topbar({
                                   onHamburgerClick,
                                   friendStatus,
                                   viewedUserId,
                                   onSendFriendRequest,
                               }) {
    const navigate = useNavigate();

    // UI / Popups
    const [openPopup, setOpenPopup] = useState(null); // "friend" | "chat" | "notify" | "match" | null
    const containerRef = useRef(null);

    // Profilbild (aktueller User)
    const [profilePicUrl, setProfilePicUrl] = useState("");

    // Suche
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Friend-Request Notifications (eingehend, unread)
    const [friendNotifs, setFriendNotifs] = useState([]);
    // „Notify“: Accepted/Declined deiner gesendeten Requests
    const [notifyItems, setNotifyItems] = useState([]);

    const actorCacheRef = useRef(new Map());
    const pollRef = useRef(null);

    // === Profilbild laden ===
    useEffect(() => {
        (async () => {
            try {
                const { data } = await ProfileApi.getMe();
                setProfilePicUrl(data?.urlProfilePicture || "/assets/default-avatar.png");
            } catch {
                setProfilePicUrl("/assets/default-avatar.png");
            }
        })();
    }, []);

    // === Suche: Navigation ===
    const goToFullResults = () => {
        const q = query.trim();
        if (!q) return;
        setSearchOpen(false);
        navigate(`/search?query=${encodeURIComponent(q)}`);
    };

    // === Outside-Click schließt Popups + Suche ===
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpenPopup(null);
                setSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleIconClick = (type) => {
        setOpenPopup((prev) => (prev === type ? null : type));
        setSearchOpen(false);
    };

    // === Debounced Suche (300ms) ===
    useEffect(() => {
        if (!query?.trim()) {
            setResults([]);
            return;
        }
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const { data } = await UsersApi.search(query.trim());
                setResults(data || []);
                setSearchOpen(true);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    // === Enter/Escape in Suche ===
    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            goToFullResults();
        } else if (e.key === "Escape") {
            setSearchOpen(false);
        }
    };

    // --- Helper: Senderdaten anreichern ---
    const enrichWithActor = async (items) => {
        return Promise.all(
            (items || []).map(async (n) => {
                let actor = actorCacheRef.current.get(n.actorId);
                if (!actor) {
                    try {
                        const [{ data: user }, profRes] = await Promise.all([
                            UsersApi.get(n.actorId),
                            ProfileApi.getByUserId(n.actorId).catch(() => null),
                        ]);
                        const profile = profRes?.data;
                        actor = {
                            username: user?.username ?? `user#${n.actorId}`,
                            avatar:
                                user?.profilePictureUrl ||
                                profile?.urlProfilePicture ||
                                "/assets/default-avatar.png",
                        };
                        actorCacheRef.current.set(n.actorId, actor);
                    } catch {
                        actor = { username: `user#${n.actorId}`, avatar: "/assets/default-avatar.png" };
                    }
                }
                return { ...n, actor };
            })
        );
    };

    // === Polling: Notifications laden & aufteilen ===
    useEffect(() => {
        let cancelled = false;

        const fetchNotifs = async () => {
            try {
                const { data } = await NotificationsApi.list(); // nur für eingeloggten User
                    console.log("Notifications:", data);
                // 1) Eingehende Friend-Requests (zum Annehmen/Ablehnen)
                const incoming = (data || []).filter(
                    (n) =>

                        n.type === "FRIEND_REQUEST" &&
                        !n.read &&
                        // heuristik: es ist KEIN „accepted/declined“-Update
                        !/accepted|declined/i.test(`${n.title || ""} ${n.message || ""}`)
                );
                console.log("Incoming:", incoming);
                const enrichedIncoming = await enrichWithActor(incoming);

                // 2) Updates zu von MIR gesendeten Requests (accepted/declined)
                const updates = (data || []).filter(
                    (n) =>
                        n.type === "FRIEND_REQUEST" &&
                        !n.read &&
                        /accepted|declined/i.test(`${n.title || ""} ${n.message || ""}`) //
                );
                console.log("Updates:", updates);
                const enrichedUpdates = await enrichWithActor(updates);

                if (!cancelled) {
                    setFriendNotifs(enrichedIncoming);
                    setNotifyItems(enrichedUpdates);
                }
            } catch {
                // still & silent

            }
        };


        // sofort + alle 10s
        fetchNotifs();
        pollRef.current = setInterval(fetchNotifs, 10000);
        return () => {
            cancelled = true;
            clearInterval(pollRef.current);
        };
    }, []);

    // === Aktionen: Accept / Decline (für eingehende Requests) ===
    const accept = async (notif) => {
        try {
            await FriendshipsApi.accept(notif.refId); // refId = Friendship-Request-ID
            await NotificationsApi.readOne(notif.id).catch(() => {});
            setFriendNotifs((arr) => arr.filter((x) => x.id !== notif.id));
        } catch {}
    };
    const decline = async (notif) => {
        try {
            await FriendshipsApi.decline(notif.refId);
            await NotificationsApi.readOne(notif.id).catch(() => {});
            setFriendNotifs((arr) => arr.filter((x) => x.id !== notif.id));
        } catch {}
    };

    // === Aktion: Notify-Item als gelesen markieren ===
    const markNotifyRead = async (notif) => {
        try {
            await NotificationsApi.readOne(notif.id);
            setNotifyItems((arr) => arr.filter((x) => x.id !== notif.id));
        } catch {}
    };

    return (
        <div className="topbarContainer" ref={containerRef}>
            <div className="hamburgerMenu" onClick={onHamburgerClick}>
                <span className="logoham">☰</span>
            </div>

            <div className="topbarLeft">
                <span className="logo">TierTreff Logo</span>
            </div>

            <div className="topbarCenter">
                <div className="searchBar">
                    <Search className="searchIcon" />
                    <input
                        placeholder="Search for Username"
                        className="searchInput"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => results.length && setSearchOpen(true)}
                        onKeyDown={handleSearchKeyDown}
                    />
                    {searchOpen && (
                        <div className="searchDropdown">
                            {loading && <div className="searchItem muted">Search…</div>}
                            {!loading && results.length > 0 && (
                                <button className="searchSeeAll" onClick={goToFullResults}>
                                    Show all results ({results.length})
                                </button>
                            )}

                            {!loading &&
                                results.map((u) => (
                                    <Link
                                        key={u.id}
                                        to={`/users/${u.id}`}
                                        className="searchItem"
                                        onClick={() => setSearchOpen(false)}
                                    >
                                        <img
                                            src={u.profilePictureUrl || "/assets/default-avatar.png"}
                                            alt={u.username}
                                            className="searchAvatar"
                                        />
                                        <div className="searchText">
                                            <div className="searchUsername">@{u.username}</div>
                                        </div>
                                    </Link>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="topbarRight">
                <div className="topbarLinks">
                    <Link to="/home" className="sidebarLink">
                        <span className="topbarLink">Go to Home</span>
                    </Link>
                </div>

                <div className="topbarIcons">
                    {/* Friend Requests (eingehend) */}
                    <div className="topbarIconItem" onClick={() => handleIconClick("friend")} title="Friend requests">
                        <Person />
                        <span className="topbarIconBadge">{friendNotifs.length}</span>
                    </div>

                    {/* Match (Demo / später dynamisch) */}
                    <div className="topbarIconItem" onClick={() => handleIconClick("match")}>
                        <Beenhere />
                        <span className="topbarIconBadge">2</span>
                    </div>

                    {/* Chat (Demo) */}
                    <div className="topbarIconItem" onClick={() => handleIconClick("chat")}>
                        <Chat />
                        <span className="topbarIconBadge">3</span>
                    </div>

                    {/* Other notifications: ACCEPTED/DECLINED meiner Requests */}
                    <div className="topbarIconItem" onClick={() => handleIconClick("notify")} title="Notifications">
                        <Notifications />
                        <span className="topbarIconBadge">{notifyItems.length}</span>
                    </div>
                </div>

                {/* Dropdowns */}
                {openPopup && (
                    <div className="topbarDropdown">
                        {/* FRIEND REQUESTS (eingehend) */}
                        {openPopup === "friend" && (
                            <div className="matchPopupContent">
                                {friendNotifs.length === 0 && (
                                    <div className="matchRequestItem">
                                        <div className="matchInfo">
                                            <span className="matchMessage">No friend requests</span>
                                        </div>
                                    </div>
                                )}
                                {friendNotifs.map((n) => (
                                    <div className="matchRequestItem" key={n.id}>
                                        <img
                                            src={n.actor?.avatar || "/assets/default-avatar.png"}
                                            alt={n.actor?.username || "User"}
                                            className="matchProfileImg"
                                        />
                                        <div className="matchInfo">
                                            <span className="matchName">{n.actor?.username || "User"}</span>
                                            <span className="matchMessage">sent you a friend request</span>
                                        </div>
                                        <div className="matchActions">
                                            <button className="acceptBtn" onClick={() => accept(n)}>Accept</button>
                                            <button className="declineBtn" onClick={() => decline(n)}>Decline</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* NOTIFY: accepted/declined meiner gesendeten Requests */}
                        {openPopup === "notify" && (
                            <div className="matchPopupContent">
                                {notifyItems.length === 0 && (
                                    <div className="matchRequestItem">
                                        <div className="matchInfo">
                                            <span className="matchMessage">No notifications</span>
                                        </div>
                                    </div>
                                )}
                                {notifyItems.map((n) => (
                                    <div className="matchRequestItem" key={n.id}>
                                        <img
                                            src={n.actor?.avatar || "/assets/default-avatar.png"}
                                            alt={n.actor?.username || "User"}
                                            className="matchProfileImg"
                                        />
                                        <div className="matchInfo">
                                            <span className="matchName">{n.actor?.username || "User"}</span>
                                            <span className="matchMessage">
                        {/* Zeige Text aus Backend, Fallback: accepted/declined */}
                                                {n.message || n.title || "Friend request update"}
                      </span>
                                        </div>
                                        <div className="matchActions">
                                            <button className="acceptBtn" onClick={() => markNotifyRead(n)}>Mark read</button>
                                            <Link className="declineBtn" to={`/users/${n.actorId}`} onClick={() => markNotifyRead(n)}>
                                                View
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* MATCH / CHAT bleiben Demo */}
                        {openPopup === "match" && (
                            <div className="matchPopupContent">
                                {/* demo content */}
                            </div>
                        )}
                        {openPopup === "chat" && (
                            <div className="matchPopupContent">
                                {/* demo content */}
                            </div>
                        )}
                    </div>
                )}

                <img src={profilePicUrl} alt="Profile" className="topbarImg" />
            </div>
        </div>
    );
}

