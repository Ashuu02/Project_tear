import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FooterStrip from "@/components/landing/FooterStrip";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text">
      <Navbar />
      <HeroSection />
      <FooterStrip />
    </div>
  );
}
