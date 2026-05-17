"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError("");
      await loginWithGoogle();
      // Router push is handled by useEffect
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
      setIsLoggingIn(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoggingIn(true);
      setError("");
      
      // Auto-append @mintsglobal.ae suffix if only a raw username is entered
      const finalEmail = email.includes("@") ? email.trim() : `${email.trim()}@mintsglobal.ae`;
      
      await signInWithEmailAndPassword(auth, finalEmail, password);
      // Router push is handled by useEffect
    } catch (err: any) {
      setError("Invalid username or password.");
      setIsLoggingIn(false);
    }
  };

  if (loading || user) {
    return <div className="h-screen w-full flex items-center justify-center bg-background">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Premium Slate/Indigo Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-slate-900 p-12 text-white relative overflow-hidden">
        {/* Subtle background gradient shapes */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-900/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-800/30 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-white py-3.5 px-8 rounded-2xl shadow-xl border border-slate-100 mb-8">
            <img src="/logo.png" alt="Mints Logo" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold mb-4 text-center tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
            Agency Operating System
          </h1>
          <p className="text-lg text-slate-400 max-w-md text-center font-medium leading-relaxed">
            Centralized operations, capacity planner, real-time chat, and automated payroll.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 bg-background p-8">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-md lg:border">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription>
              Use your Mints Global workspace account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive-foreground bg-destructive rounded-md text-center">
                {error}
              </div>
            )}
            
            <Button 
              className="w-full h-12 text-base" 
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
            >
              Sign in with Google
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or use ERP account
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email">Username or Email</Label>
                  <span className="text-[10px] text-slate-400 font-medium">auto-appends @mintsglobal.ae</span>
                </div>
                <div className="relative flex items-center">
                  <Input 
                    id="email" 
                    type="text" 
                    placeholder="e.g. anand or username@mintsglobal.ae" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoggingIn}
                    className="pr-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                />
              </div>
              <Button 
                type="submit" 
                variant="outline" 
                className="w-full h-12 text-base"
                disabled={isLoggingIn}
              >
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
