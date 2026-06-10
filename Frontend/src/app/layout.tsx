import type { Metadata } from "next";
import { Inter, Doto } from "next/font/google";
import GoogleAuthProvider from "@/components/GoogleAuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const doto = Doto({
  subsets: ["latin"],
  variable: "--font-sync-ai",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Sync AI — Intelligent Assistant",
  description:
    "AI-powered chatbot with RAG, persistent memory, PDF ingestion, and web search capabilities.",
  icons: {
    icon: "/icons8-ai.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" className={`dark ${inter.variable} ${doto.variable}`}>
      <body className="antialiased">
        <ThemeProvider>
          <GoogleAuthProvider>{children}</GoogleAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
