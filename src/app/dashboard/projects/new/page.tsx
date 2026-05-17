"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { canAccess } from "@/lib/permissions";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SERVICES = [
  "SEO Campaign", "Performance Marketing", "Social Media Management",
  "Brand Strategy", "Cybersecurity Audit", "Penetration Testing",
  "Website Development", "Mobile App Development", "Video Production",
  "Photography Shoot", "Graphic Design", "Full-Service Retainer"
];

const formSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  clientId: z.string().min(1, "Client is required"),
  serviceType: z.string().min(1, "Service type is required"),
  managerId: z.string().min(1, "Manager is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  description: z.string().optional(),
});

export default function CreateProject() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  // In real app, clients would be fetched from Firestore
  const [clients] = useState([
    { id: "client_1", name: "Al Safa Group" },
    { id: "client_2", name: "Dubai Tech LLC" },
    { id: "client_3", name: "Emirates Retail" }
  ]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      clientId: "",
      serviceType: "",
      managerId: user?.uid || "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      budget: "",
      description: "",
    },
  });

  useEffect(() => {
    // Fetch managers for the dropdown
    const fetchManagers = async () => {
      const q = query(collection(db, "employees"), where("role", "in", ["manager", "c_suite", "founder"]));
      const snapshot = await getDocs(q);
      const mgrs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setManagers(mgrs);
    };
    fetchManagers();
  }, []);

  const isManagerOrAbove = canAccess(role, "VIEW_ALL_FINANCE"); // Using as proxy

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const projectData = {
        ...values,
        createdBy: user.uid,
        status: "pitch", // Default status
        memberIds: [values.managerId, user.uid].filter((v, i, a) => a.indexOf(v) === i), // Ensure manager and creator are members, unique
        memberRoles: {
          [values.managerId]: "Project Manager",
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "projects"), projectData);
      router.push(`/dashboard/projects/${docRef.id}`);
    } catch (err: any) {
      console.error("Error creating project:", err);
      setIsSubmitting(false);
    }
  }

  return (
    <RoleGuard permission="CREATE_PROJECT" fallback={<div>Access Denied. Only Senior Employees and above can create projects.</div>}>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
          <p className="text-muted-foreground mt-1">Set up a new client project or internal initiative.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Fill out the initial project specifications. You can add team members and tasks later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E-Commerce Website Redesign" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICES.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="managerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Manager</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Assign a manager" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {managers.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isManagerOrAbove && (
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget (AED) <span className="text-muted-foreground font-normal ml-1">(Optional)</span></FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="50000" {...field} />
                          </FormControl>
                          <FormDescription>Only visible to Managers and above.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated End Date <span className="text-muted-foreground font-normal ml-1">(Optional)</span></FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Description / Scope</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief overview of the project deliverables and goals..." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-olive-500 hover:bg-olive-600 text-white">
                    {isSubmitting ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
