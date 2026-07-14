import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Gulf Evaluation Dashboard",
  description: "Front-end demonstration dashboard for the Gulf Investment Awareness Program judging workflow"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
