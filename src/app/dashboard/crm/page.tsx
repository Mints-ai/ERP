"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Target } from "lucide-react";
import { downloadCSV } from "@/lib/exportUtils";
import { subscribeToLeads } from "@/lib/crm-services";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { LeadDetailSheet } from "@/components/crm/LeadDetailSheet";
import { NewLeadModal } from "@/components/crm/NewLeadModal";
import { Skeleton } from "@/components/ui/skeleton";

export default function CRMDashboard() {
  const { user, role, simulatedRole } = useAuth();
  const currentRole = simulatedRole || role || "";
  
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLeads((fetchedLeads) => {
      setLeads(fetchedLeads);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredLeads = leads.filter(l => 
    l.company.toLowerCase().includes(search.toLowerCase()) || 
    l.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    downloadCSV(
      filteredLeads,
      ["Company Name", "Contact Person", "Email", "Assigned To", "Stage", "Deal Value (AED)"],
      ["company", "contactName", "email", "assignedTo", "stage", "value"],
      "Mints_Global_CRM_Leads.csv"
    );
  };

  return (
    <RoleGuard permission="CREATE_PROJECT" fallback={<div className="p-8 text-center text-foreground/40 font-bold uppercase tracking-wider text-xs">Access Denied. Only staff with project management authorization can access the CRM.</div>}>
      <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> CRM & Pipeline
            </h1>
            <p className="text-xs text-foreground/40 mt-1">Track leads, generate quotes, and close deals.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-foreground/40" />
              <Input
                placeholder="Search leads..."
                className="pl-9 bg-card border border-border shadow-sm rounded-lg border-border text-foreground placeholder:text-foreground/30 w-full animate-none h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="bg-card border border-border shadow-sm rounded-lg border-border hover: hover:text-foreground text-foreground/80 font-semibold h-10 px-4 flex-1 sm:flex-none cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4 text-accent shrink-0" /> Export CSV
              </Button>
              <NewLeadModal user={user} />
            </div>
          </div>
        </div>

        {loading ? (
           <div className="flex gap-4">
             {[1,2,3,4].map(i => (
               <div key={i} className="w-80 flex flex-col h-[500px] border border-border rounded-2xl p-3">
                 <Skeleton className="h-6 w-1/3 mb-4 rounded bg-border" />
                 <div className="space-y-3">
                   <Skeleton className="h-24 w-full rounded-xl bg-border" />
                   <Skeleton className="h-24 w-full rounded-xl bg-border" />
                 </div>
               </div>
             ))}
           </div>
        ) : (
          <KanbanBoard 
            leads={filteredLeads} 
            user={user} 
            currentRole={currentRole} 
            setSelectedLead={setSelectedLead} 
          />
        )}
      </div>

      <LeadDetailSheet 
        selectedLead={selectedLead} 
        setSelectedLead={setSelectedLead} 
        user={user} 
      />
    </RoleGuard>
  );
}
