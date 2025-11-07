"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  from: z.string().optional(),
});

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    const data = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
      from: formData.get("from") || "/dashboard/default",
    });

    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: data.from,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    // If it's a redirect (successful login), re-throw it
    throw error;
  }
}
