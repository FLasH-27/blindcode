import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Animated grid background */}
      <div
        className="absolute inset-0 animate-grid-bg pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(249,115,22,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#f97316] opacity-[0.07] blur-[120px] animate-glow pointer-events-none" />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#f97316] opacity-[0.05] blur-[100px] animate-glow pointer-events-none"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[#ea580c] opacity-[0.04] blur-[80px] animate-glow pointer-events-none"
        style={{ animationDelay: "1s" }}
      />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto animate-fade-in-up">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            BlindCode
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="px-4 py-2 text-sm text-[#71717a] hover:text-white transition-colors rounded-lg hover:bg-[#111]"
          >
            Admin
          </Link>
          <Link
            href="/join"
            className="px-5 py-2 text-sm font-medium text-black bg-[#f97316] hover:bg-[#ea580c] transition-colors rounded-lg"
          >
            Join Contest
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="animate-fade-in-up mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-xs font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse-dot" />
            REAL-TIME BLIND CODING PLATFORM
          </span>
        </div>

        {/* Title */}
        <h1 className="animate-fade-in-up-delay-1 text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-[0.9]">
          <span className="text-white">Code.</span>
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fdba74 100%)",
            }}
          >
            Compete.
          </span>
          <br />
          <span className="text-white">Conquer.</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up-delay-2 mt-8 text-lg sm:text-xl text-[#71717a] max-w-xl leading-relaxed">
          A minimalist blind coding contest platform. No distractions, no
          Google — just you, a problem, and your skills.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-in-up-delay-3 flex flex-col sm:flex-row items-center gap-4 mt-12">
          <Link
            href="/join"
            className="group relative px-8 py-3.5 text-base font-semibold text-black bg-[#f97316] rounded-xl hover:bg-[#ea580c] transition-all duration-200 shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_50px_rgba(249,115,22,0.5)]"
          >
            Join a Contest
            <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
          <Link
            href="/admin"
            className="px-8 py-3.5 text-base font-medium text-white border border-[#333] rounded-xl hover:bg-[#111] hover:border-[#555] transition-all duration-200"
          >
            Admin Panel
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8">
          {/* Card 1 */}
          <div
            className="animate-fade-in-up group p-6 rounded-xl bg-[#111]/80 border border-[#222] hover:border-[#333] transition-all duration-300 backdrop-blur-sm"
            style={{ animationDelay: "0.6s" }}
          >
            <div className="w-10 h-10 rounded-lg bg-[#f97316]/10 flex items-center justify-center mb-4 group-hover:bg-[#f97316]/20 transition-colors">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Real-Time Sync</h3>
            <p className="text-[#71717a] text-sm leading-relaxed">
              Code auto-saves in real time. Admins see every keystroke as it
              happens.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="animate-fade-in-up group p-6 rounded-xl bg-[#111]/80 border border-[#222] hover:border-[#333] transition-all duration-300 backdrop-blur-sm"
            style={{ animationDelay: "0.8s" }}
          >
            <div className="w-10 h-10 rounded-lg bg-[#f97316]/10 flex items-center justify-center mb-4 group-hover:bg-[#f97316]/20 transition-colors">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Blind Mode</h3>
            <p className="text-[#71717a] text-sm leading-relaxed">
              No search, no copy-paste from outside. Pure problem-solving
              ability tested.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="animate-fade-in-up group p-6 rounded-xl bg-[#111]/80 border border-[#222] hover:border-[#333] transition-all duration-300 backdrop-blur-sm"
            style={{ animationDelay: "1.0s" }}
          >
            <div className="w-10 h-10 rounded-lg bg-[#f97316]/10 flex items-center justify-center mb-4 group-hover:bg-[#f97316]/20 transition-colors">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Admin Controls</h3>
            <p className="text-[#71717a] text-sm leading-relaxed">
              Start, monitor, and end contests with full real-time participant
              visibility.
            </p>
          </div>
        </div>
      </div>

      {/* Floating code snippets */}
      <div className="absolute top-[15%] right-[8%] animate-float pointer-events-none opacity-[0.06]" style={{ animationDelay: "1s" }}>
        <pre className="text-[#f97316] text-xs font-mono">
{`function solve(n) {
  if (n <= 1) return n;
  return solve(n-1) + solve(n-2);
}`}
        </pre>
      </div>
      <div className="absolute bottom-[20%] left-[5%] animate-float pointer-events-none opacity-[0.05]" style={{ animationDelay: "3s" }}>
        <pre className="text-[#f97316] text-xs font-mono">
{`for i in range(n):
    if arr[i] == target:
        return i`}
        </pre>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
    </div>
  );
}
