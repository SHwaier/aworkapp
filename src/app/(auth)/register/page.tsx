"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";

function PasswordCheck({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      {met ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <X className="h-3 w-3 text-muted-foreground/50" />
      )}
      <span className={met ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register(name, email, password, confirmPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-lg shadow-xl shadow-foreground/2 rounded-2xl overflow-hidden">
      <CardHeader className="space-y-1.5 p-6 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Create an account</CardTitle>
        <CardDescription className="text-muted-foreground/80 font-medium">
          Start tracking your job applications
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 p-6 pt-0">
          {error && (
            <div
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium"
              role="alert"
              id="register-error"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="register-name"
              className="text-xs font-bold text-muted-foreground tracking-wide uppercase"
            >
              Full name
            </Label>
            <Input
              id="register-name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              autoFocus
              disabled={isSubmitting}
              className="h-11 rounded-xl bg-background/50 border-border/60 focus:bg-background transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="register-email"
              className="text-xs font-bold text-muted-foreground tracking-wide uppercase"
            >
              Email
            </Label>
            <Input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isSubmitting}
              className="h-11 rounded-xl bg-background/50 border-border/60 focus:bg-background transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="register-password"
              className="text-xs font-bold text-muted-foreground tracking-wide uppercase"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                className="pr-10 h-11 rounded-xl bg-background/50 border-border/60 focus:bg-background transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength checklist */}
            {password.length > 0 && (
              <ul className="mt-2 space-y-1.5 bg-background/40 p-3 rounded-xl border border-border/50">
                <PasswordCheck met={hasMinLength} label="At least 8 characters" />
                <PasswordCheck met={hasLowercase} label="One lowercase letter" />
                <PasswordCheck met={hasUppercase} label="One uppercase letter" />
                <PasswordCheck met={hasNumber} label="One number" />
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="register-confirm-password"
              className="text-xs font-bold text-muted-foreground tracking-wide uppercase"
            >
              Confirm password
            </Label>
            <Input
              id="register-confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isSubmitting}
              className="h-11 rounded-xl bg-background/50 border-border/60 focus:bg-background transition-all"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive font-medium mt-1.5">Passwords do not match</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 p-6 pt-2">
          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/10 transition-all active:scale-[0.98]"
            disabled={
              isSubmitting ||
              !hasMinLength ||
              !hasLowercase ||
              !hasUppercase ||
              !hasNumber ||
              !passwordsMatch
            }
            id="register-submit"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create account
          </Button>

          <div className="relative flex py-1 items-center w-full">
            <div className="grow border-t border-border/60"></div>
            <span className="shrink mx-4 text-xs font-bold text-muted-foreground uppercase">
              Or
            </span>
            <div className="grow border-t border-border/60"></div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => (window.location.href = "/api/auth/google")}
            className="w-full h-11 rounded-xl font-semibold border-border/60 hover:bg-muted/30 transition-all flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground font-medium mt-2">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-primary hover:text-primary/90 transition-colors underline underline-offset-4"
              id="register-login-link"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
