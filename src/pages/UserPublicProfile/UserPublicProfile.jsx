// src/pages/user/UserPublicProfile.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import { UsersApi, ProfileApi, FriendshipsApi, AuthApi } from "../../api/api";
import { resolveAvatarSrc, DEFAULT_AVATAR_URL } from "../../utils/image";
import "./userPublicProfile.css";


// Helpers
const fromPetEnum = (e) =>
    ({ DOG: "Dog", CAT: "Cat", BIRD: "Bird", OTHER: "Other" }[e] || "Other");
const fromLookingEnum = (e) =>
    ({ PLAYDATES: "Playdates", TRAINING: "Training", SITTING: "Sitting", MEETUPS: "Meetups" }[e] || "Playdates");

const normalizeStatus = (s) => {
    if (!s) return "NONE";
    const up = String(s).toUpperCase();
    if (["ACCEPTED", "FRIENDS", "FRIEND", "APPROVED"].includes(up)) return "ACCEPTED";
    if (["PENDING", "REQUESTED"].includes(up)) return "PENDING";
    return "NONE";
};


export default function UserPublicProfile() {

    const { id } = useParams();

    const [me, setMe] = useState(null);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [friendBusy, setFriendBusy] = useState(false);
    const [error, setError] = useState("");

    // Backend-Status: "NONE" | "PENDING" | "ACCEPTED"
    const [friendStatus, setFriendStatus] = useState("NONE");
    const isPending = friendStatus === "PENDING";
    const isAccepted = friendStatus === "ACCEPTED";
    //
    const [friendshipId, setFriendshipId] = useState(null);   // für ACCEPTED -> delete
    const [iAmRequester, setIAmRequester] = useState(false);  // bin ich der Sender?        // für PENDING  -> cancel

    const isSelf = useMemo(
        () => !!me && !!user && String(me.id) === String(user.id),
        [me, user]
    );

    // Initial load
    useEffect(() => {
        let abort = false;
        (async () => {
            try {
                setLoading(true);
                setError("");

                const [{ data: meData }, { data: userDto }] = await Promise.all([
                    AuthApi.me(),
                    UsersApi.get(id),
                ]);
                if (abort) return;

                setMe(meData);
                setUser(userDto);

                // Profil (tolerant gg. 404)
                try {
                    const { data: prof } = await ProfileApi.getByUserId(id);
                    if (!abort) setProfile(prof);
                } catch {
                    if (!abort) setProfile(null);
                }

                // Freundschafts-Status laden (FriendshipDTO: { id, userId, friendId, status })
                try {
                    const res = await FriendshipsApi.getStatus(userDto.id);
                    const data = res?.data ?? {};
                    const st = normalizeStatus(data.status);
                    if (abort) return;
                    setFriendStatus(st);
                    // eine ID reicht für Cancel (PENDING) und Remove (ACCEPTED)
                    setFriendshipId(data?.id ?? null);
                    // bin ich der Sender? (für "Cancel Request")
                    setIAmRequester(String(data?.userId) === String(meData.id));
                } catch {
                    if (!abort) {
                        setFriendStatus("NONE");
                        setFriendshipId(null);
                        setIAmRequester(false);
                    }
                }
            } catch {
                   if (!abort) {
                         setFriendStatus("NONE");
                         setFriendshipId(null);
                            setIAmRequester(false);
                       }
                 }


            finally {
                if (!abort) setLoading(false);
            }
        })();
        return () => {
            abort = true;
        };
    }, [id]);

    // Add Friend
    const handleAddFriend = async () => {
        if (!user || isPending || isAccepted) return;
        try {
            setFriendBusy(true);
            setError("");
            await FriendshipsApi.create({ friendId: user.id }); // Backend erwartet friendId
            // Optimistic
            setFriendStatus("PENDING");
        } catch (e) {
            const code = e?.response?.status || e?.status;
            const msg =
                e?.response?.data?.message ||
                e?.response?.data?.error ||
                e?.message || "";
            if (code === 409 || /already exists|pending|duplicate/i.test(msg)) {
                setFriendStatus("PENDING");
            } else {
                setError("Freundschaftsanfrage fehlgeschlagen.");
            }
        } finally {
            setFriendBusy(false);
        }
    };
    // Cancel pending request
    const handleCancelRequest = async () => {
        if (!isPending || friendBusy || !iAmRequester) return;
        try {
            setFriendBusy(true);
            setError("");
            if (friendshipId) {
                await FriendshipsApi.delete(friendshipId);
            }
            // Optimistic
            setFriendStatus("NONE");
            setFriendshipId(null);
            setIAmRequester(false);
        } catch (e) {
            setError("Konnte Anfrage nicht abbrechen.");
        } finally {
            setFriendBusy(false);
        }
    };


// Remove friendship (beidseitig beenden)
    const handleRemoveFriend = async () => {
        if (!isAccepted || friendBusy) return;
        try {
            setFriendBusy(true);
            setError("");
            if (friendshipId) await FriendshipsApi.delete(friendshipId);
            // Optimistic
            setFriendStatus("NONE");
            setFriendshipId(null);
            setIAmRequester(false);
        } catch (e) {
            setError("Konnte Freundschaft nicht löschen.");
        } finally {
            setFriendBusy(false);
        }
    };


    // Avatar-URL (Profil oder Default)
    const avatarUrl =
        profile && profile.urlProfilePicture
            ? resolveAvatarSrc(profile.urlProfilePicture)
            : DEFAULT_AVATAR_URL;

    return (
        <>
            <Topbar
                friendStatus={friendStatus}
                viewedUserId={user?.id}
                // Falls im Topbar eine Anfrage akzeptiert/abgelehnt wird,
                // springt der Status hier sofort um:
                onFriendshipChange={(newStatus) => setFriendStatus(normalizeStatus(newStatus))}
            />

            <div className="homeContainer">
                <Sidebar />

                <div className="profileContainer">
                    {loading && <div className="loading">Wird geladen…</div>}
                    {!loading && error && <div className="error">{error}</div>}

                    {!loading && user && (
                        <div className="profileCard">
                            <div className="profileHeader">
                                <img
                                    className="profileAvatar "
                                    src={avatarUrl || "/assets/default-avatar.png"}
                                    alt={user.username}
                                    onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR_URL)}
                                />

                                <div className="profileHeadText">
                                    <h1 className="profileTitle">{user.username}</h1>
                                    <div className="profileLocation">
                                        {profile?.location ? `📍 ${profile.location}` : "📍 —"}
                                    </div>
                                </div>

                                {!isSelf && (
                                    isAccepted ? (
                                        <div className="profileActions">
                                            <span className="profileFriendChip">✓ Friends</span>
                                            <button
                                                className="profileButton profileButton--danger"
                                                disabled={friendBusy}
                                                onClick={handleRemoveFriend}
                                                title="Remove friendship"
                                            >
                                                {friendBusy ? "Removing…" : "Remove Friendship"}
                                            </button>
                                        </div>
                                    ) : isPending ? (
                                        <div className="profileActions">
                                            <button className="profileButton profileButton--muted" disabled>
                                                Request pending…
                                            </button>
                                            {iAmRequester && (
                                                <button
                                                    className="profileButton profileButton--secondary"
                                                    disabled={friendBusy}
                                                    onClick={handleCancelRequest}
                                                    title="Cancel friend request"
                                                >
                                                    {friendBusy ? "Cancelling…" : "Cancel Request"}
                                                </button>
                                            )}
                                        </div>

                                    ) : (
                                        <button
                                            className="profileButton profileButton--primary"
                                            disabled={friendBusy}
                                            onClick={handleAddFriend}
                                        >
                                            {friendBusy ? "Sending…" : "Add Friend"}
                                        </button>
                                    )
                                )}



                            </div>

                            <hr className="profileDivider" />

                            <div className="profileDetails">
                                <p><b>About:</b> {profile?.bio || "—"}</p>
                                <p><b>Pet type:</b> {fromPetEnum(profile?.petType)}</p>
                                <p><b>Looking for:</b> {fromLookingEnum(profile?.lookingFor)}</p>
                                <p><b>Topics:</b> {profile?.topics || "—"}</p>
                                <p><b>Preferred days:</b> {profile?.days || "—"}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
