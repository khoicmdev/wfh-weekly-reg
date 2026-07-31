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
import { router } from "../router-config";
import { apiClient } from "../../lib/api-client";
import { setStoredAuth, type AuthState } from "../../lib/auth.store";

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiClient<AuthState>("/api/v1/auth/login", {
        method: "POST",
        body: { email, password },
      });

      setStoredAuth(data);
      toast.success("Welcome back!");
      await router.invalidate();
      await navigate({ to: "/", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
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
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="login-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
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
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button
                id="login-submit"
                type="submit"
                className="w-full mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/register-account"
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
