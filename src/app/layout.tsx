import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { AppProviders } from "@/components/providers/AppProviders";
import { GradientDefs } from "@/components/ui/GradientDefs";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Fliq — Watch. Create. Share.",
  description:
    "Fliq is the next-gen short video platform made for creators and built for community. Watch, create, and share.",
  applicationName: "Fliq",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#050509",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <GradientDefs />
        <AppProviders
          initialUser={
            user
              ? { ...user, createdAt: user.createdAt.toISOString(), usernameChangedAt: user.usernameChangedAt?.toISOString() ?? null }
              : null
          }
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
