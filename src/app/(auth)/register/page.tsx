import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "რეგისტრაცია" };

export default async function RegisterPage() {
  if (await getViewer()) redirect("/dashboard");
  return (
    <>
      <h1 className="text-2xl font-extrabold">რეგისტრაცია</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">გვჭირდება მხოლოდ სახელი, ელფოსტა და პაროლი.</p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">უკვე გაქვს ანგარიში? <Link href="/login" className="font-semibold text-primary hover:underline">შესვლა</Link></p>
    </>
  );
}
