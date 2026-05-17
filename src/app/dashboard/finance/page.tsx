"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateInvoice } from "@/lib/pdfGenerator";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Banknote, FileText, Receipt, TrendingUp, AlertCircle, Plus, FileDown, ArrowUpRight, ArrowDownRight, DollarSign, Upload, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

// Enhanced Mock Data for Area Chart
const mockFinancialData = [
  { name: "Jan", revenue: 125000, expenses: 85000, profit: 40000 },
  { name: "Feb", revenue: 142000, expenses: 90000, profit: 52000 },
  { name: "Mar", revenue: 98000, expenses: 75000, profit: 23000 },
  { name: "Apr", revenue: 185000, expenses: 110000, profit: 75000 },
  { name: "May", revenue: 160000, expenses: 95000, profit: 65000 },
  { name: "Jun", revenue: 210000, expenses: 125000, profit: 85000 },
];

const mockExpenseData = [
  { name: "Software", value: 15000 },
  { name: "Marketing", value: 45000 },
  { name: "Freelancers", value: 25000 },
  { name: "Office", value: 8000 },
];

const COLORS = ["#4a5c2b", "#6b7c3e", "#8fa651", "#b0c485"];
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  paid: "bg-green-100 text-green-700 border-green-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
};

export default function FinanceDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // OCR State
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ amount?: number; date?: string; vendor?: string } | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) return;

    const qInvoices = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      const invs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(invs);
    });

    const qExpenses = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const exps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(exps);
      setLoading(false);
    });

    return () => {
      unsubInvoices();
      unsubExpenses();
    };
  }, [user]);

  return (
    <RoleGuard permission="VIEW_DEPT_FINANCE" fallback={<div className="p-8 text-center text-olive-600">Access Denied.</div>}>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-olive-900">Finance & Reporting</h1>
            <p className="text-olive-600 mt-1">Manage agency revenue, cash flow, invoices, and expenses.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-olive-200 text-olive-700 hover:bg-olive-50 shadow-sm">
              <FileDown className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6 bg-white border border-olive-200 shadow-sm p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-olive-100 data-[state=active]:text-olive-900">Executive Summary</TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-olive-100 data-[state=active]:text-olive-900">Invoices</TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-olive-100 data-[state=active]:text-olive-900">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            
            {/* Executive Summary Bar */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-olive-200 shadow-sm bg-gradient-to-br from-white to-olive-50">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-olive-500 uppercase tracking-wider">Gross Revenue</p>
                    <div className="p-1.5 bg-olive-100 text-olive-600 rounded-md"><DollarSign className="w-4 h-4" /></div>
                  </div>
                  <h3 className="text-2xl font-black text-olive-900 tabular-nums">920.0K <span className="text-sm font-bold text-olive-400">AED</span></h3>
                  <div className="flex items-center gap-1 mt-2 text-xs font-bold text-green-600">
                    <ArrowUpRight className="w-3 h-3" /> 12.5% YoY
                  </div>
                </CardContent>
              </Card>

              <Card className="border-olive-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-olive-500 uppercase tracking-wider">Net Profit</p>
                    <div className="p-1.5 bg-green-50 text-green-600 rounded-md"><TrendingUp className="w-4 h-4" /></div>
                  </div>
                  <h3 className="text-2xl font-black text-olive-900 tabular-nums">340.0K <span className="text-sm font-bold text-olive-400">AED</span></h3>
                  <div className="flex items-center gap-1 mt-2 text-xs font-bold text-green-600">
                    <ArrowUpRight className="w-3 h-3" /> 8.2% YoY
                  </div>
                </CardContent>
              </Card>

              <Card className="border-olive-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-olive-500 uppercase tracking-wider">AR (Outstanding)</p>
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><Banknote className="w-4 h-4" /></div>
                  </div>
                  <h3 className="text-2xl font-black text-olive-900 tabular-nums">45.5K <span className="text-sm font-bold text-olive-400">AED</span></h3>
                  <div className="flex items-center gap-1 mt-2 text-xs font-bold text-red-500">
                    <AlertCircle className="w-3 h-3" /> 3 Invoices Overdue
                  </div>
                </CardContent>
              </Card>

              <Card className="border-olive-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-olive-500 uppercase tracking-wider">Run Rate</p>
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><ArrowUpRight className="w-4 h-4" /></div>
                  </div>
                  <h3 className="text-2xl font-black text-olive-900 tabular-nums">1.84M <span className="text-sm font-bold text-olive-400">AED</span></h3>
                  <div className="flex items-center gap-1 mt-2 text-xs font-bold text-olive-400">
                    Projected FY2026
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stacked Area Chart */}
              <Card className="lg:col-span-2 border-olive-200 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg text-olive-900">Cash Flow (H1 2026)</CardTitle>
                  <CardDescription>Revenue vs Expenses vs Net Profit over the last 6 months.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockFinancialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8fa651" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8fa651" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4a5c2b" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#4a5c2b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value / 1000}k`} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => [`${value} AED`, '']}
                        />
                        <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8fa651" strokeWidth={2} fill="url(#colorRevenue)" name="Revenue" />
                        <Area type="monotone" dataKey="profit" stackId="2" stroke="#4a5c2b" strokeWidth={3} fill="url(#colorProfit)" name="Profit" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Donut */}
              <Card className="border-olive-200 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg text-olive-900">Expense Distribution</CardTitle>
                  <CardDescription>Breakdown by category (Current Month)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] flex flex-col justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mockExpenseData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={95}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {mockExpenseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => `${value} AED`} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Inner Text for Donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-olive-900">93K</span>
                      <span className="text-[10px] uppercase font-bold text-olive-400">Total Exp</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    {mockExpenseData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center text-olive-700">
                          <div className="w-3 h-3 rounded-sm mr-2" style={{backgroundColor: COLORS[index]}}></div>
                          {entry.name}
                        </div>
                        <span className="text-olive-900 tabular-nums">{entry.value.toLocaleString()} AED</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Invoices List */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-olive-900">Accounts Receivable</h2>
              <RoleGuard permission="CREATE_INVOICE">
                <Button className="bg-olive-600 hover:bg-olive-700 text-white shadow-md">
                  <Plus className="mr-2 h-4 w-4" /> Create Invoice
                </Button>
              </RoleGuard>
            </div>
            <Card className="border-olive-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <div className="text-center py-16 text-olive-500 bg-olive-50/50">
                    <Banknote className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-olive-900">No invoices generated yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-olive-50 text-olive-700 text-xs uppercase tracking-wider font-bold border-b border-olive-200">
                        <tr>
                          <th className="px-6 py-4">Invoice #</th>
                          <th className="px-6 py-4">Client</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Due Date</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-olive-100">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-olive-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-olive-900">{inv.invoiceNumber}</td>
                            <td className="px-6 py-4 text-olive-600 font-medium">{inv.clientId}</td>
                            <td className="px-6 py-4 font-bold text-olive-900 tabular-nums">{inv.total?.toLocaleString()} {inv.currency || 'AED'}</td>
                            <td className="px-6 py-4 text-olive-500 font-medium">{inv.dueDate}</td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={`font-bold shadow-none ${STATUS_COLORS[inv.status] || STATUS_COLORS.draft}`}>
                                {inv.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-olive-600 hover:text-olive-900 hover:bg-olive-100"
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
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses List */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-olive-900">Accounts Payable</h2>
              <RoleGuard permission="SUBMIT_EXPENSE">
                <div className="flex gap-2">
                  <Dialog open={isOcrModalOpen} onOpenChange={setIsOcrModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-olive-100 hover:bg-olive-200 text-olive-900 border border-olive-200 shadow-sm">
                        <Sparkles className="mr-2 h-4 w-4 text-olive-600" /> Smart Scan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-olive-600" /> AI Receipt Scanner
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {!ocrResult ? (
                          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-olive-200 rounded-xl bg-olive-50/50">
                            {isScanning ? (
                              <div className="flex flex-col items-center gap-3 text-olive-600">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p className="text-sm font-medium">Extracting data...</p>
                              </div>
                            ) : (
                              <>
                                <Upload className="h-10 w-10 text-olive-400 mb-3" />
                                <p className="text-sm font-medium text-olive-900 mb-1">Upload Receipt Image</p>
                                <p className="text-xs text-olive-500 mb-4 text-center">JPG, PNG up to 5MB</p>
                                <Label htmlFor="receipt-upload" className="cursor-pointer bg-olive-600 hover:bg-olive-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                  Select File
                                </Label>
                                <Input id="receipt-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm flex items-start gap-2">
                              <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                              <p>Data extracted successfully! Review and save.</p>
                            </div>
                            <div className="grid gap-2">
                              <Label>Vendor Name</Label>
                              <Input defaultValue={ocrResult.vendor} className="bg-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label>Amount</Label>
                                <Input defaultValue={ocrResult.amount} type="number" step="0.01" className="bg-white" />
                              </div>
                              <div className="grid gap-2">
                                <Label>Date</Label>
                                <Input defaultValue={ocrResult.date} type="date" className="bg-white" />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                              <Button variant="outline" onClick={() => {setOcrResult(null); setReceiptImage(null);}}>Scan Another</Button>
                              <Button className="bg-olive-600 text-white hover:bg-olive-700">Save Expense</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button className="bg-olive-600 hover:bg-olive-700 text-white shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> Log Expense
                  </Button>
                </div>
              </RoleGuard>
            </div>
            <Card className="border-olive-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {expenses.length === 0 ? (
                  <div className="text-center py-16 text-olive-500 bg-olive-50/50">
                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-olive-900">No expenses logged yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-olive-50 text-olive-700 text-xs uppercase tracking-wider font-bold border-b border-olive-200">
                        <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-olive-100">
                        {expenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-olive-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-olive-900">{exp.submittedBy}</td>
                            <td className="px-6 py-4 text-olive-600 font-medium">{exp.category}</td>
                            <td className="px-6 py-4 font-bold text-olive-900 tabular-nums">{exp.amount?.toLocaleString()} {exp.currency || 'AED'}</td>
                            <td className="px-6 py-4 text-olive-500 font-medium">
                              {exp.createdAt?.seconds ? new Date(exp.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={`font-bold shadow-none ${
                                exp.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                exp.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-amber-100 text-amber-700 border-amber-200'
                              }`}>
                                {exp.status?.toUpperCase() || 'PENDING'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
