import { siteUrl } from "@/lib/env";

export const escapeHtml = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const TZ = "Asia/Tbilisi";
const when = (iso: unknown) =>
  typeof iso === "string"
    ? new Intl.DateTimeFormat("ka-GE", { dateStyle: "full", timeStyle: "short", timeZone: TZ }).format(new Date(iso))
    : "";

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

function layout(opts: { preheader: string; heading: string; paragraphs: string[]; cta?: { label: string; href: string }; footnote?: string }): string {
  const base = siteUrl();
  const paras = opts.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#2b2d42;">${p}</p>`).join("");
  const cta = opts.cta
    ? `<p style="margin:24px 0 8px;"><a href="${escapeHtml(opts.cta.href)}" style="display:inline-block;background:#6d4aff;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:12px;font-size:16px;">${escapeHtml(opts.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="ka"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;background:#f3f2fb;font-family:-apple-system,'Segoe UI','Noto Sans Georgian',Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;">
<tr><td style="background:linear-gradient(100deg,#6d4aff,#3b82f6);padding:20px 28px;color:#ffffff;font-weight:800;font-size:20px;letter-spacing:.04em;">NEXTGEN</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#14152b;">${escapeHtml(opts.heading)}</h1>
${paras}${cta}
</td></tr>
<tr><td style="padding:16px 28px 24px;font-size:12px;line-height:1.5;color:#6b6d85;border-top:1px solid #ececf6;">
${opts.footnote ? escapeHtml(opts.footnote) + "<br>" : ""}
შეტყობინებების მართვა შეგიძლია <a href="${escapeHtml(base)}/dashboard/settings" style="color:#6d4aff;">პარამეტრებში</a>.
</td></tr></table></td></tr></table></body></html>`;
}

type Payload = Record<string, unknown>;

export function renderEmail(kind: string, payload: Payload): Rendered | null {
  const base = siteUrl();
  const title = escapeHtml(payload.event_title ?? payload.title ?? "");
  const eventUrl = payload.event_id ? `${base}/events/${encodeURIComponent(String(payload.event_id))}` : `${base}/events`;
  const details = (): string[] => [
    ...(payload.starts_at ? [`<strong>დრო:</strong> ${escapeHtml(when(payload.starts_at))}`] : []),
    ...(payload.location ? [`<strong>ადგილი:</strong> ${escapeHtml(payload.location)}`] : []),
  ];

  switch (kind) {
    case "welcome":
      return {
        subject: "კეთილი იყოს შენი მობრძანება NEXTGEN-ში",
        html: layout({
          preheader: "რეგისტრაცია წარმატებით დასრულდა",
          heading: "რეგისტრაცია წარმატებით დასრულდა 🎉",
          paragraphs: ["შენი ელფოსტა დადასტურებულია. ახლა შეგიძლია ნახო მომავალი ღონისძიებები, დარეგისტრირდე ერთი ღილაკით და გამოაქვეყნო საკუთარი პროექტები."],
          cta: { label: "ღონისძიებების ნახვა", href: `${base}/events` },
        }),
        text: `რეგისტრაცია წარმატებით დასრულდა. ღონისძიებები: ${base}/events`,
      };
    case "registration_received":
      return {
        subject: `განაცხადი მიღებულია: ${payload.event_title ?? ""}`,
        html: layout({
          preheader: "შენი განაცხადი მიღებულია",
          heading: "განაცხადი მიღებულია",
          paragraphs: [`ღონისძიება „${title}“ — შენი განაცხადი მიღებულია და ელოდება ადმინისტრატორის დადასტურებას.`, ...details()],
          cta: { label: "განაცხადის სტატუსი", href: `${base}/dashboard` },
        }),
        text: `განაცხადი მიღებულია: ${payload.event_title}. სტატუსი: ${base}/dashboard`,
      };
    case "registration_approved":
      return {
        subject: `განაცხადი დადასტურებულია: ${payload.event_title ?? ""}`,
        html: layout({
          preheader: "შენი მონაწილეობა დადასტურდა",
          heading: "შენი მონაწილეობა დადასტურდა ✅",
          paragraphs: [`ღონისძიება „${title}“ — მონაწილეობა დადასტურებულია.`, ...details()],
          cta: { label: "ღონისძიების ნახვა", href: eventUrl },
        }),
        text: `მონაწილეობა დადასტურებულია: ${payload.event_title}. ${eventUrl}`,
      };
    case "registration_rejected":
      return {
        subject: `განაცხადი უარყოფილია: ${payload.event_title ?? ""}`,
        html: layout({
          preheader: "განაცხადი ვერ დაკმაყოფილდა",
          heading: "განაცხადი ვერ დაკმაყოფილდა",
          paragraphs: [`ღონისძიება „${title}“ — სამწუხაროდ, ამჯერად შენი განაცხადი ვერ დაკმაყოფილდა. გირჩევთ, ნახო სხვა მომავალი ღონისძიებები.`],
          cta: { label: "სხვა ღონისძიებები", href: `${base}/events` },
        }),
        text: `განაცხადი ვერ დაკმაყოფილდა: ${payload.event_title}. ${base}/events`,
      };
    case "event_changed":
      return {
        subject: `ღონისძიების დეტალები შეიცვალა: ${payload.event_title ?? ""}`,
        html: layout({
          preheader: "შეიცვალა დრო ან ადგილი",
          heading: "ღონისძიების დეტალები შეიცვალა",
          paragraphs: [`ღონისძიებაში „${title}“ შეიცვალა მნიშვნელოვანი ინფორმაცია. განახლებული დეტალები:`, ...details()],
          cta: { label: "დეტალების ნახვა", href: eventUrl },
        }),
        text: `ღონისძიება „${payload.event_title}“ განახლდა: ${eventUrl}`,
      };
    case "event_cancelled":
      return {
        subject: `ღონისძიება გაუქმდა: ${payload.event_title ?? ""}`,
        html: layout({
          preheader: "ღონისძიება გაუქმდა",
          heading: "ღონისძიება გაუქმდა",
          paragraphs: [`სამწუხაროდ, ღონისძიება „${title}“ გაუქმდა.`],
          cta: { label: "სხვა ღონისძიებები", href: `${base}/events` },
        }),
        text: `ღონისძიება „${payload.event_title}“ გაუქმდა. ${base}/events`,
      };
    case "announcement":
      return {
        subject: `მნიშვნელოვანი განცხადება: ${payload.title ?? ""}`,
        html: layout({
          preheader: String(payload.title ?? ""),
          heading: String(payload.title ?? "განცხადება"),
          paragraphs: [escapeHtml(payload.excerpt ?? "").replace(/\n/g, "<br>")],
          cta: { label: "სიახლეების ნახვა", href: `${base}/news` },
        }),
        text: `${payload.title}\n\n${payload.excerpt ?? ""}\n${base}/news`,
      };
    default:
      return null;
  }
}
