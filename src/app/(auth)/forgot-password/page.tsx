import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "პაროლის აღდგენა" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">პაროლის აღდგენა</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">მიუთითე ელფოსტა და გამოგიგზავნით ბმულს ახალი პაროლის დასაყენებლად.</p>
      <ForgotForm />
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-primary hover:underline">← შესვლაზე დაბრუნება</Link></p>
    </>
  );
}
