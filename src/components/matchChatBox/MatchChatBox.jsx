import { useEffect, useRef, useState } from "react";
import "./matchchatbox.css";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { ChatApi } from "../../api/api";
import { fmtTime } from "../../utils/datetime";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
const WS_BASE = `${API_BASE}/ws`;

export default function MatchChatBox({
                                         currentUser,
                                         matchedUsers = [],
                                         onClose,
                                     }) {

    const [selectedInterestMatch, setSelectedInterestMatch] = useState(null);
    const [messages, setMessages] = useState([]); // ChatMessageDTO[]
    const [input, setInput] = useState("");

    const stompRef = useRef(null);
    const subRef = useRef(null);
    const bottomRef = useRef(null);

    // ---------- helpers ----------
    const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };

    const normalizeUsers = (data) =>
        (data || [])
            .map((u) => ({
                id: toNum(u?.id ?? u?.user?.id ?? u?.friendId),
                username: String(
                    u?.username ?? u?.user?.username ?? u?.friend?.username ?? ""
                ).trim(),
            }))
            .filter((x) => x.id !== null && x.username);

    const interestMatches = normalizeUsers(matchedUsers);

    // ---------- WebSocket ----------
    useEffect(() => {
        const sock = new SockJS(WS_BASE, null, {
            transportOptions: {
                xhrStream: { withCredentials: true },
                xhrPolling: { withCredentials: true },
            },
        });

        const client = new Client({
            webSocketFactory: () => sock,
            reconnectDelay: 3000,
            onConnect: () => {
                subRef.current = client.subscribe("/user/queue/messages", (frame) => {
                    try {
                        const dto = JSON.parse(frame.body);
                        setMessages((prev) => [...prev, dto]);
                    } catch (e) {
                        console.error("WS frame parse error:", e);
                    }
                });
            },
        });

        client.debug = (msg) => console.log("[STOMP]", msg);
        client.activate();
        stompRef.current = client;

        return () => {
            try {
                subRef.current?.unsubscribe();
            } catch {}
            client.deactivate();
            stompRef.current = null;
        };
    }, []);

    // ---------- load history when a match is selected ----------
    useEffect(() => {
        if (!selectedInterestMatch?.id || !currentUser?.id) return;
        (async () => {
            try {
                const res = await ChatApi.history(
                    currentUser.id,
                    selectedInterestMatch.id
                );
                const list = Array.isArray(res.data) ? res.data : [];
                setMessages((prev) => {
                    const isThisPair = (m) =>
                        (m.senderUsername === currentUser.username &&
                            m.recipientUsername === selectedInterestMatch.username) ||
                        (m.senderUsername === selectedInterestMatch.username &&
                            m.recipientUsername === currentUser.username);
                    const others = prev.filter((m) => !isThisPair(m));
                    return [...others, ...list];
                });
            } catch (err) {
                console.error("Failed to load history:", err);
            }
        })();
    }, [selectedInterestMatch?.id, currentUser?.id]);

    // ---------- auto-scroll ----------
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, selectedInterestMatch]);

    // ---------- send message ----------
    const handleSend = () => {
        const content = input.trim();
        if (!content || !selectedInterestMatch || !currentUser) return;
        const client = stompRef.current;
        if (!client || !client.connected) return;

        client.publish({
            destination: "/app/chat",
            body: JSON.stringify({ recipientId: selectedInterestMatch.id, content }),
        });

        setInput("");
    };

    const goBack = () => {
        setSelectedInterestMatch(null);
        setInput("");
    };

    const visible = selectedInterestMatch
        ? messages.filter(
            (m) =>
                (m.senderUsername === currentUser?.username &&
                    m.recipientUsername === selectedInterestMatch.username) ||
                (m.senderUsername === selectedInterestMatch.username &&
                    m.recipientUsername === currentUser?.username)
        )
        : [];

    // ---------- render ----------
    return (
        <div className="chatPopup">
            <div className="chatHeader">
                {selectedInterestMatch && (
                    <button className="chatBackBtn" onClick={goBack} title="Back" />
                )}
                <span>
          {selectedInterestMatch
              ? `Chat with ${selectedInterestMatch.username}`
              : "Choose a match"}
        </span>
                <button className="chatCloseBtn" onClick={onClose}>
                    ×
                </button>
            </div>

            {!selectedInterestMatch ? (
                <ul className="friendList">
                    {interestMatches.map((u) => {
                        return (
                            <li
                                key={u.id}
                                className="friendItem rightbarFriend"
                                onClick={() => setSelectedInterestMatch(u)}
                                style={{ cursor: "pointer" }}
                            >
                                <div className="rightbarProfileImgContainer" />
                                <span className="rightbarUsername">{u.username} </span>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <>
                    <div className="chatSubHeader">
                        <button className="chatBackLink" onClick={goBack}>
                            ← Back to matches
                        </button>
                    </div>

                    <div className="chatMessages">
                        {visible.map((m, idx) => (
                            <p key={m.id ?? idx}>
                                <strong>{m.senderUsername}:</strong> {m.content}
                                <span className="time"> {fmtTime(m.dateTime)}</span>
                            </p>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    <div className="chatInputWrapper">
                        <input
                            className="chatInput"
                            placeholder={`Message ${selectedInterestMatch.username}...`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSend();
                                if (e.key === "Escape") goBack();
                            }}
                        />
                        <button className="chatSendBtn" onClick={handleSend}>
                            Send
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
