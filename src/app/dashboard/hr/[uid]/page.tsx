"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ROLE_META } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Mail, Phone, Calendar, UserRound } from "lucide-react";

export default function EmployeeProfile() {
  const { uid } = useParams();
  const { user, role } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    
    const unsubscribe = onSnapshot(doc(db, "employees", uid as string), (docSnap) => {
      if (docSnap.exists()) {
        setEmployee({ id: docSnap.id, ...docSnap.data() });
      } else {
        setEmployee(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <UserRound className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Employee Not Found</h2>
        <p className="text-muted-foreground mt-2">The requested profile does not exist or you don't have access.</p>
      </div>
    );
  }

  const roleMeta = ROLE_META[employee.role] || { label: "Employee", color: "bg-olive-100 text-olive-700" };
  const getInitials = (name: string) => name ? name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "U";

  // Check if current user is a manager or above to see private tabs
  const isManagerOrAbove = ["founder", "c_suite", "manager"].includes(role || "");
  const isSelf = user?.uid === uid;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Profile Card */}
      <Card className="overflow-hidden border-border/50">
        <div className="h-32 bg-olive-100/50"></div>
        <div className="px-6 pb-6 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 md:-mt-12">
            <Avatar className="h-32 w-32 border-4 border-card shadow-sm bg-card">
              <AvatarImage src={employee.profilePhotoURL} alt={employee.fullName} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-medium">
                {getInitials(employee.fullName)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-1 mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{employee.fullName}</h1>
                {!employee.isActive && (
                  <Badge variant="destructive" className="ml-2">Inactive</Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground">{employee.jobTitle || "No Job Title"}</p>
              
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className={`font-medium shadow-none border-0 ${roleMeta.color}`}>
                  {roleMeta.label}
                </Badge>
                {employee.department && (
                  <Badge variant="outline" className="bg-background">
                    <Building2 className="w-3 h-3 mr-1.5 text-muted-foreground" />
                    {employee.department}
                  </Badge>
                )}
                <div className="text-sm text-muted-foreground flex items-center ml-auto">
                  <span className="font-mono bg-muted px-2 py-1 rounded text-xs">{employee.employeeId || "No ID"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border w-full justify-start h-auto p-1 overflow-x-auto flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-olive-50 data-[state=active]:text-olive-700">Overview</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-olive-50 data-[state=active]:text-olive-700">Documents</TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-olive-50 data-[state=active]:text-olive-700">Projects</TabsTrigger>
          <TabsTrigger value="leaves" className="data-[state=active]:bg-olive-50 data-[state=active]:text-olive-700">Leave History</TabsTrigger>
          {(isManagerOrAbove || isSelf) && (
            <TabsTrigger value="notes" className="data-[state=active]:bg-olive-50 data-[state=active]:text-olive-700">Private Notes</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-medium">{employee.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="font-medium">{employee.phone || "Not provided"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date Joined</p>
                    <p className="font-medium">
                      {employee.dateJoined ? new Date(employee.dateJoined.seconds * 1000).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                </div>
                {employee.isIntern && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Internship Ends</p>
                      <p className="font-medium text-amber-600">
                        {employee.internEndDate ? new Date(employee.internEndDate).toLocaleDateString() : "TBD"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Documents</CardTitle>
              <CardDescription>Passport, UAE Visa, Emirates ID, Contracts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground">Firebase Storage integration pending...</p>
                {/* Upload logic would go here */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Placeholders for other tabs to be built out later */}
        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Assigned Projects</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">No projects assigned currently.</p></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Leave History</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">No leave records found.</p></CardContent>
          </Card>
        </TabsContent>

        {(isManagerOrAbove || isSelf) && (
          <TabsContent value="notes" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Private Notes</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">No private notes found.</p></CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
