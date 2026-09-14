"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { sendDiscordNotification } from "@/lib/utils";
import { LoadingScreen } from "@/components/layout/LoadingScreen";

export default function LoginPage() {
  const { user, role, loginWithGoogle, loading, authError, setAuthError } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState(0);

  const [isReactivateOpen, setIsReactivateOpen] = useState(false);
  const [reactivateName, setReactivateName] = useState("");
  const [reactivateEmail, setReactivateEmail] = useState("");
  const [reactivateReason, setReactivateReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Initialize and check lockout from storage
  useEffect(() => {
    const checkLockout = () => {
      const storedLockout = localStorage.getItem("login_lockout_until");
      if (storedLockout) {
        const lockoutTime = parseInt(storedLockout, 10);
        const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutSecondsRemaining(remaining);
        } else {
          localStorage.removeItem("login_lockout_until");
          setLockoutSecondsRemaining(0);
        }
      }
    };
    checkLockout();
    const timer = setInterval(checkLockout, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      localStorage.removeItem("login_failed_attempts");
      localStorage.removeItem("login_lockout_until");
      if (role === "client") {
        router.push("/client-portal");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (authError) {
      setError(authError);
      setIsLoggingIn(false);
      setAuthError(null);
    }
  }, [authError, setAuthError]);

  const handleGoogleLogin = async () => {
    if (lockoutSecondsRemaining > 0) {
      setError(`Too many failed login attempts. Please wait ${lockoutSecondsRemaining} seconds before trying again.`);
      return;
    }
    try {
      setIsLoggingIn(true);
      setError("");
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
      setIsLoggingIn(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSecondsRemaining > 0) {
      setError(`Login temporarily locked due to security policy. Try again in ${lockoutSecondsRemaining} seconds.`);
      return;
    }

    try {
      setIsLoggingIn(true);
      setError("");
      
      const finalEmail = email.includes("@") ? email.trim() : `${email.trim()}@mintsglobal.ae`;
      
      const cred = await signInWithEmailAndPassword(auth, finalEmail, password);
      // Reset failed attempts on success
      localStorage.removeItem("login_failed_attempts");
      localStorage.removeItem("login_lockout_until");
      setFailedAttempts(0);
      
      // Fire Discord notification non-blocking to prevent UI delay
      sendDiscordNotification(`🔓 **${cred.user.displayName || finalEmail}** logged in to the ERP.`, undefined, 'auth').catch(console.error);
    } catch (err: any) {
      const currentAttempts = failedAttempts + 1;
      setFailedAttempts(currentAttempts);

      let lockoutDuration = 0;
      if (currentAttempts >= 8) {
        lockoutDuration = 300; // 5 minutes
      } else if (currentAttempts >= 5) {
        lockoutDuration = 30; // 30 seconds
      }

      if (lockoutDuration > 0) {
        const lockoutUntil = Date.now() + lockoutDuration * 1000;
        localStorage.setItem("login_lockout_until", lockoutUntil.toString());
        setLockoutSecondsRemaining(lockoutDuration);
        setError(`Too many failed login attempts (${currentAttempts}). Account access is locked for ${lockoutDuration} seconds.`);
      } else {
        setError(`Invalid username or password. (Attempt ${currentAttempts}/5 before temporary lockout)`);
      }
      setIsLoggingIn(false);

      // Log failed credentials login attempt asynchronously
      (async () => {
        try {
          const finalEmail = email.includes("@") ? email.trim() : `${email.trim()}@mintsglobal.ae`;
          let userIp = "Unknown";
          try {
            const ipResponse = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(1500) });
            const ipData = await ipResponse.json();
            userIp = ipData.ip || "Unknown";
          } catch (_) {}

          const ua = typeof navigator !== "undefined" ? navigator.userAgent : "Unknown";
          const platform = typeof navigator !== "undefined" ? (navigator as any).userAgentData?.platform || navigator.platform || "Unknown" : "Unknown";
          const browserName = (() => {
            if (/Edg\//.test(ua)) return "Edge";
            if (/Chrome\//.test(ua)) return "Chrome";
            if (/Firefox\//.test(ua)) return "Firefox";
            if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return "Safari";
            return "Unknown";
          })();
          const deviceType = /Mobi|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop";
          const loginTs = new Date().toISOString();

          const { collection, addDoc, doc, setDoc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");

          await addDoc(collection(db, "loginActivity"), {
            uid: "anonymous",
            email: finalEmail,
            fullName: "Unknown Employee",
            role: "anonymous",
            ip: userIp,
            browser: browserName,
            device: deviceType,
            platform,
            sessionType: "Email/Password",
            status: "failed",
            createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
            loginAt: loginTs,
          });

          const auditRef = doc(collection(db, "auditLog"));
          await setDoc(auditRef, {
            actorId: "anonymous",
            actorName: "Anonymous",
            action: "BLOCKED_LOGIN",
            targetCollection: "employees",
            targetId: "anonymous",
            details: `Failed credentials login attempt for ${finalEmail} from IP ${userIp} via ${browserName} on ${deviceType} (${platform})`,
            createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
          });
        } catch (logErr) {
          console.error("Error logging failed credentials login:", logErr);
        }
      })();
    }
  };

  const handleReactivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactivateEmail || !reactivateName || !reactivateReason) {
      alert("Please fill in all fields.");
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const { collection, addDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      await addDoc(collection(db, "reactivation_requests"), {
        fullName: reactivateName.trim(),
        email: reactivateEmail.trim().toLowerCase(),
        reason: reactivateReason.trim(),
        status: "pending",
        createdAt: new Date().toISOString()
      });
      alert("Reactivation request submitted successfully. An administrator will review your request.");
      setIsReactivateOpen(false);
      setReactivateName("");
      setReactivateEmail("");
      setReactivateReason("");
    } catch (err: any) {
      console.error("Reactivation request failed:", err);
      alert("Failed to submit request: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  if (loading || user) {
    return <LoadingScreen message="Verifying credentials..." subtext="Secure Authentication" />;
  }

  return (
    <div className="flex min-h-dvh w-full relative justify-center items-center p-3.5 sm:p-6 bg-background overflow-x-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[8%] left-[15%] w-[240px] sm:w-[320px] h-[240px] sm:h-[320px] rounded-full bg-primary/15 blur-[100px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[8%] right-[15%] w-[260px] sm:w-[350px] h-[260px] sm:h-[350px] rounded-full bg-primary/10 blur-[110px] sm:blur-[130px] pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:36px_36px] sm:bg-[size:48px_48px] opacity-25 pointer-events-none" />

      <Card className="w-full max-w-[420px] bg-card shadow-2xl border border-border rounded-2xl sm:rounded-3xl overflow-hidden p-5 sm:p-7 relative z-10 animate-scale-in">
        <CardHeader className="space-y-2.5 text-center p-0 pb-5">
          {/* Logo container */}
          <div className="flex justify-center items-center mb-1">
            <div className="bg-white py-2 px-5 rounded-2xl shadow-sm border border-border/40">
              <Image 
                src="/logo.png" 
                alt="Mints Global ERP" 
                width={180} 
                height={55} 
                className="h-8 sm:h-9 w-auto object-contain" 
                priority 
              />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground text-xs sm:text-sm">
            Sign in to access your Mints Global workspace
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-0">
          {error && (
            <div className="space-y-2">
              <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl text-center font-medium leading-relaxed">
                {error}
              </div>
              {error.toLowerCase().includes("deactivated") && (
                <button
                  type="button"
                  onClick={() => {
                    setReactivateEmail(email);
                    setIsReactivateOpen(true);
                  }}
                  className="w-full text-center text-xs font-bold text-primary hover:text-primary/80 underline cursor-pointer"
                >
                  Request Account Reactivation
                </button>
              )}
            </div>
          )}
          
          {/* Google SSO Button */}
          <Button 
            type="button"
            variant="outline"
            className="w-full h-11 text-xs sm:text-sm font-semibold rounded-xl border-border bg-secondary/50 hover:bg-secondary text-foreground flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer" 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn || lockoutSecondsRemaining > 0}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </Button>
          
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-card px-2 text-muted-foreground font-bold tracking-wider">
                Or secure login
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground/90">Username or Email</Label>
                <span className="text-[11px] text-muted-foreground font-medium">auto-appends @mintsglobal.ae</span>
              </div>
              <Input 
                id="email" 
                type="text" 
                placeholder="e.g. arya or username@mintsglobal.ae" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoggingIn}
                autoComplete="username"
                className="h-11 text-base sm:text-sm rounded-xl bg-background border border-border px-3.5 placeholder:text-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground/90">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
                autoComplete="current-password"
                className="h-11 text-base sm:text-sm rounded-xl bg-background border border-border px-3.5 placeholder:text-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-sm font-bold btn-primary flex items-center justify-center gap-2 rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98] mt-2"
              disabled={isLoggingIn || lockoutSecondsRemaining > 0}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing In...</span>
                </>
              ) : lockoutSecondsRemaining > 0 ? (
                <>
                  <Lock className="w-4 h-4 text-white" />
                  <span>Locked ({lockoutSecondsRemaining}s)</span>
                </>
              ) : (
                <>
                  <span>Sign In to ERP</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </Button>
          </form>
          
          <div className="pt-2 flex items-center justify-center gap-1.5 text-center text-muted-foreground text-[11px] leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Corporate Operating Center · Protected by cyber laws</span>
          </div>
        </CardContent>
      </Card>

      {/* Reactivation Request Modal */}
      {isReactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl overflow-hidden p-5 sm:p-6 relative text-foreground">
            <h3 className="text-lg font-bold text-foreground tracking-tight mb-1.5">Request Account Reactivation</h3>
            <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
              If your account was deactivated, submit a request with a brief explanation to request access recovery.
            </p>
            <form onSubmit={handleReactivationSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="reactivateName" className="text-xs font-semibold text-muted-foreground">Full Name</Label>
                <Input
                  id="reactivateName"
                  type="text"
                  required
                  value={reactivateName}
                  onChange={(e) => setReactivateName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="h-10 text-base sm:text-sm bg-background border border-border rounded-xl px-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reactivateEmail" className="text-xs font-semibold text-muted-foreground">Corporate Email</Label>
                <Input
                  id="reactivateEmail"
                  type="email"
                  required
                  value={reactivateEmail}
                  onChange={(e) => setReactivateEmail(e.target.value)}
                  placeholder="e.g. john.doe@mintsglobal.ae"
                  className="h-10 text-base sm:text-sm bg-background border border-border rounded-xl px-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reactivateReason" className="text-xs font-semibold text-muted-foreground">Reason for Reactivation</Label>
                <textarea
                  id="reactivateReason"
                  required
                  rows={3}
                  value={reactivateReason}
                  onChange={(e) => setReactivateReason(e.target.value)}
                  placeholder="Please state why you require access restored..."
                  className="w-full text-base sm:text-xs bg-background border border-border rounded-xl p-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary shadow-sm focus:outline-none"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReactivateOpen(false)}
                  disabled={isSubmittingRequest}
                  className="w-full text-xs h-10 text-muted-foreground hover:text-foreground border-border bg-transparent rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="w-full text-xs h-10 btn-primary rounded-xl cursor-pointer border-0"
                >
                  {isSubmittingRequest ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

