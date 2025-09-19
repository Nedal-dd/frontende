import { useState } from "react";

import { Users } from "../../dummyData";
import "./matchContainer.css";

export default function matchContainer() {
  // Dummy user data for demonstration (replace with real user data as needed)
  const currentUser = {
    id: 1,
    username: "petlover123",
    profilePicture: "/assets/001.jpg",
  };

  const petTypes = ["Dog", "Cat", "Bird", "Rabbit", "Reptile", "Other"];

  // Use Users from dummyData for suggestions
  const [requests, setRequests] = useState(
    Users.slice(0, 5).map((user, idx) => ({
      id: idx + 1,
      user: {
        username: user.username,
        profilePicture: user.profilePicture,
      },
      petType: "Dog",
      location: "Central Park",
      description: `Looking for a pet meet-up!`,
      createdAt: new Date().toLocaleString(),
    }))
  );

  const [form, setForm] = useState({
    petType: "Dog",
    location: "",
    description: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.location.trim()) return;
    const newRequest = {
      id: Date.now(),
      user: {
        username: currentUser.username,
        profilePicture: currentUser.profilePicture,
      },
      petType: form.petType,
      location: form.location,
      description: form.description,
      createdAt: new Date().toLocaleString(),
    };
    setRequests([newRequest, ...requests]);
    setForm({ petType: "Dog", location: "", description: "" });
  };

  return (
    <div className="match-container">
      <h2 className="match-title">Find a Pet Match</h2>
      <form className="match-form" onSubmit={handleSubmit}>
        <div className="match-form-group">
          <label className="match-form-item" htmlFor="petType">
            Pet Type
          </label>
          <select
            id="petType"
            name="petType"
            value={form.petType}
            onChange={handleChange}
            className="match-select-pet-type"
          >
            {petTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="match-form-group">
          <label className="match-form-item" htmlFor="location">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. Central Park"
            required
            className="match-add-location"
          />
        </div>
        <div className="match-form-group">
          <label className="match-form-item" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe what kind of pet meet-up you're looking for..."
            required
            className="match-add-description"
          />
        </div>
        <button className="match-submit-btn" type="submit">
          Post Request
        </button>
      </form>

      <div className="match-list">
        <h3 className="match-list-title">Recent Match Requests</h3>
        {requests.length === 0 ? (
          <p className="match-empty">
            No match requests yet. Be the first to post!
          </p>
        ) : (
          requests.map((req) => (
            <div className="match-request" key={req.id}>
              <div className="match-user-info">
                <img
                  src={req.user.profilePicture}
                  alt={req.user.username}
                  className="match-user-img"
                />
                <span className="match-username">{req.user.username}</span>
                <span className="match-date">{req.createdAt}</span>
              </div>
              <div className="match-request-details">
                <span className="match-pet-type">🐾 {req.petType}</span>
                <span className="match-location">📍 {req.location}</span>
                <p className="match-description">{req.description}</p>
              </div>
              <div className="match-requestBtn">
                <button className="requestBtn"> send request</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
