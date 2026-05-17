"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Monitor, Laptop, Key, Search, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock types
type AssetType = "laptop" | "monitor" | "software" | "other";
type AssetStatus = "active" | "maintenance" | "retired";

export default function AssetManagement() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("laptop");
  const [serialNumber, setSerialNumber] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "assets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !serialNumber) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "assets"), {
        name,
        type,
        serialNumber,
        assignedTo: assignedTo || null,
        status: "active",
        createdAt: serverTimestamp()
      });
      setIsAddOpen(false);
      setName("");
      setSerialNumber("");
      setAssignedTo("");
    } catch (err) {
      console.error("Error adding asset:", err);
    }
    setIsSubmitting(false);
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.assignedTo?.toLowerCase().includes(search.toLowerCase()) ||
    a.serialNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGuard permission="MANAGE_USERS" fallback={<div>Access Denied.</div>}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
            <p className="text-muted-foreground mt-1">Track company devices, software licenses, and physical assets.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                className="pl-9 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-olive-500 hover:bg-olive-600 text-white transition-colors">
                <Plus className="mr-2 h-4 w-4" /> Add Asset
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register New Asset</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddAsset} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Asset Name / Model</label>
                    <Input required placeholder="MacBook Pro M2 16inch" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Asset Type</label>
                      <Select value={type} onValueChange={(val: any) => setType(val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="laptop">Laptop / PC</SelectItem>
                          <SelectItem value="monitor">Monitor / Display</SelectItem>
                          <SelectItem value="software">Software License</SelectItem>
                          <SelectItem value="other">Other Peripheral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Serial / License Key</label>
                      <Input required placeholder="SN-123456789" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assigned To (Employee Name)</label>
                    <Input placeholder="Leave blank if unassigned" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-olive-600 text-white">Save Asset</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading assets...</div>
            ) : filteredAssets.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 m-4 rounded-xl">
                <Laptop className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <h3 className="text-lg font-medium text-olive-900">No Assets Found</h3>
                <p className="text-sm text-muted-foreground">Add your first company asset to start tracking.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAssets.map(asset => (
                  <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-olive-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-olive-100 p-3 rounded-lg text-olive-600">
                        {asset.type === 'laptop' && <Laptop className="w-5 h-5" />}
                        {asset.type === 'monitor' && <Monitor className="w-5 h-5" />}
                        {asset.type === 'software' && <Key className="w-5 h-5" />}
                        {asset.type === 'other' && <AlertCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-olive-900">{asset.name}</h4>
                        <p className="text-xs text-muted-foreground font-mono mt-1">SN: {asset.serialNumber}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Assigned To</p>
                        <p className="text-sm font-medium text-olive-900 mt-1">{asset.assignedTo || "Unassigned"}</p>
                      </div>
                      
                      <Badge variant="outline" className={cn(
                        "w-24 justify-center capitalize",
                        asset.status === 'active' ? "border-green-200 text-green-700 bg-green-50" : "border-amber-200 text-amber-700 bg-amber-50"
                      )}>
                        {asset.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
