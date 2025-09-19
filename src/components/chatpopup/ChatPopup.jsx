/*
import { useState } from "react";
import "./chatPopup.css";

export default function ChatPopup({ onClose }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "Shirley", text: "Hey there!" },
    { sender: "You", text: "Hello 😊" },
  ]);

  const handleSend = () => {
    if (input.trim() === "") return;

    setMessages([...messages, { sender: "You", text: input }]);
    setInput(""); // clear input
  };

  return (
    <div className="chatPopup">
      <div className="chatHeader">
        <span>Chat</span>
        <button className="chatCloseBtn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="chatMessages">
        {messages.map((msg, idx) => (
          <p key={idx}>
            <strong>{msg.sender}:</strong> {msg.text}
          </p>
        ))}
      </div>

      <div className="chatInputWrapper">
        <input
          className="chatInput"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button className="chatSendBtn" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}*/
// src/components/ChatPopup.jsx
import { useEffect, useRef, useState } from "react";
import "./chatPopup.css";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const API_BASE = import.meta.env.VITE_API_BASE; // e.g. http://localhost:8080
const WS_URL = import.meta.env.VITE_WS_URL; // e.g. http://localhost:8080/ws

export default function ChatPopup({
  friends = [],
  currentUser,
  token,
  onClose,
}) {
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]); // ChatMessageDTO[]
  const [input, setInput] = useState("");
  const stompRef = useRef(null);
  const subRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- WebSocket connect (once) ----
  useEffect(() => {
    const sock = new SockJS(WS_URL);
    const client = new Client({
      webSocketFactory: () => sock,
      reconnectDelay: 3000,
      onConnect: () => {
        // Personal queue subscription
        subRef.current = client.subscribe("/user/queue/messages", (frame) => {
          const dto = JSON.parse(frame.body); // {id, senderUsername, recipientUsername, content, dateTime}
          // Nur anzeigen, wenn es zur aktuellen Konversation gehört (optional)
          if (!selectedFriend || !currentUser) {
            setMessages((prev) => [...prev, dto]);
            return;
          }
          const involvesSelected =
            (dto.senderUsername === selectedFriend.username &&
              dto.recipientUsername === currentUser.username) ||
            (dto.senderUsername === currentUser.username &&
              dto.recipientUsername === selectedFriend.username);
          setMessages((prev) => (involvesSelected ? [...prev, dto] : prev));
        });
      },
    });

    if (token) client.connectHeaders = { Authorization: `Bearer ${token}` };
    client.activate();
    stompRef.current = client;

    return () => {
      try {
        subRef.current?.unsubscribe();
      } catch {}
      client.deactivate();
      stompRef.current = null;
    };
  }, [token, currentUser, selectedFriend]);

  // ---- Load history when friend changes ----
  useEffect(() => {
    if (!selectedFriend || !currentUser) return;
    (async () => {
      const url = `${API_BASE}/messages/${currentUser.id}/${selectedFriend.id}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        console.error("History HTTP", res.status);
        return;
      }
      const list = await res.json(); // List<ChatMessageDTO>
      setMessages(list);
    })();
  }, [selectedFriend, currentUser, token]);

  const handleSend = () => {
    if (!input.trim() || !selectedFriend) return;
    const client = stompRef.current;
    if (!client || !client.connected) return;

    // Payload to @MessageMapping("/chat") -> ChatMessage entity fields
    const body = {
      senderId: currentUser.id,
      recipientId: selectedFriend.id,
      content: input.trim(),
    };

    client.publish({
      destination: "/app/chat",
      body: JSON.stringify(body),
      // headers: token ? { Authorization: `Bearer ${token}` } : undefined, // only if server checks it here
    });

    // Optimistic echo (optional)
    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        senderUsername: currentUser.username,
        recipientUsername: selectedFriend.username,
        content: input.trim(),
        dateTime: new Date().toISOString(),
      },
    ]);
    setInput("");
  };

  return (
    <div className="chatPopup">
      <div className="chatHeader">
        <span>
          {selectedFriend
            ? `Chat with ${selectedFriend.username}`
            : "Choose a friend"}
        </span>
        <button className="chatCloseBtn" onClick={onClose}>
          ×
        </button>
      </div>

      {!selectedFriend && (
        <div className="friendList">
          {friends.map((f) => (
            <div
              key={f.id}
              className="friendItem"
              onClick={() => setSelectedFriend(f)}
            >
              <img src={f.profilePicture} alt="" className="friendImg" />
              <span>{f.username}</span>
            </div>
          ))}
        </div>
      )}

      {selectedFriend && (
        <>
          <div className="chatMessages">
            {messages.map((m, idx) => (
              <p key={m.id ?? idx}>
                <strong>
                  {m.senderUsername ??
                    (m.senderId === currentUser.id
                      ? currentUser.username
                      : selectedFriend.username)}
                  :
                </strong>{" "}
                {m.content}
              </p>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="chatInputWrapper">
            <input
              className="chatInput"
              placeholder={`Message ${selectedFriend.username}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
