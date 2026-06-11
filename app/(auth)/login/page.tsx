"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, Lock, KeyRound, User, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { encryptValue, getApiBaseUrl, shouldBypassAltcha } from "@/lib/auth-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AltchaWidgetClient = dynamic(() => import("@/components/auth/AltchaWidgetClient"), {
    ssr: false,
});

type LoginUser = {
    id: string;
    name: string;
    company: string;
    [key: string]: unknown;
};


export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [employeeCode, setEmployeeCode] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [verifiedUser, setVerifiedUser] = useState<{ id: string; company: string } | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const isPasswordChangeStage = Boolean(verifiedUser);

    // Password strength calculation for newPassword
    const checks = useMemo(() => {
        return [
            { label: "At least 8 characters", met: newPassword.length >= 8 },
            { label: "One uppercase letter", met: /[A-Z]/.test(newPassword) },
            { label: "One lowercase letter", met: /[a-z]/.test(newPassword) },
            { label: "One number (0-9)", met: /[0-9]/.test(newPassword) },
            { label: "One special character", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
        ];
    }, [newPassword]);

    const strengthScore = useMemo(() => {
        return checks.filter((c) => c.met).length;
    }, [checks]);

    const isPasswordValid = useMemo(() => {
        return strengthScore === 5;
    }, [strengthScore]);

    const apiBase = useMemo(() => getApiBaseUrl(), []);

    const setSession = (user: LoginUser) => {
        localStorage.setItem("isAuthenticated", "true");
        sessionStorage.setItem("logindata", JSON.stringify(user));
        sessionStorage.setItem("employee_name", user.name || "");
        sessionStorage.setItem("employee_code", (user.employee_id as string) || "");
        sessionStorage.setItem("employee_email", email);
        sessionStorage.setItem("employee_company", "IFB");
        sessionStorage.setItem("plant", "AC");
    };

    const getAltchaPayload = () => {
        if (typeof document === "undefined") return null;
        return document.querySelector<HTMLInputElement>('input[name="altchaPayload"]')?.value || null;
    };

    const resolveAltchaPayload = async () => {
        const hostname = typeof window !== "undefined" ? window.location.hostname : "";
        if (shouldBypassAltcha(hostname, apiBase)) return "bypassed-internal-ip";

        const payload = getAltchaPayload();
        if (!payload) throw new Error("Please complete ALTCHA verification");
        return payload;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const altchaPayload = await resolveAltchaPayload();
            const res = await fetch(`${apiBase}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password: encryptValue(password),
                    altchaPayload,
                }),
            });
            const json = await res.json();

            if (!json?.success) {
                toast.error(json?.message || "Login failed");
                return;
            }

            const data = json.data;
            console.log("Login successful! Setting session in localStorage...");
            if (data?.accessToken) {
                localStorage.setItem("accessToken", data.accessToken);
            }
            setSession(data.user);
            console.log("Session set. isAuthenticated in localStorage is:", localStorage.getItem("isAuthenticated"));
            toast.success("Logged in successfully! Redirecting...");
            // router.push("/manufacturing");
            router.push("/dashboard");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to login");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateOtp = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiBase}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: forgotEmail.toLowerCase().trim(),
                    employeeCode: encryptValue(employeeCode),
                }),
            });
            const data = await res.json();
            if (!data?.success) {
                toast.error(data?.message || "Failed to generate OTP");
                return;
            }
            setOtpSent(true);
            setEmail(forgotEmail.toLowerCase().trim());
            setShowForgotPassword(false);
            toast.success(data?.message || "OTP sent to registered email");
        } catch {
            toast.error("Error while generating OTP");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiBase}/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    otp: encryptValue(otp),
                    employeeCode: encryptValue(employeeCode),
                }),
            });
            const json = await res.json();
            if (!json?.success) {
                toast.error(json?.message || "Invalid OTP");
                return;
            }
            const data = json.data;
            setVerifiedUser({ id: data.employeeCode, company: "IFB" });
            toast.success("OTP verified. Set your new password.");
        } catch {
            toast.error("Error while verifying OTP");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangePassword = async () => {
        if (!isPasswordValid) {
            toast.error("Please ensure your password meets all strength requirements.");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        if (!verifiedUser) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiBase}/auth/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: encryptValue(verifiedUser.id),
                    newPassword: encryptValue(newPassword),
                    company: encryptValue(verifiedUser.company),
                }),
            });
            const json = await res.json();
            if (!json?.success) {
                toast.error(json?.message || "Failed to update password");
                return;
            }

            toast.success(json.message || "Password updated. Please login.");
            setOtpSent(false);
            setVerifiedUser(null);
            setOtp("");
            setEmployeeCode("");
            setNewPassword("");
            setConfirmPassword("");
        } catch {
            toast.error("Error while updating password");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-sm md:w-lg border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl shadow-zinc-200/50 dark:shadow-black/40 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl p-2 sm:p-4 rounded-2xl hover:border-zinc-300/80 dark:hover:border-zinc-700/80 transition-all duration-300">
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
                    {isPasswordChangeStage ? "Reset Password" : otpSent ? "Verify Security Code" : showForgotPassword ? "Recover Password" : "Welcome Back"}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[280px] mx-auto">
                    {isPasswordChangeStage
                        ? "Define a new strong password for your security."
                        : otpSent
                            ? "Please enter the 6-digit OTP sent to your mailbox."
                            : showForgotPassword
                                ? "Enter details to verify your employee account."
                                : "Sign in to access the IFB AC manufacturing & quality portal."}
                </CardDescription>
            </CardHeader>

            <CardContent className="px-3 sm:px-4 pb-4">
                <form onSubmit={handleLogin} className="space-y-4">
                    {!otpSent && !showForgotPassword && !isPasswordChangeStage && (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address</Label>
                                <div className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none transition-colors">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="urvesh_vernekar@ifbglobal.com"
                                        className="pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 focus-visible:bg-white dark:focus-visible:bg-zinc-950 transition-all duration-200"
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="password" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Password</Label>
                                    <button
                                        type="button"
                                        className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline transition-colors"
                                        onClick={() => setShowForgotPassword(true)}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none transition-colors">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="pl-12 pr-10 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 focus-visible:bg-white dark:focus-visible:bg-zinc-950 transition-all duration-200"
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
                        </>
                    )}

                    {showForgotPassword && !otpSent && (
                        <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 text-xs">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                <div>
                                    <span className="font-semibold">Verification Step:</span> We will generate and email a verification code to check authorization.
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="forgotEmail" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Registered Email</Label>
                                <div className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="forgotEmail"
                                        type="email"
                                        autoComplete="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        placeholder="urvesh_vernekar@ifbglobal.com"
                                        className="pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all duration-200"
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="employeeCode" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Employee Code</Label>
                                <div className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="employeeCode"
                                        type="text"
                                        autoComplete="username"
                                        value={employeeCode}
                                        onChange={(e) => setEmployeeCode(e.target.value)}
                                        placeholder="E12345"
                                        className="pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all duration-200"
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {otpSent && !isPasswordChangeStage && (
                        <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                <div>
                                    <span className="font-semibold">Passcode Dispatched:</span> Enter the code sent to <span className="font-semibold text-zinc-900 dark:text-zinc-100">{email}</span>.
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="otpEmployeeCode" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Employee Code</Label>
                                <div className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="otpEmployeeCode"
                                        type="text"
                                        value={employeeCode}
                                        onChange={(e) => setEmployeeCode(e.target.value)}
                                        placeholder="E12345"
                                        className="pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all duration-200"
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="otp" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Enter OTP</Label>
                                <div className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                                        <KeyRound className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="otp"
                                        type="text"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="Enter 6-digit OTP"
                                        className="pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs tracking-[0.25em] font-mono text-center focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all duration-200"
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {isPasswordChangeStage && (
                        <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <div>
                                    <span className="font-semibold">Reset Approved:</span> Specify your new password configuration below.
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="newPassword" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">New Password</Label>
                                <div className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Create new password"
                                        className="pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all duration-200"
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password strength visualizer */}
                            {newPassword.length > 0 && (
                                <div className="space-y-2.5 p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/30 dark:bg-zinc-950/20 animate-in fade-in duration-305">
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

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="confirmNewPassword" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Confirm Password</Label>
                                    {confirmPassword.length > 0 && (
                                        <span className={cn(
                                            "text-[10px] font-bold transition-all duration-300",
                                            newPassword === confirmPassword ? "text-emerald-500" : "text-red-500"
                                        )}>
                                            {newPassword === confirmPassword ? "Match" : "No match"}
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="confirmNewPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className={cn(
                                            "pl-12 w-full h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all duration-200",
                                            confirmPassword.length > 0
                                                ? newPassword === confirmPassword
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
                    )}

                    {!otpSent && !showForgotPassword && !isPasswordChangeStage && (
                        <div className="scale-95 origin-center overflow-hidden border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl p-1 bg-zinc-50/20 dark:bg-zinc-950/10">
                            <AltchaWidgetClient challengeUrl={`${apiBase}/auth/altcha/challenge`} />
                        </div>
                    )}

                    <Button
                        type={!showForgotPassword && !otpSent && !isPasswordChangeStage ? "submit" : "button"}
                        disabled={isSubmitting}
                        onClick={(e) => {
                            if (!showForgotPassword && !otpSent && !isPasswordChangeStage) {
                                return;
                            }
                            e.preventDefault();
                            if (showForgotPassword && !otpSent) void handleGenerateOtp();
                            else if (otpSent && !isPasswordChangeStage) void handleVerifyOtp();
                            else if (isPasswordChangeStage) void handleChangePassword();
                        }}
                        className="w-full h-10 text-xs font-semibold rounded-xl mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:shadow-blue-500/15 hover:scale-[1.01] active:scale-[0.98] transition-all duration-150 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2 justify-center">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </span>
                        ) : showForgotPassword && !otpSent ? (
                            "Generate OTP"
                        ) : otpSent && !isPasswordChangeStage ? (
                            "Verify OTP"
                        ) : isPasswordChangeStage ? (
                            "Change Password"
                        ) : (
                            "Sign In"
                        )}
                    </Button>

                    {(showForgotPassword || otpSent || isPasswordChangeStage) && (
                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium hover:underline pt-1 transition-all duration-200"
                            onClick={() => {
                                setShowForgotPassword(false);
                                setOtpSent(false);
                                setVerifiedUser(null);
                            }}
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                        </button>
                    )}

                    {!showForgotPassword && !otpSent && !isPasswordChangeStage && (
                        <div className="text-center pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 mt-4">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">Don't have an account? </span>
                            <button
                                type="button"
                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline transition-colors cursor-pointer"
                                onClick={() => router.push("/register")}
                            >
                                Register here
                            </button>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
