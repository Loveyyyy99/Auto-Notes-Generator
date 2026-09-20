import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "AutoNotes.ai — Hybrid Lecture Summarization",
  description:
    "Turn YouTube lectures into extractive, abstractive, and hybrid study notes using Whisper, a classical ML sentence classifier, and BART/mBART.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Sora:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-body-md text-body-md text-on-surface">
        <Header />
        <main className="w-full pt-16 bg-surface min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
