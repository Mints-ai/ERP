"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { JobPosting, CandidateStatus } from "@/types";
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
import { UserPlus, Upload, Save } from "lucide-react";

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobPosting | null;
}

export function AddCandidateDialog({ open, onOpenChange, job }: AddCandidateDialogProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<CandidateStatus>("Applied");
  const [notes, setNotes] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    if (!fullName || !email) {
      showToast("Please fill in candidate name and email.", "warning");
      return;
    }

    setLoading(true);
    try {
      let resumeUrl = "";
      // Handle file upload if present
      if (resumeFile) {
        const fileExt = resumeFile.name.split('.').pop();
        const safeName = fullName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const storageRef = ref(storage, `resumes/${job.id}/${Date.now()}_${safeName}.${fileExt}`);
        const snapshot = await uploadBytes(storageRef, resumeFile);
        resumeUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "candidates"), {
        jobId: job.id,
        jobTitle: job.title,
        fullName,
        email,
        phone,
        status,
        notes,
        resumeUrl,
        appliedAt: serverTimestamp(),
      });

      showToast("Candidate added successfully.", "success");
      
      setFullName("");
      setEmail("");
      setPhone("");
      setStatus("Applied");
      setNotes("");
      setResumeFile(null);
      onOpenChange(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Candidate
          </DialogTitle>
          <DialogDescription>
            {job ? `Applying for: ${job.title}` : "Select a job first"}
          </DialogDescription>
        </DialogHeader>

        {job && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Full Name</label>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Email Address</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Phone Number</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Initial Stage</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="Applied">Applied</option>
                <option value="Screening">Screening</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Resume (PDF/Word)</label>
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById("resume-upload")?.click()}
                  className="w-full border-dashed border-2 bg-muted/30 hover:bg-muted/50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {resumeFile ? resumeFile.name : "Upload Resume"}
                </Button>
                <input 
                  id="resume-upload" 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setResumeFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Internal Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Initial screening notes..." />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {loading ? <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Add Candidate
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
