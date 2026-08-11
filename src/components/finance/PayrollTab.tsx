import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { logPayslipGeneration } from "@/lib/finance-services";
import { cn } from "@/lib/utils";
import { generatePayslip } from "@/lib/pdfGenerator";

interface PayrollTabProps {
  employeesList: any[];
  user: any;
}

export function PayrollTab({ employeesList, user }: PayrollTabProps) {
  const [selectedEmpPayroll, setSelectedEmpPayroll] = useState<any | null>(null);
  const [payrollBonus, setPayrollBonus] = useState("");
  const [payrollDeduction, setPayrollDeduction] = useState("");
  const [payrollPeriod, setPayrollPeriod] = useState("May 2026");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Agency Payroll & Compensation</h2>
          <p className="text-xs text-foreground/40 mt-1">Manage employee base pay, process bonuses, and generate official payslips.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground/40 uppercase">Period:</span>
          <select 
            value={payrollPeriod}
            onChange={(e) => setPayrollPeriod(e.target.value)}
            className="h-8 border border-border rounded-lg px-2 text-xs focus:ring-0 bg-background text-foreground font-semibold"
          >
            <option value="May 2026">May 2026</option>
            <option value="June 2026">June 2026</option>
            <option value="July 2026">July 2026</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border border-border shadow-sm rounded-lg overflow-hidden border-border">
          <CardHeader className="border-b border-border p-4">
            <CardTitle className="text-xs uppercase font-bold text-foreground tracking-wider">Employee Roster</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-xs">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Base Salary</th>
                    <th>Deductions</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesList.map(emp => {
                    const baseSalary = emp.baseSalary || 12000;
                    return (
                      <tr key={emp.id} className={cn("hover: transition-colors cursor-pointer", selectedEmpPayroll?.id === emp.id ? "" : "")} onClick={() => {
                        setSelectedEmpPayroll(emp);
                        setPayrollBonus("");
                        setPayrollDeduction("");
                      }}>
                        <td className="font-bold text-foreground flex items-center gap-2.5 py-3">
                          <Avatar className="h-7 w-7 border border-border">
                            <AvatarImage src={emp.profilePhotoURL} />
                            <AvatarFallback className="bg-primary text-xs font-bold text-foreground">
                              {emp.fullName ? emp.fullName.split(" ").map((n: any) => n[0]).join("") : "EM"}
                            </AvatarFallback>
                          </Avatar>
                          {emp.fullName || "Team Member"}
                        </td>
                        <td className="text-foreground/60 font-semibold">{emp.jobTitle || "Employee"}</td>
                        <td className="font-bold text-foreground font-mono">{baseSalary.toLocaleString()} AED</td>
                        <td className="text-foreground/40 font-mono">0 AED</td>
                        <td className="text-right">
                          <button className="text-primary font-bold hover:underline hover:text-primary/80">Configure</button>
                        </td>
                      </tr>
                    );
                  })}
                  {employeesList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-foreground/30 italic">No employees found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden border-border p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs uppercase font-bold text-foreground/55 tracking-wider mb-4">Pay Period Configuration</h3>
            
            {selectedEmpPayroll ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border border-border p-3 rounded-xl">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={selectedEmpPayroll.profilePhotoURL} />
                    <AvatarFallback className="bg-primary text-xs font-bold text-foreground">
                      {selectedEmpPayroll.fullName ? selectedEmpPayroll.fullName.split(" ").map((n: any) => n[0]).join("") : "EM"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-foreground">{selectedEmpPayroll.fullName}</p>
                    <p className="text-xs text-foreground/40 font-semibold uppercase mt-0.5">{selectedEmpPayroll.jobTitle || "Employee"}</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Base Salary (AED)</Label>
                  <Input 
                    disabled
                    value={selectedEmpPayroll.baseSalary || 12000} 
                    className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border text-foreground/50 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Performance Bonus</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 1500"
                      value={payrollBonus} 
                      onChange={(e) => setPayrollBonus(e.target.value)}
                      className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 font-mono text-foreground bg-background"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Unpaid Deductions</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 300"
                      value={payrollDeduction} 
                      onChange={(e) => setPayrollDeduction(e.target.value)}
                      className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm h-9 text-xs border-border placeholder:text-foreground/20 focus:border-primary/60 focus:ring-0 font-mono text-foreground bg-background"
                    />
                  </div>
                </div>

                <div className="border border-border p-3.5 rounded-xl space-y-2 text-xs text-foreground/60">
                  <div className="flex justify-between">
                    <span>Base Salary:</span>
                    <span className="font-mono text-foreground">{(selectedEmpPayroll.baseSalary || 12000).toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between text-accent">
                    <span>Bonus Added:</span>
                    <span className="font-mono">+{Number(payrollBonus || 0).toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Deductions Applied:</span>
                    <span className="font-mono">-{Number(payrollDeduction || 0).toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground text-sm">
                    <span>Net Payday:</span>
                    <span className="font-mono text-accent">
                      {((selectedEmpPayroll.baseSalary || 12000) + Number(payrollBonus || 0) - Number(payrollDeduction || 0)).toLocaleString()} AED
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={async () => {
                    const base = selectedEmpPayroll.baseSalary || 12000;
                    const bon = Number(payrollBonus || 0);
                    const ded = Number(payrollDeduction || 0);
                    const net = base + bon - ded;
                    
                    generatePayslip({
                      payslipNumber: `SLIP-2026-${Math.floor(100 + Math.random() * 900)}`,
                      employeeName: selectedEmpPayroll.fullName || "Team Member",
                      role: selectedEmpPayroll.jobTitle || "Employee",
                      period: payrollPeriod,
                      baseSalary: base + bon,
                      deductions: ded,
                      netPay: net,
                      unpaidLeaves: Math.max(0, Math.floor(ded / 500))
                    });

                    await logPayslipGeneration(user?.uid, selectedEmpPayroll.id, selectedEmpPayroll.fullName, payrollPeriod, net);
                  }}
                  className="w-full bg-primary hover:bg-primary text-foreground font-bold h-10 py-0 flex items-center justify-center gap-1.5 shadow-glow-indigo rounded-xl cursor-pointer"
                >
                  <FileDown className="h-4 w-4" /> Download Official Payslip
                </Button>
              </div>
            ) : (
              <div className="text-center py-16 text-foreground/30 italic text-xs">
                Select an employee from the roster list to configure salary slip and pay adjustments.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
