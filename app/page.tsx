import { fetchQuery } from "convex/nextjs";
import { api } from "../convex/_generated/api";
import { getToken } from "../lib/auth/auth-server";
import { redirect } from "next/navigation";
import HomeLayout from "@/components/layouts/home-layout";

export default async function Home() {
  const token = await getToken();
  const isAuth = await fetchQuery(api.auth.isAuthenticated, {}, { token });

  if (!isAuth) {
    redirect("/sign-in");
  }

  const user = await fetchQuery(api.auth.getCurrentUser, {}, { token });

  console.log(user);

  return <HomeLayout />;
}
