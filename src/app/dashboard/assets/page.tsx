"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/permissions";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { Asset } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Monitor, Package, Search, Plus, Wrench, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AddAssetDialog } from "./components/AddAssetDialog";
import { AssignAssetDialog } from "./components/AssignAssetDialog";
import { useToast } from "@/context/ToastContext";

export default function AssetsPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    const q = query(collection(db, "assets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Asset[];
      setAssets(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to delete ${asset.name}? This action cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "assets", asset.id));
      showToast(`${asset.name} was removed.`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.assignedToName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = assets.reduce((sum, a) => sum + (a.cost || 0), 0);
  const availableCount = assets.filter(a => a.status === "Available").length;
  const assignedCount = assets.filter(a => a.status === "Assigned").length;
  const maintenanceCount = assets.filter(a => a.status === "Under Maintenance").length;

  if (!canAccess(role, "MANAGE_USERS")) {
    return <div className="p-8 text-center text-foreground/50">You do not have permission to view this page.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Asset Management</h1>
          <p className="text-foreground/50 mt-1">Track company hardware, licenses, and inventory.</p>
        </div>
        
        <Button onClick={() => setAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
          <Plus className="w-4 h-4 mr-2" /> Add New Asset
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/50 uppercase">Total Inventory</p>
                <h3 className="text-3xl font-bold mt-1 text-foreground">{assets.length}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary"><Package className="w-6 h-6" /></div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/50 uppercase">Available</p>
                <h3 className="text-3xl font-bold mt-1 text-emerald-500">{availableCount}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><Monitor className="w-6 h-6" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/50 uppercase">Assigned</p>
                <h3 className="text-3xl font-bold mt-1 text-blue-500">{assignedCount}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Monitor className="w-6 h-6" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/50 uppercase">Total Value</p>
                <h3 className="text-3xl font-bold mt-1 text-foreground">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary"><span className="text-xl font-bold">$</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:px-6">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Monitor className="w-5 h-5 text-primary" /> Inventory List
          </CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-foreground/60 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Asset Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Cost</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-foreground/40 font-medium">
                      Loading inventory...
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-foreground/40 font-medium">
                      No assets found.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-foreground">{asset.name}</p>
                        <p className="text-xs text-foreground/50 mt-0.5">SN: {asset.serialNumber || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 text-foreground/70">{asset.category}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={
                          asset.status === "Available" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          asset.status === "Assigned" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          asset.status === "Under Maintenance" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-foreground/10 text-foreground/60 border-border"
                        }>
                          {asset.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-foreground/80 font-medium">
                        {asset.status === "Assigned" ? asset.assignedToName : <span className="text-foreground/30">—</span>}
                      </td>
                      <td className="px-6 py-4 font-mono text-foreground/80">
                        ${asset.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {asset.status === "Available" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 border-border hover:bg-muted"
                            onClick={() => { setSelectedAsset(asset); setAssignDialogOpen(true); }}
                          >
                            Assign
                          </Button>
                        )}
                        <Link href={`/dashboard/assets/${asset.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-foreground/60 hover:text-primary">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-foreground/40 hover:text-rose-500"
                          onClick={() => handleDelete(asset)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddAssetDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <AssignAssetDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} asset={selectedAsset} />
    </div>
  );
}
