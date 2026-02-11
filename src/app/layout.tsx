import type { Metadata } from "next";
import { AppContent } from "./AppContent";
import "@/index.css";

export const metadata: Metadata = {
  title: "Project Beacon - Modern Recruiting CRM Dashboard",
  description: "Relationship-first recruiting CRM for talent teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppContent>{children}</AppContent>
      </body>
    </html>
  );
}
