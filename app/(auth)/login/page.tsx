"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { encryptValue, getApiBaseUrl, shouldBypassAltcha } from "@/lib/auth-client";
import { toast } from "sonner";

const AltchaWidgetClient = dynamic(() => import("@/components/auth/AltchaWidgetClient"), {
    ssr: false,
});

type LoginUser = {
    id: string;
    name: string;
    company: string;
    [key: string]: unknown;
};

const PASSWORD_POLICY = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[0-9]).{8,}$/;

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
    const apiBase = useMemo(() => getApiBaseUrl(), []);

    const setSession = (user: LoginUser) => {
        localStorage.setItem("isAuthenticated", "true");
        sessionStorage.setItem("logindata", JSON.stringify(user));
        sessionStorage.setItem("employee_name", user.name || "");
        sessionStorage.setItem("employee_code", user.id || "");
        sessionStorage.setItem("employee_email", email);
        sessionStorage.setItem("employee_company", user.company || "");
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
            const data = await res.json();

            if (!data?.success) {
                toast.error(data?.message || "Login failed");
                return;
            }

            console.log("Login successful! Setting session in localStorage...");
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
            const data = await res.json();
            if (!data?.success) {
                toast.error(data?.message || "Invalid OTP");
                return;
            }
            setVerifiedUser({ id: data.user.id, company: data.user.company });
            toast.success("OTP verified. Set your new password.");
        } catch {
            toast.error("Error while verifying OTP");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangePassword = async () => {
        if (!PASSWORD_POLICY.test(newPassword)) {
            toast.error("Password must be 8+ chars with uppercase, number and special character.");
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
            const data = await res.json();
            if (!data?.success) {
                toast.error(data?.message || "Failed to update password");
                return;
            }

            toast.success(data.message || "Password updated. Please login.");
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
        <Card className="w-full max-w-md border border-white/60 dark:border-zinc-800 shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl p-2 sm:p-4 rounded-3xl">
            <div className="flex flex-col items-center pt-6 pb-2">
                <div className="relative w-36 h-12 mb-2">
                    <Image src="/images/IFB.png" alt="IFB Logo" fill className="object-contain dark:invert" priority />
                </div>
            </div>

            <CardHeader className="text-center pb-3 pt-4">
                <CardTitle className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                    {isPasswordChangeStage ? "Change Password" : otpSent ? "Verify OTP" : showForgotPassword ? "Forgot Password" : "Sign In"}
                </CardTitle>
                <CardDescription className="text-sm mt-1">IFB AC Portal Authentication</CardDescription>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 pb-6">
                <form onSubmit={handleLogin} className="space-y-4">
                    {!otpSent && !showForgotPassword && !isPasswordChangeStage && (
                        <>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full px-4 py-2.5 rounded-2xl border bg-zinc-50 dark:bg-zinc-950"
                                disabled={isSubmitting}
                                required
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="w-full px-4 py-2.5 pr-12 rounded-2xl border bg-zinc-50 dark:bg-zinc-950"
                                    disabled={isSubmitting}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-4 top-3 text-zinc-400"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </>
                    )}

                    {showForgotPassword && !otpSent && (
                        <>
                            <input
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                placeholder="Registered Email"
                                className="w-full px-4 py-2.5 rounded-2xl border bg-zinc-50 dark:bg-zinc-950"
                                disabled={isSubmitting}
                                required
                            />
                            <input
                                type="text"
                                value={employeeCode}
                                onChange={(e) => setEmployeeCode(e.target.value)}
                                placeholder="Employee Code"
                                className="w-full px-4 py-2.5 rounded-2xl border bg-zinc-50 dark:bg-zinc-950"
                                disabled={isSubmitting}
                                required
                            />
                        </>
                    )}

                    {otpSent && !isPasswordChangeStage && (
                        <>
                            <input
                                type="text"
                                value={employeeCode}
                                onChange={(e) => setEmployeeCode(e.target.value)}
                                placeholder="Employee Code"
                                className="w-full px-4 py-2.5 rounded-2xl border bg-zinc-50 dark:bg-zinc-950"
                                disabled={isSubmitting}
                                required
                            />
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="OTP"
                                className="w-full px-4 py-2.5 rounded-2xl border bg-zinc-50 dark:bg-zinc-950"
                                disabled={isSubmitting}
                                required
                            />
                        </>
                    )}

                    {isPasswordChangeStage && (
                        <>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New Password"
                                className="w-full px-4 py-2.5 rounded-2xl border bg-zinc-50 dark:bg-zinc-950"
                                disabled={isSubmitting}
                                required
                            />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm Password"
                                className="w-full px-4 py-2.5 rounded-2xl border bg-zinc-50 dark:bg-zinc-950"
                                disabled={isSubmitting}
                                required
                            />
                        </>
                    )}



                    {!otpSent && !showForgotPassword && !isPasswordChangeStage && (
                        <AltchaWidgetClient challengeUrl={`${apiBase}/auth/altcha/challenge`} />
                    )}

                    <Button
                        type={!showForgotPassword && !otpSent && !isPasswordChangeStage ? "submit" : "button"}
                        disabled={isSubmitting}
                        onClick={() => {
                            if (showForgotPassword && !otpSent) void handleGenerateOtp();
                            else if (otpSent && !isPasswordChangeStage) void handleVerifyOtp();
                            else if (isPasswordChangeStage) void handleChangePassword();
                        }}
                        className="w-full py-5 text-sm font-semibold rounded-2xl mt-4 bg-blue-600 hover:bg-blue-700 text-white"
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

                    {!showForgotPassword && !otpSent && !isPasswordChangeStage && (
                        <button
                            type="button"
                            className="w-full text-sm text-blue-600 hover:underline"
                            onClick={() => setShowForgotPassword(true)}
                        >
                            Forgot / Change Password
                        </button>
                    )}

                    {(showForgotPassword || otpSent || isPasswordChangeStage) && (
                        <button
                            type="button"
                            className="w-full text-sm text-zinc-500 hover:underline"
                            onClick={() => {
                                setShowForgotPassword(false);
                                setOtpSent(false);
                                setVerifiedUser(null);
                            }}
                        >
                            Back to Login
                        </button>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
