import { redirect } from "next/navigation";
import { verifySession } from "@/lib/firebase/admin/auth/verifySession";
import LoginPageClient from "./LoginPageClient";

export default async function LoginPage() {
  const user = await verifySession();

  if (user) {
    redirect("/tracker");
  }

  return <LoginPageClient />;
}
