import type { Metadata } from "next";
import { Noto_Sans_KR, Lora, Fira_Code } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blog.365happy365.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "365happy365 - 세상의 모든 궁금한 것들",
    template: "%s | 365happy365",
  },
  description: "세상의 모든 궁금한 것들을 탐구하는 블로그. 과학, 기술, 문화, 일상의 호기심을 함께 풀어갑니다.",
  keywords: ["블로그", "과학", "기술", "문화", "일상", "호기심"],
  authors: [{ name: "365happy365" }],
  creator: "365happy365",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteUrl,
    siteName: "365happy365",
    title: "365happy365 - 세상의 모든 궁금한 것들",
    description: "세상의 모든 궁금한 것들을 탐구하는 블로그",
  },
  twitter: {
    card: "summary_large_image",
    title: "365happy365 - 세상의 모든 궁금한 것들",
    description: "세상의 모든 궁금한 것들을 탐구하는 블로그",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${lora.variable} ${firaCode.variable}`}>
      <body className="antialiased bg-[#F8F5EE] text-[#333333] font-sans min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
