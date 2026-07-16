"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings2, Shield, Trash2, Zap, ArrowRight, ServerCrash, Save, Edit } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  triggerType: string;
  conditions: {
    field: string;
    operator: string;
    value: any;
  }[];
  approvalChain: string[];
  isActive: boolean;
  createdAt?: string;
}

export default function WorkflowsPage() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    setLoading(true);
    try {
      const q = query(collection(db, "workflows"));
      const querySnapshot = await getDocs(q);
      const fetchedWorkflows = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Workflow[];
      setWorkflows(fetchedWorkflows);
    } catch (err) {
      console.error("Failed to fetch workflows", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setCurrentWorkflow({
      id: Math.random().toString(36).substr(2, 9),
      name: "New Expense Approval Workflow",
      triggerType: "Expense",
      conditions: [{ field: "amount", operator: ">=", value: 1000 }],
      approvalChain: ["manager", "founder", "finance"],
      isActive: true
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentWorkflow) return;
    try {
      const workflowRef = doc(db, "workflows", currentWorkflow.id);
      await setDoc(workflowRef, {
        ...currentWorkflow,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsEditing(false);
      setCurrentWorkflow(null);
      fetchWorkflows();
    } catch (err) {
      console.error("Failed to save workflow", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this workflow?")) return;
    try {
      await deleteDoc(doc(db, "workflows", id));
      fetchWorkflows();
    } catch (err) {
      console.error("Failed to delete workflow", err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading workflows...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" /> Automated Workflows
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Configure automated routing and approval chains for internal processes.</p>
        </div>
        {!isEditing && (
          <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90 text-white shadow-md">
            <Plus className="h-4 w-4 mr-2" /> New Workflow
          </Button>
        )}
      </div>

      {isEditing && currentWorkflow ? (
        <Card className="border-primary shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="bg-muted/30 border-b border-border pb-4">
            <CardTitle>Edit Workflow Configuration</CardTitle>
            <CardDescription>Define the trigger conditions and the sequential chain of approvals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Workflow Name</label>
                <input 
                  type="text"
                  value={currentWorkflow.name}
                  onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, name: e.target.value })}
                  className="w-full h-10 border border-border rounded-xl px-3 text-sm focus:ring-1 focus:ring-primary bg-background text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Trigger Type</label>
                <select 
                  value={currentWorkflow.triggerType}
                  onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, triggerType: e.target.value })}
                  className="w-full h-10 border border-border rounded-xl px-3 text-sm focus:ring-1 focus:ring-primary bg-background text-foreground"
                >
                  <option value="Expense">Expense Submissions</option>
                  <option value="Leave" disabled>Leave Requests (Coming Soon)</option>
                  <option value="Invoice" disabled>Invoice Approvals (Coming Soon)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Trigger Conditions
              </label>
              {currentWorkflow.conditions.map((cond, idx) => (
                <div key={idx} className="flex gap-3 items-center bg-muted/40 p-3 rounded-xl border border-border">
                  <span className="text-sm font-medium">When</span>
                  <input 
                    type="text" 
                    value={cond.field}
                    onChange={(e) => {
                      const newConds = [...currentWorkflow.conditions];
                      newConds[idx].field = e.target.value;
                      setCurrentWorkflow({ ...currentWorkflow, conditions: newConds });
                    }}
                    className="h-8 border border-border rounded-lg px-2 text-sm w-32 bg-background text-foreground"
                  />
                  <select 
                    value={cond.operator}
                    onChange={(e) => {
                      const newConds = [...currentWorkflow.conditions];
                      newConds[idx].operator = e.target.value;
                      setCurrentWorkflow({ ...currentWorkflow, conditions: newConds });
                    }}
                    className="h-8 border border-border rounded-lg px-2 text-sm w-24 bg-background text-foreground"
                  >
                    <option value=">=">{'>='}</option>
                    <option value="<=">{'<='}</option>
                    <option value="==">==</option>
                    <option value=">">{'>'}</option>
                    <option value="<">{'<'}</option>
                  </select>
                  <input 
                    type="number" 
                    value={cond.value}
                    onChange={(e) => {
                      const newConds = [...currentWorkflow.conditions];
                      newConds[idx].value = Number(e.target.value);
                      setCurrentWorkflow({ ...currentWorkflow, conditions: newConds });
                    }}
                    className="h-8 border border-border rounded-lg px-2 text-sm w-32 bg-background text-foreground"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" /> Approval Chain (Sequential)
              </label>
              <div className="flex flex-wrap gap-2 items-center p-4 bg-primary/5 border border-primary/20 rounded-xl">
                {currentWorkflow.approvalChain.map((role, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-background text-primary border-primary font-bold px-3 py-1 text-sm shadow-sm">
                      {idx + 1}. {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                    {idx < currentWorkflow.approvalChain.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Edit chain logic by comma separating roles (e.g., manager, founder, finance).
              </p>
              <input 
                type="text" 
                value={currentWorkflow.approvalChain.join(", ")}
                onChange={(e) => {
                  const roles = e.target.value.split(",").map(r => r.trim().toLowerCase()).filter(Boolean);
                  setCurrentWorkflow({ ...currentWorkflow, approvalChain: roles });
                }}
                className="w-full h-10 border border-border rounded-xl px-3 text-sm focus:ring-1 focus:ring-primary bg-background text-foreground"
                placeholder="manager, founder, finance"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white">
                <Save className="h-4 w-4 mr-2" /> Save Workflow
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workflows.map((wf) => (
            <Card key={wf.id} className="hover:border-primary/50 transition-colors shadow-sm">
              <CardContent className="p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{wf.name}</h3>
                    <Badge variant={wf.isActive ? "default" : "secondary"} className={wf.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none" : ""}>
                      {wf.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold bg-muted px-2 py-0.5 rounded text-foreground">{wf.triggerType}</span>
                    <span>with</span>
                    {wf.conditions.map((c, i) => (
                      <span key={i} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border">
                        {c.field} {c.operator} {c.value}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col md:items-end gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <span>Chain:</span>
                    {wf.approvalChain.map((r, i) => (
                      <span key={i} className="flex items-center">
                        <span className="text-foreground">{r}</span>
                        {i < wf.approvalChain.length - 1 && <ArrowRight className="h-3 w-3 mx-1 opacity-50" />}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setCurrentWorkflow(wf); setIsEditing(true); }}>
                      <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDelete(wf.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {workflows.length === 0 && (
            <div className="text-center p-12 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
              <ServerCrash className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No workflows configured yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
