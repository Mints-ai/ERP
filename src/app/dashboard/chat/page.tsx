"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInitials } from "@/lib/utils";
import { Hash, Send, Image as ImageIcon, Smile, MoreVertical } from "lucide-react";
import { format } from "date-fns";

const CHANNELS = [
  { id: "general", name: "General" },
  { id: "design", name: "Design Team" },
  { id: "engineering", name: "Engineering" },
  { id: "announcements", name: "Announcements" },
];

export default function Chat() {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState(CHANNELS[0].id);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "messages"),
      where("channelId", "==", activeChannel),
      orderBy("createdAt", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [activeChannel, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageText = newMessage;
    setNewMessage(""); // clear input instantly for perceived performance

    try {
      await addDoc(collection(db, "messages"), {
        text: messageText,
        channelId: activeChannel,
        userId: user.uid,
        userName: user.displayName || "Unknown User",
        userAvatar: user.photoURL || "",
        createdAt: serverTimestamp()
      });
      // Scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageText); // revert on error
    }
  };

  const activeChannelName = CHANNELS.find(c => c.id === activeChannel)?.name;

  return (
    <div className="h-[calc(100vh-120px)] flex bg-white/50 backdrop-blur-xl border border-slate-200 rounded-xl overflow-hidden shadow-card">
      
      {/* Sidebar Channels */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">Team Chat</h2>
        </div>
        <div className="p-3 space-y-1 flex-1 overflow-y-auto hide-scrollbar">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Channels</div>
          {CHANNELS.map(channel => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeChannel === channel.id 
                ? 'bg-indigo-100 text-indigo-700 font-semibold' 
                : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Hash className="h-4 w-4" />
              {channel.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        
        {/* Chat Header */}
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-slate-400" />
            <h2 className="font-bold text-slate-900 text-lg">{activeChannelName}</h2>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <MessageSquare className="h-12 w-12 opacity-20" />
              <p>No messages in #{activeChannelName} yet.</p>
              <p className="text-sm">Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.userId === user?.uid;
              const showAvatar = idx === 0 || messages[idx - 1].userId !== msg.userId;
              
              return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${!showAvatar ? 'mt-2' : ''}`}>
                  {showAvatar ? (
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={msg.userAvatar} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 font-medium">
                        {getInitials(msg.userName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-10 shrink-0" />
                  )}
                  
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {showAvatar && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-900">{msg.userName}</span>
                        <span className="text-[10px] text-slate-400">
                          {msg.createdAt?.seconds ? format(new Date(msg.createdAt.seconds * 1000), 'h:mm a') : 'Just now'}
                        </span>
                      </div>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                        : 'bg-slate-100 text-slate-900 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 shrink-0">
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${activeChannelName}...`}
              className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-full px-4"
            />
            <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 shrink-0">
              <Smile className="h-5 w-5" />
            </Button>
            <Button type="submit" disabled={!newMessage.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-10 w-10 p-0 shrink-0 shadow-md transition-transform active:scale-95">
              <Send className="h-4 w-4 ml-1" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
