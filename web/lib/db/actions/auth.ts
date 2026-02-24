"use server";

import { auth } from "@/lib/auth/server";

export async function requireUser(): Promise<string> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}
