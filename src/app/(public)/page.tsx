import Link from "next/link";
import { ArrowRight, CalendarCheck, FolderKanban, Lightbulb, Megaphone, MousePointerClick, Rocket, Trophy, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/page-header";
import { EventCard } from "@/components/events/event-card";
import { ProjectCard } from "@/components/projects/project-card";
import { signedImageUrls } from "@/lib/project-images";
import { EVENT_COLUMNS, eventPhase } from "@/lib/events";
import { eventCategoryLabels } from "@/lib/constants";
import { fmtDate, fmtDay, fmtMonthShort, fmtTime } from "@/lib/utils";
import type { AnnouncementRow, EventRow, ProjectRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function Section({ id, eyebrow, title, action, children }: { id?: string; eyebrow: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="container-page scroll-mt-20 py-12 sm:py-16">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const viewer = await getViewer();
  const nowIso = new Date().toISOString();

  const [eventsRes, newsRes, projectsRes] = await Promise.all([
    supabase.from("events").select(EVENT_COLUMNS).neq("status", "draft").neq("status", "cancelled").gte("starts_at", nowIso).order("starts_at").limit(8),
    supabase.from("announcements").select("id,title,body,is_important,published_at,is_published,created_at").eq("is_published", true).order("published_at", { ascending: false }).limit(3),
    supabase.from("projects").select("*").eq("moderation_status", "approved").order("created_at", { ascending: false }).limit(6),
  ]);
  const events = (eventsRes.data ?? []) as EventRow[];
  const news = (newsRes.data ?? []) as AnnouncementRow[];
  const projects = (projectsRes.data ?? []) as ProjectRow[];
  const images = await signedImageUrls(projects.map((p) => p.image_path));

  const open = events.filter((e) => eventPhase(e) === "open").slice(0, 3);
  const featured = open.length ? open : events.slice(0, 3);

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-hero">
        <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
        <div aria-hidden className="absolute -right-24 top-24 -z-10 size-72 animate-float rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden className="absolute -left-24 top-64 -z-10 size-64 animate-float rounded-full bg-accent/20 blur-3xl [animation-delay:-4s]" />
        <div className="container-page grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          <div className="animate-fade-up">
            <Badge className="mb-5 gap-1.5 py-1 pl-2"><Rocket className="size-3.5" /> მოსწავლეების პლატფორმა</Badge>
            <h1 className="text-[2.1rem] font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              მომავლის თაობა <span className="text-gradient">იწყება აქ</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              ჭადრაკის ტურნირები, Brain Arena, პროგრამირებისა და დებატების კონკურსები. დარეგისტრირდი ერთი ღილაკით, თვალი ადევნე განაცხადს და გამოაქვეყნე შენი პროექტები.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {viewer ? (
                <Button asChild size="lg" variant="gradient"><Link href="/dashboard">ჩემი დაფა <ArrowRight /></Link></Button>
              ) : (
                <Button asChild size="lg" variant="gradient"><Link href="/register">რეგისტრაცია <ArrowRight /></Link></Button>
              )}
              <Button asChild size="lg" variant="outline"><Link href="/events">ღონისძიებების ნახვა</Link></Button>
            </div>
          </div>

          {/* Decorative preview of the next event — only shown when a real event exists */}
          {featured[0] && (
            <Link href={`/events/${featured[0].id}`} className="animate-fade-up rounded-2xl border bg-card/80 p-5 shadow-2xl shadow-primary/15 backdrop-blur [animation-delay:150ms] hover:border-primary/40 sm:p-6">
              <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><CalendarCheck className="size-4" /> უახლოესი ღონისძიება</p>
              <div className="flex items-start gap-4">
                <div aria-hidden className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  <span className="text-2xl font-extrabold leading-none">{fmtDay(featured[0].starts_at)}</span>
                  <span className="mt-1 text-xs font-semibold uppercase">{fmtMonthShort(featured[0].starts_at)}</span>
                </div>
                <div className="min-w-0">
                  <Badge variant="outline" className="mb-2">{eventCategoryLabels[featured[0].category]}</Badge>
                  <h2 className="text-lg font-bold leading-snug">{featured[0].title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{fmtTime(featured[0].starts_at)} · {featured[0].location}</p>
                </div>
              </div>
              <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">დეტალები და რეგისტრაცია <ArrowRight className="size-4" /></p>
            </Link>
          )}
        </div>
      </section>

      {/* ───────── Mission ───────── */}
      <Section id="mission" eyebrow="ჩვენი მისია" title="სივრცე, სადაც მოსწავლეები იზრდებიან">
        <p className="mb-8 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          NEXTGEN აერთიანებს სასკოლო კონკურსებს, ტურნირებსა და მოსწავლეთა პროექტებს. გვინდა, ყოველ მოსწავლეს ჰქონდეს მარტივი გზა, იპოვოს საინტერესო შესაძლებლობა,
          დარეგისტრირდეს და გამოავლინოს თავისი ნიჭი.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Trophy, title: "კონკურსები და ტურნირები", text: "ერთი ადგილი ყველა ღონისძიებისთვის: განრიგი, წესები და შედეგები." },
            { icon: Lightbulb, title: "შენი პროექტები", text: "წარადგინე საკუთარი იდეა და ნამუშევარი — დამტკიცების შემდეგ გალერეაში გამოჩნდება." },
            { icon: Users, title: "უსაფრთხო გარემო", text: "მოითხოვება მხოლოდ საჭირო მონაცემები, პირადი ინფორმაცია საჯაროდ არ ქვეყნდება." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border bg-card p-5 sm:p-6">
              <div className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/12 text-primary"><Icon className="size-5" /></div>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ───────── Active events ───────── */}
      <Section eyebrow="აქტუალური" title="ღონისძიებები" action={<Button asChild variant="ghost" size="sm"><Link href="/events">ყველა <ArrowRight /></Link></Button>}>
        {featured.length ? (
          <div className="grid gap-4 lg:grid-cols-3">{featured.map((e) => <EventCard key={e.id} event={e} />)}</div>
        ) : (
          <EmptyState icon={<CalendarCheck />} title="ახალი ღონისძიებები მალე გამოქვეყნდება" description="დარეგისტრირდი და შეტყობინებას მიიღებ, როგორც კი ახალი კონკურსი დაემატება." />
        )}
      </Section>

      {/* ───────── Upcoming contests (calendar list) ───────── */}
      <Section eyebrow="კალენდარი" title="მომავალი კონკურსები">
        {events.length ? (
          <ol className="divide-y overflow-hidden rounded-xl border bg-card">
            {events.slice(0, 6).map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="flex min-h-16 items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/60 sm:px-5">
                  <time dateTime={e.starts_at} className="w-14 shrink-0 text-center">
                    <span className="block text-xl font-extrabold leading-none">{fmtDay(e.starts_at)}</span>
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{fmtMonthShort(e.starts_at)}</span>
                  </time>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{e.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">{eventCategoryLabels[e.category]} · {fmtTime(e.starts_at)} · {e.location}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="განრიგი ჯერ ცარიელია" description="მომავალი კონკურსები აქ გამოჩნდება." />
        )}
      </Section>

      {/* ───────── News ───────── */}
      <Section eyebrow="სიახლეები" title="პროექტის სიახლეები" action={<Button asChild variant="ghost" size="sm"><Link href="/news">ყველა <ArrowRight /></Link></Button>}>
        {news.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {news.map((n) => (
              <article key={n.id} className="flex flex-col gap-2 rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Megaphone className="size-3.5" />
                  {n.published_at && <time dateTime={n.published_at}>{fmtDate(n.published_at)}</time>}
                  {n.is_important && <Badge variant="warning">მნიშვნელოვანი</Badge>}
                </div>
                <h3 className="font-bold leading-snug">{n.title}</h3>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Megaphone />} title="სიახლეები ჯერ არ არის" description="პირველი განცხადება მალე გამოქვეყნდება." />
        )}
      </Section>

      {/* ───────── How it works ───────── */}
      <Section eyebrow="როგორ მუშაობს" title="ოთხი მარტივი ნაბიჯი">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: UserPlus, t: "დარეგისტრირდი", d: "სახელი, ელფოსტა და პაროლი — სხვა არაფერი." },
            { icon: MousePointerClick, t: "აირჩიე ღონისძიება", d: "ნახე განრიგი, წესები და თავისუფალი ადგილები." },
            { icon: CalendarCheck, t: "გააგზავნე განაცხადი", d: "ერთი ღილაკით. სტატუსს დაფაზე თვალს ადევნებ." },
            { icon: FolderKanban, t: "გამოაქვეყნე პროექტი", d: "წარადგინე ნამუშევარი და გამოჩნდი გალერეაში." },
          ].map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="relative rounded-xl border bg-card p-5">
              <span aria-hidden className="absolute right-4 top-3 text-5xl font-black text-primary/10">{i + 1}</span>
              <div className="mb-3 grid size-10 place-items-center rounded-lg bg-primary/12 text-primary"><Icon className="size-5" /></div>
              <h3 className="font-bold">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ───────── Projects gallery ───────── */}
      <Section eyebrow="გალერეა" title="მოსწავლეთა პროექტები" action={<Button asChild variant="ghost" size="sm"><Link href="/projects">ყველა <ArrowRight /></Link></Button>}>
        {projects.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => <ProjectCard key={p.id} project={p} imageUrl={p.image_path ? images[p.image_path] : null} />)}
          </div>
        ) : (
          <EmptyState icon={<FolderKanban />} title="გალერეა მალე შეივსება" description="პირველი დამტკიცებული პროექტები აქ გამოჩნდება. შენც შეგიძლია წარადგინო საკუთარი." >
            <Button asChild variant="outline"><Link href={viewer ? "/dashboard/projects/new" : "/register"}>პროექტის წარდგენა</Link></Button>
          </EmptyState>
        )}
      </Section>

      {/* ───────── CTA ───────── */}
      {!viewer && (
        <section className="container-page py-12">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent px-6 py-12 text-center text-primary-foreground sm:px-12 sm:py-16">
            <div aria-hidden className="bg-grid absolute inset-0 opacity-30" />
            <h2 className="relative text-2xl font-extrabold sm:text-4xl">მზად ხარ შემოგვიერთდე?</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/85">რეგისტრაცია სწრაფია და უფასო. დაგჭირდება მხოლოდ ელფოსტა.</p>
            <Button asChild size="lg" variant="secondary" className="relative mt-7 bg-white text-primary hover:bg-white/90"><Link href="/register">რეგისტრაცია <ArrowRight /></Link></Button>
          </div>
        </section>
      )}
    </>
  );
}
