"use client";

import { useState, useEffect } from "react";
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
import { Gift, Save } from "lucide-react";

interface BonusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  initialAmount: number;
  initialNotes: string;
  onSave: (amount: number, notes: string) => void;
}

export function BonusDialog({ open, onOpenChange, employeeName, initialAmount, initialNotes, onSave }: BonusDialogProps) {
  const [amount, setAmount] = useState(initialAmount.toString());
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    if (open) {
      setAmount(initialAmount.toString() === "0" ? "" : initialAmount.toString());
      setNotes(initialNotes);
    }
  }, [open, initialAmount, initialNotes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    onSave(isNaN(parsedAmount) ? 0 : parsedAmount, notes);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Add Bonus / Adjustment
          </DialogTitle>
          <DialogDescription>
            Adjust the payout for {employeeName} before finalizing the payroll cycle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase">Amount (AED)</label>
            <Input 
              type="number" 
              required 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="e.g. 500" 
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase">Notes / Reason</label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={2} 
              placeholder="e.g. Sales Commission" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="w-4 h-4 mr-2" />
              Save Adjustment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
