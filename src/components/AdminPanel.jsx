import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AdminPanel = ({ onClose }) => {
  const [wallpaperUrl, setWallpaperUrl] = useState("");
  const [deleteHours, setDeleteHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.wallpaperUrl) setWallpaperUrl(data.wallpaperUrl);
          if (data.deleteIntervalHours) setDeleteHours(data.deleteIntervalHours);
        }
      } catch (e) {
        console.error("Error fetching settings", e);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMsg("");
    try {
      let finalUrl = wallpaperUrl;
      // Basic Google Drive conversion
      // Match: https://drive.google.com/file/d/ID/view
      // Or just ID detection
      const driveRegex = /\/d\/([a-zA-Z0-9_-]+)/;
      const match = finalUrl.match(driveRegex);
      if (match && match[1]) {
        finalUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }

      await setDoc(doc(db, "settings", "global"), {
        wallpaperUrl: finalUrl,
        deleteIntervalHours: parseFloat(deleteHours)
      });
      setMsg("Settings saved successfully!");
    } catch (e) {
      console.error(e);
      setMsg("Error saving settings.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
        <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
            ✕
        </button>
        <h2 className="text-xl font-bold mb-4">Admin Controls</h2>
        
        <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Global Wallpaper URL</label>
            <p className="text-xs text-gray-500 mb-1">Supports direct links and Google Drive public file links.</p>
            <input 
                type="text" 
                value={wallpaperUrl}
                onChange={(e) => setWallpaperUrl(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="https://..."
            />
        </div>

        <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Auto-Delete Messages After (Hours)</label>
            <input 
                type="number" 
                value={deleteHours}
                onChange={(e) => setDeleteHours(e.target.value)}
                className="w-full border p-2 rounded"
                min="0.1"
                step="0.1"
            />
        </div>

        {msg && <p className="mb-4 text-green-600 font-bold">{msg}</p>}

        <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
            {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
