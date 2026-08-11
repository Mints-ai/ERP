import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, FileDown, Plus, Trash2, FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "@/lib/export";
import { generateInvoice } from "@/lib/pdfGenerator";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { canAccess } from "@/lib/permissions";
import { saveInvoice, deleteInvoiceData } from "@/lib/finance-services";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  draft: " text-foreground/50 border-border",
  sent: "bg-primary/15 text-primary/80 border-primary/20",
  paid: "bg-emerald-600/15 text-emerald-300 border-emerald-500/20",
  overdue: "bg-rose-600/15 text-rose-300 border-rose-500/20",
};

interface InvoicesTabProps {
  invoices: any[];
  clientsList: any[];
  compCurrency: string;
  user: any;
  role: string;
}

export function InvoicesTab({ invoices, clientsList, compCurrency, user, role }: InvoicesTabProps) {
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceClientName, setInvoiceClientName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceItems, setInvoiceItems] = useState<{ description: string; amount: number }[]>([
    { description: "Services rendered", amount: 0 }
  ]);
  const [invoiceTax, setInvoiceTax] = useState("5");
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [savingInvoice, setSavingInvoice] = useState(false);

  const initInvoiceForm = () => {
    setInvoiceNumber(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setInvoiceDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setInvoiceItems([{ description: "Services rendered", amount: 0 }]);
    setInvoiceTax("5");
    setInvoiceDiscount("0");
    setIsInvoiceModalOpen(true);
  };

  const addInvoiceItem = () => setInvoiceItems([...invoiceItems, { description: "", amount: 0 }]);
  
  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateInvoiceItem = (index: number, key: 'description' | 'amount', val: any) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [key]: val };
    setInvoiceItems(updated);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceClientName || !invoiceNumber || !invoiceDueDate) return;
    
    setSavingInvoice(true);
    try {
      const subtotal = invoiceItems.reduce((acc, item) => acc + Number(item.amount), 0);
      const taxAmount = subtotal * (Number(invoiceTax) / 100);
      const discountAmount = subtotal * (Number(invoiceDiscount) / 100);
      const finalTotal = subtotal + taxAmount - discountAmount;

      await saveInvoice({
        invoiceNumber, invoiceClientName, invoiceItems, invoiceTax, invoiceDiscount, invoiceDueDate, finalTotal, subtotal
      }, user?.uid, compCurrency);

      setIsInvoiceModalOpen(false);
      setInvoiceItems([{ description: "Services rendered", amount: 0 }]);
      setInvoiceClientName("");
    } catch (err) {
      console.error("Error saving invoice:", err);
    } finally {
      setSavingInvoice(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Accounts Receivable</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => exportToExcel(invoices, "Invoices_Report", "Invoices")}
            className="px-4 h-9 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
          <RoleGuard permission="CREATE_INVOICE">
            <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
              <DialogTrigger asChild>
                <button onClick={initInvoiceForm} className="btn-primary h-9 py-0 px-4 text-xs font-bold flex items-center justify-center cursor-pointer">
                  <Plus className="mr-1.5 h-4 w-4" /> Create Invoice
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-background border border-border text-foreground p-6 rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-foreground">Create Client Invoice</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveInvoice} className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Invoice #</Label>
                      <Input 
                        required 
                        value={invoiceNumber} 
                        onChange={(e) => setInvoiceNumber(e.target.value)} 
                        className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Due Date</Label>
                      <Input 
                        required 
                        type="date" 
                        value={invoiceDueDate} 
                        onChange={(e) => setInvoiceDueDate(e.target.value)} 
                        className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Client Company</Label>
                    <select 
                      required
                      value={invoiceClientName} 
                      onChange={(e) => setInvoiceClientName(e.target.value)} 
                      className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:border-primary/60 focus:ring-0 bg-background text-foreground font-semibold"
                    >
                      <option value="">-- Select Client --</option>
                      {clientsList.map(c => (
                        <option key={c.id} value={c.companyName || c.name}>{c.companyName || c.name || "Mints Client"}</option>
                      ))}
                      <option value="Mints Global Sandbox Client">Sandbox Demonstration Client</option>
                    </select>
                  </div>

                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Invoice Items</Label>
                      <button type="button" onClick={addInvoiceItem} className="text-xs text-primary font-bold hover:underline">+ Add Item</button>
                    </div>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {invoiceItems.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input 
                            required 
                            placeholder="Item description" 
                            value={item.description}
                            onChange={(e) => updateInvoiceItem(idx, 'description', e.target.value)}
                            className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-8 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 flex-1"
                          />
                          <Input 
                            required 
                            type="number" 
                            placeholder="Amount" 
                            value={item.amount || ""}
                            onChange={(e) => updateInvoiceItem(idx, 'amount', Number(e.target.value))}
                            className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-8 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-24 font-mono text-right"
                          />
                          {invoiceItems.length > 1 && (
                            <button type="button" onClick={() => removeInvoiceItem(idx)} className="text-rose-400 hover:text-rose-300 font-bold text-xs p-1">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Tax Rate (%)</Label>
                      <Input 
                        type="number" 
                        value={invoiceTax} 
                        onChange={(e) => setInvoiceTax(e.target.value)} 
                        className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full font-mono"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Discount (%)</Label>
                      <Input 
                        type="number" 
                        value={invoiceDiscount} 
                        onChange={(e) => setInvoiceDiscount(e.target.value)} 
                        className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 w-full font-mono"
                      />
                    </div>
                  </div>

                  <div className="border border-border p-3 rounded-xl space-y-1.5 text-xs text-foreground/60">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono text-foreground">{invoiceItems.reduce((acc, item) => acc + Number(item.amount), 0).toLocaleString()} {compCurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({invoiceTax}%):</span>
                      <span className="font-mono text-foreground">{(invoiceItems.reduce((acc, item) => acc + Number(item.amount), 0) * (Number(invoiceTax) / 100)).toLocaleString()} {compCurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount ({invoiceDiscount}%):</span>
                      <span className="font-mono text-foreground">{(invoiceItems.reduce((acc, item) => acc + Number(item.amount), 0) * (Number(invoiceDiscount) / 100)).toLocaleString()} {compCurrency}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 font-bold text-foreground">
                      <span>Grand Total:</span>
                      <span className="font-mono text-primary">
                        {(
                          invoiceItems.reduce((acc, item) => acc + Number(item.amount), 0) * (1 + Number(invoiceTax) / 100 - Number(invoiceDiscount) / 100)
                        ).toLocaleString()} {compCurrency}
                      </span>
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t border-border gap-2 sm:gap-0 mt-4">
                    <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="btn-ghost h-9 py-0 px-4 text-xs font-semibold border-border text-foreground/70 hover:text-foreground cursor-pointer">Cancel</button>
                    <button type="submit" disabled={savingInvoice} className="btn-primary h-9 py-0 px-4 text-xs font-bold flex items-center justify-center cursor-pointer">
                      {savingInvoice ? "Saving..." : "Create & Issue"}
                    </button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </RoleGuard>
        </div>
      </div>
      <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden border-border">
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="text-center py-16 text-foreground/30">
              <Banknote className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-wider text-foreground/40">No invoices generated yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover: transition-colors">
                      <td className="font-bold text-foreground">{inv.invoiceNumber}</td>
                      <td className="text-foreground/60 font-semibold">{inv.clientId}</td>
                      <td className="font-bold text-foreground font-mono text-xs">{inv.total?.toLocaleString()} {inv.currency || compCurrency}</td>
                      <td className="text-foreground/40 font-semibold">{inv.dueDate}</td>
                      <td>
                        <Badge variant="outline" className={cn("font-bold text-xs py-0.5 tracking-wider uppercase shadow-none", STATUS_COLORS[inv.status] || STATUS_COLORS.draft)}>
                          {inv.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            className="btn-ghost p-1.5 hover:text-foreground text-foreground/50 cursor-pointer rounded-lg border-border/30 border hover:border-border"
                            onClick={() => generateInvoice({
                              invoiceNumber: inv.invoiceNumber,
                              date: inv.date || new Date().toISOString().split('T')[0],
                              clientName: inv.clientId || "Client",
                              items: inv.items || [{ description: "Services rendered", amount: inv.total || 0 }],
                              total: inv.total || 0,
                              status: inv.status
                            })}
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                          {canAccess(role, "DELETE_DATA") && (
                            <button 
                              onClick={async () => {
                                if (confirm(`Are you absolutely sure you want to permanently delete the invoice "${inv.invoiceNumber}"? This action cannot be undone.`)) {
                                  await deleteInvoiceData(inv.id);
                                }
                              }}
                              className="p-1.5 text-foreground/40 hover:text-red-500 rounded-lg hover: transition-colors border border-border/30 hover:border-border"
                              title="Delete Invoice"
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
