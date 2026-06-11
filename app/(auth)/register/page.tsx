"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, User, Mail, Lock, KeyRound, ShieldCheck, CheckCircle2, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { encryptValue, getApiBaseUrl } from "@/lib/auth-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  // Password strength calculation
  const checks = useMemo(() => {
    return [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "One uppercase letter", met: /[A-Z]/.test(password) },
      { label: "One lowercase letter", met: /[a-z]/.test(password) },
      { label: "One number (0-9)", met: /[0-9]/.test(password) },
      { label: "One special character", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    ];
  }, [password]);

  const strengthScore = useMemo(() => {
    return checks.filter(c => c.met).length;
  }, [checks]);

  const isPasswordValid = useMemo(() => {
    return strengthScore === 5;
  }, [strengthScore]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error("Please ensure your password meets all strength requirements.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          employee_id: employeeId.trim() || undefined,
          email: email.toLowerCase().trim(),
          password: encryptValue(password),
          role: role,
        }),
      });
      const json = await res.json();

      if (!json?.success) {
        toast.error(json?.message || "Registration failed");
        return;
      }

      toast.success("Account registered successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to register");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl shadow-zinc-200/50 dark:shadow-black/40 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl p-2 sm:p-4 rounded-2xl hover:border-zinc-300/80 dark:hover:border-zinc-700/80 transition-all duration-300 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col items-center pt-5 pb-3">
        <div className="relative w-32 h-10 mb-2 hover:scale-105 transition-transform duration-300">
          <Image src="/images/IFB.png" alt="IFB Logo" fill className="object-contain dark:invert" priority />
        </div>
        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-200/50 dark:border-blue-800/30">
          <ShieldCheck className="w-3 h-3" /> IIOT PCR Portal
        </div>
      </div>

      <CardHeader className="text-center pb-2 pt-1">
        <CardTitle className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create Account
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Register a secure enterprise credentials account for the IFB AC Portal.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-3 sm:px-4 pb-4">
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Row 1: Full Name & Employee Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Full Name</Label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all duration-200"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="employeeId" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Employee Code</Label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="employeeId"
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="E12345"
                  className="pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all duration-200"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 2: Email Address & User Role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address</Label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@ifbglobal.com"
                  className="pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all duration-200"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">User Role</Label>
              <Select value={role} onValueChange={setRole} disabled={isSubmitting}>
                <SelectTrigger id="role" className="w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[100] text-xs">
                  <SelectItem value="EMPLOYEE" className="rounded-lg cursor-pointer text-xs">Employee</SelectItem>
                  <SelectItem value="OPERATOR" className="rounded-lg cursor-pointer text-xs">Operator</SelectItem>
                  <SelectItem value="QUALITY_INSPECTOR" className="rounded-lg cursor-pointer text-xs">Quality Inspector</SelectItem>
                  <SelectItem value="SAFETY_OFFICER" className="rounded-lg cursor-pointer text-xs">Safety Officer</SelectItem>
                  <SelectItem value="MANAGER" className="rounded-lg cursor-pointer text-xs">Manager</SelectItem>
                  <SelectItem value="ADMIN" className="rounded-lg cursor-pointer text-xs">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Password & Confirm Password */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Password</Label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="pl-12 pr-10 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all duration-200"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Confirm Password</Label>
                {confirmPassword.length > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold transition-all duration-300 flex items-center gap-0.5",
                    password === confirmPassword ? "text-emerald-500" : "text-red-500"
                  )}>
                    {password === confirmPassword ? "Match" : "No match"}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className={cn(
                    "pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 text-xs focus-visible:ring-2 transition-all duration-200",
                    confirmPassword.length > 0
                      ? password === confirmPassword
                        ? "border-emerald-500/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/15"
                        : "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/15"
                      : "border-zinc-200 dark:border-zinc-800"
                  )}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          </div>

          {/* Password strength visualizer */}
          {password.length > 0 && (
            <div className="space-y-2.5 p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/30 dark:bg-zinc-950/20 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                {/* Visual score bars */}
                <div className="flex gap-1 h-1.5">
                  {[...Array(5)].map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex-1 rounded-full transition-all duration-500",
                        index < strengthScore
                          ? strengthScore <= 2
                            ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                            : strengthScore <= 4
                              ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                              : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          : "bg-zinc-200 dark:bg-zinc-800"
                      )}
                    />
                  ))}
                </div>

                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500 font-medium">Security Assessment:</span>
                  <span className={cn(
                    "font-bold uppercase tracking-wider transition-colors duration-300",
                    strengthScore === 0 && "text-zinc-400",
                    strengthScore <= 2 && strengthScore > 0 && "text-red-500",
                    strengthScore <= 4 && strengthScore > 2 && "text-amber-500",
                    strengthScore === 5 && "text-emerald-500"
                  )}>
                    {strengthScore === 0 && "Insecure"}
                    {strengthScore <= 2 && strengthScore > 0 && "Weak"}
                    {strengthScore <= 4 && strengthScore > 2 && "Moderate"}
                    {strengthScore === 5 && "Secure (Strong)"}
                  </span>
                </div>
              </div>

              {/* Rules checklist */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40">
                {checks.map((check, index) => (
                  <div key={index} className="flex items-center gap-2 text-[10px] select-none">
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0",
                      check.met
                        ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-600 dark:text-emerald-400"
                        : "bg-transparent border-zinc-200 dark:border-zinc-850 text-zinc-450 dark:text-zinc-500"
                    )}>
                      {check.met ? (
                        <Check className="w-2.5 h-2.5 stroke-[4.5]" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      )}
                    </div>
                    <span className={cn(
                      "transition-colors duration-300 truncate",
                      check.met ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-zinc-500"
                    )}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 text-xs font-semibold rounded-xl mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:shadow-blue-500/15 hover:scale-[1.01] active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </span>
            ) : (
              "Register Account"
            )}
          </Button>

          <div className="text-center pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 mt-4">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Already have an account? </span>
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline transition-colors cursor-pointer"
              onClick={() => router.push("/login")}
            >
              Sign In
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
