import "./globals.css";
import { Inter } from "next/font/google";
import ContestConfigProvider from "@/components/ContestConfigProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Blind Code Platform",
  description: "Minimalist Coding Interview Platform — Real-time blind coding contests",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#0a0a0a] text-white antialiased`}>
        <ContestConfigProvider>
          {children}
        </ContestConfigProvider>
      </body>
    </html>
  );
}
