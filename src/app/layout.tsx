import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "habit tracker",
  description: "Simple printable paper habit tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#fdfbf7] text-[#1c1c1c] antialiased">
        {children}
      </body>
    </html>
  );
}
