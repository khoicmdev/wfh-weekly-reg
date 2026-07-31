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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
      await apiClient<{ message: string }>("/api/v1/auth/register", {
        method: "POST",
        body: { email, password },
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
    <div className="min-h-screen flex items-center justify-center bg-neutral px-4">
      <div className="w-full max-w-[420px] flex flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <img src="/tlg_ico.png" alt="TLG Logo" className="h-8 w-auto object-contain shrink-0" />
            <h1 className="text-2xl font-bold text-blue-900 tracking-tight">TLG Legal</h1>
          </div>
          <p className="text-sm text-muted-foreground">WFH Weekly Registration</p>
        </div>

        <Card className="gap-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create account</CardTitle>
            <CardDescription>Register with your work email to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="register-account-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                id="register-account-submit"
                type="submit"
                className="w-full mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Creating account…" : "Create account"}
              </Button>
            </form>
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
