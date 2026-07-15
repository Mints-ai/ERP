"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { JobStatus } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Save } from "lucide-react";

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateJobDialog({ open, onOpenChange }: CreateJobDialogProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<"Full-time" | "Part-time" | "Contract" | "Internship">("Full-time");
  const [status, setStatus] = useState<JobStatus>("Open");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !department) {
      showToast("Please fill in title and department.", "warning");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "jobs"), {
        title,
        department,
        location,
        type,
        status,
        description,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
      });

      showToast("Job posting created successfully.", "success");
      
      setTitle("");
      setDepartment("");
      setLocation("");
      setType("Full-time");
      setStatus("Open");
      setDescription("");
      onOpenChange(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Create Job Posting
          </DialogTitle>
          <DialogDescription>
            Publish a new role to start accepting candidates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase">Job Title</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Department</label>
              <Input required value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Engineering" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Remote, NY Office" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="Open">Open</option>
                <option value="Draft">Draft</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase">Description & Requirements</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Enter job description..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading ? <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Create Job
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
