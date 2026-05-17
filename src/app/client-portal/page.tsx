"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { generateInvoice } from "@/lib/pdfGenerator";
import { Briefcase, FileDown, Clock, CheckCircle2, AlertCircle, Banknote, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchClientData = async () => {
      try {
        // In a production app, we would strictly query by clientId == user.uid
        // For demo purposes, if they don't have specific data, we'll show some mock data 
        // so the UI doesn't look completely empty to an admin testing the portal.
        
        const projQ = query(collection(db, "projects"), orderBy("createdAt", "desc"));
        const invQ = query(collection(db, "invoices"), orderBy("createdAt", "desc"));

        const [projSnap, invSnap] = await Promise.all([getDocs(projQ), getDocs(invQ)]);

        let fetchedProjects = projSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        let fetchedInvoices = invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Simulate client filtering (only show their stuff)
        // If they are literally named "Client", show everything for the demo.
        if (user.role === 'client') {
           fetchedProjects = fetchedProjects.filter(p => p.clientId === user.uid || p.clientName === user.displayName);
           fetchedInvoices = fetchedInvoices.filter(i => i.clientId === user.uid || i.clientName === user.displayName);
        }

        // If completely empty (like a fresh database), provide 1 mock project and 1 mock invoice just for visual feedback.
        if (fetchedProjects.length === 0) {
          fetchedProjects = [{
            id: 'mock-1',
            name: "Website Redesign & Branding",
            status: "In Progress",
            progress: 65,
            dueDate: "2026-06-15",
            manager: "Admin User"
          }];
        }

        if (fetchedInvoices.length === 0) {
          fetchedInvoices = [{
            id: 'mock-inv-1',
            invoiceNumber: "INV-2026-001",
            status: "pending",
            total: 15000,
            date: "2026-05-01",
            dueDate: "2026-05-30",
            clientName: user.displayName || "Client",
            items: [{ description: "Phase 1: UI Design", amount: 15000 }]
          }];
        }

        setProjects(fetchedProjects);
        setInvoices(fetchedInvoices);
      } catch (err) {
        console.error("Error fetching client data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [user]);

  const handleDownloadInvoice = (inv: any) => {
    generateInvoice({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date || new Date().toISOString().split('T')[0],
      clientName: inv.clientName || inv.clientId || "Client",
      items: inv.items || [{ description: "Services rendered", amount: inv.total || 0 }],
      total: inv.total || 0,
      status: inv.status || 'pending'
    });
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-slate-500">Loading your portal...</div>;
  }

  const activeProjects = projects.filter(p => p.status !== "Completed");
  const pendingInvoices = invoices.filter(i => i.status !== "paid");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Welcome Banner */}
      <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-indigo-100 max-w-xl">
            View your active projects, track progress, and manage your invoices all in one place.
          </p>
        </div>
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/50 blur-3xl" />
        <div className="absolute bottom-0 right-32 -mb-16 w-48 h-48 rounded-full bg-indigo-400/30 blur-2xl" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-600" /> Active Projects
            </h2>
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">{activeProjects.length}</Badge>
          </div>

          <div className="grid gap-4">
            {activeProjects.map((project, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={project.id}
              >
                <Card className="hover:border-indigo-200 transition-colors shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{project.name}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                          <Calendar className="h-3.5 w-3.5" /> Target Delivery: {project.dueDate || "TBD"}
                        </p>
                      </div>
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 shadow-none hover:bg-slate-100">
                        {project.status || "In Progress"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">Completion Progress</span>
                        <span className="font-bold text-indigo-600">{project.progress || 0}%</span>
                      </div>
                      <Progress value={project.progress || 0} className="h-2.5 bg-slate-100 [&>div]:bg-indigo-500" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {activeProjects.length === 0 && (
              <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p>All projects are completed!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Invoices */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="h-5 w-5 text-indigo-600" /> Billing & Invoices
            </h2>
            {pendingInvoices.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-none shadow-none">{pendingInvoices.length} Due</Badge>
            )}
          </div>

          <div className="grid gap-4">
            {invoices.map((inv, i) => (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={inv.id}
              >
                <Card className="shadow-sm">
                  <CardContent className="p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900">{inv.invoiceNumber}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Due: {inv.dueDate}</p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${
                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        inv.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {inv.status?.toUpperCase() || 'PENDING'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-end justify-between border-t border-slate-100 pt-4 mt-1">
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Amount Due</p>
                        <p className="font-bold text-lg text-slate-900 tabular-nums">
                          {inv.total?.toLocaleString()} AED
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        onClick={() => handleDownloadInvoice(inv)}
                      >
                        <FileDown className="mr-2 h-4 w-4" /> PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {invoices.length === 0 && (
              <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
                <p>No invoices available.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
