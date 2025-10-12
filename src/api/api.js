import axios from "axios";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8080",
    withCredentials: true,
});

// === Profile ===
export const ProfileApi = {
    getMe: () => api.get("/api/profile"), updateMe: (dto) =>
        api.put("/api/profile", dto),
    getByUserId: (id) => api.get(`/api/profile/${id}`),
};

//   `/api/users/${id}`
// === Auth ===
export const AuthApi = {
    login: ({ username, password }) =>
        api.post("/auth/login", new URLSearchParams({ username, password }).toString(),  { headers: { "Content-Type": "application/x-www-form-urlencoded" } } ),

    me: () => api.get("/auth/me"),
    register: (dto) => api.post("/auth/register", dto),
    changePassword: (id, newPassword) =>
        api.put(`/auth/${id}/change-password`, newPassword, {
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
        }),
    logout: () => api.post("/auth/logout"),
    getRoles: () => api.get("/auth/roles"),
    forgotPasswordStart: (email) =>
        api.post("/auth/forgot-password", email, {
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
        }),
    forgotPasswordVerify: ({ email, code, newPassword }) =>
        api.post("/auth/forgot-password/verify", { email, code, newPassword }),
};

// === Users ===
export const UsersApi = {
    list: () => api.get("/api/users"),
    get: (id) => api.get(`/api/users/${id}`),
    delete: (id) => api.delete(`/api/users/${id}`),
    updatePassword: (id, newPassword) =>
        api.put(`/api/users/${id}/password`, { newPassword }),
    updateProfilePicture: (id, url) =>
        api.put(`/api/users/${id}/profile-picture`, url, {
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
        }),
    updateUsername: (id, newUsername) =>
        api.put(`/api/users/${id}/username`, newUsername, {
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
        }),
    updateEmail: (id, newEmail) =>
        api.put(`/api/users/${id}/email`, newEmail, {
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
        }),
    getEmail: (id) => api.get(`/api/users/${id}/email`),
    search: (query) => api.get("/api/users/search", { params: { query } }),
    pets: (id) => api.get(`/api/users/${id}/pets`),
    posts: (id) => api.get(`/api/users/${id}/posts`),
    friends: (id) => api.get(`/api/users/${id}/friends`),
    mutualFriends: (id, otherUserId) =>
        api.get(`/api/users/${id}/mutual-friends/${otherUserId}`),
    friendsCount: (id) => api.get(`/api/users/${id}/getFriendsCount`),
};

// === Posts ===
export const PostsApi = {
    list: (params) => api.get("/api/posts", { params }),
    listFriends: (params) => api.get("/api/posts/friends", { params }),
    get: (id) => api.get(`/api/posts/${id}`),
    create: (dto) => api.post("/api/posts", dto),
    update: (id, dto) => api.put(`/api/posts/${id}`, dto),
    delete: (id) => api.delete(`/api/posts/${id}`),
    comments: (postId, params) =>
        api.get(`/api/posts/${postId}/comments`, { params }),
    addComment: (postId, dto) => api.post(`/api/posts/${postId}/comments`, dto),
    updateComment: (postId, commentId, dto) =>
        api.put(`/api/posts/${postId}/comments/${commentId}`, dto),
    deleteComment: (postId, commentId) =>
        api.delete(`/api/posts/${postId}/comments/${commentId}`),
    like: (postId) => api.post(`/api/posts/${postId}/like` , {}),
    unlike: (postId) => api.post(`/api/posts/${postId}/unlike` , {}),
    likeUsers: (postId) => api.get(`/api/posts/${postId}/likes`),
    likeCount: (postId) => api.get(`/api/posts/${postId}/likes/count`),
};

// === Pets ===
export const PetsApi = {
    list: () => api.get("/api/pets"),
    get: (id) => api.get(`/api/pets/${id}`),
    create: (dto) => api.post("/api/pets", dto),
    update: (id, dto) => api.put(`/api/pets/${id}`, dto),
    delete: (id) => api.delete(`/api/pets/${id}`),
};

