"use client";

import { useRef, useEffect } from "react";
// import { useScroll, useTransform } from "framer-motion";
import Lenis from "lenis";
import Navbar from "@/components/landingPage/Navbar";
import { Highlighter } from "@/components/ui/highlighter";
import RotatingText from "@/components/landingPage/RotatingText/RotatingText";
import FeatureShowcase from "@/components/landingPage/FeatureCardsNew/FeatureCards";
import Link from "next/link";
import HorizontalStepGuide from "@/components/landingPage/StepGuide/HorizontalStepGuide";
import SplashCursor from "@/components/landingPage/AnimatedCursor";
import { AnimatedBeamMultipleOutput } from "@/components/landingPage/AnimatedBeam/LogosWithAnimatedBeam";
import { ChevronsDown } from "lucide-react";

// const imageLogos = [
//   {
//     src: "/assets/elevenlabs-logo-black.png",
//     alt: "ElevenLabs",
//     href: "https://elevenlabs.io/",
//   },
//   {
//     src: "/assets/OpenAI-black-wordmark.png",
//     alt: "OpenAI",
//     href: "https://openai.com/",
//     scale: 3,
//   },
//   {
//     src: "assets/Anthropic-Logo-Black.png",
//     alt: "Anthropic",
//     href: "https://www.anthropic.com/",
//   },
// ];

// const menuItems = [
//   {
//     text: "Life-like AI Voices",
//     logo: "/assets/elevenlabs-logo.svg",
//     symbol: "/assets/elevenlabs-symbol.svg",
//     link: "https://elevenlabs.io/",
//     width: "max-w-[240px]",
//     height: "h-[8vh]",
//   },
//   {
//     text: "Smart Script Parsing",
//     logo: "/assets/openai-logo.svg",
//     symbol: "/assets/openai-symbol.svg",
//     link: "https://openai.com/",
//     width: "max-w-[150px]",
//     height: "h-[10vh]",
//   },
//   {
//     text: "Smart Script Parsing",
//     logo: "assets/anthropic-logo.svg",
//     symbol: "/assets/anthropic-symbol.svg",
//     link: "https://www.anthropic.com/",
//     width: "max-w-[240px]",
//     height: "h-[8vh]",
//   },
// ];

// const INDICATOR_MAX_SHIFT = 200;

