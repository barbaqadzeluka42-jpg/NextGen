# NEXTGEN — საგანმანათლებლო პლატფორმა მოსწავლეებისთვის

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui-სტილის კომპონენტები · Supabase (Postgres, Auth, RLS, Storage) · Resend · Vercel.

**ინსტრუქცია განთავსებისთვის → [`DEPLOYMENT.md`](./DEPLOYMENT.md)**

## რა არის უკვე აწყობილი

| ფუნქცია | სტატუსი |
| --- | --- |
| რეგისტრაცია (სახელი, ელფოსტა, პაროლი), ელფოსტის დადასტურება, შესვლა/გამოსვლა, პაროლის აღდგენა | კოდი მზადაა; მუშაობს მხოლოდ Supabase-თან დაკავშირების შემდეგ |
| როლები: Student / Admin / Super Admin (ბაზის დონეზე დაცული) | ✔ SQL ტესტებით გადამოწმებული |
| ღონისძიებები: შექმნა, რედაქტირება, გაუქმება, სტატუსები, წესები | ✔ |
| ერთი ღილაკით რეგისტრაცია; დუბლირების და ადგილების გადაჭარბების გამორიცხვა (პარალელურადაც) | ✔ SQL ტესტით: 12 პარალელური მოთხოვნა → 3 ადგილზე ზუსტად 3 |
| განაცხადის დამტკიცება/უარყოფა, CSV ექსპორტი | ✔ |
| Student Dashboard (რეგისტრაციები, სტატუსები, შეტყობინებები, ახალი კონკურსები, პარამეტრები) | ✔ |
| შეტყობინებები საიტზე + ელფოსტით (outbox, ლიმიტი, retry), გამორთვის პარამეტრები | ✔ ბაზის ნაწილი ტესტირებულია; ელფოსტის გაგზავნა — Resend-ის გასაღების შემდეგ |
| ადმინის პანელი: ღონისძიებები, სიახლეები, პროექტების მოდერაცია, შეტყობინებები, სტატუსტიკა, როლები (Super Admin), Audit Log | ✔ |
| პროექტების გალერეა (თანხმობა + დამტკიცება, დახურული Storage bucket, signed URL) | ✔ |
| კონფიდენციალურობა: მონაცემების გადმოწერა (JSON), ანგარიშის წაშლა, მინიმალური მონაცემები | ✔ |
| ღია/მუქი თემა, mobile-first დიზაინი, ქართული ენა | ✔ |

## ლოკალურად გაშვება

```bash
cp .env.example .env.local      # შეავსე Supabase-ის მნიშვნელობები (იხ. DEPLOYMENT.md)
npm install
npm run dev                     # http://localhost:3000
```

სხვა ბრძანებები: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`.

## არქიტექტურა

```
src/
  app/
    (public)/    მთავარი, ღონისძიებები, სიახლეები, პროექტები, privacy, terms
    (auth)/      login, register, forgot-password, reset-password
    auth/confirm ელფოსტის ბმულების დამუშავება (token_hash / PKCE)
    dashboard/   მოსწავლის პირადი სივრცე
    admin/       ადმინისტრატორის პანელი (requireAdmin ყოველ გვერდზე)
    api/         export (მონაცემების გადმოწერა), cron/emails
  actions/       Server Actions (ვალიდაცია zod-ით, rate limit, როლის შემოწმება)
  lib/           supabase კლიენტები, auth guards, validation, email, rate-limit
  components/    UI (shadcn-სტილი), ფორმები, ნავიგაცია
  proxy.ts       სესიის განახლება + /dashboard, /admin-ის პირველადი დაცვა
supabase/
  migrations/    0001 სქემა · 0002 ფუნქციები/ტრიგერები/RPC · 0003 RLS და grants · 0004 Storage
  tests/         ლოკალური SQL ტესტები (არ არის production-ისთვის)
  email-templates/  Supabase-ის წერილების შაბლონები (ქართულად)
```

### უსაფრთხოების მოდელი (დაცვის 3 დამოუკიდებელი ფენა)

1. **Postgres RLS + grants** — ცხრილები default-ად დაკეტილია; კლიენტს მხოლოდ საჭირო სვეტების ჩაწერა შეუძლია. `user_roles`, `event_registrations`, `moderation_status`, `taken_seats` კლიენტიდან პირდაპირ არ იცვლება.
2. **SECURITY DEFINER RPC-ები** (`register_for_event`, `decide_registration`, `moderate_project`, `set_user_role`, …) — თვითონ ამოწმებენ როლს `auth.uid()`-ით და ბლოკავენ ადგილების გადაჭარბებას ხაზის დაბლოკვით (`FOR UPDATE`).
3. **სერვერის შემოწმება** — ყოველი Server Action/გვერდი თავიდან ამოწმებს სესიას (`auth.getUser()`) და როლს; non-admin ადმინ-გვერდზე 404-ს იღებს.

დამატებით: zod ვალიდაცია, Postgres-ზე დაფუძნებული rate limiting (შესვლა, რეგისტრაცია, აღდგენა, განაცხადები, ატვირთვა), open-redirect დაცვა (`safeNext`), სურათის ტიპის შემოწმება magic bytes-ით, ელფოსტის HTML escaping, CSV formula-injection დაცვა, CSP/HSTS/X-Frame-Options headers, `server-only` service-role-ისთვის, აუდიტის ჟურნალი ტრიგერებით (ადმინს ვერ აუქმებს), ანგარიშის არსებობის გამჟღავნების გარეშე პასუხები.

## ცნობილი შეზღუდვები (რეალურად)

- **პროექტი არ არის გაშვებული რეალურ Supabase/Resend-ზე** (ამ გარემოში ანგარიშებზე წვდომა არ მქონდა). შემოწმებულია: TypeScript, ESLint, production build, 14 unit ტესტი, **მიგრაციები და RLS რეალურ PostgreSQL 16-ზე** (`supabase/tests/run.sh`), UI ვიზუალურად Supabase-ის სიმულაციით ტელეფონის/დესკტოპის ზომაზე. **Auth-ის ნაკადი (ელფოსტა → ბმული → სესია), რეალური PostgREST მოთხოვნები და Resend-ით გაგზავნა პირველად თქვენს გარემოში გაიტესტება** — იხ. DEPLOYMENT.md-ის „გადამოწმების სია“.
- CSP-ში `script-src 'unsafe-inline'` დარჩა (Next.js-ის hydration-ისთვის). nonce-ზე გადასვლა შესაძლებელია, მაგრამ ყველა გვერდს დინამიკურს გახდის.
- ატვირთულ სურათებს EXIF მეტამონაცემები არ ეშლება.
- Resend-ის უფასო გეგმა = 100 წერილი/დღე; `EMAIL_DAILY_LIMIT` ზღუდავს, დარჩენილი რიგში ელოდება. Vercel Hobby-ზე cron დღეში ერთხელ გადის (retry-სთვის).
- Waitlist (მოლოდინის სია), ელფოსტის შეცვლა, ბევრ სკოლაზე ადმინის უფლებების გამიჯვნა — სქემა მზადაა (`schools`, `school_id`), UI/პოლიტიკები არ არის.
- `privacy` და `terms` გვერდების ტექსტი სამუშაო ვერსიაა; გაშვებამდე იურისტმა/სკოლამ უნდა გადახედოს (განსაკუთრებით ასაკობრივი თანხმობა: ტექსტში 16 წელია მითითებული).
