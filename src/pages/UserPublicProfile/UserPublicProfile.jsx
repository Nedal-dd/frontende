// src/pages/user/UserPublicProfile.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import { UsersApi, ProfileApi, FriendshipsApi, AuthApi } from "../../api/api";

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

                // Freundschafts-Status laden
                try {
                    const res = await FriendshipsApi.getStatus(userDto.id);
                    if (!abort) setFriendStatus(normalizeStatus(res?.data?.status));
                } catch {
                    if (!abort) setFriendStatus("NONE");
                }
            } catch {
                if (!abort) setError("Konnte Profil nicht laden.");
            } finally {
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
                                    className="profileAvatar"
                                    src={user.profilePictureUrl || "/assets/default-avatar.png"}
                                    alt={user.username}
                                />

                                <div className="profileHeadText">
                                    <h1 className="profileTitle">{user.username}</h1>
                                    <div className="profileLocation">
                                        {profile?.location ? `📍 ${profile.location}` : "📍 —"}
                                    </div>
                                </div>

                                {!isSelf && (
                                    isAccepted ? (
                                        <span className="profileFriendChip">✓ Friends</span>
                                    ) : isPending ? (
                                        <button className="profileButton profileButton--success" disabled>
                                            Request pending…
                                        </button>
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
                                <p><b>Messages allowed:</b> {profile?.allowMessages ? "Yes" : "No"}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
