"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Hash, Send, Image as ImageIcon, Smile, MoreVertical, MessageSquare, Video, VideoOff, Mic, MicOff, Monitor, PhoneOff } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

  // Video call states
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    }, (error) => {
      console.error("Firestore onSnapshot error (messages):", error);
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

  const startCall = async () => {
    setInCall(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 200);
    } catch (err) {
      console.error("Camera access blocked or not available:", err);
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setInCall(false);
    setIsScreenSharing(false);
    setIsVideoOff(false);
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    } else {
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Screen share cancelled:", err);
      }
    } else {
      if (videoRef.current && localStream) {
        videoRef.current.srcObject = localStream;
      }
      setIsScreenSharing(false);
    }
  };

  const activeChannelName = CHANNELS.find(c => c.id === activeChannel)?.name;

  return (
    <div className="h-[calc(100vh-120px)] flex bg-white/50 backdrop-blur-xl border border-slate-200 rounded-xl overflow-hidden shadow-card">
      
      {/* Sidebar Channels */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
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
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        
        {/* Chat Header */}
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-slate-400" />
            <h2 className="font-bold text-slate-900 text-lg">{activeChannelName}</h2>
          </div>
          <div className="flex items-center gap-3">
            {!inCall && (
              <Button 
                onClick={startCall} 
                variant="outline" 
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold flex items-center gap-1.5 shadow-sm rounded-lg"
              >
                <Video className="h-4.5 w-4.5" />
                Start Video Call
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Live Call Window */}
        {inCall && (
          <div className="bg-slate-950 p-6 border-b border-slate-800 animate-in slide-in-from-top duration-300 relative shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              
              {/* Local Stream (Me) */}
              <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative border border-slate-800 group shadow-md">
                {isVideoOff ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white/40">
                    <Avatar className="h-16 w-16 mb-2 border border-white/10">
                      <AvatarFallback className="bg-indigo-600 text-white text-lg font-bold">
                        {getInitials(user?.displayName || "Me")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">Camera Off</span>
                  </div>
                ) : (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                )}
                
                {/* User tag */}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {user?.displayName || "Me"} (You)
                </div>
              </div>

              {/* Remote Stream (Simulated connection) */}
              <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative border border-slate-800 group shadow-md flex items-center justify-center">
                
                {/* Audio wave simulation */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-indigo-950/20 text-white/50">
                  <div className="flex items-center gap-1 mb-4 h-8">
                    <span className="w-1 bg-indigo-500 rounded-full h-6 animate-pulse" />
                    <span className="w-1 bg-indigo-400 rounded-full h-8 animate-pulse delay-75" />
                    <span className="w-1 bg-indigo-500 rounded-full h-4 animate-pulse delay-150" />
                    <span className="w-1 bg-indigo-300 rounded-full h-7 animate-pulse delay-200" />
                    <span className="w-1 bg-indigo-500 rounded-full h-5 animate-pulse delay-300" />
                  </div>
                  <Avatar className="h-16 w-16 mb-2 border border-white/10 shadow-lg">
                    <AvatarFallback className="bg-purple-600 text-white text-lg font-bold">
                      SA
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-300">System Administrator</span>
                </div>
                
                {/* Peer tag */}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Remote Host
                </div>
              </div>

            </div>

            {/* Call Control Panel */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button 
                onClick={toggleMute} 
                variant="outline" 
                className={cn("h-11 w-11 rounded-full p-0 border border-slate-850", 
                  isMuted 
                    ? "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30 hover:text-red-300" 
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              
              <Button 
                onClick={toggleVideo} 
                variant="outline" 
                className={cn("h-11 w-11 rounded-full p-0 border border-slate-850", 
                  isVideoOff 
                    ? "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30 hover:text-red-300" 
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>

              <Button 
                onClick={toggleScreenShare} 
                variant="outline" 
                className={cn("h-11 w-11 rounded-full p-0 border border-slate-850", 
                  isScreenSharing 
                    ? "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500" 
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Monitor className="h-5 w-5" />
              </Button>

              <Button 
                onClick={endCall} 
                className="bg-red-600 hover:bg-red-700 text-white h-11 px-5 rounded-full font-bold flex items-center gap-1.5 shadow-md shadow-red-900/35 transition-transform active:scale-95 border-none"
              >
                <PhoneOff className="h-5 w-5" />
                Leave Room
              </Button>
            </div>
          </div>
        )}

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
              className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-full px-4 text-slate-950 font-medium"
            />
            <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 shrink-0">
              <Smile className="h-5 w-5" />
            </Button>
            <Button type="submit" disabled={!newMessage.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-10 w-10 p-0 shrink-0 shadow-md transition-transform active:scale-95 border-none">
              <Send className="h-4 w-4 ml-1" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
