"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { generatePayslip } from "@/lib/pdfGenerator";
import { Banknote, FileDown, Calculator, Download, Gift, Clock, History } from "lucide-react";
import { motion } from "framer-motion";
import { BonusDialog } from "./components/BonusDialog";
import { GratuityCalculator } from "./components/GratuityCalculator";
import { Receipt } from "lucide-react";
import { PayrollData, PayrollRun } from "@/types";

export default function PayrollDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [payroll, setPayroll] = useState<PayrollData[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);

  // Bonus Dialog state
  const [bonusOpen, setBonusOpen] = useState(false);
  const [selectedEmpIndex, setSelectedEmpIndex] = useState<number | null>(null);

  // Gratuity Dialog state
  const [gratuityOpen, setGratuityOpen] = useState(false);
  const [selectedEmpIndexGratuity, setSelectedEmpIndexGratuity] = useState<number | null>(null);

  // Get current month string (e.g. "July 2026")
  const currentMonthStr = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const [cycleLabel, setCycleLabel] = useState(currentMonthStr);

  useEffect(() => {
    fetchPayrollData();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const snap = await getDocs(query(collection(db, "payroll_runs")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as PayrollRun[];
      list.sort((a, b) => (b.runAt?.toMillis?.() || 0) - (a.runAt?.toMillis?.() || 0));
      setPayrollHistory(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Employees
      const employeesSnap = await getDocs(collection(db, "employees"));
      
      // 2. Fetch Unpaid Leaves
      const leavesSnap = await getDocs(collection(db, "leaves"));
      const unpaidLeavesByEmployee: Record<string, number> = {};
      leavesSnap.forEach(lDoc => {
        const leave = lDoc.data();
        if (leave.status === "approved" && (leave.leaveType === "Unpaid Leave" || leave.leaveType?.toLowerCase().includes("unpaid"))) {
          const empId = leave.userId || leave.employeeId;
          if (empId) {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            // Only count if it overlaps with the current month (simplified for now)
            if (start.getMonth() === new Date().getMonth() && start.getFullYear() === new Date().getFullYear()) {
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              unpaidLeavesByEmployee[empId] = (unpaidLeavesByEmployee[empId] || 0) + diffDays;
            }
          }
        }
      });

      // 3.5 Fetch Expenses
      const expensesSnap = await getDocs(
        query(collection(db, "expenses"), where("status", "==", "Approved"))
      );
      const expensesByEmployee: Record<string, number> = {};
      expensesSnap.forEach(eDoc => {
        const exp = eDoc.data();
        if (exp.employeeId) {
          expensesByEmployee[exp.employeeId] = (expensesByEmployee[exp.employeeId] || 0) + Number(exp.amount);
        }
      });

      // 3. Fetch Attendance (to calculate overtime)
      // We need records for the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startDateStr = startOfMonth.toISOString().split('T')[0];
      
      const attendanceSnap = await getDocs(
        query(collection(db, "attendance"), where("date", ">=", startDateStr))
      );
      
      const overtimeByEmployee: Record<string, number> = {};
      attendanceSnap.forEach(aDoc => {
        const att = aDoc.data();
        if (att.uid && att.totalWorkingSeconds > 28800) { // 8 hours = 28,800 sec
          const otSec = att.totalWorkingSeconds - 28800;
          const otHours = otSec / 3600;
          overtimeByEmployee[att.uid] = (overtimeByEmployee[att.uid] || 0) + otHours;
        }
      });

      // 4. Assemble Payroll Data
      const payrollData: PayrollData[] = [];
      employeesSnap.forEach(doc => {
        const emp = doc.data();
        if (!emp.isActive) return;
        
        // Base Salary structure
        let baseSalary = 8000;
        if (emp.role === "founder") baseSalary = 25000;
        else if (emp.role === "c_suite") baseSalary = 18000;
        else if (emp.role === "system_admin") baseSalary = 16000;
        else if (emp.role === "manager") baseSalary = 12000;
        else if (emp.role === "senior_employee") baseSalary = 9500;
        else if (emp.role === "employee") baseSalary = 8000;
        else if (emp.role === "intern") baseSalary = 4000;

        // Deductions
        const unpaidLeaves = unpaidLeavesByEmployee[doc.id] || 0;
        const dailyRate = baseSalary / 30;
        const deductions = Math.round(unpaidLeaves * dailyRate);

        // Overtime (1.5x hourly rate)
        const hourlyRate = (baseSalary / 30) / 8; 
        const otHours = overtimeByEmployee[doc.id] || 0;
        const overtimePay = Math.round(otHours * (hourlyRate * 1.5));
        const expensesReimbursed = expensesByEmployee[doc.id] || 0;
        const gratuityPay = 0;

        const netPay = Math.max(0, baseSalary - deductions + overtimePay + expensesReimbursed + gratuityPay);

        payrollData.push({
          userId: doc.id,
          name: emp.fullName || "Mints Team Member",
          role: emp.role || "Employee",
          avatar: emp.profilePhotoURL || "",
          baseSalary,
          unpaidLeaves,
          deductions,
          overtimeHours: Math.round(otHours * 10) / 10,
          overtimePay,
          bonuses: 0,
          bonusNotes: "",
          expensesReimbursed,
          gratuityPay,
          netPay,
          status: "Pending",
          bankName: emp.bankName || "N/A",
          iban: emp.iban || "N/A",
          initialJoinDate: emp.joinDate || ""
        } as any);
      });

      setPayroll(payrollData);
    } catch (err) {
      console.error("Error loading payroll data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayslip = (data: PayrollData) => {
    generatePayslip({
      payslipNumber: `PS-${Math.floor(1000 + Math.random() * 9000)}`,
      employeeName: data.name,
      role: data.role,
      period: cycleLabel,
      baseSalary: data.baseSalary,
      deductions: data.deductions,
      netPay: data.netPay,
      unpaidLeaves: data.unpaidLeaves
    });
  };

  const saveBonus = (amount: number, notes: string) => {
    if (selectedEmpIndex === null) return;
    const newPayroll = [...payroll];
    const rec = newPayroll[selectedEmpIndex];
    rec.bonuses = amount;
    rec.bonusNotes = notes;
    rec.netPay = Math.max(0, rec.baseSalary - rec.deductions + rec.overtimePay + (rec.bonuses || 0) + (rec.expensesReimbursed || 0) + (rec.gratuityPay || 0));
    setPayroll(newPayroll);
  };

  const saveGratuity = (amount: number, notes: string) => {
    if (selectedEmpIndexGratuity === null) return;
    const newPayroll = [...payroll];
    const rec = newPayroll[selectedEmpIndexGratuity];
    rec.gratuityPay = amount;
    rec.netPay = Math.max(0, rec.baseSalary - rec.deductions + rec.overtimePay + (rec.bonuses || 0) + (rec.expensesReimbursed || 0) + (rec.gratuityPay || 0));
    setPayroll(newPayroll);
  };

  const handleRunCycle = async () => {
    if (!confirm(`Are you sure you want to finalize payroll for ${cycleLabel}?`)) return;
    setProcessing(true);
    try {
      const totalDisbursement = payroll.reduce((sum, p) => sum + p.netPay, 0);
      
      const finalizedRecords = payroll.map(p => ({ ...p, status: "Paid" as const }));

      const runDoc = await addDoc(collection(db, "payroll_runs"), {
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
        totalDisbursement,
        records: finalizedRecords,
        runBy: user?.uid,
        runAt: serverTimestamp()
      });

      try {
        await fetch("/api/payroll/distribute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: runDoc.id, label: cycleLabel, amount: totalDisbursement })
        });
      } catch (e) {
        console.error("Distribution error:", e);
      }

      showToast(`Payroll for ${cycleLabel} disbursed successfully!`, "success");
      setPayroll(finalizedRecords);
      fetchHistory();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const totalPayroll = payroll.reduce((sum, p) => sum + p.netPay, 0);
  const totalOvertime = payroll.reduce((sum, p) => sum + p.overtimePay, 0);
  const totalBonuses = payroll.reduce((sum, p) => sum + p.bonuses, 0);

  // Check if current view is already disbursed
  const isDisbursed = payroll.every(p => p.status === "Paid");

  return (
    <RoleGuard permission="MANAGE_USERS" fallback={<div className="p-8 text-center text-foreground/40 font-bold uppercase tracking-wider text-xs">Access Denied. Only authorized HR personnel can run payroll metrics.</div>}>
      <div className="space-y-6 pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Advanced Payroll</h1>
            <p className="text-foreground/40 mt-1">Auto-calculate overtime, deduct unpaid leave, and finalize disbursements.</p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setViewingHistory(!viewingHistory)}
              className="border-border text-foreground hover:bg-muted"
            >
              <History className="mr-2 h-4 w-4" /> {viewingHistory ? "View Current Cycle" : "View History"}
            </Button>
            {!viewingHistory && (
              isDisbursed ? (
                <Button 
                  onClick={() => window.open(`/api/payroll/wps?label=${cycleLabel}`, '_blank')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-md border-0 rounded-xl font-bold h-10 px-5"
                >
                  <FileDown className="mr-2 h-4 w-4" /> Download WPS (.sif)
                </Button>
              ) : (
                <Button 
                  onClick={handleRunCycle}
                  disabled={processing || payroll.length === 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md border-0 rounded-xl font-bold h-10 px-5"
                >
                  {processing ? <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" /> : <Calculator className="mr-2 h-4 w-4" />} 
                  Run Payroll Cycle
                </Button>
              )
            )}
          </div>
        </div>

        {viewingHistory ? (
          <div className="grid gap-4">
            <h2 className="text-xl font-bold text-foreground">Payroll History</h2>
            {payrollHistory.length === 0 ? (
              <div className="p-8 border border-dashed border-border rounded-xl text-center text-foreground/50">
                No payroll cycles have been finalized yet.
              </div>
            ) : (
              payrollHistory.map(run => (
                <div key={run.id} className="border border-border rounded-xl p-5 bg-card flex justify-between items-center hover:border-primary/40 transition-colors cursor-pointer" 
                  onClick={() => {
                    setPayroll(run.records);
                    setCycleLabel(`${run.month} ${run.year}`);
                    setViewingHistory(false);
                  }}
                >
                  <div>
                    <h3 className="font-bold text-lg">{run.month} {run.year}</h3>
                    <p className="text-sm text-foreground/50 mt-1">Disbursed on {run.runAt?.toDate ? run.runAt.toDate().toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xl text-primary">{run.totalDisbursement.toLocaleString()} AED</p>
                    <p className="text-xs font-bold text-foreground/40 uppercase mt-1">{run.records.length} Employees</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid gap-6 md:grid-cols-4">
              <div className="border border-border shadow-card rounded-2xl p-6 bg-primary/5">
                <div className="flex flex-row items-center justify-between pb-2">
                  <span className="text-xs font-bold text-primary/80 uppercase tracking-wider">Total Net Disbursement</span>
                  <Banknote className="h-4 w-4 text-primary shadow-sm" />
                </div>
                <div className="text-2xl font-black text-foreground mt-1 tabular-nums">{totalPayroll.toLocaleString()} AED</div>
              </div>
              
              <div className="border border-border shadow-card rounded-2xl p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <span className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Total Overtime Pay</span>
                  <Clock className="h-4 w-4 text-emerald-400 shadow-glow-emerald" />
                </div>
                <div className="text-2xl font-black text-foreground mt-1 tabular-nums">
                  +{totalOvertime.toLocaleString()} AED
                </div>
              </div>

              <div className="border border-border shadow-card rounded-2xl p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <span className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Bonuses & Adjustments</span>
                  <Gift className="h-4 w-4 text-amber-400 shadow-glow-amber" />
                </div>
                <div className="text-2xl font-black text-foreground mt-1 tabular-nums">
                  +{totalBonuses.toLocaleString()} AED
                </div>
              </div>

              <div className="border border-border shadow-card rounded-2xl p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <span className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Unpaid Leave Deductions</span>
                  <Calculator className="h-4 w-4 text-rose-400 shadow-glow-rose" />
                </div>
                <div className="text-2xl font-black text-foreground mt-1 tabular-nums">
                  -{payroll.reduce((sum, p) => sum + p.deductions, 0).toLocaleString()} AED
                </div>
              </div>
            </div>

            {/* Payroll Table */}
            <div className="border border-border shadow-card rounded-2xl overflow-hidden">
              <div className="p-6 pb-4 border-b border-border flex justify-between items-center bg-muted/10">
                <h2 className="text-lg font-bold text-foreground">Ledger: {cycleLabel}</h2>
                {isDisbursed && <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-0">Disbursed</Badge>}
              </div>
              
              <div className="p-0">
                {loading ? (
                  <div className="h-40 flex items-center justify-center text-foreground/40 font-bold text-sm">Aggregating attendance, overtime, and leave deductions...</div>
                ) : payroll.length === 0 ? (
                  <div className="text-center py-12 p-6 flex flex-col items-center">
                    <Banknote className="h-10 w-10 text-foreground/20 mb-3" />
                    <p className="text-sm font-semibold text-foreground/80">No Personnel Found</p>
                    <p className="text-xs text-foreground/40 mt-1">There are no active employees in the system.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="text-foreground/40 text-[10px] uppercase tracking-widest font-bold border-b border-border">
                        <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4 text-right">Base Salary</th>
                          <th className="px-6 py-4 text-right">Overtime</th>
                          <th className="px-6 py-4 text-right">Bonuses</th>
                          <th className="px-6 py-4 text-right">Expenses</th>
                          <th className="px-6 py-4 text-right text-emerald-400">Gratuity</th>
                          <th className="px-6 py-4 text-right text-rose-400">Deductions</th>
                          <th className="px-6 py-4 text-right text-primary">Net Pay</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-foreground/80 font-medium">
                        {payroll.map((record, i) => (
                          <motion.tr 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            key={record.userId} 
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 border border-border">
                                  <AvatarImage src={record.avatar} />
                                  <AvatarFallback className="bg-primary/10 text-primary/80 text-xs font-bold">
                                    {getInitials(record.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-bold text-foreground text-sm leading-none">{record.name}</div>
                                  <div className="text-[10px] text-foreground/40 uppercase tracking-widest font-bold mt-1">{record.role?.replace("_", " ")}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-foreground/60 tabular-nums">
                              {record.baseSalary.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums">
                              {record.overtimePay > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-emerald-400 font-bold">+{record.overtimePay.toLocaleString()}</span>
                                  <span className="text-[10px] text-foreground/40 mt-0.5">{record.overtimeHours} hrs</span>
                                </div>
                              ) : <span className="text-foreground/30">-</span>}
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums">
                              {record.bonuses > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-amber-400 font-bold">+{record.bonuses.toLocaleString()}</span>
                                  <span className="text-[10px] text-foreground/40 mt-0.5 truncate max-w-[100px]" title={record.bonusNotes}>{record.bonusNotes}</span>
                                </div>
                              ) : <span className="text-foreground/30">-</span>}
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums">
                              {(record.expensesReimbursed || 0) > 0 ? (
                                <span className="text-foreground font-bold">+{(record.expensesReimbursed || 0).toLocaleString()}</span>
                              ) : <span className="text-foreground/30">-</span>}
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums">
                              {(record.gratuityPay || 0) > 0 ? (
                                <span className="text-emerald-400 font-bold">+{(record.gratuityPay || 0).toLocaleString()}</span>
                              ) : <span className="text-foreground/30">-</span>}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-rose-400 tabular-nums">
                              {record.deductions > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span>-{record.deductions.toLocaleString()}</span>
                                  <span className="text-[10px] text-rose-400/50 mt-0.5">{record.unpaidLeaves}d leave</span>
                                </div>
                              ) : <span className="text-foreground/30 font-normal">-</span>}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-primary text-base tabular-nums">
                              {record.netPay.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Badge variant="outline" className={`font-bold shadow-none border ${ record.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20' }`}>
                                {record.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!isDisbursed && (<>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-foreground/40 hover:text-amber-400 hover:bg-amber-400/10"
                                    onClick={() => {
                                      setSelectedEmpIndex(i);
                                      setBonusOpen(true);
                                    }}
                                    title="Add Bonus / Adjustment"
                                  >
                                    <Gift className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-foreground/40 hover:text-emerald-400 hover:bg-emerald-400/10"
                                    onClick={() => {
                                      setSelectedEmpIndexGratuity(i);
                                      setGratuityOpen(true);
                                    }}
                                    title="Calculate Gratuity"
                                  >
                                    <Calculator className="h-4 w-4" />
                                  </Button>
                                </>)}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-foreground/40 hover:text-primary hover:bg-primary/10"
                                  onClick={() => handleGeneratePayslip(record)}
                                  title="Download Payslip"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <BonusDialog 
          open={bonusOpen} 
          onOpenChange={setBonusOpen} 
          employeeName={selectedEmpIndex !== null ? payroll[selectedEmpIndex]?.name : ""}
          initialAmount={selectedEmpIndex !== null ? payroll[selectedEmpIndex]?.bonuses || 0 : 0}
          initialNotes={selectedEmpIndex !== null ? payroll[selectedEmpIndex]?.bonusNotes || "" : ""}
          onSave={saveBonus}
        />
        <GratuityCalculator
          open={gratuityOpen}
          onOpenChange={setGratuityOpen}
          employeeName={selectedEmpIndexGratuity !== null ? payroll[selectedEmpIndexGratuity]?.name : ""}
          baseSalary={selectedEmpIndexGratuity !== null ? payroll[selectedEmpIndexGratuity]?.baseSalary || 0 : 0}
          initialJoinDate={selectedEmpIndexGratuity !== null ? (payroll[selectedEmpIndexGratuity] as any)?.initialJoinDate : ""}
          onSave={saveGratuity}
        />
      </div>
    </RoleGuard>
  );
}
