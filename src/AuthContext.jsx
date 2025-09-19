import { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data); // backend Rückgabe { id, username, ... }
      } catch (err) {
        console.error("Failed to fetch logged-in user", err);
        setUser(null); // stelle sicher, dass user null ist, wenn nicht eingeloggt
      }
    };

    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
