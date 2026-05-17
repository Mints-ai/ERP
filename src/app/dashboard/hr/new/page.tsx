"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateEmployeeId } from "@/lib/employeeUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ROLE_META } from "@/lib/permissions";
import { RoleGuard } from "@/components/layout/RoleGuard";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

// In a real app, this would be fetched from Firestore /departments
const DEPARTMENTS = [
  "Executive Office", "Operations", "HR & Admin", "Finance", 
  "Cyber Security", "Performance Marketing", "SEO", 
  "Social Media", "Branding & Creative", "Software Development", 
  "Video Production", "Photography & Graphics"
];

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Must be a valid email address."),
  role: z.string().min(1, "Role is required."),
  department: z.string().min(1, "Department is required."),
  jobTitle: z.string().min(2, "Job title is required."),
  phone: z.string().optional(),
  isIntern: z.boolean(),
  internEndDate: z.string().optional(),
  temporaryPassword: z.string().min(6, "Password must be at least 6 characters."),
}).superRefine((data, ctx) => {
  if (data.isIntern && !data.internEndDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Intern end date is required when Is Intern is checked",
      path: ["internEndDate"],
    });
  }
});

export default function AddEmployee() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextEmpId, setNextEmpId] = useState("");

  useEffect(() => {
    generateEmployeeId().then(id => setNextEmpId(id));
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "",
      department: "",
      jobTitle: "",
      phone: "",
      isIntern: false,
      internEndDate: "",
      temporaryPassword: Math.random().toString(36).slice(-8) + "Aa1!", // Generate random pass
    },
  });

  const isIntern = form.watch("isIntern");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setError(null);
    try {
      const generatedId = await generateEmployeeId();
      
      await addDoc(collection(db, "employees"), {
        fullName: values.fullName,
        email: values.email,
        role: values.role,
        department: values.department,
        jobTitle: values.jobTitle,
        phone: values.phone || "",
        isIntern: values.isIntern,
        internEndDate: values.internEndDate || null,
        employeeId: generatedId,
        isActive: true,
        dateJoined: new Date(),
        createdAt: new Date().toISOString(),
      });

      router.push("/dashboard/hr");
    } catch (err: any) {
      setError(err.message || "Failed to create employee account.");
      setIsSubmitting(false);
    }
  }

  return (
    <RoleGuard permission="MANAGE_USERS" fallback={<div>Access Denied. You do not have permission to add employees.</div>}>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Employee</h1>
          <p className="text-muted-foreground mt-1">Create a new ERP account and profile for a team member.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Details</CardTitle>
            <CardDescription>
              This will automatically assign the unique Employee ID: <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">{nextEmpId || "Calculating..."}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 mb-6 text-sm text-destructive-foreground bg-destructive/20 border border-destructive rounded-md">
                {error}
              </div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@mintsglobal.ae" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ROLE_META).map(([key, meta]) => (
                              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Determines permissions and access levels.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DEPARTMENTS.map(dept => (
                              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
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
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Senior SEO Specialist" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+971 50 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
                  <FormField
                    control={form.control}
                    name="isIntern"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>This employee is an Intern</FormLabel>
                          <FormDescription>
                            Interns have restricted views and time-bound access.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {isIntern && (
                    <FormField
                      control={form.control}
                      name="internEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Internship End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="temporaryPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temporary Password</FormLabel>
                        <FormControl>
                          <Input type="text" {...field} />
                        </FormControl>
                        <FormDescription>Automatically generated. Will be emailed to user.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-olive-500 hover:bg-olive-600 text-white">
                    {isSubmitting ? "Creating..." : "Create Employee Account"}
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
