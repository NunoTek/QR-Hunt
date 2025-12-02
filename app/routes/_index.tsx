import type { MetaFunction } from "@remix-run/node";
import {
  HeroSection,
  PlayerExperienceSection,
  HowItWorksSection,
  PerfectForSection,
  FeaturesSection,
  ScreenshotsSection,
  CTASection,
  Footer,
} from "~/components/home";

export const meta: MetaFunction = () => {
  return [
    { title: "QR Hunt - QR Code Scavenger Hunt Platform" },
    { name: "description", content: "Create exciting QR code scavenger hunts for team building, events, and parties. Real-time leaderboards, instant scoring, and easy setup." },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-primary">
      <HeroSection />
      <PlayerExperienceSection />
      <HowItWorksSection />
      <PerfectForSection />
      <FeaturesSection />
      <ScreenshotsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
