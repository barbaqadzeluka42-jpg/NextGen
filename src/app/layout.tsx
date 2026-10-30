import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-georgian";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "NEXTGEN — საგანმანათლებლო პლატფორმა მოსწავლეებისთვის", template: "%s · NEXTGEN" },
  description: "სასკოლო ღონისძიებები, კონკურსები, ტურნირები და მოსწავლეთა პროექტები ერთ სივრცეში.",
  openGraph: { title: "NEXTGEN", description: "კონკურსები, ტურნირები და მოსწავლეთა პროექტები.", type: "website", locale: "ka_GE" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6fc" },
    { media: "(prefers-color-scheme: dark)", color: "#14131f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground">
          მთავარ შინაარსზე გადასვლა
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
