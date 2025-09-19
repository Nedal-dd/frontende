import { Routes, Route, Navigate } from "react-router-dom";
import Topbar from "./components/topbar/Topbar";
import Home from "./pages/Home/home";
import Match from "./pages/Match/Match";
import Login from "./pages/login/Login";
import SignupForm from "./pages/login/SignupForm";
import Profile from "./pages/Profile/Profile";
import UserPublicProfile from "./pages/UserPublicProfile/UserPublicProfile";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/match" element={<Match />} />
      <Route path="/signup" element={<SignupForm />} />
      <Route path="/Profile" element={<Profile />} />
      <Route path="/users/:id" element={<UserPublicProfile />} />
    </Routes>
  );
}
export default App;
