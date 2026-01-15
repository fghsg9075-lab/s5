import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  updateDoc,
  doc,
  deleteDoc,
  arrayUnion,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const Chat = () => {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState("");
  const [deleteHours, setDeleteHours] = useState(24);
  const [deletingMsgId, setDeletingMsgId] = useState(null); // For delete modal
  const navigate = useNavigate();
  const bottomRef = useRef(null);

  // Generate a unique chat ID based on user IDs (sorted to ensure consistency)
  const chatId = currentUser.uid > userId 
    ? `${currentUser.uid}-${userId}` 
    : `${userId}-${currentUser.uid}`;

  useEffect(() => {
    // Listen to global settings
    const unsubscribeSettings = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.wallpaperUrl) setWallpaperUrl(data.wallpaperUrl);
            if (data.deleteIntervalHours) setDeleteHours(data.deleteIntervalHours);
        }
    });

    return () => unsubscribeSettings();
  }, []);

  useEffect(() => {
    // Listener for messages
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeMsgs = onSnapshot(q, (snapshot) => {
      const msgs = [];
      const now = Date.now();
      const cutoff = now - (deleteHours * 60 * 60 * 1000);

      snapshot.forEach((d) => {
        const data = d.data();
        const msgTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(); 
        
        // Auto-delete check: expired AND not saved
        if (msgTime < cutoff && !data.saved) {
            deleteDoc(d.ref).catch(err => console.error("Auto-delete error", err));
        } else {
             // Check if deleted for current user
             const deletedFor = data.deletedFor || [];
             if (!deletedFor.includes(currentUser.uid)) {
                 msgs.push({ id: d.id, ...data });
             }
        }
      });
      
      setMessages(msgs);
      
      // Mark unseen messages as seen
      msgs.forEach((msg) => {
          if (msg.senderId !== currentUser.uid && !msg.seen) {
                const msgRef = doc(db, "chats", chatId, "messages", msg.id);
                updateDoc(msgRef, { seen: true }).catch(console.error);
          }
      });
    });

    return () => unsubscribeMsgs();
  }, [chatId, currentUser.uid, deleteHours]);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text) return;

    setLoading(true);

    try {
       await addDoc(collection(db, "chats", chatId, "messages"), {
        text: text,
        senderId: currentUser.uid,
        createdAt: Timestamp.now(),
        seen: false,
        saved: false,
        deletedFor: []
      });
      setText("");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };
  
  const toggleSave = async (msgId, currentStatus) => {
      const msgRef = doc(db, "chats", chatId, "messages", msgId);
      await updateDoc(msgRef, { saved: !currentStatus });
  };

  const confirmDelete = (msgId) => {
      setDeletingMsgId(msgId);
  };

  const handleDelete = async (action) => {
      if (!deletingMsgId) return;
      const msgRef = doc(db, "chats", chatId, "messages", deletingMsgId);
      
      if (action === "all") {
          await deleteDoc(msgRef);
      } else if (action === "me") {
          await updateDoc(msgRef, { deletedFor: arrayUnion(currentUser.uid) });
      }
      setDeletingMsgId(null);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 relative">
      {/* Background Wallpaper Layer */}
      {wallpaperUrl && (
          <div 
            className="absolute inset-0 z-0 opacity-40 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url(${wallpaperUrl})` }}
          />
      )}

      <header className="bg-blue-600 p-4 text-white flex items-center justify-between shadow-md z-10 relative">
        <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-4 font-bold text-xl">
            &larr;
            </button>
            <h1 className="text-lg font-bold">Chat</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 relative">
        {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;
            return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                    <div className={`max-w-xs md:max-w-md p-3 rounded-lg relative ${isMe ? "bg-blue-500 text-white" : "bg-white text-gray-800"}`}>
                        <p>{msg.text}</p>
                        
                        <div className="flex items-center justify-end mt-1 gap-2">
                            {/* Save Button */}
                             <button 
                                onClick={() => toggleSave(msg.id, msg.saved)}
                                className={`text-xs ${msg.saved ? "text-yellow-400 font-bold" : "text-gray-400 hover:text-yellow-300"}`}
                                title={msg.saved ? "Unsave" : "Save to prevent deletion"}
                             >
                                 {msg.saved ? "★ Saved" : "☆"}
                             </button>

                             {/* Delete Icon (Trash) */}
                             <button 
                                onClick={() => confirmDelete(msg.id)}
                                className="text-xs text-red-300 hover:text-red-100"
                                title="Delete message"
                             >
                                 🗑
                             </button>

                            <div className={`text-xs ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                                {isMe && (
                                    <span>
                                        {msg.seen ? (
                                            <span className="text-green-300 font-bold">✓✓</span>
                                        ) : (
                                            <span>✓</span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white border-t flex items-center gap-2 z-10 relative">
         <input 
            type="text" 
            value={text} 
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-600"
         />
         <button type="submit" disabled={loading || !text} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 min-w-[40px] flex justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
         </button>
      </form>

      {/* Delete Confirmation Modal */}
      {deletingMsgId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4">Delete Message?</h3>
                  <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleDelete('me')}
                        className="bg-gray-200 p-2 rounded hover:bg-gray-300 text-left"
                      >
                          Delete for me
                      </button>
                      <button 
                        onClick={() => handleDelete('all')}
                        className="bg-red-100 text-red-700 p-2 rounded hover:bg-red-200 text-left"
                      >
                          Delete for everyone
                      </button>
                      <button 
                        onClick={() => setDeletingMsgId(null)}
                        className="mt-2 text-blue-600 text-center text-sm"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Chat;
