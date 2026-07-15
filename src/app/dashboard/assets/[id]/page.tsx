"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/permissions";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Asset, MaintenanceLog } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Monitor, Calendar, Hash, DollarSign, Wrench, Activity, AlertCircle, Save } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AssetDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { role, user } = useAuth();
  const { showToast } = useToast();
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Log state
  const [addLogOpen, setAddLogOpen] = useState(false);
  const [logDesc, setLogDesc] = useState("");
  const [logCost, setLogCost] = useState("");
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  useEffect(() => {
    const fetchAsset = async () => {
      const docRef = doc(db, "assets", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAsset({ id: docSnap.id, ...docSnap.data() } as Asset);
      }
      setLoading(false);
    };
    fetchAsset();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "assetMaintenanceLogs"), where("assetId", "==", id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MaintenanceLog[];
      setLogs(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
    return () => unsubscribe();
  }, [id]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDesc || !logCost) return;
    setIsSubmittingLog(true);

    try {
      await addDoc(collection(db, "assetMaintenanceLogs"), {
        assetId: id,
        date: new Date().toISOString(),
        description: logDesc,
        cost: parseFloat(logCost),
        status: "Completed",
      });

      // Update asset status to under maintenance if not already (or just add log)
      // Here we assume it's just a log entry, not changing status automatically.

      showToast("Maintenance log has been recorded.", "success");
      setLogDesc("");
      setLogCost("");
      setAddLogOpen(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const handleReturnAsset = async () => {
    if (!asset) return;
    if (!confirm("Are you sure you want to return this asset to Available status?")) return;

    try {
      await updateDoc(doc(db, "assets", asset.id), {
        status: "Available",
        assignedToUid: null,
        assignedToName: null,
      });
      setAsset({ ...asset, status: "Available", assignedToUid: undefined, assignedToName: undefined });
      showToast("Asset is now available.", "success");

      await addDoc(collection(db, "auditLog"), {
        actorId: user?.uid,
        actorName: user?.fullName || user?.email || "Unknown",
        action: "ASSET_RETURNED",
        targetCollection: "assets",
        targetId: asset.id,
        details: `Asset ${asset.name} returned`,
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleMarkMaintenance = async () => {
    if (!asset) return;
    try {
      const newStatus = asset.status === "Under Maintenance" ? "Available" : "Under Maintenance";
      await updateDoc(doc(db, "assets", asset.id), {
        status: newStatus,
        ...(newStatus === "Available" ? { assignedToUid: null, assignedToName: null } : {})
      });
      setAsset({ ...asset, status: newStatus as any });
      showToast(`Asset marked as ${newStatus}.`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  }

  if (!canAccess(role, "MANAGE_USERS")) {
    return <div className="p-8 text-center text-foreground/50">Access denied.</div>;
  }

  if (loading) return <div className="p-8 text-center text-foreground/50">Loading asset...</div>;
  if (!asset) return <div className="p-8 text-center text-foreground/50">Asset not found.</div>;

  // Calculate Depreciation
  const purchaseYear = new Date(asset.purchaseDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsOwned = currentYear - purchaseYear;
  const depRate = asset.depreciationRate || 20; // Default 20%
  let currentValue = asset.cost - (asset.cost * (depRate / 100) * yearsOwned);
  if (currentValue < 0) currentValue = 0;

  const totalMaintenanceCost = logs.reduce((sum, l) => sum + l.cost, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/assets">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-foreground/50 hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {asset.name}
              <Badge variant="outline" className={
                asset.status === "Available" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                asset.status === "Assigned" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                asset.status === "Under Maintenance" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                "bg-foreground/10 text-foreground/60 border-border"
              }>
                {asset.status}
              </Badge>
            </h1>
            <p className="text-foreground/50 mt-1">{asset.category} | Added on {asset.purchaseDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {asset.status === "Assigned" && (
            <Button onClick={handleReturnAsset} variant="outline" className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
              Return Asset
            </Button>
          )}
          <Button onClick={handleMarkMaintenance} variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
            <Wrench className="w-4 h-4 mr-2" />
            {asset.status === "Under Maintenance" ? "Mark Repaired" : "Send for Repair"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Details & Depreciation */}
        <div className="space-y-6 md:col-span-1">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Asset Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-bold text-foreground/40 uppercase mb-1 flex items-center gap-1.5"><Hash className="w-3 h-3" /> Serial Number</p>
                <p className="font-mono text-foreground font-medium">{asset.serialNumber || "N/A"}</p>
              </div>
              
              <div>
                <p className="text-xs font-bold text-foreground/40 uppercase mb-1 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Purchase Date</p>
                <p className="text-foreground font-medium">{asset.purchaseDate}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-foreground/40 uppercase mb-1 flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Original Cost</p>
                <p className="text-foreground font-medium">${asset.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>

              {asset.status === "Assigned" && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <p className="text-xs font-bold text-primary/70 uppercase mb-1">Assigned To</p>
                  <p className="font-bold text-primary">{asset.assignedToName}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Depreciation</CardTitle>
              <CardDescription>Straight-line depreciation at {depRate}%/yr</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-medium text-foreground/60">Current Value</p>
                    <h3 className="text-2xl font-bold text-emerald-500">${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground/60">Loss</p>
                    <h3 className="text-lg font-bold text-rose-500">-${(asset.cost - currentValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                  </div>
                </div>
                {/* Visual Bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${(currentValue / asset.cost) * 100}%` }} />
                  <div className="bg-rose-500 h-full" style={{ width: `${((asset.cost - currentValue) / asset.cost) * 100}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Maintenance Logs */}
        <div className="md:col-span-2">
          <Card className="border-border bg-card h-full">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle className="text-lg">Maintenance & Repair Logs</CardTitle>
                <CardDescription>Total spent on repairs: <span className="font-bold text-amber-500">${totalMaintenanceCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></CardDescription>
              </div>
              <Button onClick={() => setAddLogOpen(true)} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                <Wrench className="w-4 h-4 mr-2" /> Add Log
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-foreground/40 flex flex-col items-center">
                    <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                    <p>No maintenance logs found for this asset.</p>
                  </div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="p-4 sm:px-6 hover:bg-muted/30 transition-colors flex justify-between items-start gap-4">
                      <div>
                        <p className="font-medium text-foreground">{log.description}</p>
                        <p className="text-xs text-foreground/50 mt-1">{new Date(log.date).toLocaleDateString()} &middot; {log.status}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-amber-500">${log.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Log Dialog */}
      <Dialog open={addLogOpen} onOpenChange={setAddLogOpen}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              Add Maintenance Log
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddLog} className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Description / Issue</label>
              <Input
                required
                value={logDesc}
                onChange={(e) => setLogDesc(e.target.value)}
                placeholder="e.g. Screen replacement"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Repair Cost ($)</label>
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={logCost}
                onChange={(e) => setLogCost(e.target.value)}
                placeholder="0.00"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setAddLogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingLog} className="bg-amber-500 hover:bg-amber-600 text-white">
                {isSubmittingLog ? (
                  <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Record Log
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
