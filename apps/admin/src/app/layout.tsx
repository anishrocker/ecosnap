import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoSnap Admin",
  description: "Content tools for EcoSnap recycling guidance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0, background: "#f6f6f6" }}>{children}</body>
    </html>
  );
}
