"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, doc, updateDoc, onSnapshot, query, addDoc, serverTimestamp } from "firebase/firestore";
import { Asset } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserSquare2, Send } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface AssignAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
}

export function AssignAssetDialog({ open, onOpenChange, asset }: AssignAssetDialogProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [selectedUid, setSelectedUid] = useState("");

  useEffect(() => {
    if (!open) return;
    const q = query(collection(db, "employees"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        fullName: doc.data().fullName || doc.data().email,
        email: doc.data().email,
      }));
      setEmployees(list);
    });
    return () => unsubscribe();
  }, [open]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !selectedUid) return;

    setLoading(true);
    try {
      const selectedEmp = employees.find(emp => emp.id === selectedUid);
      
      const docRef = doc(db, "assets", asset.id);
      await updateDoc(docRef, {
        status: "Assigned",
        assignedToUid: selectedUid,
        assignedToName: selectedEmp?.fullName || "Employee",
      });

      // Audit Log
      await addDoc(collection(db, "auditLog"), {
        actorId: user?.uid,
        actorName: user?.fullName || user?.email || "Unknown",
        action: "ASSET_ASSIGNED",
        targetCollection: "assets",
        targetId: asset.id,
        details: `Assigned ${asset.name} to ${selectedEmp?.fullName}`,
        createdAt: serverTimestamp(),
      });

      showToast(`${asset.name} assigned to ${selectedEmp?.fullName}.`, "success");

      setSelectedUid("");
      onOpenChange(false);
    } catch (error: any) {
      showToast(error.message || "Failed to assign asset", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserSquare2 className="h-5 w-5 text-primary" />
            Assign Asset
          </DialogTitle>
          <DialogDescription>
            Assign <strong className="text-foreground">{asset.name}</strong> ({asset.serialNumber || 'No Serial'}) to an employee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAssign} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase">Select Employee</label>
            <select
              required
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm border-border text-foreground"
            >
              <option value="" disabled>Select an employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedUid} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Assign to Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
