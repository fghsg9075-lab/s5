import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SecurityContext = createContext();

export const useSecurity = () => useContext(SecurityContext);

export const SecurityProvider = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Lock on tab switch / background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsLocked(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const unlock = () => {
    setIsLocked(false);
  };

  const lock = () => {
    setIsLocked(true);
  }

  const value = {
    isLocked,
    unlock,
    lock
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};
