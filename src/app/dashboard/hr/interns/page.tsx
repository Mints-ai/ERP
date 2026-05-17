"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, CalendarClock } from "lucide-react";
import Link from "next/link";
import { generateInternCertificate } from "@/lib/pdfGenerator";
import { RoleGuard } from "@/components/layout/RoleGuard";

export default function InternManagement() {
  const [interns, setInterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch only active interns
    const q = query(
      collection(db, "employees"),
      where("isActive", "==", true),
      where("isIntern", "==", true),
      orderBy("fullName")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInterns(ints);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const calculateProgress = (dateJoined: any, internEndDate: string) => {
    if (!dateJoined || !internEndDate) return 0;
    
    // Check if it's a Firestore timestamp or string
    const start = dateJoined.seconds ? new Date(dateJoined.seconds * 1000) : new Date(dateJoined);
    const end = new Date(internEndDate);
    const now = new Date();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsedDuration = now.getTime() - start.getTime();
    
    return Math.round((elapsedDuration / totalDuration) * 100);
  };

  const getDaysRemaining = (internEndDate: string) => {
    if (!internEndDate) return "TBD";
    
    const end = new Date(internEndDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Completed";
    if (diffDays === 0) return "Ends today";
    return `${diffDays} days left`;
  };

  return (
    <RoleGuard permission="VIEW_ALL_EMPLOYEES" fallback={<div>Access Denied.</div>}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intern Management</h1>
          <p className="text-muted-foreground mt-1">Track internship progress and generate completion certificates.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : interns.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-dashed">
            <h3 className="text-lg font-medium text-muted-foreground">No active interns found</h3>
            <p className="text-sm text-muted-foreground mt-1">When interns are added, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {interns.map((intern) => {
              const progress = calculateProgress(intern.dateJoined, intern.internEndDate);
              const daysRemaining = getDaysRemaining(intern.internEndDate);
              const isEndingSoon = daysRemaining.includes("days left") && parseInt(daysRemaining) <= 7;
              
              return (
                <Card key={intern.id} className="overflow-hidden border-border/50 hover:shadow-md transition-all">
                  <CardHeader className="pb-4 bg-muted/20 border-b">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border shadow-sm">
                          <AvatarImage src={intern.profilePhotoURL} alt={intern.fullName} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getInitials(intern.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            <Link href={`/dashboard/hr/${intern.id}`} className="hover:underline">
                              {intern.fullName}
                            </Link>
                          </CardTitle>
                          <div className="text-sm text-muted-foreground">{intern.department || "No Department"}</div>
                        </div>
                      </div>
                      {isEndingSoon && (
                        <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">Ending Soon</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Ends:</span>
                      <span className="text-muted-foreground">
                        {intern.internEndDate ? new Date(intern.internEndDate).toLocaleDateString() : 'TBD'}
                      </span>
                      <Badge variant="outline" className="ml-auto font-normal bg-background">
                        {daysRemaining}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Internship Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 w-full bg-muted" />
                    </div>

                    <div className="pt-4 flex justify-between gap-3 border-t">
                      <Button variant="outline" className="w-full" render={<Link href={`/dashboard/hr/${intern.id}`} />}>
                        View Profile
                      </Button>
                      <Button className="w-full bg-olive-500 hover:bg-olive-600 text-white gap-2" 
                              onClick={() => generateInternCertificate(intern.fullName, intern.department || "General", new Date().toLocaleDateString())}>
                        <FileText className="h-4 w-4" /> Certificate
                      </Button>
                    </div>
                    
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
