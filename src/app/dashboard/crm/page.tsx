"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, PhoneCall, Mail, Building, DollarSign, FileText, MoreHorizontal } from "lucide-react";
import { generateQuote } from "@/lib/pdfGenerator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STAGES = ["Lead", "Meeting", "Negotiation", "Won", "Lost"];

export default function CRMDashboard() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Lead Form
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !contactName) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "leads"), {
        company,
        contactName,
        email,
        value: parseFloat(value) || 0,
        stage: "Lead",
        createdAt: serverTimestamp(),
        assignedTo: user?.displayName || "Unassigned"
      });
      setIsAddOpen(false);
      setCompany("");
      setContactName("");
      setEmail("");
      setValue("");
    } catch (err) {
      console.error(err);
    }
    setIsSubmitting(false);
  };

  const updateLeadStage = async (id: string, newStage: string) => {
    try {
      await updateDoc(doc(db, "leads", id), { stage: newStage });
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateQuote = (lead: any) => {
    generateQuote({
      quoteNumber: `Q-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toLocaleDateString(),
      clientName: lead.company,
      contactName: lead.contactName,
      items: [
        { description: "Standard Agency Retainer (Monthly)", amount: lead.value || 5000 }
      ],
      total: lead.value || 5000
    });
  };

  const filteredLeads = leads.filter(l => 
    l.company.toLowerCase().includes(search.toLowerCase()) || 
    l.contactName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGuard permission="MANAGE_PROJECTS" fallback={<div>Access Denied.</div>}>
      <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-olive-900">CRM & Pipeline</h1>
            <p className="text-muted-foreground mt-1">Track leads, generate quotes, and close deals.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                className="pl-9 glass-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-olive-600 hover:bg-olive-700 text-white shadow-md">
                  <Plus className="mr-2 h-4 w-4" /> New Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddLead} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company Name</label>
                    <Input required placeholder="Acme Corp" value={company} onChange={e => setCompany(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Person</label>
                    <Input required placeholder="John Doe" value={contactName} onChange={e => setContactName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" placeholder="john@acme.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estimated Deal Value (AED)</label>
                    <Input type="number" placeholder="50000" value={value} onChange={e => setValue(e.target.value)} />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-olive-600 text-white">Save Lead</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto pb-4 hide-scrollbar">
          <div className="flex gap-4 h-full min-w-max">
            {STAGES.map(stage => {
              const stageLeads = filteredLeads.filter(l => l.stage === stage);
              
              return (
                <div key={stage} className="w-80 flex flex-col h-full bg-olive-50/50 rounded-xl p-3 border border-olive-100">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-bold text-olive-900 tracking-tight uppercase text-sm flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        stage === 'Won' ? 'bg-green-500' : 
                        stage === 'Lost' ? 'bg-red-500' : 'bg-olive-500'
                      }`} />
                      {stage}
                    </h3>
                    <Badge variant="secondary" className="bg-white border-olive-200">{stageLeads.length}</Badge>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    <AnimatePresence>
                      {stageLeads.map(lead => (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={lead.id}
                          className="glass-card p-4 rounded-lg group hover:border-olive-300 transition-colors relative"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-olive-900 truncate pr-6">{lead.company}</h4>
                            
                            {/* Action Menu */}
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="p-1 hover:bg-olive-100 rounded-md">
                                  <MoreHorizontal className="h-4 w-4 text-olive-600" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleGenerateQuote(lead)}>
                                    <FileText className="mr-2 h-4 w-4 text-blue-600" /> Generate Quote
                                  </DropdownMenuItem>
                                  {STAGES.map(s => s !== stage && (
                                    <DropdownMenuItem key={s} onClick={() => updateLeadStage(lead.id, s)}>
                                      Move to {s}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5 text-xs text-olive-600">
                            <p className="flex items-center gap-1.5">
                              <Building className="h-3 w-3" /> {lead.contactName}
                            </p>
                            {lead.email && (
                              <p className="flex items-center gap-1.5">
                                <Mail className="h-3 w-3" /> <span className="truncate">{lead.email}</span>
                              </p>
                            )}
                            <p className="flex items-center gap-1.5 font-semibold text-olive-800 mt-2">
                              <DollarSign className="h-3 w-3 text-green-600" /> 
                              {lead.value ? `${lead.value.toLocaleString()} AED` : 'TBD'}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
