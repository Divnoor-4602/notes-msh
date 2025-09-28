import React from "react";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import HomeClient from "./home-client";

export default async function Home() {
  // Check if user is authenticated
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If user is not signed in, redirect to sign-in page
  if (!session) {
    redirect("/sign-in");
  }

  return <HomeClient />;
}
