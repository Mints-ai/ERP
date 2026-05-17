"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { canAccess, ROLE_META } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Megaphone, Pin, CheckCircle2, AlertCircle } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// In a real app, this would be fetched from Firestore /departments
const DEPARTMENTS = [
  "Executive Office", "Operations", "HR & Admin", "Finance", 
  "Cyber Security", "Performance Marketing", "SEO", 
  "Social Media", "Branding & Creative", "Software Development", 
  "Video Production", "Photography & Graphics"
];

export default function Announcements() {
  const { user, role } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPostOpen, setIsPostOpen] = useState(false);
  
  // New Announcement State
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("all");
  const [targetValue, setTargetValue] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Enter your announcement here...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[150px] border rounded-md p-3',
      },
    },
  });

  const isManagerOrAbove = canAccess(role, "POST_ANNOUNCEMENT");

  useEffect(() => {
    if (!user || !role) return;

    // Fetch all announcements, we'll filter client side for complex audience logic
    // In production with larger datasets, you'd use a composite index or multiple queries
    const q = query(
      collection(db, "announcements"), 
      orderBy("isPinned", "desc"), 
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allAnns = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      // Filter based on audience
      // Assuming user has a department field. Since we don't have it directly in user context here,
      // we'll fetch it from the employee doc or assume it's in user object
      const userDept = user.department || "unknown"; // Make sure to add department to AuthUser interface
      
      const visibleAnns = allAnns.filter(ann => {
        if (ann.audience === "all") return true;
        if (ann.audience === "department" && ann.targetValue === userDept) return true;
        if (ann.audience === "role" && ann.targetValue === role) return true;
        // The creator can always see their posts
        if (ann.createdBy === user.uid) return true;
        
        return false;
      });

      setAnnouncements(visibleAnns);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, role]);

  const handlePost = async () => {
    if (!user || !title || !editor) return;
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, "announcements"), {
        title,
        content: editor.getHTML(),
        audience,
        targetValue: audience !== "all" ? targetValue : "",
        isPinned,
        sendEmail, // A Cloud Function would pick this up and send the email
        createdBy: user.uid,
        creatorName: user.displayName,
        readBy: [],
        createdAt: serverTimestamp(),
      });
      
      setIsPostOpen(false);
      setTitle("");
      editor.commands.setContent('<p>Enter your announcement here...</p>');
      setAudience("all");
      setTargetValue("");
      setIsPinned(false);
      setSendEmail(false);
    } catch (err) {
      console.error("Error posting announcement:", err);
    }
    
    setIsSubmitting(false);
  };

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "announcements", id), {
        readBy: arrayUnion(user.uid)
      });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-olive-500" />
            Notice Board
          </h1>
          <p className="text-muted-foreground mt-1">Company-wide and department announcements.</p>
        </div>
        
        {isManagerOrAbove && (
          <Dialog open={isPostOpen} onOpenChange={setIsPostOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-olive-500 hover:bg-olive-600 text-white transition-colors">
              Post Announcement
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>New Announcement</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Announcement Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g. Q3 Town Hall Meeting" />
                </div>
                
                <div className="space-y-2">
                  <Label>Message Content</Label>
                  <EditorContent editor={editor} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select value={audience} onValueChange={(val) => setAudience(val || "all")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Staff</SelectItem>
                        <SelectItem value="department">Specific Department</SelectItem>
                        <SelectItem value="role">Specific Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {audience === "department" && (
                    <div className="space-y-2">
                      <Label>Select Department</Label>
                      <Select value={targetValue} onValueChange={(val) => setTargetValue(val || "")}>
                        <SelectTrigger><SelectValue placeholder="Choose department" /></SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {audience === "role" && (
                    <div className="space-y-2">
                      <Label>Select Role</Label>
                      <Select value={targetValue} onValueChange={(val) => setTargetValue(val || "")}>
                        <SelectTrigger><SelectValue placeholder="Choose role" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_META).map(([key, meta]) => (
                            <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-6 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="pin" checked={isPinned} onCheckedChange={(c) => setIsPinned(!!c)} />
                    <Label htmlFor="pin" className="cursor-pointer">Pin to top</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="email" checked={sendEmail} onCheckedChange={(c) => setSendEmail(!!c)} />
                    <Label htmlFor="email" className="cursor-pointer">Send Email Notification</Label>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPostOpen(false)}>Cancel</Button>
                <Button onClick={handlePost} disabled={isSubmitting || !title} className="bg-olive-500 hover:bg-olive-600 text-white">
                  {isSubmitting ? "Posting..." : "Publish Announcement"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed flex flex-col items-center">
             <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
             <h3 className="text-lg font-medium text-muted-foreground">No Announcements</h3>
             <p className="text-sm text-muted-foreground mt-1">Check back later for updates from management.</p>
          </div>
        ) : (
          announcements.map((ann) => {
            const isRead = ann.readBy?.includes(user?.uid);
            
            return (
              <Card key={ann.id} className={`overflow-hidden transition-all ${ann.isPinned ? 'border-l-4 border-l-olive-500 shadow-sm' : 'border-border/50'}`}>
                <CardHeader className="pb-2 bg-muted/10 flex flex-row items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {ann.isPinned && <Pin className="h-4 w-4 text-olive-500 fill-olive-500" />}
                      <CardTitle className="text-xl">{ann.title}</CardTitle>
                      
                      {ann.audience !== "all" && (
                        <Badge variant="outline" className="ml-2 bg-background font-normal text-xs">
                          {ann.audience === "department" ? "Dept: " : "Role: "} 
                          {ann.audience === "role" ? ROLE_META[ann.targetValue]?.label : ann.targetValue}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>Posted by <strong>{ann.creatorName || "Management"}</strong></span>
                      <span>•</span>
                      <span>{ann.createdAt ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                    </div>
                  </div>
                  
                  {isRead ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Read
                    </Badge>
                  ) : (
                    <Badge className="bg-olive-50 text-olive-700 hover:bg-olive-100 shadow-none border-0 group cursor-pointer transition-colors"
                           onClick={() => markAsRead(ann.id)}>
                      <AlertCircle className="h-3 w-3 mr-1 fill-olive-500 text-white" /> 
                      <span className="group-hover:underline">Mark as Read</span>
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="prose prose-sm max-w-none prose-a:text-olive-600" 
                       dangerouslySetInnerHTML={{ __html: ann.content }} />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
