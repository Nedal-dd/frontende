// src/components/topbar/Topbar.jsx
import "./topbar.css";
import { Search, Person, Beenhere, Chat, Notifications } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect , useMemo } from "react";
import { UsersApi, ProfileApi, NotificationsApi, FriendshipsApi } from "../../api/api";
import { resolveAvatarSrc, DEFAULT_AVATAR_URL } from "../../utils/image";
import { useAuth } from "../../AuthContext";

export default function Topbar({
                                   onHamburgerClick
                               }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const myUserId = user?.id ?? user?.userId ?? null;


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
    const searchAvatarCacheRef = useRef(new Map());


    // Notifications
    const [matchNotifs, setMatchNotifs] = useState([]);
    const [chatNotifs, setChatNotifs] = useState([]);

    // Caches/guards
    const dismissedIdsRef = useRef(new Set());
    const [busyIds, setBusyIds] = useState(new Set());
    const setBusy = (id, on) =>
        setBusyIds((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });

    const notifIdOf = (n) =>
        n?.id ?? n?.notificationId ?? n?.uuid ?? n?._id ?? null;

    // === Profilbild laden ===
    useEffect(() => {
        (async () => {
            try {
                const { data } = await ProfileApi.getMe();
                setProfilePicUrl(resolveAvatarSrc(data.urlProfilePicture));
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



    useEffect(() => {
        if (!query?.trim()) {
            setResults([]);
            return;
        }
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const { data } = await UsersApi.search(query.trim());
                const raw = data || [];

                const enriched = await Promise.all(
                    raw.map(async (u) => {
                        // 1) Wenn UsersApi.search bereits eine URL hat, nutzen
                        let src = u.profilePictureUrl;

                        // 2) Sonst aus Cache oder Profile laden
                        if (!src) {
                            const cached = searchAvatarCacheRef.current.get(u.id);
                            if (cached) return { ...u, avatar: cached };
                            try {
                                const { data: prof } = await ProfileApi.getByUserId(u.id);
                                src = prof?.urlProfilePicture || "";
                            } catch {
                                src = "";
                            }
                        }

                        // 3) Dateiname/URL → echte URL mit Prefix
                        const final = resolveAvatarSrc(src);
                        searchAvatarCacheRef.current.set(u.id, final);
                        return { ...u, avatar: final };
                    })
                );

                setResults(enriched);
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
                 //   console.log("Notifications:", data);
                // 1) Eingehende Friend-Requests (zum Annehmen/Ablehnen)
                const incoming = (data || []).filter(
                    (n) =>

                        n.type === "FRIEND_REQUEST" &&
                        !n.read &&
                        // heuristik: es ist KEIN „accepted/declined“-Update
                        !/accepted|declined/i.test(`${n.title || ""} ${n.message || ""}`)
                );
              //  console.log("Incoming:", incoming);
                const enrichedIncoming = await enrichWithActor(incoming);

                // 2) Updates zu von MIR gesendeten Requests (accepted/declined)
                const updates = (data || []).filter(
                    (n) =>
                        n.type === "FRIEND_REQUEST" &&
                        !n.read &&
                        /accepted|declined/i.test(`${n.title || ""} ${n.message || ""}`) //
                );
             //   console.log("Updates:", updates);
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


    /* Match*/


    const  handleIconClick = (type) => {
        setOpenPopup((prev) => (prev === type ? null : type));
        setSearchOpen(false);
    };

    // ---------------- helpers ----------------
    const normType = (t) =>
        String(t || "")
            .toUpperCase()
            .replace(/\s+/g, "_");

    const isUnread = (n) => {
        if (typeof n.read === "boolean") return n.read === false;
        const status = String(n.status || n.state || "").toUpperCase();
        if (status)
            return ["UNREAD", "NEW", "PENDING", "REQUESTED"].includes(status);
        if ("readAt" in n) return n.readAt == null;
        return true;
    };

    const isMatchType = (t) => {
        if (
            t.includes("MATCH") &&
            (t.includes("INTEREST") || t.includes("REQUEST"))
        )
            return true;
        return [
            "MATCH",
            "MATCH_REQUEST",
            "MATCH_REQUEST_INTEREST",
            "MATCH_INTEREST",
            "MATCH_INTEREST_ACCEPTED",
            "MATCH_INTEREST_DECLINED",
        ].includes(t);
    };

    const isChatType = (t) => ["CHAT", "CHAT_MESSAGE", "MESSAGE"].includes(t);

    const resolveActorId = (n) => n.actorId ?? n.senderId ?? null;
    const resolveRecipientId = (n) => n.recipientId ?? n.receiverId ?? null;
    const resolveRequesterId = (n) =>
        n.requesterId ??
        n.senderId ??
        n.initiatorId ??
        n.fromUserId ??
        n.actorId ??
        null;

    const isPending = (n) => {
        const s = String(n.status || n.state || "").toUpperCase();
        if (!s) return true;
        return ["UNREAD", "NEW", "PENDING", "REQUESTED"].includes(s);
    };

    // Only for match items now
    const isActionableForMe = (n) => {
        if (!myUserId) return false;
        const t = n.__TYPE;
        const recipientId = resolveRecipientId(n);
        const requesterId = resolveRequesterId(n);
        const iAmRecipient = recipientId
            ? recipientId === myUserId
            : requesterId !== myUserId;

        if (["MATCH_INTEREST", "MATCH_REQUEST_INTEREST"].includes(t)) {
            return iAmRecipient && isPending(n);
        }
        return false;
    };

    const humanTextFor = (t, n) => {
        const recipientId = resolveRecipientId(n);
        const requesterId = resolveRequesterId(n);
        const iAmRecipient = recipientId
            ? recipientId === myUserId
            : requesterId !== myUserId;

        switch (t) {
            case "MATCH_INTEREST":
            case "MATCH_REQUEST_INTEREST":
                return iAmRecipient
                    ? "is interested in your match request"
                    : "you expressed interest";
            case "MATCH_INTEREST_ACCEPTED":
                return "accepted your match request";
            case "MATCH_INTEREST_DECLINED":
                return "declined your match request";
            default:
                return "sent you a notification";
        }
    };

    // Capped actor cache
    const MAX_CACHE = 200;
    const putActorInCache = (id, actor) => {
        const m = actorCacheRef.current;
        if (!m.has(id) && m.size >= MAX_CACHE) {
            const firstKey = m.keys().next().value;
            m.delete(firstKey);
        }
        m.set(id, actor);
    };

    const enrich = async (n) => {
        const actorId = resolveActorId(n);
        if (!actorId)
            return { ...n, actor: { username: "User", avatar: "/assets/001.jpg" } };

        if (actorCacheRef.current.has(actorId)) {
            return { ...n, actor: actorCacheRef.current.get(actorId) };
        }
        try {
            const [{ data: u }, profRes] = await Promise.all([
                UsersApi.get(actorId),
                ProfileApi.getByUserId(actorId).catch(() => null),
            ]);
            const actor = {
                username: u?.username ?? `user#${actorId}`,
                avatar:
                    resolveAvatarSrc( u?.profilePictureUrl) ||
                    profRes?.data?.urlProfilePicture ||
                    "/assets/001.jpg",
            };
            putActorInCache(actorId, actor);
            return { ...n, actor };
        } catch {
            const fallback = {
                username: `user#${actorId}`,
                avatar: "/assets/001.jpg",
            };
            putActorInCache(actorId, fallback);
            return { ...n, actor: fallback };
        }
    };

    // ---------------- polling notifications (match + chat) ----------------
    useEffect(() => {
        let cancelled = false;

        const byTimeDesc = (a, b) => {
            const ta = new Date(a.createdAt || a.timestamp || 0).getTime();
            const tb = new Date(b.createdAt || b.timestamp || 0).getTime();
            return tb - ta;
        };

        const fetchNotifs = async () => {
            try {
                const { data } = await NotificationsApi.list();
                const all = Array.isArray(data) ? data : [];
                const allSorted = all.sort(byTimeDesc);

                const unread = allSorted
                    .filter(isUnread)
                    .filter((n) => !dismissedIdsRef.current.has(notifIdOf(n)));

                const withTypes = unread.map((n) => ({
                    ...n,
                    __TYPE: normType(
                        n.type || n.notificationType || n.kind || n.eventType
                    ),
                }));

                const matches = withTypes.filter((n) => isMatchType(n.__TYPE));
                const chats = withTypes.filter((n) => isChatType(n.__TYPE));

                const [enMatches, enChats] = await Promise.all([
                    Promise.all(matches.map(enrich)),
                    Promise.all(chats.map(enrich)),
                ]);

                if (!cancelled) {
                    setMatchNotifs(enMatches);
                    setChatNotifs(enChats);
                }
            } catch {
                // silent
            }
        };

        if (myUserId) {
            fetchNotifs();
            const id = setInterval(fetchNotifs, 10000);
            return () => {
                cancelled = true;
                clearInterval(id);
            };
        }
    }, [myUserId]);

    // ---------------- actions: match ----------------
    const acceptMatchInterest = async (notif) => {
        const nid = notifIdOf(notif);
        if (nid) {
            dismissedIdsRef.current.add(nid);
            setBusy(nid, true);
        }
        setMatchNotifs((arr) => arr.filter((x) => notifIdOf(x) !== nid));
        try {
            await MatchApi.accept(notif.refId); // POST /api/match/interests/{interestId}/accept
            if (nid) await NotificationsApi.readOne(nid).catch(() => {});
        } catch {
            if (nid) {
                dismissedIdsRef.current.delete(nid);
                setMatchNotifs((arr) => [notif, ...arr]); // rollback
            }
        } finally {
            if (nid) setBusy(nid, false);
        }
    };

    const declineMatchInterest = async (notif) => {
        const nid = notifIdOf(notif);
        if (nid) {
            dismissedIdsRef.current.add(nid);
            setBusy(nid, true);
        }
        setMatchNotifs((arr) => arr.filter((x) => notifIdOf(x) !== nid));
        try {
            await MatchApi.decline(notif.refId); // POST /api/match/interests/{interestId}/decline
            if (nid) await NotificationsApi.readOne(nid).catch(() => {});
        } catch {
            if (nid) {
                dismissedIdsRef.current.delete(nid);
                setMatchNotifs((arr) => [notif, ...arr]); // rollback
            }
        } finally {
            if (nid) setBusy(nid, false);
        }
    };

    // ---- NEW: click handlers (row = read + action) ----
    const handleChatNotifClick = async (n) => {
        const nid = notifIdOf(n);
        if (nid) {
            dismissedIdsRef.current.add(nid);
            setChatNotifs((arr) => arr.filter((x) => notifIdOf(x) !== nid));
            NotificationsApi.readOne(nid).catch(() => {});
        }
        const peer = n.actorId ?? n.senderId;
        if (peer) navigate(`/home?chatWith=${peer}`);
    };

    const handleMatchRowClickIfNonActionable = async (n) => {
        if (isActionableForMe(n)) return; // let buttons handle it
        const nid = notifIdOf(n);
        if (!nid) return;
        dismissedIdsRef.current.add(nid);
        setMatchNotifs((arr) => arr.filter((x) => notifIdOf(x) !== nid));
        NotificationsApi.readOne(nid).catch(() => {});
    };

    // ---------------- UI bits ----------------
    const Badge = ({ count }) =>
        count > 0 ? <span className="topbarIconBadge">{count}</span> : null;



    const matchItems = useMemo(() => matchNotifs, [matchNotifs]);


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
                                            src={u.avatar || DEFAULT_AVATAR_URL}
                                            alt={u.username}
                                            className="searchAvatar"
                                            onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR_URL)}
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
                    <div className="topbarIconItem"  onClick={() => handleIconClick("match")} title="Match requests">

                            <Beenhere />
                            <Badge count={matchItems.length} />

                    </div>

                    {/* Chat (Demo) */}
                    <div className="topbarIconItem"  onClick={() => handleIconClick("chat")} title="Chat messages">

                            <Chat />
                            <Badge count={chatNotifs.length} />

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
                                {matchItems.length === 0 && (
                                    <div className="matchRequestItem">
                                        <div className="matchInfo">
                                            <span className="matchMessage">No match interests</span>
                                        </div>
                                    </div>
                                )}
                                {matchItems.map((n) => {
                                    const actionable = isActionableForMe(n);
                                    const nid = notifIdOf(n);
                                    return (
                                        <div
                                            className="matchRequestItem"
                                            key={n.id ?? nid}
                                            role={!actionable ? "button" : undefined}
                                            tabIndex={!actionable ? 0 : -1}
                                            onClick={
                                                !actionable
                                                    ? () => handleMatchRowClickIfNonActionable(n)
                                                    : undefined
                                            }
                                            onKeyDown={
                                                !actionable
                                                    ? (e) => {
                                                        if (e.key === "Enter" || e.key === " ")
                                                            handleMatchRowClickIfNonActionable(n);
                                                    }
                                                    : undefined
                                            }
                                            style={!actionable ? { cursor: "pointer" } : undefined}
                                        >
                                            <img
                                                src={n.actor?.avatar || "/assets/001.jpg"}
                                                alt={n.actor?.username || "User"}
                                                className="matchProfileImg"
                                            />
                                            <div className="matchInfo">
                        <span className="matchName">
                          {n.actor?.username || "User"}
                        </span>
                                                <span className="matchMessage">
                          {humanTextFor(n.__TYPE, n)}
                        </span>
                                            </div>
                                            {actionable ? (
                                                <div className="matchActions">
                                                    <button
                                                        className="acceptBtn"
                                                        disabled={busyIds.has(nid)}
                                                        onClick={() => acceptMatchInterest(n)}
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        className="declineBtn"
                                                        disabled={busyIds.has(nid)}
                                                        onClick={() => declineMatchInterest(n)}
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {openPopup === "chat" && (
                            <div className="matchPopupContent">
                                {chatNotifs.length === 0 && (
                                    <div className="matchRequestItem">
                                        <div className="matchInfo">
                                            <span className="matchMessage">No new messages</span>
                                        </div>
                                    </div>
                                )}
                                {chatNotifs.map((n) => (
                                    <div
                                        className="matchRequestItem"
                                        key={n.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleChatNotifClick(n)}
                                        onKeyDown={(e) =>
                                            (e.key === "Enter" || e.key === " ") &&
                                            handleChatNotifClick(n)
                                        }
                                        style={{ cursor: "pointer" }}
                                    >
                                        <img
                                            src={n.actor?.avatar || "/assets/001.jpg"}
                                            alt={n.actor?.username || "User"}
                                            className="matchProfileImg"
                                        />
                                        <div className="matchInfo">
                      <span className="matchName">
                        {n.actor?.username || "User"}
                      </span>
                                            <span className="matchMessage">sent you a message</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}



                    </div>
                )}

                <img src={profilePicUrl} alt="Profile" className="topbarImg" />
            </div>
        </div>
    );
}

