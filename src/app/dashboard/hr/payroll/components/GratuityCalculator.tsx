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
import { Calculator, Save } from "lucide-react";

interface GratuityCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  baseSalary: number;
  initialJoinDate?: string;
  onSave: (amount: number, notes: string) => void;
}

export function GratuityCalculator({ open, onOpenChange, employeeName, baseSalary, initialJoinDate, onSave }: GratuityCalculatorProps) {
  const [joinDate, setJoinDate] = useState(initialJoinDate || "");
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [gratuityAmount, setGratuityAmount] = useState<number>(0);
  const [tenureYears, setTenureYears] = useState<number>(0);

  useEffect(() => {
    if (open) {
      setJoinDate(initialJoinDate || "");
      setEndDate(new Date().toISOString().split("T")[0]);
      setGratuityAmount(0);
      setTenureYears(0);
    }
  }, [open, initialJoinDate]);

  useEffect(() => {
    if (joinDate && endDate) {
      const start = new Date(joinDate);
      const end = new Date(endDate);
      
      if (end < start) {
        setGratuityAmount(0);
        setTenureYears(0);
        return;
      }

      // Calculate total days
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const years = totalDays / 365.25;
      
      setTenureYears(Math.round(years * 100) / 100);

      // UAE Gratuity Formula
      // Basic salary per day = (Base Salary * 12) / 365
      const dailyBasic = (baseSalary * 12) / 365;
      let totalGratuity = 0;

      if (years >= 1 && years <= 5) {
        // 21 days for each year
        totalGratuity = years * 21 * dailyBasic;
      } else if (years > 5) {
        // 21 days for first 5 years + 30 days for remaining years
        const first5 = 5 * 21 * dailyBasic;
        const remaining = (years - 5) * 30 * dailyBasic;
        totalGratuity = first5 + remaining;
      }

      setGratuityAmount(Math.round(totalGratuity));
    }
  }, [joinDate, endDate, baseSalary]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(gratuityAmount, `End of Service Gratuity (${tenureYears.toFixed(2)} years)`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Gratuity Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate End of Service benefits for {employeeName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase">Base Salary (AED)</label>
            <div className="font-mono text-lg font-bold text-foreground">{baseSalary.toLocaleString()} AED</div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase">Join Date</label>
            <Input 
              type="date" 
              required 
              value={joinDate} 
              onChange={(e) => setJoinDate(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase">End Date</label>
            <Input 
              type="date" 
              required 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>

          <div className="p-4 bg-muted/20 border border-border rounded-xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-foreground/50 uppercase">Tenure</span>
              <span className="font-mono text-sm font-semibold">{tenureYears.toFixed(2)} Years</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Total Gratuity</span>
              <span className="font-mono text-xl font-black text-primary">{gratuityAmount.toLocaleString()} AED</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={gratuityAmount === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="w-4 h-4 mr-2" />
              Apply to Payroll
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
