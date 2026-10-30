# NEXTGEN — განთავსების სახელმძღვანელო

დრო: ~30–40 წუთი. ყველა სერვისს აქვს უფასო გეგმა, რომელიც MVP-სთვის საკმარისია.

## 1. Supabase

1. [supabase.com](https://supabase.com) → **New project** (რეგიონი: Frankfurt / ახლო ევროპა). შეინახე Database password.
2. **მიგრაციები.** SQL Editor-ში თანმიმდევრულად გაუშვი ეს 4 ფაილი (ყოველი — მთლიანად, ცალ-ცალკე **Run**):
   `supabase/migrations/0001_schema.sql` → `0002_functions_triggers.sql` → `0003_rls_and_grants.sql` → `0004_storage.sql`.
   (ან CLI-ით: `npx supabase link --project-ref <ref>` და `npx supabase db push`.)
3. **API გასაღებები:** Project Settings → API (ან „API Keys“):
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (უსაფრთხოა ბრაუზერისთვის, RLS იცავს)
   - Secret key (`sb_secret_…`) → `SUPABASE_SECRET_KEY` (**საიდუმლოა**; მხოლოდ Vercel-ის Environment Variables-ში, არასდროს `NEXT_PUBLIC_`-ით)
4. **Authentication → URL Configuration:**
   - *Site URL:* `https://შენი-დომენი` (ან Vercel-ის URL)
   - *Redirect URLs:* `https://შენი-დომენი/auth/confirm`, `http://localhost:3000/auth/confirm`
5. **Authentication → Sign In / Providers → Email:** *Confirm email* = **ჩართული**; *Minimum password length* = 8.
6. **Authentication → Email Templates:** ჩასვი `supabase/email-templates/confirm-signup.html` („Confirm signup“) და `reset-password.html` („Reset password“) შიგთავსი. ისინი `token_hash` ბმულს იყენებენ, რომელიც ნებისმიერ მოწყობილობაზე მუშაობს.
7. **Authentication → Rate Limits:** დატოვე ნაგულისხმევი ან დააკონკრეტე (რეგისტრაცია/IP). აპლიკაცია დამატებით თავისი ლიმიტებითაც იცავს.

## 2. Resend (ელფოსტა)

1. [resend.com](https://resend.com) → **Domains** → დაამატე შენი დომენი და ჩაწერე DNS ჩანაწერები (SPF, DKIM). დომენის გარეშე Resend მხოლოდ საკუთარ მისამართზე გაგზავნის.
2. **API Keys** → შექმენი გასაღები (*Sending access*) → `RESEND_API_KEY`.
3. `EMAIL_FROM` = `NEXTGEN <noreply@შენი-დომენი>`.
4. **დადასტურების და აღდგენის წერილები** Supabase-ს მიაქვს, ამიტომ დაუკავშირე Resend-ს SMTP-ით (წინააღმდეგ შემთხვევაში Supabase-ის ჩაშენებული სერვისი მხოლოდ ~2 წერილს/საათში გზავნის):
   Supabase → Authentication → **SMTP Settings** → *Enable custom SMTP*:
   Host `smtp.resend.com`, Port `465`, Username `resend`, Password = იგივე Resend API key, Sender = `noreply@შენი-დომენი`.
5. დანარჩენ წერილებს (მისალმება, განაცხადის სტატუსი, ღონისძიების ცვლილება, განცხადებები) აპლიკაცია თავად გზავნის სერვერიდან (`email_outbox` რიგი → Resend API).

## 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → აირჩიე GitHub რეპო `NextGen`.
2. Root Directory დატოვე ნაგულისხმევი (`./`); Framework: Next.js ამოიცნობა ავტომატურად.
3. **Environment Variables** (Production და Preview):

   | სახელი | მნიშვნელობა |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key |
   | `NEXT_PUBLIC_SITE_URL` | `https://შენი-დომენი` |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | საკონტაქტო ელფოსტა (footer/privacy), არასავალდებულო |
   | `NEXT_PUBLIC_ORG_NAME` | ორგანიზაციის/სკოლის სახელი privacy გვერდისთვის, არასავალდებულო |
   | `RESEND_API_KEY`, `EMAIL_FROM` | Resend-იდან |
   | `EMAIL_DAILY_LIMIT` | `90` (Resend free = 100/დღე) |
   | `CRON_SECRET` | გრძელი შემთხვევითი ტექსტი (`openssl rand -hex 32`); Vercel Cron ავტომატურად გამოგზავნის `Authorization: Bearer …` |

4. **Deploy.** `vercel.json` უკვე შეიცავს დღიურ cron-ს (`/api/cron/emails`), რომელიც გაუგზავნელ წერილებს ხელახლა ცდის.
5. (არასავალდებულო) Domains → დაამატე საკუთარი დომენი და განაახლე `NEXT_PUBLIC_SITE_URL` + Supabase *Site URL*.

## 4. პირველი Super Admin

საიტზე ჩვეულებრივ დარეგისტრირდი და დაადასტურე ელფოსტა. შემდეგ Supabase SQL Editor-ში გაუშვი `supabase/seed.sql`-ის `update` ბრძანება შენი ელფოსტით. ამის შემდეგ `/admin`-ზე შესვლა შეგეძლება, ხოლო `/admin/users`-ში სხვებს ადმინის როლს მიანიჭებ.
(ადმინის უფლება რეგისტრაციისას არასდროს ენიჭება.)

## 5. გადამოწმების სია (გაუშვი გაშვების შემდეგ — ეს ნაკადები ჯერ ცოცხალ გარემოში არ გატესტილა)

- [ ] რეგისტრაცია → მოდის დადასტურების წერილი → ბმული შეგიყვანს `/dashboard`-ზე → მოდის „რეგისტრაცია წარმატებით დასრულდა“ წერილი
- [ ] „დაგავიწყდა პაროლი“ → წერილი → ახალი პაროლი → შესვლა
- [ ] Super Admin: `/admin` იხსნება; ჩვეულებრივი მომხმარებლისთვის `/admin` = 404
- [ ] შექმენი ღონისძიება (სტატუსი „გამოქვეყნებული“) → სხვა ანგარიშზე ჩანს შეტყობინება „ახალი ღონისძიება“
- [ ] სხვა ანგარიშიდან დარეგისტრირება → სტატუსი „განხილვაშია“ → ადმინი ამტკიცებს → მოდის შეტყობინება და წერილი
- [ ] ღონისძიების ადგილის შეცვლა → მონაწილეებს მოდის შეტყობინება
- [ ] ღონისძიების მაქს. რაოდენობა 1 → მეორე მომხმარებელს „ადგილები ამოიწურა“
- [ ] პროექტის წარდგენა სურათით → გალერეაში არ ჩანს → ადმინი ამტკიცებს → ჩანს
- [ ] პარამეტრები → „მონაცემების გადმოწერა“ და (სატესტო ანგარიშზე) „ანგარიშის წაშლა“
- [ ] `/admin/audit` აჩვენებს ზემოთ ჩამოთვლილ ადმინისტრაციულ მოქმედებებს
- [ ] ტელეფონზე გახსენი საიტი და გაიარე იგივე ნაკადი

თუ წერილები არ მოდის: Vercel → Logs-ში მოძებნე `email`; Supabase SQL-ში `select kind,status,last_error from email_outbox order by created_at desc limit 20;`.

## 6. ლიმიტები უფასო გეგმებზე

- **Supabase Free:** 500 MB ბაზა, 1 GB Storage, 50 000 აქტიური მომხმარებელი/თვე; პროექტი 1 კვირა უმოქმედობისას „იძინებს“ (პირველი მოთხოვნა ჩაირთავს).
- **Resend Free:** 100 წერილი/დღე, 3 000/თვე. დიდი განცხადების (ყველა მომხმარებელს) ელფოსტა რიგში რამდენიმე დღეზე გადანაწილდება.
- **Vercel Hobby:** არაკომერციული გამოყენებისთვის; cron დღეში 1.

## 7. SQL ტესტები ლოკალურად

PostgreSQL 16 + `psql` გვჭირდება:

```bash
bash supabase/tests/run.sh      # აკეთებს ცალკე ngtest ბაზას, გაჰყავს მიგრაციები და ტესტები; ბოლოს: ALL TESTS PASSED
```
