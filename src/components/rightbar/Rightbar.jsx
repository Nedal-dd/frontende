// Rightbar.jsx
import { useEffect, useState } from "react";
import "./rightbar.css";
import { Link } from "react-router-dom";
import Online from "../online/online";
import { PresenceApi } from "../../api/api"; // axios instance w/ baseURL + withCredentials

export default function Rightbar() {
    const [onlineFriends, setOnlineFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    useEffect(() => {
        let cancelled = false;
        let timer;

        const load = async () => {
            try {
                const { data } = await PresenceApi.onlineFriends(); // GET /presence/friends
                if (!cancelled) setOnlineFriends(Array.isArray(data) ? data : []);
            } catch (e) {
                if (!cancelled)
                    setErr(
                        e.response?.data?.message ||
                        e.message ||
                        "Failed to load online friends"
                    );
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        // initial fetch + polling
        load();
        timer = setInterval(load, 15000); // every 15s

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    if (loading) return null;
    if (err) return <div className="rightbar">Error: {err}</div>;

    return (
        <div className="rightbar">
            <div className="rightbarWrapper">
                <h4 className="rightbarTitle">Find a Match!</h4>
                <p className="rightbarText">
                    Looking for other pet owners with similar interests or needs? Try our
                    matching feature!
                </p>
                <Link to="/match" className="rightbarMatchButton">
                    Go to Matching Page
                </Link>

                <hr className="sidebarHr" />
                <h4 className="rightbarTitle">Online Friends</h4>
                <ul className="rightbarFriendList">
                    {onlineFriends.map((u) => (
                        <Online key={u.id} user={u} />
                    ))}
                </ul>
            </div>
        </div>
    );
}