import React, { useState } from "react";
import { useSecurity } from "../context/SecurityContext";

const LockScreen = () => {
  const [password, setPassword] = useState("");
  const { unlock } = useSecurity();
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple hardcoded pin for demo purposes, or user password verification could be added
    if (password === "1234") { 
      unlock();
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800 text-white">
      <div className="bg-gray-900 p-8 rounded shadow-lg w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold mb-4">App Locked</h2>
        <p className="mb-4 text-gray-400">Enter PIN (1234) to unlock</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded text-black mb-4 text-center text-xl tracking-widest"
            placeholder="PIN"
            maxLength={4}
          />
          {error && <p className="text-red-500 mb-2">{error}</p>}
          <button className="w-full bg-blue-600 p-2 rounded font-bold hover:bg-blue-700">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

export default LockScreen;