const LandingPage = () => {
  const heroRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // const { scrollYProgress } = useScroll({
  //   target: heroRef,
  //   offset: ["start start", "end start"],
  // });

  // const indicatorY = useTransform(
  //   scrollYProgress,
  //   [0, 0.5],
  //   [0, -INDICATOR_MAX_SHIFT]
  // );

  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1, // How long the smoothing takes
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing function
      orientation: "vertical", // Vertical scrolling
      gestureOrientation: "vertical", // Gesture direction
      smoothWheel: true, // Enable smooth scrolling for mouse wheel
      wheelMultiplier: 1, // Reduce scroll speed (lower = slower)
      touchMultiplier: 1.5, // Touch scroll speed
      infinite: false, // Disable infinite scroll
    });

    lenisRef.current = lenis;

    // Sync Lenis with Framer Motion's scroll tracking
    lenis.on("scroll", () => {
      // This ensures Framer Motion animations update with Lenis scroll
    });

    // Animation frame loop
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup
    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-slate-900 antialiased bg-[#7E8E6D] overflow-x-clip">
      {/* Global navbar */}
      <header className="z-200">
        <Navbar lenisInstance={lenisRef.current} />
      </header>

      {/* Cursor in background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SplashCursor />
      </div>

      <main id="main" className="flex flex-col z-100">
        {/* HERO */}
        <section
          ref={heroRef}
          aria-labelledby="hero-heading"
          className="relative flex items-center justify-center text-center text-white bg-[#e1ddcf] h-screen"
        >
          <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="p-6 sm:p-10 lg:p-12">
              <div className="flex flex-col items-center justify-center gap-10 lg:gap-12">
                {/* Text content */}
                <div className="flex flex-col items-center justify-center max-w-2xl">
                  <div className="flex flex-col items-center justify-center py-5 mt-20 text-center">
                    <h1
                      id="hero-heading"
                      className="font-crimson font-[400] md:font-[200] tracking-tight leading-tight text-black text-5xl sm:text-7xl md:text-[100px] max-w-[100%] sm:max-w-[700px] md:max-w-[900px]"
                    >
                      <span className="block mt-2">Stop asking your</span>
                      <span
                        aria-live="polite"
                        className="w-60 md:w-100 flex items-center justify-center text-center mx-auto rounded-xl px-2"
                        style={{ backgroundColor: "#7E8E6D" }}
                      >
                        <RotatingText
                          texts={[
                            "mom",
                            "friend",
                            "partner",
                            "sibling",
                            "roomie",
                          ]}
                          mainClassName="text-black overflow-hidden rounded-lg px-2"
                          staggerFrom="last"
                          initial={{ y: "100%" }}
                          animate={{ y: 0 }}
                          exit={{ y: "-120%" }}
                          staggerDuration={0.025}
                          splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                          transition={{
                            type: "spring",
                            damping: 30,
                            stiffness: 400,
                          }}
                          rotationInterval={2000}
                        />
                      </span>
                      <span className="block mt-[-10px] md:mt-[-15px]">
                        to read your lines
                      </span>
                    </h1>
                  </div>

                  <p
                    className="
                      mt-4 
                      text-black/90 
                      text-sm 
                      sm:text-base 
                      md:text-lg 
                      lg:text-xl 
                      max-w-[60%]
                      md:max-w-[90%] 
                      sm:max-w-xl 
                      mx-auto 
                      leading-relaxed 
                      text-center 
                      break-words 
                      whitespace-normal 
                      px-4
                    "
                  >
                    Upload any script and rehearse line by line with{" "}
                    <Highlighter action="underline" color="#FF9800">
                      emotional nuance
                    </Highlighter>
                    ,{" "}
                    <Highlighter action="underline" color="#9369ff">
                      timing control
                    </Highlighter>
                    , and{" "}
                    <Highlighter action="underline" color="#ef86c1">
                      progress tracking
                    </Highlighter>{" "}
                    — anytime, anywhere.
                  </p>

                  <div className="mt-16 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href={
                        "https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog"
                      }
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 bg-black text-white border border-black hover:scale-103 text-[17px] transition-transform duration-200 ease-in-out"
                    >
                      Request Free Trial{" "}
                      <span className="text-[20px] ml-2">🎉</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div
            className="
              absolute bottom-10
              left-1/2 -translate-x-1/2
              sm:left-20 sm:translate-x-0
              flex flex-col items-center gap-2 text-black
            "
          >
            <ChevronsDown className="h-14 w-14 md:h-18 md:w-18 animate-bounce" />
          </div>
        </section>

        {/* <div className="h-[250px]" /> */}

        <section
          aria-label="Powered by"
          id="partners"
          className="min-h-screen flex flex-col justify-center items-center"
        >
          <div className="w-full text-center mb-5 mt-20">
            <h2 className="text-6xl sm:text-7xl lg:text-[125px] font-crimson font-[300] tracking-tight text-black">
              Powered by
              <br />
              industry-leading
              <br />
              companies
            </h2>
          </div>
          <div className="container mx-auto px-0 sm:px-4 lg:px-8">
            {/* <LogoLoop
              logos={imageLogos}
              speed={75}
              direction="left"
              logoHeight={30}
              gap={100}
              pauseOnHover
              scaleOnHover={false}
              // fadeOut
              fadeOutColor="#eeede4"
              ariaLabel="Technology partners"
            /> */}
            <AnimatedBeamMultipleOutput />
          </div>
        </section>

        <section id="about" className="relative overflow-hidden">
          <FeatureShowcase />
        </section>

        <section id="features" className="py-16 sm:py-20 lg:py-30">
          {/* Section header - horizontal layout */}
          <div className="w-[80%] md:w-[75%] mx-auto mb-[5rem] flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8 lg:gap-16">
            {/* Headline - left side */}
            <div className="flex-shrink-0">
              <h2 className="text-6xl sm:text-7xl lg:text-[125px] font-crimson font-[300] tracking-tight text-black">
                Explore
                <br />
                our features
              </h2>
            </div>

            {/* Description - right side */}
            <p className="text-black text-base font-semibold sm:text-lg lg:text-xl max-w-xl lg:self-end lg:mb-[-2rem]">
              {`Upload your scripts, practice your lines, and track every audition
              in one place — designed to help you train smarter, perform
              better, and take control of your acting career.`}
            </p>
          </div>
          <HorizontalStepGuide
            steps={[
              {
                title: "Upload your script",
                body: "Enter scene info, character notes, or anything else to help shape your performance setup.",
                media: "/assets/fill.mp4",
              },
              {
                title: "Fine-tune the delivery",
                body: "Refine each line with emotive tags and timing tweaks so the reader performs exactly how   you imagine.",
                media: "/assets/Finetune.mp4",
              },
              {
                title: "Rehearse and refine",
                body: "Step into your scene and start practicing. Adjust as you go until every line feels perfect.",
                media: "/assets/Practice.mp4",
              },
              {
                title: "Track your auditions",
                body: "Organize and track the progress of all your auditions in one place.",
                media: "/assets/Tracker.mp4",
              },
            ]}
          />
        </section>
        <section
          id="cta"
          className="flex flex-col justify-center items-center py-28"
        >
          {/* Section header - centered */}
          <div className="w-full text-center mb-10">
            <h2 className="text-6xl sm:text-7xl lg:text-[125px] font-crimson font-[300] tracking-tight text-black">
              Ready
              <br />
              to land your
              <br />
              dream role?
            </h2>
          </div>
          {/* Right side: button */}
          <div className="flex justify-center">
            <button className="inline-flex items-center gap-2 rounded-full px-7 py-4 bg-black text-white border border-black hover:scale-105 text-[17px] transition-transform duration-200 ease-in-out">
              <Link
                href="https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog"
                target="_blank"
              >
                Get Started
              </Link>
            </button>
          </div>
        </section>
      </main>
      <footer className="w-full bg-black mt-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 py-8 flex flex-row items-center text-slate-600 text-sm">
          {/* Left: Branding */}
          <div className="flex flex-row w-60 mx-auto justify-between items-center">
            <p className="font-semibold text-white text-body-small">
              tableread © {new Date().getFullYear()}
            </p>
            <p className="text-white text-body-small">All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
