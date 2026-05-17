"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Building2, Globe, Phone, Mail, Activity } from "lucide-react";

export default function ClientsCRM() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch clients
    const q = query(collection(db, "clients"), orderBy("companyName"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(cls);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredClients = clients.filter(c => 
    c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getHealthBadge = (score: number) => {
    if (score >= 4) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none">Excellent</Badge>;
    if (score === 3) return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 shadow-none">Good</Badge>;
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 shadow-none">At Risk</Badge>;
  };

  return (
    <RoleGuard permission="VIEW_ALL_EMPLOYEES" fallback={<div className="p-8 text-center">Access Denied. Interns cannot view client data.</div>}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage client relationships and health scores.</p>
          </div>
          
          <RoleGuard permission="MANAGE_FINANCE">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-olive-500 hover:bg-olive-600 text-white transition-colors">
                <Plus className="mr-2 h-4 w-4" /> Add Client
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                </DialogHeader>
                <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <p>Client creation form interface pending.</p>
                  <p className="text-sm mt-1">Requires inputs for company details, services, and timezone.</p>
                </div>
              </DialogContent>
            </Dialog>
          </RoleGuard>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by company or contact name..."
              className="pl-9 bg-muted/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed flex flex-col items-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Clients Found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or add a new client.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden group">
                <div className="h-2 bg-olive-200 group-hover:bg-olive-500 transition-colors"></div>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{client.companyName}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Globe className="h-3 w-3" /> {client.country || "UAE"} ({client.timezone || "GST"})
                      </CardDescription>
                    </div>
                    {getHealthBadge(client.healthScore || 5)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{client.email || "No email"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{client.phone || "No phone"}</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Services Subscribed</p>
                    <div className="flex flex-wrap gap-1.5">
                      {client.servicesSubscribed?.slice(0, 3).map((svc: string) => (
                        <Badge key={svc} variant="secondary" className="font-normal text-xs bg-muted/50">
                          {svc}
                        </Badge>
                      ))}
                      {client.servicesSubscribed?.length > 3 && (
                        <Badge variant="secondary" className="font-normal text-xs bg-muted/50">
                          +{client.servicesSubscribed.length - 3} more
                        </Badge>
                      )}
                      {!client.servicesSubscribed?.length && (
                        <span className="text-xs text-muted-foreground italic">None listed</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-4 flex gap-2">
                    <Button variant="outline" className="w-full text-xs h-8">View Projects</Button>
                    <Button variant="outline" className="w-full text-xs h-8">Client Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
