import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Login.css";
import { AuthApi } from "../../api/api"; // ✅ import from your combined api.js

export default function SignupForm() {
  const [data, setData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) =>
    setData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (data.password !== data.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    try {
      const res = await AuthApi.register({
        username: data.username,
        email: data.email,
        password: data.password,
      });

      if (res.status === 201) {
        alert("Signup successful!");
        // optional: redirect directly to login or home
        // window.location.href = "/login";
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert("Signup failed. Please try again.");
    }
  };

  return (
    <section className="login-wrapper">
      <form onSubmit={handleSubmit}>
        <h1>Sign Up</h1>
        <div className="inputbox">
          <ion-icon name="person-outline"></ion-icon>
          <input
            name="username"
            type="text"
            required
            value={data.username}
            onChange={handleChange}
          />
          <label>Name</label>
        </div>
        <div className="inputbox">
          <ion-icon name="mail-outline"></ion-icon>
          <input
            name="email"
            type="email"
            required
            value={data.email}
            onChange={handleChange}
          />
          <label>Email</label>
        </div>
        <div className="inputbox">
          <ion-icon name="lock-closed-outline"></ion-icon>
          <input
            name="password"
            type="password"
            required
            value={data.password}
            onChange={handleChange}
          />
          <label>Password</label>
        </div>
        <div className="inputbox">
          <ion-icon name="lock-closed-outline"></ion-icon>
          <input
            name="confirmPassword"
            type="password"
            required
            value={data.confirmPassword}
            onChange={handleChange}
          />
          <label>Confirm Password</label>
        </div>
        <button type="submit">Sign Up</button>
        <div className="register">
          <p>
            Already have an account? <Link to="/login">Log In</Link>
          </p>
        </div>
      </form>
    </section>
  );
}
