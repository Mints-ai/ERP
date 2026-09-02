import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { createLead } from "@/lib/crm-services";

interface NewLeadModalProps {
  user: any;
}

export function NewLeadModal({ user }: NewLeadModalProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !contactName) return;
    
    setIsSubmitting(true);
    try {
      await createLead({ company, contactName, email, value }, user);
      setIsAddOpen(false);
      setCompany("");
      setContactName("");
      setEmail("");
      setValue("");
    } catch (err) {
      console.error(err);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
      <DialogTrigger className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-xl font-semibold h-10 px-5 flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center">
        <Plus className="mr-2 h-4 w-4 shrink-0" /> New Lead
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border border-border text-foreground p-6 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddLead} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Company Name</label>
            <Input 
              required 
              placeholder="Acme Corp" 
              value={company} 
              onChange={e => setCompany(e.target.value)} 
              className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Contact Person</label>
            <Input 
              required 
              placeholder="John Doe" 
              value={contactName} 
              onChange={e => setContactName(e.target.value)} 
              className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Email</label>
            <Input 
              type="email" 
              placeholder="john@acme.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Estimated Deal Value (AED)</label>
            <Input 
              type="number" 
              placeholder="50000" 
              value={value} 
              onChange={e => setValue(e.target.value)} 
              className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full font-mono"
            />
          </div>
          <DialogFooter className="pt-4 border-t border-border gap-2 sm:gap-0 mt-4">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="h-9 py-0 px-4 text-xs font-semibold text-foreground/70 hover:text-foreground">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="btn-primary h-9 py-0 px-4 text-xs font-bold flex items-center justify-center cursor-pointer">
              {isSubmitting ? "Saving..." : "Save Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
