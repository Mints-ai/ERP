"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, FileDown } from "lucide-react";
import { ApprovalsWidget } from "@/components/dashboard/ApprovalsWidget";
import { 
  subscribeToCompanySettings, 
  subscribeToClients, 
  subscribeToEmployees, 
  subscribeToInvoices, 
  subscribeToExpenses 
} from "@/lib/finance-services";
import { downloadCSV } from "@/lib/exportUtils";

// Import Refactored Components
import { FinanceOverview } from "@/components/finance/FinanceOverview";
import { InvoicesTab } from "@/components/finance/InvoicesTab";
import { ExpensesTab } from "@/components/finance/ExpensesTab";
import { PayrollTab } from "@/components/finance/PayrollTab";

export default function FinanceDashboard() {
  const { user, role } = useAuth();
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [compCurrency, setCompCurrency] = useState("USD");

  useEffect(() => {
    const unsubSettings = subscribeToCompanySettings(setCompCurrency);
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubClients = subscribeToClients(setClientsList);
    const unsubEmployees = subscribeToEmployees(setEmployeesList);
    const unsubInvoices = subscribeToInvoices(setInvoices);
    const unsubExpenses = subscribeToExpenses(setExpenses);

    return () => {
      unsubClients();
      unsubEmployees();
      unsubInvoices();
      unsubExpenses();
    };
  }, [user]);

  const handleExportCSV = () => {
    const invoiceRows = invoices.map(inv => ({
      date: inv.dueDate || "N/A",
      type: "Invoice (Inflow)",
      party: inv.clientId || "Client",
      category: "Sales/Revenue",
      amount: inv.total || 0,
      status: inv.status || "Pending",
    }));

    const expenseRows = expenses.map(exp => ({
      date: exp.date || "N/A",
      type: "Expense (Outflow)",
      party: exp.vendor || "Vendor",
      category: exp.category || "Other",
      amount: exp.amount || 0,
      status: exp.status || "Pending",
    }));

    const consolidated = [...invoiceRows, ...expenseRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    downloadCSV(
      consolidated,
      ["Transaction Date", "Transaction Type", "Party / Client / Vendor", "Category", "Amount (AED)", "Status"],
      ["date", "type", "party", "category", "amount", "status"],
      "Mints_Global_Financial_Ledger.csv"
    );
  };

  return (
    <RoleGuard permission="VIEW_DEPT_FINANCE" fallback={<div className="p-8 text-center text-foreground/40 font-bold uppercase tracking-wider text-xs">Access Denied.</div>}>
      <div className="space-y-6 pb-12 text-foreground">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Finance Hub
            </h1>
            <p className="text-xs text-foreground/40 mt-1">Manage agency revenue, cash flow, invoices, and expenses.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportCSV}
              className="btn-ghost py-0 px-4 h-9 text-xs font-bold border-border text-foreground/70 hover:text-foreground flex items-center justify-center cursor-pointer gap-1.5"
            >
              <FileDown className="w-4 h-4 text-accent" /> Export CSV
            </button>
          </div>
        </div>

        <ApprovalsWidget />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6 border border-border shadow-inner p-1 rounded-xl flex flex-wrap h-auto gap-2">
            <TabsTrigger value="overview" className="text-xs py-1.5 px-4 font-bold rounded-lg text-foreground/40 data-[state=active]:bg-primary data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all cursor-pointer">Executive Summary</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs py-1.5 px-4 font-bold rounded-lg text-foreground/40 data-[state=active]:bg-primary data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all cursor-pointer">Invoices</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs py-1.5 px-4 font-bold rounded-lg text-foreground/40 data-[state=active]:bg-primary data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all cursor-pointer">Expenses</TabsTrigger>
            <TabsTrigger value="payroll" className="text-xs py-1.5 px-4 font-bold rounded-lg text-foreground/40 data-[state=active]:bg-primary data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all cursor-pointer">Payroll & Payslips</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <FinanceOverview invoices={invoices} expenses={expenses} compCurrency={compCurrency} />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesTab invoices={invoices} clientsList={clientsList} compCurrency={compCurrency} user={user} role={role} />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTab expenses={expenses} compCurrency={compCurrency} user={user} role={role} />
          </TabsContent>

          <TabsContent value="payroll">
            <PayrollTab employeesList={employeesList} user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
