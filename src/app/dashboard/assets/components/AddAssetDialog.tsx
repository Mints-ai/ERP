"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { AssetCategory } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Monitor, Save } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAssetDialog({ open, onOpenChange }: AddAssetDialogProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>("Laptop");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [cost, setCost] = useState("");
  const [depreciationRate, setDepreciationRate] = useState("20");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cost) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "assets"), {
        name,
        category,
        serialNumber,
        purchaseDate,
        cost: parseFloat(cost),
        depreciationRate: parseFloat(depreciationRate) || 0,
        notes,
        status: "Available",
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
      });

      // Audit Log
      await addDoc(collection(db, "auditLog"), {
        actorId: user?.uid,
        actorName: user?.fullName || user?.email || "Unknown",
        action: "ASSET_CREATED",
        targetCollection: "assets",
        details: `Created new ${category} asset: ${name}`,
        createdAt: serverTimestamp(),
      });

      showToast(`${name} has been added to inventory.`, "success");

      // Reset form
      setName("");
      setSerialNumber("");
      setCost("");
      setNotes("");
      onOpenChange(false);
    } catch (error: any) {
      showToast(error.message || "Failed to create asset", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Add New Asset
          </DialogTitle>
          <DialogDescription>
            Register a new company asset into the inventory system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Asset Name</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MacBook Pro M3"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm border-border text-foreground"
              >
                <option value="Laptop">Laptop</option>
                <option value="Monitor">Monitor</option>
                <option value="Software License">Software License</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Serial Number</label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Optional"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Cost ($)</label>
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Depreciation % / yr</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={depreciationRate}
                onChange={(e) => setDepreciationRate(e.target.value)}
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Purchase Date</label>
              <Input
                required
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="bg-background border-border text-foreground [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Notes</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or condition..."
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Asset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
