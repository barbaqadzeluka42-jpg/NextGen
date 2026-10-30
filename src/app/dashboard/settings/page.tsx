import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DeleteAccountForm, PreferencesForm, ProfileForm } from "@/components/settings-forms";
import type { PreferencesRow } from "@/lib/types";

export const metadata: Metadata = { title: "პარამეტრები" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await requireUser("/dashboard/settings");
  const supabase = await createClient();
  const { data } = await supabase.from("notification_preferences").select("inapp_new_events,inapp_announcements,email_event_changes,email_announcements").eq("user_id", viewer.id).maybeSingle();
  const prefs: PreferencesRow = data ?? { inapp_new_events: true, inapp_announcements: true, email_event_changes: true, email_announcements: true };
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="პარამეტრები" />
      <Card><CardHeader><CardTitle>პროფილი</CardTitle></CardHeader><CardContent><ProfileForm fullName={viewer.fullName} grade={viewer.grade} email={viewer.email} /></CardContent></Card>
      <Card>
        <CardHeader><CardTitle>შეტყობინებები</CardTitle><CardDescription>აირჩიე, რომელი არასავალდებულო შეტყობინებები გინდა მიიღო.</CardDescription></CardHeader>
        <CardContent><PreferencesForm prefs={prefs} /></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>შენი მონაცემები</CardTitle>
          <CardDescription>შეგიძლია გადმოწერო ყველაფერი, რასაც შენს შესახებ ვინახავთ. <Link href="/privacy" className="text-primary underline">კონფიდენციალურობის პოლიტიკა</Link></CardDescription>
        </CardHeader>
        <CardContent><Button asChild variant="outline"><a href="/api/export" download><Download /> მონაცემების გადმოწერა (JSON)</a></Button></CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">ანგარიშის წაშლა</CardTitle>
          <CardDescription>წაიშლება პროფილი, განაცხადები, შეტყობინებები და შენი პროექტები. მოქმედება შეუქცევადია.</CardDescription>
        </CardHeader>
        <CardContent><DeleteAccountForm /></CardContent>
      </Card>
    </div>
  );
}
