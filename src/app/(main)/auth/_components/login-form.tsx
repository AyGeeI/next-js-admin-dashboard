"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { loginAction, type LoginState } from "@/app/(main)/auth/v1/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {
  error: undefined,
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? "Logging in..." : "Login"}
    </Button>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard/default";
  const [state, formAction] = useFormState(loginAction, initialState);

  useEffect(() => {
    if (state.error) {
      // Error will be displayed in the form
    }
  }, [state.error]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="from" value={from} />

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          minLength={6}
        />
      </div>

      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
