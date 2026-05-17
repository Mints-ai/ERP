"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { canAccess, ROLE_META } from "@/lib/permissions";
import { RoleGuard } from "@/components/layout/RoleGuard";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings, Users, Building2, Calendar, ShieldAlert, UploadCloud, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SettingsDashboard() {
  const { user, role } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "company" | "holidays" | "audit">("users");
  
  const [companySettings, setCompanySettings] = useState<any>({
    name: "Mints Global",
    address: "Dubai, UAE",
    vatNumber: "100XXXXXXXXXX",
    currency: "AED",
    holidays: []
  });
  
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });

  const isFounder = role === "founder";
  const isCSuiteOrAbove = canAccess(role, "SYSTEM_SETTINGS"); // founder, c_suite

  useEffect(() => {
    if (!user || !isCSuiteOrAbove) return;

    // Fetch Employees for User Management
    const qEmp = query(collection(db, "employees"), orderBy("fullName"));
    const unsubEmp = onSnapshot(qEmp, (snapshot) => {
      setEmployees(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Company Settings
    const unsubSettings = onSnapshot(doc(db, "settings", "company"), (docSnap) => {
      if (docSnap.exists()) {
        setCompanySettings(docSnap.data());
      }
    });

    // Fetch Audit Logs (Founder only)
    let unsubAudit = () => {};
    if (isFounder) {
      const qAudit = query(collection(db, "auditLog"), orderBy("createdAt", "desc"));
      unsubAudit = onSnapshot(qAudit, (snapshot) => {
        setAuditLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    return () => {
      unsubEmp();
      unsubSettings();
      unsubAudit();
    };
  }, [user, isCSuiteOrAbove, isFounder]);

  const handleRoleChange = async (employeeId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, "employees", employeeId), { role: newRole });
      alert("Role updated successfully. (Custom Claims update requires Cloud Functions)");
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  const toggleEmployeeStatus = async (employeeId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "employees", employeeId), { isActive: !currentStatus });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name) return;
    
    try {
      const updatedHolidays = [...(companySettings.holidays || []), newHoliday];
      await updateDoc(doc(db, "settings", "company"), { holidays: updatedHolidays });
      setNewHoliday({ date: "", name: "" });
    } catch (err) {
      console.error("Error adding holiday:", err);
      alert("Holiday would be saved here. Firebase document 'settings/company' needs to exist.");
    }
  };

  const handleDeleteHoliday = async (index: number) => {
    try {
      const updatedHolidays = [...companySettings.holidays];
      updatedHolidays.splice(index, 1);
      await updateDoc(doc(db, "settings", "company"), { holidays: updatedHolidays });
    } catch (err) {
      console.error("Error deleting holiday:", err);
    }
  };

  return (
    <RoleGuard permission="SYSTEM_SETTINGS" fallback={<div className="p-8 text-center text-olive-600">Access Denied. System Settings are restricted to C-Suite and Founders.</div>}>
      <div className="space-y-6 pb-12 h-full flex flex-col">
        <div className="shrink-0 mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-olive-900 flex items-center gap-2">
            <Settings className="h-8 w-8 text-olive-500" />
            System Settings
          </h1>
          <p className="text-olive-600 mt-1">Manage users, roles, company profile, and audit logs.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 flex-1 items-start">
          
          {/* Vertical Navigation */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab("users")}
              className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left", 
                activeTab === "users" ? "bg-olive-900 text-white shadow-md" : "text-olive-600 hover:bg-olive-100"
              )}
            >
              <Users className="w-5 h-5" />
              User Management
            </button>
            <button 
              onClick={() => setActiveTab("company")}
              className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left", 
                activeTab === "company" ? "bg-olive-900 text-white shadow-md" : "text-olive-600 hover:bg-olive-100"
              )}
            >
              <Building2 className="w-5 h-5" />
              Company Info
            </button>
            <button 
              onClick={() => setActiveTab("holidays")}
              className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left", 
                activeTab === "holidays" ? "bg-olive-900 text-white shadow-md" : "text-olive-600 hover:bg-olive-100"
              )}
            >
              <Calendar className="w-5 h-5" />
              Holidays
            </button>
            {isFounder && (
              <button 
                onClick={() => setActiveTab("audit")}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left", 
                  activeTab === "audit" ? "bg-olive-900 text-white shadow-md" : "text-olive-600 hover:bg-olive-100"
                )}
              >
                <ShieldAlert className="w-5 h-5" />
                Audit Log
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 w-full bg-white rounded-2xl border border-olive-200 shadow-card overflow-hidden">
            
            {/* USER MANAGEMENT */}
            {activeTab === "users" && (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-olive-100 flex justify-between items-center bg-olive-50/50">
                  <div>
                    <h3 className="font-bold text-lg text-olive-900">Team Accounts</h3>
                    <p className="text-sm text-olive-600">Manage roles and access for all staff.</p>
                  </div>
                  <Link href="/dashboard/hr/new" className="inline-flex items-center justify-center rounded-lg text-sm font-bold h-10 px-4 py-2 bg-olive-600 hover:bg-olive-700 text-white shadow-md transition-colors">
                    <Plus className="mr-2 h-4 w-4" /> Create Account
                  </Link>
                </div>
                <div className="overflow-x-auto p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-olive-100/50 text-olive-700 text-xs uppercase font-bold border-b border-olive-200">
                      <tr>
                        <th className="px-6 py-4">Employee Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Current Role</th>
                        <th className="px-6 py-4 text-center">Active Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-olive-100">
                      {employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-olive-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-olive-900">{emp.fullName}</td>
                          <td className="px-6 py-4 text-olive-600 font-medium">{emp.email}</td>
                          <td className="px-6 py-4">
                            <Select 
                              defaultValue={emp.role} 
                              onValueChange={(val) => handleRoleChange(emp.id, val)}
                              disabled={emp.id === user?.uid}
                            >
                              <SelectTrigger className="w-[180px] h-9 bg-white border-olive-200 focus:ring-olive-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ROLE_META).map(([key, meta]) => (
                                  <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Switch 
                              checked={emp.isActive} 
                              onCheckedChange={() => toggleEmployeeStatus(emp.id, emp.isActive)}
                              disabled={emp.id === user?.uid}
                              className="data-[state=checked]:bg-green-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* COMPANY INFO */}
            {activeTab === "company" && (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-olive-100 bg-olive-50/50">
                  <h3 className="font-bold text-lg text-olive-900">Company Profile</h3>
                  <p className="text-sm text-olive-600">Details used across the ERP, including generated PDFs and Invoices.</p>
                </div>
                <div className="p-8 space-y-8">
                  <div className="flex items-center gap-6 pb-8 border-b border-olive-100">
                    <div className="w-24 h-24 bg-olive-50 rounded-xl flex items-center justify-center border-2 border-dashed border-olive-300">
                      {companySettings.logoURL ? (
                        <img src={companySettings.logoURL} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <Building2 className="h-8 w-8 text-olive-400 opacity-50" />
                      )}
                    </div>
                    <div>
                      <Button variant="outline" className="mb-2 border-olive-200 text-olive-700 hover:bg-olive-50 shadow-sm"><UploadCloud className="mr-2 h-4 w-4" /> Upload New Logo</Button>
                      <p className="text-xs text-olive-500 font-medium">Recommended size: 256x256px. Max 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-olive-900 font-bold">Company Name</Label>
                      <Input defaultValue={companySettings.name} className="border-olive-200 focus-visible:ring-olive-500 bg-olive-50/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-olive-900 font-bold">VAT / Tax Number</Label>
                      <Input defaultValue={companySettings.vatNumber} className="border-olive-200 focus-visible:ring-olive-500 bg-olive-50/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-olive-900 font-bold">Default Currency</Label>
                      <Select defaultValue={companySettings.currency}>
                        <SelectTrigger className="border-olive-200 focus:ring-olive-500 bg-olive-50/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-olive-900 font-bold">Headquarters Address</Label>
                      <Input defaultValue={companySettings.address} className="border-olive-200 focus-visible:ring-olive-500 bg-olive-50/50" />
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <Button className="bg-olive-600 hover:bg-olive-700 text-white shadow-md px-8">Save Changes</Button>
                  </div>
                </div>
              </div>
            )}

            {/* HOLIDAYS */}
            {activeTab === "holidays" && (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-olive-100 bg-olive-50/50">
                  <h3 className="font-bold text-lg text-olive-900">Public Holidays</h3>
                  <p className="text-sm text-olive-600">These dates are automatically excluded when calculating working days for Leave Requests.</p>
                </div>
                <div className="p-8 space-y-8">
                  <div className="flex flex-col sm:flex-row gap-4 items-end bg-olive-50/50 p-6 rounded-xl border border-olive-200 shadow-sm">
                    <div className="space-y-2 flex-1">
                      <Label className="text-olive-900 font-bold">Holiday Name</Label>
                      <Input 
                        placeholder="e.g. Eid Al Fitr" 
                        value={newHoliday.name}
                        onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label className="text-olive-900 font-bold">Date</Label>
                      <Input 
                        type="date" 
                        value={newHoliday.date}
                        onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
                        className="bg-white"
                      />
                    </div>
                    <Button className="bg-olive-600 hover:bg-olive-700 text-white shadow-md" onClick={handleAddHoliday} disabled={!newHoliday.name || !newHoliday.date}>
                      <Plus className="h-4 w-4 mr-2" /> Add Date
                    </Button>
                  </div>

                  <div className="border border-olive-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-olive-100/50 text-olive-700 text-xs uppercase font-bold border-b border-olive-200">
                        <tr>
                          <th className="px-6 py-4">Holiday Date</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-olive-100">
                        {!companySettings.holidays || companySettings.holidays.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center text-olive-500 font-medium italic bg-olive-50/30">
                              No holidays configured.
                            </td>
                          </tr>
                        ) : (
                          companySettings.holidays.map((h: any, i: number) => (
                            <tr key={i} className="hover:bg-olive-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-olive-900">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                              <td className="px-6 py-4 text-olive-600 font-medium">{h.name}</td>
                              <td className="px-6 py-4 text-right">
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteHoliday(i)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* AUDIT LOG */}
            {isFounder && activeTab === "audit" && (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-olive-100 bg-olive-50/50">
                  <h3 className="font-bold text-lg text-olive-900">System Audit Log</h3>
                  <p className="text-sm text-olive-600">Read-only record of all critical database operations. Visible to Founders only.</p>
                </div>
                <div className="overflow-x-auto p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Actor UID</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Target Collection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                            <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">No audit logs found. System events will be recorded here.</p>
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 font-mono text-xs transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-700">{log.createdAt ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</td>
                            <td className="px-6 py-4 truncate max-w-[150px] text-slate-600">{log.actorId}</td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="bg-white border-slate-300 text-slate-700 shadow-none font-bold">
                                {log.action}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-slate-500">{log.targetCollection} : {log.targetId}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
