import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, Sparkles, Loader2, Upload, Plus, Trash2 } from "lucide-react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { canAccess } from "@/lib/permissions";
import { saveManualExpense, saveOcrExpense, updateExpenseStatus, deleteExpenseData } from "@/lib/finance-services";
import { cn } from "@/lib/utils";

interface ExpensesTabProps {
  expenses: any[];
  compCurrency: string;
  user: any;
  role: string;
}

export function ExpensesTab({ expenses, compCurrency, user, role }: ExpensesTabProps) {
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ amount?: number; date?: string; vendor?: string } | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const [ocrVendor, setOcrVendor] = useState("");
  const [ocrAmount, setOcrAmount] = useState("");
  const [ocrDate, setOcrDate] = useState("");

  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualVendor, setManualVendor] = useState("");
  const [manualCategory, setManualCategory] = useState("Software");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    if (ocrResult) {
      setOcrVendor(ocrResult.vendor || "");
      setOcrAmount(ocrResult.amount?.toString() || "");
      setOcrDate(ocrResult.date || new Date().toISOString().split('T')[0]);
    }
  }, [ocrResult]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result?.toString().split(",")[1];
      if (!base64) return;
      
      setReceiptImage(event.target?.result as string);
      setIsScanning(true);
      
      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 })
        });
        
        const data = await res.json();
        if (data.success) {
          setOcrResult(data.data);
        } else {
          alert("OCR Failed: " + data.error);
        }
      } catch (err) {
        console.error(err);
        alert("An error occurred during scan.");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualVendor.trim() || !manualAmount) return;
    setSavingManual(true);
    try {
      await saveManualExpense({ manualVendor, manualCategory, manualAmount, manualDate }, user, compCurrency);
      setManualVendor("");
      setManualCategory("Software");
      setManualAmount("");
      setManualDate(new Date().toISOString().split('T')[0]);
      setIsManualOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingManual(false);
    }
  };

  const handleSaveOcr = async () => {
    if (!ocrVendor.trim() || !ocrAmount) return;
    try {
      await saveOcrExpense({ ocrVendor, ocrAmount, ocrDate }, user, compCurrency);
      setOcrResult(null);
      setReceiptImage(null);
      setIsOcrModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Accounts Payable</h2>
        <RoleGuard permission="SUBMIT_EXPENSE">
          <div className="flex gap-2">
            <Dialog open={isOcrModalOpen} onOpenChange={setIsOcrModalOpen}>
              <DialogTrigger asChild>
                <button className="px-4 h-9 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer bg-primary/10 border border-primary/20 text-primary/80 hover:bg-primary/20">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Smart Scan
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-background border border-border text-foreground p-6 rounded-2xl shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> AI Receipt Scanner
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {!ocrResult ? (
                    <div className="flex flex-col items-center justify-center p-8 border border-border border-dashed rounded-xl">
                      {isScanning ? (
                        <div className="flex flex-col items-center gap-3 text-primary">
                          <Loader2 className="h-7 w-7 animate-spin" />
                          <p className="text-xs font-bold uppercase tracking-wider">Extracting details...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-foreground/30 mb-3" />
                          <p className="text-xs font-bold text-foreground mb-1 uppercase tracking-wider">Upload Receipt Image</p>
                          <p className="text-xs text-foreground/20 mb-4 text-center">JPG, PNG up to 5MB</p>
                          <Label htmlFor="receipt-upload" className="cursor-pointer btn-primary h-8 py-0 px-4 text-xs font-bold flex items-center justify-center">
                            Select File
                          </Label>
                          <Input id="receipt-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs flex items-start gap-2">
                        <Sparkles className="h-4 w-4 shrink-0 text-accent" />
                        <p className="font-semibold leading-normal">Data extracted successfully! Review and save.</p>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Vendor Name</Label>
                        <Input 
                          value={ocrVendor} 
                          onChange={(e) => setOcrVendor(e.target.value)} 
                          className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Amount ({compCurrency})</Label>
                          <Input 
                            value={ocrAmount} 
                            onChange={(e) => setOcrAmount(e.target.value)} 
                            type="number" 
                            step="0.01" 
                            className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full font-mono" 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Date</Label>
                          <Input 
                            value={ocrDate} 
                            onChange={(e) => setOcrDate(e.target.value)} 
                            type="date" 
                            className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full" 
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                        <button onClick={() => {setOcrResult(null); setReceiptImage(null);}} className="btn-ghost h-9 py-0 px-4 text-xs font-semibold border-border text-foreground/70 hover:text-foreground cursor-pointer">Scan Another</button>
                        <button onClick={handleSaveOcr} className="btn-primary h-9 py-0 px-4 text-xs font-bold flex items-center justify-center cursor-pointer">Save Expense</button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
              <DialogTrigger asChild>
                <button className="btn-primary h-9 py-0 px-4 text-xs font-bold flex items-center justify-center cursor-pointer">
                  <Plus className="mr-1.5 h-4 w-4" /> Log Expense
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-background border border-border text-foreground p-6 rounded-2xl shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-foreground">Log Corporate Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveManual} className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Vendor Name</Label>
                    <Input 
                      required 
                      placeholder="e.g., Amazon Web Services" 
                      value={manualVendor} 
                      onChange={(e) => setManualVendor(e.target.value)} 
                      className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Expense Category</Label>
                    <select 
                      value={manualCategory} 
                      onChange={(e) => setManualCategory(e.target.value)} 
                      className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:border-primary/60 focus:ring-0 bg-background text-foreground"
                    >
                      <option value="Software">Software & Subscriptions</option>
                      <option value="Marketing">Marketing & Advertising</option>
                      <option value="Freelancers">Freelancers & Outsourcing</option>
                      <option value="Office">Office Supplies & Utilities</option>
                      <option value="Travel">Business Travel</option>
                      <option value="Meals">Meals & Client Entertainment</option>
                      <option value="Other">Other Expenses</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Amount ({compCurrency})</Label>
                      <Input 
                        required 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={manualAmount} 
                        onChange={(e) => setManualAmount(e.target.value)} 
                        className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full font-mono" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Date</Label>
                      <Input 
                        required 
                        type="date" 
                        value={manualDate} 
                        onChange={(e) => setManualDate(e.target.value)} 
                        className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full" 
                      />
                    </div>
                  </div>
                  <DialogFooter className="pt-4 border-t border-border gap-2 sm:gap-0 mt-4">
                    <button type="button" onClick={() => setIsManualOpen(false)} className="btn-ghost h-9 py-0 px-4 text-xs font-semibold border-border text-foreground/70 hover:text-foreground cursor-pointer">Cancel</button>
                    <button type="submit" disabled={savingManual} className="btn-primary h-9 py-0 px-4 text-xs font-bold flex items-center justify-center cursor-pointer">
                      {savingManual ? "Saving..." : "Log Expense"}
                    </button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </RoleGuard>
      </div>
      <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden border-border">
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="text-center py-16 text-foreground/30">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-wider text-foreground/40">No expenses logged yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover: transition-colors">
                      <td className="font-bold text-foreground">{exp.submittedBy}</td>
                      <td className="text-foreground/60 font-semibold">{exp.vendor || 'General Vendor'}</td>
                      <td className="text-foreground/60 font-semibold">{exp.category}</td>
                      <td className="font-bold text-foreground font-mono text-xs">{exp.amount?.toLocaleString()} {exp.currency || compCurrency}</td>
                      <td className="text-foreground/40 font-mono text-xs">
                        {exp.date || (exp.createdAt?.seconds ? new Date(exp.createdAt.seconds * 1000).toLocaleDateString() : 'N/A')}
                      </td>
                      <td>
                        <Badge variant="outline" className={cn("font-bold text-xs py-0.5 tracking-wider uppercase shadow-none", 
                          exp.status === 'approved' ? 'bg-emerald-600/15 text-emerald-300 border-emerald-500/20' :
                          exp.status === 'rejected' ? 'bg-rose-600/15 text-rose-300 border-rose-500/20' :
                          'bg-amber-600/15 text-amber-300 border-amber-500/20 animate-pulse'
                        )}>
                          {exp.status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {exp.status === 'pending' || !exp.status ? (
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => updateExpenseStatus(exp.id, "approved", user?.displayName)}
                                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-foreground text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-glow-emerald"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => updateExpenseStatus(exp.id, "rejected", user?.displayName)}
                                className="h-7 px-3 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-foreground/30 font-bold uppercase tracking-wider italic">Reviewed</span>
                          )}
                          {canAccess(role, "DELETE_DATA") && (
                            <button 
                              onClick={async () => {
                                if (confirm(`Are you absolutely sure you want to permanently delete the expense for "${exp.vendor || 'General Vendor'}" of amount ${exp.amount?.toLocaleString()} ${exp.currency}? This action is irreversible.`)) {
                                  await deleteExpenseData(exp.id);
                                }
                              }}
                              className="p-1.5 text-foreground/40 hover:text-red-500 rounded-lg hover: transition-colors border border-border/30 hover:border-border"
                              title="Delete Expense"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
