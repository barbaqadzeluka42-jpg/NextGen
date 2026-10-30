// Verifies that .env.local points to a correctly prepared Supabase project.
// Run:  npm run check:supabase      (read-only; creates nothing)
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let failed = 0;
const ok = (m) => console.log(`  ✔ ${m}`);
const bad = (m, fix) => { failed++; console.log(`  ✘ ${m}${fix ? `\n      → ${fix}` : ""}`); };
const warn = (m) => console.log(`  ⚠ ${m}`);
const head = (t) => console.log(`\n${t}`);

async function call(path, { key = pub, method = "GET", body } = {}) {
  try {
    const res = await fetch(`${url}${path}`, {
      method,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text };
  } catch (e) {
    return { status: 0, error: String(e.message || e) };
  }
}
const denied = (r) => r.status === 401 || r.status === 403 || r.status === 404 || (r.json && /permission denied|not found|PGRST202/i.test(JSON.stringify(r.json)));

head("1. გარემოს ცვლადები (.env.local)");
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) bad("NEXT_PUBLIC_SUPABASE_URL არასწორია", "უნდა იყოს ფორმატის: https://xxxxxxxx.supabase.co");
else ok(`Project URL: ${url}`);
if (!pub) bad("Publishable key არ არის მითითებული", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
else if (pub.startsWith("sb_secret_")) bad("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY-ში SECRET key ჩაგიწერია!", "ეს გასაღები ბრაუზერში გამოჩნდებოდა. ჩასვი sb_publishable_… გასაღები, secret კი SUPABASE_SECRET_KEY-ში");
else ok("Publishable key მითითებულია");
if (!secret) warn("SUPABASE_SECRET_KEY არ არის — rate limiting, ელფოსტის გაგზავნა და ანგარიშის წაშლა არ იმუშავებს (production-ში აუცილებელია)");
else if (secret.startsWith("sb_publishable_")) bad("SUPABASE_SECRET_KEY-ში publishable key ჩაგიწერია", "აიღე Secret key Supabase → Project Settings → API Keys-დან");
else ok("Secret key მითითებულია (არ გამოჩნდება ბრაუზერში)");
if (failed) { console.log("\nჯერ გაასწორე ზემოთ ჩამოთვლილი."); process.exit(1); }

head("2. Authentication-ის პარამეტრები");
const settings = await call("/auth/v1/settings");
if (settings.status !== 200) bad(`Auth სერვისი არ პასუხობს (HTTP ${settings.status} ${settings.error ?? ""})`, "შეამოწმე URL და გასაღები");
else {
  const s = settings.json;
  s.external?.email ? ok("Email რეგისტრაცია ჩართულია") : bad("Email provider გამორთულია", "Authentication → Sign In / Providers → Email → Enable");
  s.mailer_autoconfirm ? bad("Confirm email გამორთულია — ელფოსტის დადასტურების გარეშე შესვლა შეიძლება", "Authentication → Sign In / Providers → Email → Confirm email = ON") : ok("ელფოსტის დადასტურება ჩართულია");
  s.disable_signup ? bad("რეგისტრაცია გამორთულია (disable_signup)", "Authentication → Sign In / Providers → Allow new users to sign up = ON") : ok("ახალი მომხმარებლების რეგისტრაცია დაშვებულია");
}

head("3. ბაზის ცხრილები (მიგრაციები)");
for (const t of ["events", "announcements", "projects", "schools"]) {
  const r = await call(`/rest/v1/${t}?select=id&limit=1`);
  r.status === 200 ? ok(`${t}: არსებობს და საჯარო წაკითხვა მუშაობს`) : bad(`${t}: HTTP ${r.status}`, r.status === 404 ? "ცხრილი არ არსებობს — გაუშვი supabase/setup.sql SQL Editor-ში" : JSON.stringify(r.json ?? r.text).slice(0, 160));
}

head("4. უსაფრთხოება: ანონიმურ მომხმარებელს არ უნდა ჰქონდეს წვდომა");
for (const t of ["profiles", "user_roles", "event_registrations", "notifications", "audit_logs", "email_outbox", "rate_limits"]) {
  const r = await call(`/rest/v1/${t}?select=*&limit=1`);
  if (r.status === 200 && Array.isArray(r.json) && r.json.length > 0) bad(`${t}: ანონიმს მონაცემები ჩანს!`, "RLS/grants არ არის გამართული — გაუშვი 0003_rls_and_grants.sql");
  else if (r.status === 200) bad(`${t}: ანონიმს წვდომა აქვს (ცარიელია, მაგრამ დახურული უნდა იყოს)`, "გაუშვი 0003_rls_and_grants.sql");
  else if (r.status === 404) bad(`${t}: ცხრილი არ მოიძებნა`, "გაუშვი მიგრაციები");
  else ok(`${t}: დახურულია (HTTP ${r.status})`);
}
for (const fn of ["register_for_event", "consume_rate_limit", "claim_email_outbox", "set_user_role"]) {
  const r = await call(`/rest/v1/rpc/${fn}`, { method: "POST", body: {} });
  denied(r) ? ok(`rpc/${fn}: ანონიმისთვის დახურულია`) : bad(`rpc/${fn}: ანონიმისთვის ღიაა (HTTP ${r.status})`, "გაუშვი 0003_rls_and_grants.sql");
}

head("5. სერვერის მხარე (Secret key)");
if (!secret) warn("გამოტოვებულია (Secret key არ არის)");
else {
  const rl = await call("/rest/v1/rpc/consume_rate_limit", { key: secret, method: "POST", body: { p_key: "healthcheck", p_limit: 5, p_window_seconds: 60 } });
  rl.status === 200 && rl.json === true ? ok("rate limiting ფუნქცია მუშაობს") : bad(`consume_rate_limit: HTTP ${rl.status}`, JSON.stringify(rl.json ?? rl.text).slice(0, 160));
  const b = await call("/storage/v1/bucket/project-images", { key: secret });
  b.status === 200 ? (b.json?.public === false ? ok("Storage bucket project-images არსებობს და დახურულია") : bad("bucket project-images საჯაროა!", "გაუშვი 0004_storage.sql")) : bad(`bucket project-images ვერ მოიძებნა (HTTP ${b.status})`, "გაუშვი 0004_storage.sql");
  const sa = await call("/rest/v1/user_roles?select=user_id&role=eq.super_admin&limit=1", { key: secret });
  Array.isArray(sa.json) && sa.json.length ? ok("Super Admin არსებობს") : warn("Super Admin ჯერ არ არის — დარეგისტრირების და ელფოსტის დადასტურების შემდეგ გაუშვი supabase/seed.sql");
}

console.log(failed ? `\n✘ ${failed} პრობლემა. გაასწორე და გაუშვი თავიდან.` : "\n✔ Supabase სწორად არის მომზადებული.");
process.exit(failed ? 1 : 0);
