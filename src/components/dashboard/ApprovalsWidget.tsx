"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ShieldAlert, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ApprovalsWidget() {
  const { user, role } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !role) return;

    const q = query(
      collection(db, "expenses"),
      where("status", "==", "pending_approval")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Filter for items where the current step requires this user's role
      const myApprovals = items.filter(item => {
        const chain = item.requiredApprovals || [];
        const step = item.currentApprovalStep || 0;
        return chain[step] === role;
      });

      setPendingApprovals(myApprovals);
      setLoading(false);
    });

    return () => unsub();
  }, [user, role]);

  const handleAction = async (id: string, action: "approve" | "reject", currentStep: number, chain: string[]) => {
    setProcessingId(id);
    try {
      const expenseRef = doc(db, "expenses", id);
      
      if (action === "reject") {
        await updateDoc(expenseRef, {
          status: "rejected",
          rejectedBy: user?.displayName || user?.email,
          rejectedAt: serverTimestamp()
        });
      } else {
        const nextStep = currentStep + 1;
        if (nextStep >= chain.length) {
          // Fully approved!
          await updateDoc(expenseRef, {
            status: "approved",
            currentApprovalStep: nextStep,
            approvedBy: user?.displayName || user?.email,
            approvedAt: serverTimestamp()
          });
        } else {
          // Move to next step
          await updateDoc(expenseRef, {
            currentApprovalStep: nextStep,
            lastApprovedBy: user?.displayName || user?.email,
            lastApprovedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error("Error processing approval:", err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-border">
        <CardContent className="p-6 flex justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (pendingApprovals.length === 0) {
    return null; // Don't show the widget if there are no approvals pending for this user
  }

  return (
    <Card className="shadow-md border-primary/20 overflow-hidden mb-6">
      <CardHeader className="bg-primary/5 pb-4 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <ShieldAlert className="h-5 w-5" /> 
              Action Required: Pending Approvals
            </CardTitle>
            <CardDescription className="mt-1">
              The following requests require your approval as <span className="font-bold capitalize">{role}</span>.
            </CardDescription>
          </div>
          <Badge variant="destructive" className="animate-pulse">{pendingApprovals.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          <AnimatePresence>
            {pendingApprovals.map((item) => (
              <motion.li 
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 sm:p-6 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {item.vendor || item.category || "Expense"}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono bg-background">
                        {item.amount?.toLocaleString()} {item.currency || "USD"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submitted by <span className="font-medium text-foreground">{item.submittedBy}</span> on {item.date}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                      <span className="font-medium">Workflow:</span>
                      {item.requiredApprovals?.map((r: string, i: number) => (
                        <span key={i} className={`flex items-center ${i === item.currentApprovalStep ? "text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded" : (i < item.currentApprovalStep ? "text-emerald-600 line-through opacity-70" : "")}`}>
                          {r}
                          {i < item.requiredApprovals.length - 1 && <ArrowRight className="h-3 w-3 mx-1 opacity-50 no-underline" />}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      disabled={processingId === item.id}
                      onClick={() => handleAction(item.id, "approve", item.currentApprovalStep, item.requiredApprovals)}
                    >
                      {processingId === item.id ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
                      Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      disabled={processingId === item.id}
                      onClick={() => handleAction(item.id, "reject", item.currentApprovalStep, item.requiredApprovals)}
                    >
                      {processingId === item.id ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <X className="h-4 w-4 mr-1.5" />}
                      Reject
                    </Button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </CardContent>
    </Card>
  );
}
