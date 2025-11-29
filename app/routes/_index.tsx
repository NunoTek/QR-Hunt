import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "QR Hunt - QR Code Scavenger Hunt Platform" },
    { name: "description", content: "Create exciting QR code scavenger hunts for team building, events, and parties. Real-time leaderboards, instant scoring, and easy setup." },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-primary">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.png')" }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/70 via-[var(--color-primary-dark)]/70 to-indigo-800/70" />

        {/* Content */}
        <div className="relative text-center max-w-4xl mx-auto text-white px-4">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-fade-in">
            <span className="text-4xl sm:text-5xl lg:text-6xl" aria-label="Target">🎯</span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold">QR Hunt</h1>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-tight mb-4 sm:mb-6 animate-slide-up">
            Turn Any Space Into an
            <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent"> Adventure</span>
          </h2>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl opacity-90 leading-relaxed mb-6 sm:mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Create exciting QR code scavenger hunts for team building, events, parties, and education.
            Watch teams compete in real-time with instant scoring and live leaderboards.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-pop-in" style={{ animationDelay: "0.2s" }}>
            <Link
              to="/join"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-[var(--color-primary)] font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl text-base sm:text-lg min-h-[3rem] sm:min-h-[3.5rem]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Join a Game</span>
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white/20 text-warning font-semibold rounded-xl border-2 border-white/50 hover:bg-gray-100 hover:border-white/70 transition-all text-base sm:text-lg min-h-[3rem] sm:min-h-[3.5rem] backdrop-blur-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Create a Hunt</span>
            </Link>
          </div>
        </div>
      </section>

      {/* The Player Experience Section */}
      <section className="py-12 sm:py-16 lg:py-20 xl:py-24 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary mb-3 sm:mb-4">
              The Player Experience
            </h2>
            <p className="text-secondary text-base sm:text-lg max-w-2xl mx-auto">
              Teams race to find hidden QR codes scattered around a location. Each scan reveals a clue leading to the next location. First team to find all codes wins!
            </p>
          </div>

          {/* Flow Steps */}
          <div className="relative">
            {/* Connection Line (hidden on mobile) */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-primary)]/20 via-[var(--color-primary)] to-[var(--color-primary)]/20 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
              {/* Step 1: Join */}
              <div className="bg-elevated p-5 sm:p-6 rounded-2xl border-2 border-[var(--color-primary)]/30 hover:border-[var(--color-primary)] transition-all text-center group">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mx-auto mb-4 text-white text-2xl sm:text-3xl group-hover:scale-110 transition-transform">
                  🎮
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary mb-2">1. Join the Game</h3>
                <p className="text-secondary text-sm">
                  Open the link, enter your 6-digit team code, and you're ready to play!
                </p>
              </div>

              {/* Arrow (mobile only - hidden when grid becomes 2 columns) */}
              <div className="flex justify-center sm:hidden text-[var(--color-primary)] -my-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </div>

              {/* Step 2: Read Clue */}
              <div className="bg-elevated p-5 sm:p-6 rounded-2xl border-2 border-[var(--color-primary)]/30 hover:border-[var(--color-primary)] transition-all text-center group">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mx-auto mb-4 text-white text-2xl sm:text-3xl group-hover:scale-110 transition-transform">
                  📜
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary mb-2">2. Read the Clue</h3>
                <p className="text-secondary text-sm">
                  "Find the old oak tree near the fountain in the main square..."
                </p>
              </div>

              {/* Arrow (mobile only - hidden when grid becomes 2 columns) */}
              <div className="flex justify-center sm:hidden text-[var(--color-primary)] -my-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </div>

              {/* Step 3: Hunt */}
              <div className="bg-elevated p-5 sm:p-6 rounded-2xl border-2 border-[var(--color-primary)]/30 hover:border-[var(--color-primary)] transition-all text-center group">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mx-auto mb-4 text-white text-2xl sm:text-3xl group-hover:scale-110 transition-transform">
                  🔍
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary mb-2">3. Hunt & Discover</h3>
                <p className="text-secondary text-sm">
                  Work together, explore the area, and find the hidden QR code!
                </p>
              </div>

              {/* Arrow (mobile only - hidden when grid becomes 2 columns) */}
              <div className="flex justify-center sm:hidden text-[var(--color-primary)] -my-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </div>

              {/* Step 4: Scan & Score */}
              <div className="bg-elevated p-5 sm:p-6 rounded-2xl border-2 border-[var(--color-primary)]/30 hover:border-[var(--color-primary)] transition-all text-center group">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[var(--color-success)] to-emerald-700 flex items-center justify-center mx-auto mb-4 text-white text-2xl sm:text-3xl group-hover:scale-110 transition-transform">
                  ✨
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary mb-2">4. Scan & Score!</h3>
                <p className="text-secondary text-sm">
                  Scan the QR code, earn points, and reveal the next clue!
                </p>
              </div>
            </div>
          </div>

          {/* Repeat indicator */}
          <div className="flex items-center justify-center gap-3 mt-6 sm:mt-8 text-[var(--color-primary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            <span className="font-semibold text-sm sm:text-base">Repeat until victory!</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 lg:py-20 xl:py-24 px-4 sm:px-6 lg:px-8 bg-secondary">
        <div className="mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-center text-primary mb-8 sm:mb-12 lg:mb-16">
            How It Works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {/* Feature 1 */}
            <div className="bg-elevated/50 p-5 sm:p-6 lg:p-8 rounded-2xl border transition-all hover:border-[var(--color-primary)]/50 hover:-translate-y-1 duration-normal">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mb-4 sm:mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="sm:w-7 sm:h-7">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <rect x="7" y="7" width="3" height="3" />
                  <rect x="14" y="7" width="3" height="3" />
                  <rect x="7" y="14" width="3" height="3" />
                  <rect x="14" y="14" width="3" height="3" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-primary mb-2">1. Create QR Codes</h3>
              <p className="text-secondary text-sm sm:text-base">Design your hunt with clues, riddles, and challenges. Generate unique QR codes for each checkpoint.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-elevated/50 p-5 sm:p-6 lg:p-8 rounded-2xl border transition-all hover:border-[var(--color-primary)]/50 hover:-translate-y-1 duration-normal">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mb-4 sm:mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="sm:w-7 sm:h-7">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-primary mb-2">2. Invite Teams</h3>
              <p className="text-secondary text-sm sm:text-base">Create teams and share unique codes. Players join instantly on their phones - no app download needed.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-elevated/50 p-5 sm:p-6 lg:p-8 rounded-2xl border transition-all hover:border-[var(--color-primary)]/50 hover:-translate-y-1 duration-normal">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mb-4 sm:mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="sm:w-7 sm:h-7">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-primary mb-2">3. Hunt & Scan</h3>
              <p className="text-secondary text-sm sm:text-base">Teams follow clues to find QR codes. Each scan reveals the next clue, guiding them to the next location.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-elevated/50 p-5 sm:p-6 lg:p-8 rounded-2xl border transition-all hover:border-[var(--color-primary)]/50 hover:-translate-y-1 duration-normal">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mb-4 sm:mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="sm:w-7 sm:h-7">
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-primary mb-2">4. Live Leaderboard</h3>
              <p className="text-secondary text-sm sm:text-base">Watch the competition unfold in real-time. Instant updates as teams find clues and earn points.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Perfect For Section */}
      <section className="py-12 sm:py-16 lg:py-20 xl:py-24 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-center text-primary mb-8 sm:mb-12 lg:mb-16">
            Perfect For
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            {[
              { icon: "🏢", title: "Team Building", desc: "Engage employees with interactive challenges" },
              { icon: "🎉", title: "Parties & Events", desc: "Make any celebration more memorable" },
              { icon: "🎓", title: "Education", desc: "Gamify learning with interactive quests" },
              { icon: "🏕️", title: "Camps & Retreats", desc: "Explore outdoor spaces with guided hunts" },
              { icon: "🏛️", title: "Museums & Tours", desc: "Create engaging self-guided experiences" },
              { icon: "💒", title: "Weddings", desc: "Fun activities for guests to enjoy" },
            ].map((item, i) => (
              <div key={i} className="bg-secondary p-4 sm:p-5 lg:p-6 rounded-xl border hover:border-[var(--color-primary)]/50 transition-colors text-center">
                <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3" role="img" aria-label={item.title}>{item.icon}</span>
                <h4 className="font-bold text-primary text-xs sm:text-sm lg:text-base mb-1">{item.title}</h4>
                <p className="text-tertiary text-xs lg:text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features List Section */}
      <section className="py-12 sm:py-16 lg:py-20 xl:py-24 px-4 sm:px-6 lg:px-8 bg-secondary">
        <div className="mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            {/* Features List */}
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary mb-6 sm:mb-8 text-center lg:text-left">
                Everything You Need
              </h2>
              <ul className="space-y-3 sm:space-y-4">
                {[
                  "Clue-based navigation guides teams to each QR code",
                  "Real-time leaderboards with live updates",
                  "Built-in chat between teams and organizers",
                  "QR code generator with custom logos",
                  "Media clues (images, videos, audio)",
                  "Works on any device - no app needed",
                  "Self-hosted - your data stays private",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-secondary">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-success)] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm sm:text-base lg:text-lg">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-64 sm:w-72 lg:w-80 bg-tertiary rounded-[2.5rem] p-3 shadow-2xl border border-border">
                <div className="bg-primary rounded-[2rem] p-4 sm:p-5 min-h-[400px]">
                  {/* Mockup Header */}
                  <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)]" />
                    <span className="font-semibold text-primary text-xs sm:text-sm">Team Alpha</span>
                    <span className="ml-auto bg-[var(--color-primary)] text-white text-xs font-bold px-2.5 py-1 rounded-full">245 pts</span>
                  </div>

                  {/* Mockup Clue */}
                  <div className="bg-secondary rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border-l-4 border-[var(--color-primary)]">
                    <p className="text-xs text-[var(--color-primary)] font-semibold mb-1">Next Clue</p>
                    <p className="font-bold text-primary text-sm mb-1">The Hidden Garden</p>
                    <p className="text-tertiary text-xs">Find where roses bloom in shade...</p>
                  </div>

                  {/* Mockup Chat */}
                  <div className="mb-3 sm:mb-4">
                    <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white text-xs px-3 py-2 rounded-lg inline-block">
                      Admin: Need a hint?
                    </div>
                  </div>

                  {/* Mockup Button */}
                  <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white text-center py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm">
                    Scan QR Code
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 xl:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center">
        <div className="max-w-3xl w-full text-center text-white">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 sm:mb-4">
            Ready to Start Your Hunt?
          </h2>
          <p className="text-base sm:text-lg lg:text-xl opacity-90 mb-6 sm:mb-8">
            Create your first scavenger hunt in minutes. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              to="/join"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-[var(--color-primary)] font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg text-base sm:text-lg min-h-[3rem] sm:min-h-[3.5rem]"
            >
              Join a Game
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white/20 text-warning font-semibold rounded-xl border-2 border-white/50 hover:bg-gray-100 hover:border-white/70 transition-all text-base sm:text-lg min-h-[3rem] sm:min-h-[3.5rem] backdrop-blur-sm"
            >
              Create a Hunt
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 bg-secondary border-t border-gray-800">
        <div className="mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-lg sm:text-xl font-bold text-secondary mb-2">
            <span>🎯</span>
            <span>QR Hunt</span>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm">Self-hostable • Open source • Privacy-focused</p>
        </div>
      </footer>
    </div>
  );
}
