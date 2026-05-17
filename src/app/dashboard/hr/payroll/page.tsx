"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { generatePayslip } from "@/lib/pdfGenerator";
import { Banknote, FileDown, Calculator, Download } from "lucide-react";
import { motion } from "framer-motion";

interface PayrollData {
  userId: string;
  name: string;
  role: string;
  avatar: string;
  baseSalary: number;
  unpaidLeaves: number;
  deductions: number;
  netPay: number;
  status: "Paid" | "Pending";
}

export default function PayrollDashboard() {
  const [payroll, setPayroll] = useState<PayrollData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayroll = async () => {
      // In a real app, this would fetch from a specific `payroll` collection
      // connected to `leaves` and `attendance`. For now, we mock the calculation based on users.
      const usersSnap = await getDocs(collection(db, "users"));
      
      const payrollData: PayrollData[] = [];
      usersSnap.forEach(doc => {
        const user = doc.data();
        
        // Mock Salary Calculation
        const baseSalary = user.role === "admin" ? 15000 : user.role === "manager" ? 12000 : 8000;
        const unpaidLeaves = Math.floor(Math.random() * 3); // Mock 0-2 unpaid leaves
        const dailyRate = baseSalary / 30;
        const deductions = Math.round(unpaidLeaves * dailyRate);
        const netPay = baseSalary - deductions;

        payrollData.push({
          userId: doc.id,
          name: user.fullName || "Unknown User",
          role: user.role || "Employee",
          avatar: user.profilePhotoURL || "",
          baseSalary,
          unpaidLeaves,
          deductions,
          netPay,
          status: Math.random() > 0.5 ? "Paid" : "Pending"
        });
      });

      // Sort pending first
      payrollData.sort((a, b) => (a.status === "Pending" ? -1 : 1));
      
      setPayroll(payrollData);
      setLoading(false);
    };

    fetchPayroll();
  }, []);

  const handleGeneratePayslip = (data: PayrollData) => {
    const date = new Date();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    generatePayslip({
      payslipNumber: `PS-${Math.floor(Math.random() * 10000)}`,
      employeeName: data.name,
      role: data.role,
      period: `${month} ${year}`,
      baseSalary: data.baseSalary,
      deductions: data.deductions,
      netPay: data.netPay,
      unpaidLeaves: data.unpaidLeaves
    });
  };

  const totalPayroll = payroll.reduce((sum, p) => sum + p.netPay, 0);

  return (
    <RoleGuard permission="MANAGE_USERS" fallback={<div>Access Denied.</div>}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payroll & Compensation</h1>
            <p className="text-muted-foreground mt-1">Manage salaries, deductions, and generate payslips.</p>
          </div>
          
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
            <Calculator className="mr-2 h-4 w-4" /> Run Payroll
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Payroll (This Month)</CardTitle>
              <Banknote className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPayroll.toLocaleString()} AED</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Disbursements</CardTitle>
              <Banknote className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {payroll.filter(p => p.status === 'Pending').length} Employees
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
              <Calculator className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-700">
                {payroll.reduce((sum, p) => sum + p.deductions, 0).toLocaleString()} AED
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Table */}
        <Card className="glass-card overflow-hidden">
          <CardHeader>
            <CardTitle>Employee Salaries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">Calculating payroll...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Base Salary</th>
                      <th className="px-6 py-4 text-red-600">Deductions</th>
                      <th className="px-6 py-4 text-emerald-600">Net Pay</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payroll.map((record, i) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        key={record.userId} 
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={record.avatar} />
                              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                                {getInitials(record.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-slate-900">{record.name}</div>
                              <div className="text-xs text-muted-foreground capitalize">{record.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600">{record.baseSalary.toLocaleString()} AED</td>
                        <td className="px-6 py-4 font-medium text-red-600">
                          {record.deductions > 0 ? `-${record.deductions.toLocaleString()} AED` : '0 AED'}
                          {record.unpaidLeaves > 0 && <span className="block text-[10px] text-red-400">({record.unpaidLeaves} days LWP)</span>}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-600">{record.netPay.toLocaleString()} AED</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`font-bold shadow-none ${
                            record.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {record.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50"
                            onClick={() => handleGeneratePayslip(record)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
