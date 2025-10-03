// src/components/match/MatchContainer.jsx
import { useEffect, useRef, useState } from "react";
import { MatchApi, AuthApi, AdminApi } from "../../api/api";
import "./matchContainer.css";

const PET_ENUM_VALUES = ["DOG", "CAT", "BIRD", "RABBIT", "REPTILE", "OTHER"];
const petLabel = (e) => e?.charAt(0) + e?.slice(1).toLowerCase();
const U = (s) => String(s || "").toUpperCase();

export default function MatchContainer() {
    const [currentUser, setCurrentUser] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [roles, setRoles] = useState([]);

    const isAdmin = roles.includes("ROLE_ADMIN");

    // Only CLOSED is considered closed (ACCEPTED should still allow chat)
    const isRequestClosed = (req) => U(req?.status) === "CLOSED";

    const [form, setForm] = useState({
        petType: "DOG",
        location: "",
        description: "",
    });
    const [sendingInterestIds, setSendingInterestIds] = useState(new Set());
    const pollRef = useRef(null);

    const maxLocation = 120;
    const maxDescription = 500;

    // figure out viewer's status for a request
    const myInterestStatusFrom = (req, myId) => {
        if (!myId || !req) return null;

        const direct =
            req.myInterestStatus ||
            req.myInterest?.status ||
            req.myStatus ||
            req.viewerStatus ||
            null;
        if (direct) return U(direct);

        const list = req?.interests || req?.interestsList || req?.requests || [];
        if (Array.isArray(list)) {
            const mine =
                list.find(
                    (i) =>
                        i?.senderId === myId ||
                        i?.userId === myId ||
                        i?.authorId === myId ||
                        i?.fromUserId === myId
                ) || null;

            if (mine?.status) return U(mine.status);
            if (req.acceptedInterestId && mine?.id === req.acceptedInterestId)
                return "ACCEPTED";
        }
        return null;
    };

    const withViewerStatus = (arr, myId) =>
        (arr || []).map((r) => ({
            ...r,
            __myStatus: myInterestStatusFrom(r, myId),
        }));

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            setInfo("");
            try {
                const me = await AuthApi.me().catch(() => null);
                const my = me?.data || null;
                if (!cancelled) setCurrentUser(my);

                const { data: roleData } = await AuthApi.getRoles();
                if (!cancelled) setRoles(roleData || []);

                const { data } = await MatchApi.recent(10);
                const base = Array.isArray(data) ? data : [];
                if (!cancelled) setRequests(withViewerStatus(base, my?.id));
            } catch (e) {
                if (!cancelled)
                    setError(
                        e?.response?.data?.message ||
                        e?.message ||
                        "Failed to load match requests"
                    );
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!currentUser?.id) return;
        let cancelled = false;
        const fetchRecent = async () => {
            try {
                const { data } = await MatchApi.recent(10);
                const base = Array.isArray(data) ? data : [];
                if (!cancelled) setRequests(withViewerStatus(base, currentUser.id));
            } catch {}
        };
        fetchRecent();
        pollRef.current = setInterval(fetchRecent, 10000);
        return () => {
            cancelled = true;
            clearInterval(pollRef.current);
        };
    }, [currentUser?.id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const limited =
            name === "location"
                ? value.slice(0, maxLocation)
                : name === "description"
                    ? value.slice(0, maxDescription)
                    : value;
        setForm((p) => ({ ...p, [name]: limited }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.location.trim() || !form.description.trim()) return;
        try {
            setError("");
            setInfo("");
            const dto = {
                petType: form.petType,
                location: form.location.trim(),
                description: form.description.trim(),
            };
            const { data } = await MatchApi.create(dto);
            setRequests((prev) => withViewerStatus([data, ...prev], currentUser?.id));
            setForm({ petType: "DOG", location: "", description: "" });
            setInfo("Your match request has been posted.");
        } catch (e) {
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to create match request"
            );
        }
    };

    const handleSendInterest = async (matchId) => {
        try {
            setError("");
            setInfo("");
            setSendingInterestIds((s) => new Set(s).add(matchId));
            // optimistic: show pending
            setRequests((prev) =>
                prev.map((r) =>
                    r.id === matchId ? { ...r, __myStatus: "PENDING" } : r
                )
            );
            await MatchApi.sendInterest(matchId);
            setInfo("Interest sent ✔");
        } catch (e) {
            // rollback if error
            setRequests((prev) =>
                prev.map((r) =>
                    r.id === matchId && r.__myStatus === "PENDING"
                        ? { ...r, __myStatus: null }
                        : r
                )
            );
            setError(
                e?.response?.data?.message || e?.message || "Failed to send interest"
            );
        } finally {
            setSendingInterestIds((s) => {
                const n = new Set(s);
                n.delete(matchId);
                return n;
            });
        }
    };

    const isOwn = (req) =>
        currentUser?.id != null && req.authorId === currentUser.id;

    const StatusBadge = ({ status }) => {
        if (!status) return null;
        const s = U(status);
        let cls = "badge-pending";
        let label = "Pending";
        if (s === "ACCEPTED") {
            cls = "badge-accepted";
            label = "Accepted";
        } else if (s === "DECLINED") {
            cls = "badge-declined";
            label = "Declined";
        } else if (s === "CLOSED") {
            cls = "badge-closed";
            label = "Closed";
        }
        return <span className={`match-status ${cls}`}>{label}</span>;
    };

    const handleDeleteAdmin = async (id) => {
        try {
            await AdminApi.deleteMatchRequest(id);
            setRequests((prev) => prev.filter((r) => r.id !== id));
            setInfo("Match request deleted ✔");
        } catch (e) {
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete match request"
            );
        }
    };

    const handleDelete = async (id) => {
        try {
            await MatchApi.deleteRequest(id);
            setRequests((prev) => prev.filter((r) => r.id !== id));
            setInfo("Match request deleted");
        } catch (e) {
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete match request"
            );
        }
    };

    return (
        <div className="match-container">
            <h2 className="match-title">Find a Pet Match</h2>

            {error && <div className="match-error">{error}</div>}
            {info && <div className="match-info">{info}</div>}

            <form className="match-form" onSubmit={handleSubmit}>
                <div className="match-form-group">
                    <label className="match-form-item" htmlFor="petType">
                        Pet Type
                    </label>
                    <select
                        id="petType"
                        name="petType"
                        value={form.petType}
                        onChange={handleChange}
                        className="match-select-pet-type"
                    >
                        {PET_ENUM_VALUES.map((v) => (
                            <option key={v} value={v}>
                                {petLabel(v)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="match-form-group">
                    <label className="match-form-item" htmlFor="location">
                        Location{" "}
                        <span className="muted">
              ({form.location.length}/{maxLocation})
            </span>
                    </label>
                    <input
                        type="text"
                        id="location"
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        placeholder="e.g. Central Park"
                        required
                        className="match-add-location"
                    />
                </div>

                <div className="match-form-group">
                    <label className="match-form-item" htmlFor="description">
                        Description{" "}
                        <span className="muted">
              ({form.description.length}/{maxDescription})
            </span>
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="What kind of pet meet-up are you looking for?"
                        required
                        className="match-add-description"
                    />
                </div>

                <button className="match-submit-btn" type="submit">
                    Post Request
                </button>
            </form>

            <div className="match-list">
                <h3 className="match-list-title">Recent Match Requests</h3>

                {loading && <p className="match-empty">Loading…</p>}
                {!loading && requests.length === 0 && (
                    <p className="match-empty">
                        No match requests yet. Be the first to post!
                    </p>
                )}

                {!loading &&
                    requests.map((req) => {
                        const myStatus = req.__myStatus;
                        const isOwner = isOwn(req);
                        const closed = isRequestClosed(req);

                        // Is the request globally accepted?
                        const requestAccepted = U(req.status) === "ACCEPTED";

                        // Minimal client-side derivation of the accepted sender
                        const acceptedInterest =
                            (Array.isArray(req.interests) ? req.interests : []).find(
                                (i) =>
                                    U(i?.status) === "ACCEPTED" ||
                                    i?.id === req?.acceptedInterestId
                            ) || null;

                        const acceptedSenderId =
                            acceptedInterest?.senderId ??
                            acceptedInterest?.userId ??
                            acceptedInterest?.authorId ??
                            acceptedInterest?.fromUserId ??
                            null;

                        // Sender sees Chat if their interest was accepted
                        const viewerAccepted =
                            (currentUser?.id != null &&
                                currentUser.id === acceptedSenderId) ||
                            U(myStatus) === "ACCEPTED"; // keep this as a helpful fallback if backend sets per-viewer status

                        const showChatForOwner = isOwner && (requestAccepted || closed);
                        const showChatForViewer = !isOwner && viewerAccepted;

                        return (
                            <div className="match-request" key={req.id}>
                                <div className="match-user-info">
                                    <div className="match-avatar" aria-hidden>
                                        {req.authorUsername?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <span className="match-username">{req.authorUsername}</span>
                                    <span className="match-date">
                    {req.createdAt
                        ? new Date(req.createdAt).toLocaleString()
                        : ""}
                  </span>
                                </div>

                                <div className="match-request-details">
                  <span className="match-pet-type">
                    🐾 {petLabel(req.petType)}
                  </span>
                                    <span className="match-location">📍 {req.location}</span>
                                    <p className="match-description">{req.description}</p>
                                    <p className="match-status-line">Status: {U(req.status)}</p>
                                </div>

                                <div className="match-requestBtn">
                                    {isOwner ? (
                                        <>
                                            {closed && <StatusBadge status="CLOSED" />}
                                            {showChatForOwner && (
                                                <button
                                                    className="chatBtn"
                                                    onClick={() =>
                                                        console.log("open chat for request", req.id)
                                                    }
                                                >
                                                    Chat
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {showChatForViewer ? (
                                                <>
                                                    <StatusBadge status="ACCEPTED" />
                                                    <button
                                                        className="chatBtn"
                                                        onClick={() =>
                                                            console.log("open chat with author", req.authorId)
                                                        }
                                                    >
                                                        Chat
                                                    </button>
                                                </>
                                            ) : closed ? (
                                                <StatusBadge status="CLOSED" />
                                            ) : myStatus ? (
                                                <StatusBadge status={myStatus} />
                                            ) : (
                                                <button
                                                    className="requestBtn"
                                                    onClick={() => handleSendInterest(req.id)}
                                                    disabled={sendingInterestIds.has(req.id)}
                                                >
                                                    {sendingInterestIds.has(req.id)
                                                        ? "sending…"
                                                        : "send request"}
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {isAdmin && (
                                        <button
                                            className="deleteBtn"
                                            onClick={() => handleDeleteAdmin(req.id)}
                                        >
                                            Delete
                                        </button>
                                    )}

                                    {isOwner && (
                                        <button
                                            className="deleteBtn"
                                            onClick={() => handleDelete(req.id)}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}