import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
} from "@repo/ui";
import { rootRoute } from "../../app";
import { apiClient } from "../../lib/api-client";

export const registerAccountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register-account",
  component: RegisterAccountPage,
});

function RegisterAccountPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient<{ message: string }>("/api/v1/auth/send-otp", {
        method: "POST",
        body: { email },
      });

      toast.success("Verification code sent! Please check your email / console.");
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send code.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const trimmedCode = code.trim();
    if (trimmedCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient<{ message: string }>("/api/v1/auth/register", {
        method: "POST",
        body: { email, password, code: trimmedCode },
      });

      toast.success("Account created! Please sign in.");
      await navigate({ to: "/login", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 transition-colors">
      <div className="w-full max-w-[420px] flex flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <img src="/tlg_ico.png" alt="TLG Logo" className="h-8 w-auto object-contain shrink-0" />
            <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-400 tracking-tight">TLG Legal</h1>
          </div>
          <p className="text-sm text-muted-foreground">WFH Weekly Registration</p>
        </div>

        <Card className="gap-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {step === 1 ? "Create account" : "Verify email"}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? "Register with your work email to get started."
                : `Enter the 6-digit code sent to ${email}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form id="register-step-1" onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="register-confirm-password">Confirm password</Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <Button
                  id="register-send-code"
                  type="submit"
                  className="w-full mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending code…" : "Send verification code"}
                </Button>
              </form>
            ) : (
              <form id="register-step-2" onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg text-xs">
                  <span className="text-muted-foreground truncate max-w-[240px]">{email}</span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-primary hover:underline font-medium ml-2 shrink-0"
                    disabled={isLoading}
                  >
                    Change
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="register-otp-code">6-digit verification code</Label>
                  <Input
                    id="register-otp-code"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    pattern="\d{6}"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    disabled={isLoading}
                    autoFocus
                    required
                    className="text-center font-mono text-lg tracking-widest"
                  />
                </div>

                <Button
                  id="register-account-submit"
                  type="submit"
                  className="w-full mt-2"
                  disabled={isLoading || code.trim().length !== 6}
                >
                  {isLoading ? "Verifying…" : "Complete registration"}
                </Button>

                <div className="text-center mt-1">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    Didn't receive code? Resend
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
