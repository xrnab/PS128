import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { User, District, Block, Village } from "@prisma/client";
import { cache } from "react";

export type FullAppUser = User & {
  district: District | null;
  block: Block | null;
  village: Village | null;
};

/**
 * Retrieves the currently authenticated Clerk user object.
 */
export const getCurrentClerkUser = cache(async () => {
  return await currentUser();
});

/**
 * Ensures the request is authenticated with Clerk.
 * Redirects to /sign-in if unauthenticated.
 */
export const requireAuthenticatedUser = cache(async (): Promise<string> => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  return userId;
});

/**
 * Retrieves the authoritative Prisma User record for the currently logged-in Clerk user.
 * Deduplicated per-request using React cache.
 */
export const getCurrentAppUser = cache(async (): Promise<FullAppUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const appUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      district: true,
      block: true,
      village: true,
    },
  });

  return appUser as FullAppUser | null;
});

/**
 * Enforces that the user has completed onboarding and possesses ACTIVE status.
 * Handles automatic redirection for unonboarded, pending, or rejected users.
 * Deduplicated per-request using React cache.
 */
export const requireActiveUser = cache(async (): Promise<FullAppUser> => {
  await requireAuthenticatedUser();
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/onboarding");
  }

  if (appUser.status === "PENDING_APPROVAL") {
    redirect("/pending-approval");
  }

  if (appUser.status === "REJECTED") {
    redirect("/rejected");
  }

  return appUser;
});
