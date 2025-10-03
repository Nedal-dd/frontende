import React from "react";
import { AdminApi, UsersApi } from "../../api/api";
import Topbar from "../../components/topbar/Topbar";

import "./allUsers.css";

export default function AllUsers() {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [q, setQ] = React.useState("");

    const LIMIT = 25;

    React.useEffect(() => {
        let alive = true;

        const load = async () => {
            try {
                setLoading(true);
                setError("");

                // 1) Load base list
                const { data } = await AdminApi.users(LIMIT);
                const base = Array.isArray(data) ? data : [];

                // 2) Fetch emails per user (in parallel)
                const results = await Promise.allSettled(
                    base.map(async (u) => {
                        const r = await UsersApi.getEmail(u.id);
                        // endpoint might return { email: "..." } OR plain string
                        const email =
                            (r.data && (r.data.email ?? r.data.value)) ?? r.data ?? null;
                        return { id: u.id, email };
                    })
                );

                // 3) Build a map id->email
                const emailMap = new Map();
                for (const res of results) {
                    if (res.status === "fulfilled") {
                        emailMap.set(res.value.id, res.value.email);
                    }
                }

                // 4) Merge email into user objects (prefer fetched email)
                const merged = base.map((u) => ({
                    ...u,
                    email: emailMap.get(u.id) ?? u.email ?? null,
                }));

                if (alive) setUsers(merged);
            } catch (e) {
                if (alive) setError(e?.message || "Failed to load users.");
            } finally {
                if (alive) setLoading(false);
            }
        };

        load();
        return () => {
            alive = false;
        };
    }, []);

    const filtered = React.useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return users;
        return users.filter((u) => {
            const username = (u.username || "").toLowerCase();
            const email = (u.email || "").toLowerCase();
            const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
            return (
                username.includes(term) || email.includes(term) || name.includes(term)
            );
        });
    }, [q, users]);

    const refresh = async () => {
        // simple reuse of the effect logic by toggling a key would be overkill;
        // just re-run the same load steps inline
        try {
            setLoading(true);
            setError("");
            const { data } = await AdminApi.users(LIMIT);
            const base = Array.isArray(data) ? data : [];

            const results = await Promise.allSettled(
                base.map(async (u) => {
                    const r = await UsersApi.getEmail(u.id);
                    const email =
                        (r.data && (r.data.email ?? r.data.value)) ?? r.data ?? null;
                    return { id: u.id, email };
                })
            );

            const emailMap = new Map();
            for (const res of results) {
                if (res.status === "fulfilled") {
                    emailMap.set(res.value.id, res.value.email);
                }
            }

            const merged = base.map((u) => ({
                ...u,
                email: emailMap.get(u.id) ?? u.email ?? null,
            }));

            setUsers(merged);
        } catch (e) {
            setError(e?.message || "Failed to reload users.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAdmin = async (id) => {
        try {
            await AdminApi.deleteUser(id);
            // entfernen aus Liste
            setUsers((prev) => prev.filter((u) => u.id !== id));
        } catch (e) {
            setError(
                e?.response?.data?.message || e?.message || "Failed to delete User"
            );
        }
    };

    return (
        <>
            <Topbar onHamburgerClick={() => setShowSidebarMenu((p) => !p)} />
            <div className="allUsers-container">
                <h2 className="allUsers-title">All Users</h2>

                <div className="allUsers-controls">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by username or email"
                        className="allUsers-search"
                    />
                    <button onClick={refresh} className="allUsers-refresh">
                        Refresh
                    </button>
                </div>

                {loading && <p>Loading users…</p>}
                {error && (
                    <p role="alert" className="allUsers-error">
                        {error}
                    </p>
                )}

                {!loading &&
                    !error &&
                    (filtered.length ? (
                        <table className="allUsers-table">
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((u) => (
                                <tr key={u.id}>
                                    <td>{u.id}</td>
                                    <td>{u.username ?? "-"}</td>
                                    <td>
                                        {u.email ?? "-"}{" "}
                                        <button
                                            className="deleteBtn"
                                            style={{ marginLeft: "44px" }}
                                            onClick={() => handleDeleteAdmin(u.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No users found.</p>
                    ))}
            </div>
        </>
    );
}