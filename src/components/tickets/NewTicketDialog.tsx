"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketCategory, TicketPriority, TicketAttachment } from "@/types/ticket";
import { createTicket, validateTicketAttachment } from "@/lib/ticket-services";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Plus, Paperclip, AlertCircle, FileText, X } from "lucide-react";

interface NewTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const CATEGORIES: TicketCategory[] = [
  "IT Support",
  "HR & Workplace",
  "Finance & Invoicing",
  "Access & Security",
  "General Operations"
];

const PRIORITIES: TicketPriority[] = ["Low", "Normal", "High", "Urgent"];

export default function NewTicketDialog({ isOpen, onClose, user }: NewTicketDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("IT Support");
  const [priority, setPriority] = useState<TicketPriority>("Normal");
  
  // Attachments
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateTicketAttachment(file);
    if (!validation.valid) {
      setFileError(validation.error || "Invalid file format.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }

    setFileError("");
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !user) return;

    setIsSubmitting(true);
    try {
      let attachments: TicketAttachment[] = [];

      if (selectedFile && storage) {
        const validation = validateTicketAttachment(selectedFile);
        const storageRef = ref(storage, `ticket_attachments/${Date.now()}-${validation.safeName}`);
        await uploadBytes(storageRef, selectedFile, { contentType: selectedFile.type });
        const url = await getDownloadURL(storageRef);

        attachments.push({
          id: Math.random().toString(36).substring(2, 9),
          name: selectedFile.name,
          url,
          size: selectedFile.size,
          type: selectedFile.type,
          uploadedBy: user.uid,
          uploadedByName: user.fullName || "User",
          uploadedAt: new Date().toISOString()
        });
      }

      await createTicket({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        createdBy: user.uid,
        creatorName: user.fullName || user.displayName || "Employee",
        creatorEmail: user.email || "",
        attachments
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("IT Support");
      setPriority("Normal");
      setSelectedFile(null);
      setFileError("");
      onClose();
    } catch (err) {
      console.error("Error creating ticket:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Plus className="w-5 h-5 text-primary" /> Create Support Ticket
          </DialogTitle>
          <DialogDescription className="text-xs text-foreground/50">
            Submit a request for IT, HR, Finance, or administrative support.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">Subject / Issue Summary</label>
            <Input
              required
              placeholder="e.g., VPN connection fails, Invoice approval pending..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">Category</label>
              <Select value={category} onValueChange={(val) => setCategory(val as TicketCategory)}>
                <SelectTrigger className="w-full text-xs h-9 border-border">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">Priority</label>
              <Select value={priority} onValueChange={(val) => setPriority(val as TicketPriority)}>
                <SelectTrigger className="w-full text-xs h-9 border-border">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">Detailed Description</label>
            <Textarea
              required
              placeholder="Provide complete details, steps to reproduce, or any relevant identifiers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs border-border min-h-[100px]"
            />
          </div>

          {/* Attachments Drop/Pick */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block">Attachment (Optional)</label>
            {selectedFile ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate font-medium">{selectedFile.name}</span>
                  <span className="text-[10px] text-foreground/40 font-mono">({Math.round(selectedFile.size / 1024)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 border border-border border-dashed rounded-xl cursor-pointer hover:bg-muted/30 transition-colors text-xs text-foreground/60">
                <Paperclip className="w-4 h-4 text-primary" />
                <span>Attach screenshot or document (.pdf, .docx, .xlsx, .png, .jpg &le; 10MB)</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
            {fileError && <p className="text-[11px] text-rose-400 font-bold">{fileError}</p>}
          </div>

          <DialogFooter className="pt-2 border-t border-border mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-foreground/70 hover:text-foreground"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="btn-primary px-4 py-2 text-xs font-bold rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
