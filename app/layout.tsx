import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { logoutAction } from "./actions";
import { passwordEnabled } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kargo Hiring",
  description: "Ranked PM / SPM shortlist scored against Kargo's hiring rubric",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-sm">
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">Kargo Hiring</Link>
            <Link href="/" className="text-stone-600 hover:text-stone-900">Dashboard</Link>
            <Link href="/upload" className="text-stone-600 hover:text-stone-900">Upload CVs</Link>
            <Link href="/rubric" className="text-stone-600 hover:text-stone-900">Rubric</Link>
            {passwordEnabled() && (
              <form action={logoutAction} className="ml-auto">
                <button className="text-stone-500 hover:text-stone-900">Log out</button>
              </form>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
