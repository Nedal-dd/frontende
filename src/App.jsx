import { Routes, Route, Navigate } from "react-router-dom";
import Topbar from "./components/topbar/Topbar";
import Home from "./pages/Home/home";
import Match from "./pages/Match/Match";
import Login from "./pages/login/Login";
import SignupForm from "./pages/login/SignupForm";
import Profile from "./pages/Profile/Profile";
import UserPublicProfile from "./pages/UserPublicProfile/UserPublicProfile";
import "./App.css";
import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_BASE } from "./api/api";
import AllUsers from "./pages/AllUsers/AllUsers";
import ForgotPassword from "./pages/login/ForgotPassword";

function App() {
    const stompRef = useRef(null);

    useEffect(() => {
        // background websocket just for presence
        const sock = new SockJS(WS_BASE, null, {
            transportOptions: {
                xhrStream: { withCredentials: true },
                xhrPolling: { withCredentials: true },
            },
        });
        const client = new Client({
            webSocketFactory: () => sock,
            reconnectDelay: 3000,
        });
        client.activate();
        stompRef.current = client;

        return () => {
            client.deactivate();
            stompRef.current = null;
        };
    }, []);

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/match" element={<Match />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/Profile" element={<Profile />} />
            <Route path="/users/:id" element={<UserPublicProfile />} />
            <Route path="/allUsers" element={<AllUsers />} />
        </Routes>
    );
}
export default App;