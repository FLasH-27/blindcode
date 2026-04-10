"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, Radio, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminGuard from "@/components/AdminGuard";
import { logoutAdmin } from "@/lib/adminAuth";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Problems", href: "/admin/problems", icon: Code2 },
    { name: "Contest", href: "/admin/contest", icon: Radio },
  ];

  const router = useRouter();

  const handleLogout = () => {
    logoutAdmin();
    // Force a re-render/reload to show the password gate
    window.location.reload();
  };

  return (
    <AdminGuard>
      <div className="flex h-screen w-full bg-[#0a0a0a] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[240px] flex-shrink-0 border-r border-[#222222] bg-[#0a0a0a] flex flex-col h-full z-10">
          <div className="h-16 flex items-center px-6 border-b border-[#222222]">
            <Link href="/" className="flex items-center">
              <Code2 className="w-6 h-6 text-[#f97316] mr-2" />
              <span className="font-semibold text-lg tracking-tight text-white">BlindCode</span>
            </Link>
          </div>
          
          <div className="px-4 pt-6 pb-2">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#555] font-semibold">Admin Panel</span>
          </div>

          <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-md text-sm transition-colors relative group",
                    isActive 
                      ? "bg-[#111111] text-white font-medium" 
                      : "text-[#71717a] hover:bg-[#111111] hover:text-white"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#f97316] rounded-r-md" />
                  )}
                  <Icon className={cn("w-4 h-4 mr-3", isActive ? "text-[#f97316]" : "text-[#71717a] group-hover:text-white")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-[#222] flex flex-col gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center text-[12px] text-[#71717a] hover:text-white transition-colors text-left"
            >
              <LogOut className="w-3 h-3 mr-2" />
              Log out
            </button>
            <p className="text-[11px] text-[#444]">Blind Code v1.0</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-[#0a0a0a]">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
