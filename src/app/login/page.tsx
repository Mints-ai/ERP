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
      await signInWithEmailAndPassword(auth, email, password);
      // Router push is handled by useEffect
    } catch (err: any) {
      setError("Invalid email or password.");
      setIsLoggingIn(false);
    }
  };

  if (loading || user) {
    return <div className="h-screen w-full flex items-center justify-center bg-background">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Olive Green Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-primary p-12 text-primary-foreground">
        <h1 className="text-5xl font-bold mb-4">Mints Global ERP</h1>
        <p className="text-xl opacity-90 max-w-md text-center">
          Centralized operations, project delivery, and people management platform.
        </p>
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
                <Label htmlFor="email">ERP Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="john.intern@erp.mintsglobal.ae" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoggingIn}
                />
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
                Sign In with Email
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
