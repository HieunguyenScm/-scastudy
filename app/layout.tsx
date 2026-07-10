import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const imageUrl = host ? `${protocol}://${host}/og.png` : undefined;
  return {
    title: "ctnascm — Supply Chain AI Learning OS",
    description: "Nền tảng học Supply Chain riêng tư trong 24 tuần: Demand Planning, Analytics, Planning, Optimization và Supply Chain AI.",
    applicationName: "ctnascm",
    robots: { index: false, follow: false },
    openGraph: {
      title: "ctnascm — Supply Chain AI Learning OS",
      description: "Từ intern đến Supply Chain AI trong 24 tuần.",
      type: "website",
      locale: "vi_VN",
      images: imageUrl ? [{ url: imageUrl, width: 1680, height: 945, alt: "ctnascm Supply Chain AI Learning OS" }] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
