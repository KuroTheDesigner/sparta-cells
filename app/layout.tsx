import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
export const metadata: Metadata = {
  title: "Sparta Cells — Find your next phone",
  description:
    "Research real phones, compare every specification, and choose on your terms.",
  metadataBase: new URL("https://sparca-cells.vercel.app"),
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
