import { redirect } from "next/navigation"
import { getServerUser } from "@/lib/firebase/server-auth"

export default async function AIInsightsPage() {
  const user = await getServerUser()
  if (!user) redirect("/auth/login")

  // Redirect to dashboard — Ledmi is now a floating chatbot accessible everywhere
  redirect("/dashboard")
}
