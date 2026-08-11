import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Building, DollarSign, User, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logLeadEmail, subscribeToLeadEmails } from "@/lib/crm-services";

interface LeadDetailSheetProps {
  selectedLead: any;
  setSelectedLead: (lead: any) => void;
  user: any;
}

export function LeadDetailSheet({ selectedLead, setSelectedLead, user }: LeadDetailSheetProps) {
  const [emailText, setEmailText] = useState("");
  const [leadEmails, setLeadEmails] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedLead) return;
    const unsubscribe = subscribeToLeadEmails(selectedLead.id, setLeadEmails);
    return () => unsubscribe();
  }, [selectedLead]);

  const handleLogEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailText || !selectedLead) return;
    try {
      await logLeadEmail(selectedLead.id, emailText, user);
      setEmailText("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
      <SheetContent side="right" className="w-[400px] p-6 border-l border-border bg-background text-foreground flex flex-col h-full overflow-y-auto">
        {selectedLead && (
          <>
            <SheetHeader className="border-b border-border pb-4 mb-4 shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                {selectedLead.company}
              </SheetTitle>
              <div className="flex items-center gap-4 text-xs text-foreground/60 mt-2">
                <span className="flex items-center gap-1.5"><User className="h-3 w-3" /> {selectedLead.contactName}</span>
                <span className="flex items-center gap-1.5"><DollarSign className="h-3 w-3 text-accent" /> {selectedLead.value} AED</span>
              </div>
            </SheetHeader>
            
            <div className="flex-1 flex flex-col min-h-0">
              <h4 className="font-bold text-sm text-foreground mb-3">Email Tracking & Activity</h4>
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                <AnimatePresence>
                  {leadEmails.length === 0 ? (
                    <p className="text-xs text-foreground/40 italic text-center py-4">No activity logged yet.</p>
                  ) : (
                    leadEmails.map(msg => (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className="border border-border p-3 rounded-xl text-xs bg-card">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-primary/80">{msg.sender}</span>
                          <span className="text-xs text-foreground/40 uppercase font-mono tracking-wider">
                            {msg.createdAt?.toDate().toLocaleDateString() || 'Just now'}
                          </span>
                        </div>
                        <p className="text-foreground/80 whitespace-pre-wrap">{msg.text}</p>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
              
              <form onSubmit={handleLogEmail} className="shrink-0 space-y-3 p-3 rounded-xl border border-border bg-card">
                <Textarea 
                  placeholder="Log an email or meeting note..." 
                  className="text-xs bg-background border-border resize-none h-20 text-foreground placeholder:text-foreground/30 focus-visible:ring-1 focus-visible:ring-primary"
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                />
                <Button type="submit" disabled={!emailText} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8">
                  <Plus className="h-3 w-3 mr-1.5" /> Log Activity
                </Button>
              </form>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