// === Pet Types ===
export const PetTypesApi = {
    list: () => api.get("/api/pet-types"),
};

// === Friendships ===
export const FriendshipsApi = {
    list: () => api.get("/api/friendships"),
    get: (id) => api.get(`/api/friendships/${id}`),
    create: (dto) => api.post("/api/friendships", dto),
    accept: (id) => api.post(`/api/friendships/${id}/accept`),
    decline: (id) => api.post(`/api/friendships/${id}/decline`),
    delete: (id) => api.delete(`/api/friendships/${id}`),
    getStatus: (otherUserId) => api.get(`/api/friendships/status/${otherUserId}`),
};

// === Match ===
export const MatchApi = {
    create: (dto) => api.post("/api/match", dto),
    recent: (limit = 10) => api.get("/api/match/recent", { params: { limit } }),
    sendInterest: (id) => api.post(`/api/match/${id}/send-interest`),
    accept: (interestId) =>
        api.post(`/api/match/interests/${interestId}/accept`),
    decline: (interestId) =>
        api.post(`/api/match/interests/${interestId}/decline`),
    close: (id) => api.post(`/api/match/${id}/close`),
    deleteRequest: (id) => api.delete(`/api/match/${id}`),
    deleteInterest: (id) => api.delete(`/api/match/${id}/unsent-interest`),
    acceptedPeer: (matchId) => api.get(`/api/match/${matchId}/accepted-peer`),
    currentMatchId: () => api.get("/api/match/currentMatchId"),
};

// === Notifications ===
export const NotificationsApi = {
    list: () => api.get("/api/notifications"),
    count: () => api.get("/api/notifications/count"),
    readOne: (id) => api.post(`/api/notifications/${id}/read`),
    readAll: () => api.post("/api/notifications/read-all"),
    getOne: (id) => api.get(`/api/oneNotfication/${id}`),
};

// === Presence ===
export const PresenceApi = {
    onlineFriends: () => api.get("/presence/friends"),
};

// === Chat (REST + STOMP) ===
export const ChatApi = {
    history: (senderId, recipientId) =>
        api.get(`/api/chat/${senderId}/${recipientId}`),
};

export function connectChat({ onMessage } = {}) {
    const base = import.meta.env.VITE_API_BASE || "http://localhost:8080";
    const client = new Client({
        webSocketFactory: () => new SockJS(`${base}/ws`),
        reconnectDelay: 3000,
    });

    client.onConnect = () => {
        client.subscribe("/user/queue/messages", (frame) => {
            const payload = frame?.body ? JSON.parse(frame.body) : null;
            onMessage?.(payload);
        });
    };

    client.activate();

    const send = ({ senderId, recipientId, content, dateTime }) =>
        client.publish({
            destination: "/app/chat",
            body: JSON.stringify({ senderId, recipientId, content, dateTime }),
        });

    return { client, send };
}


// === Admin ===
export const AdminApi = {
    // GET /api/admin/dashboard
    dashboard: () => api.get("/api/admin/dashboard"),

    // GET /api/admin/users
    users: (limit = 10) =>
        api.get("/api/admin/users", { params: { limit } }),
    // DELETE /api/admin/{id}/deleteUser
    deleteUser: (id) => api.delete(`/api/admin/${id}/deleteUser`),

    // DELETE /api/admin/{id}/deleteMatchRequest
    deleteMatchRequest: (id) => api.delete(`/api/admin/${id}/deleteMatchRequest`),

    // DELETE /api/admin/{id}/deletePost
    deletePost: (id) => api.delete(`/api/admin/${id}/deletePost`),

    // DELETE /api/admin/{postId}/{commentId}/deleteComment
    deleteComment: (postId, commentId) =>
        api.delete(`/api/admin/${postId}/${commentId}/deleteComment`),
};