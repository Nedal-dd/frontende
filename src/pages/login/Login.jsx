import React, { useState } from "react";
import "./Login.css";

import { AuthApi } from "../../api/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const body = new URLSearchParams({ username, password }).toString();

      await AuthApi.login({ username, password });

      // session cookie is now stored by the browser
      window.location.href = "/home";
    } catch (err) {
      if (err.response?.status === 401) {
        setErrorMessage("Invalid username or password.");
      } else {
        const msg =
          err.response?.data ||
          `Login failed (HTTP ${err.response?.status || "?"})`;
        setErrorMessage(msg);
      }
    }
  };

  return (
    <section className="login-wrapper">
      <form onSubmit={handleSubmit}>
        <h1>Login</h1>

        {errorMessage && (
          <div className="dialog-row">
            <label className="text-center redText">{errorMessage}</label>
          </div>
        )}

        <div className="inputbox">
          <ion-icon name="person-outline"></ion-icon>
          <input
            name="username"
            id="username"
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label htmlFor="username">Username</label>
        </div>

        <div className="inputbox">
          <ion-icon name="lock-closed-outline"></ion-icon>
          <input
            name="password"
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label htmlFor="password">Password</label>
        </div>

        <div className="register">
          <p>
            <a href="/forgot-password">Forget Password?</a>
          </p>
        </div>

        <button type="submit">Log in</button>

        <div className="register">
          <p>
            Don't have an account? <a href="/signup">Register!!</a>
          </p>
        </div>
      </form>
    </section>
  );
}
