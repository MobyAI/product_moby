"use client";

import { useRef, useEffect, useState } from "react";
import Lenis from "lenis";
import Navbar from "@/components/landingPage/Navbar";
import { Highlighter } from "@/components/ui/highlighter";
import RotatingText from "@/components/landingPage/RotatingText/RotatingText";
// import FeatureShowcase from "@/components/landingPage/FeatureCardsNew/FeatureCards";
import Link from "next/link";
import HorizontalStepGuide from "@/components/landingPage/StepGuide/HorizontalStepGuide";
// import SplashCursor from "@/components/landingPage/AnimatedCursor";
import { AnimatedBeamMultipleOutput } from "@/components/landingPage/AnimatedBeam/LogosWithAnimatedBeam";
import ScrollStack, {
  ScrollStackItem,
} from "@/components/landingPage/ScrollStack";
import FAQItem from "./FAQItem";
import {
  Headphones,
  Gauge,
  TrendingUp,
  Sparkles,
  ChevronsDown,
  Infinity,
} from "lucide-react";
import { useScrollReveal } from "@/components/landingPage/useScrollReveal";

export type Feature = {
  id: string;
  media?: { src?: string; alt?: string; node?: React.ReactNode };
  badge?: string;
  title: string;
  description: string;
  cta?: { label: string; onClick?: () => void; href?: string };
};

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

const LandingPage = () => {
  const heroRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [isIndicatorFixed, setIsIndicatorFixed] = useState(true);
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);

  // Scroll reveal hook settings
  const partnersReveal = useScrollReveal(0.1);
  const aboutReveal = useScrollReveal(0.1);
  const featuresReveal = useScrollReveal(0.1);
  const faqReveal = useScrollReveal(0.1);
  const ctaReveal = useScrollReveal(0.1);

  // Feature cards data
  const features: Feature[] = [
    {
      id: "practice",
      media: {
        node: <Headphones className="w-8 h-8 xl:w-10 xl:h-10 text-white" />,
      },
      title: "Practice anytime, anywhere",
      description:
        "Upload your script and step right into your scene. Rehearse on demand with a life-like AI reader that's always ready when you are. Great for last-minute audition prep, script memorization, or developing monologues and characters at your own speed. Practice whenever, wherever.",
    },
    {
      id: "speech",
      media: {
        node: <Sparkles className="w-8 h-8 xl:w-10 xl:h-10 text-white" />,
      },
      title: "Bring every line to life",
      description:
        "Become the director and tell your personal scene partner exactly what you want. Add emotional direction to any line — from whispered intensity to angry outbursts. Your AI reader will deliver your lines consistently every single take, no matter how many times you want to run the scene.",
    },
    {
      id: "control",
      media: { node: <Gauge className="w-8 h-8 xl:w-10 xl:h-10 text-white" /> },
      title: "Command every moment",
      description:
        "Shape every detail of your scene with professional-level control. Adjust pauses, pacing, and dialogue delivery down to the second for flawless, personalized rehearsals. Practice your timing and perfect your reactions, and build chemistry with your virtual scene partner for audition-ready performances.",
    },
    {
      id: "track",
      media: {
        node: <TrendingUp className="w-8 h-8 xl:w-10 xl:h-10 text-white" />,
      },
      title: "Stay organized, stay ahead",
      description:
        "Track every audition and callback in one centralized dashboard. Monitor your casting submissions and rehearsal progress all in one place so you're always prepared. Manage your entire audition pipeline from script breakdown to final performance, so you never miss an opportunity.",
    },
  ];

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    setLenisInstance(lenis);

    lenis.on("scroll", ({ scroll }: { scroll: number }) => {
      if (heroRef.current) {
        // Calculate the bottom of hero + rounded div (150px)
        const sectionHeight = heroRef.current.offsetHeight + 150;
        const heroTop = heroRef.current.offsetTop;
        const heroBottom = heroTop + sectionHeight;

        // Check if viewport bottom has reached the section bottom
        const viewportBottom = scroll + window.innerHeight;
        const shouldBeFixed = viewportBottom < heroBottom;

        setIsIndicatorFixed(shouldBeFixed);
      }
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-slate-900 antialiased bg-[#7E8E6D] overflow-x-clip">
      {/* Global navbar */}
      <header className="z-200">
        <Navbar lenisInstance={lenisInstance} />
      </header>

      {/* Cursor in background */}
      {/* <div className="fixed inset-0 z-0 pointer-events-none">
        <SplashCursor />
      </div> */}

      <main id="main" className="flex flex-col z-100">
        {/* HERO */}
        <section
          ref={heroRef}
          aria-labelledby="hero-heading"
          className="relative flex items-center justify-center text-center text-white bg-[#e1ddcf] h-screen"
        >
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 p-6 sm:p-10 lg:p-12">
            <hgroup className="flex flex-col items-center justify-center text-center py-5 mt-20 mb-30 md:mb-0">
              <h1
                id="hero-heading"
                className="font-crimson font-[400] md:font-[300] tracking-tight leading-tight text-black text-5xl sm:text-7xl md:text-[100px] max-w-[100%] sm:max-w-[700px] md:max-w-[900px]"
              >
                {/* Hidden for SEO and screen readers */}
                <span className="sr-only">
                  Stop asking your friend to read your lines
                </span>

                {/* Visual animated version - hidden from screen readers */}
                <span aria-hidden="true">
                  <span className="block mt-2">Stop asking your</span>
                  <span
                    aria-live="polite"
                    className="w-60 md:w-100 flex items-center justify-center text-center mx-auto rounded-xl px-2"
                    style={{ backgroundColor: "#7E8E6D" }}
                  >
                    <RotatingText
                      texts={["mom", "friend", "partner", "sibling", "roomie"]}
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
                </span>
              </h1>

              <h2 className="mt-6 text-black font-inter text-xs sm:text-sm md:text-lg lg:text-lg text-center leading-tight">
                <Highlighter action="underline" color="#FF9800">
                  Upload scripts
                </Highlighter>
                ,{" "}
                <Highlighter action="underline" color="#9369ff">
                  rehearse lines
                </Highlighter>
                , and{" "}
                <Highlighter action="underline" color="#ef86c1">
                  track auditions
                </Highlighter>{" "}
                all in one place.
              </h2>

              <p className="mt-1 text-black text-xs font-inter sm:text-sm md:text-lg lg:text-lg max-w-[55%] leading-relaxed text-center break-words whitespace-normal">
                Jumpstart your acting career now!
              </p>

              <div className="mt-15 md:mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Request early access - opens in new tab"
                  className="landing-cta-button"
                >
                  Request Early Access{" "}
                  <span className="text-[15px] sm:text-[20px] ml-2">🎉</span>
                </Link>
              </div>
            </hgroup>
          </div>

          {/* Scroll indicator */}
          <aside
            ref={indicatorRef}
            className={`
              ${isIndicatorFixed ? "fixed" : "absolute"}
              left-1/2 -translate-x-1/2
              sm:left-20 sm:translate-x-0
              flex flex-col items-center gap-2 text-black
            `}
            style={{
              bottom: isIndicatorFixed ? "40px" : "-110px",
            }}
          >
            <ChevronsDown className="h-12 w-12 sm:h-20 sm:w-20 animate-bounce" />
          </aside>
        </section>

        {/* Rounded bottom */}
        <div className="h-[150px] w-screen landing-rounded-section-bottom shadow-2xl" />

        <section
          ref={partnersReveal.ref}
          aria-label="Technology stack"
          id="technology"
          className={`
          min-h-screen flex flex-col justify-center items-center mb-10 sm:mb-20
          landing-scroll-reveal
          ${
            partnersReveal.isVisible
              ? "landing-scroll-reveal-visible"
              : "landing-scroll-reveal-hidden"
          }
        `}
        >
          {/* Hidden for SEO and screen readers */}
          <div className="sr-only">
            tableread is powered by industry-leading technology to power the AI
            scene reader for life-life voices, smart script parsing, as well as
            audition tracking.
          </div>

          <div className="w-full text-center mb-5 mt-30">
            <h2 className="landing-section-heading">
              Powered by
              <br />
              industry-leading
              <br />
              technology
            </h2>
          </div>
          <figure className="container mx-auto px-0 sm:px-4 lg:px-8">
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
            <AnimatedBeamMultipleOutput isVisible={partnersReveal.isVisible} />
            <figcaption className="sr-only">
              Technology partners powering tableread: ElevenLabs, OpenAI, and
              Anthropic
            </figcaption>
          </figure>
        </section>

        <section
          ref={aboutReveal.ref}
          id="features"
          aria-label="App features"
          className={`
          relative overflow-hidden
          landing-scroll-reveal
          ${
            aboutReveal.isVisible
              ? "landing-scroll-reveal-visible"
              : "landing-scroll-reveal-hidden"
          }
        `}
        >
          {/* Hidden for SEO and screen readers */}
          <div className="sr-only">
            tableread offers four key features: practice anytime with AI scene
            partners, bring lines to life with emotional direction, command
            every moment with timing controls, and stay organized with audition
            tracking.
          </div>

          {/* Section header - horizontal layout */}
          <div className="landing-section-container-flex">
            {/* Headline - left side */}
            <div className="flex-shrink-0">
              <h2 className="landing-section-heading">
                Elevate
                <br />
                performance
              </h2>
            </div>

            {/* Description - right side */}
            <p className="landing-section-description lg:self-end lg:mb-[-2rem]">
              From rehearsing lines with your own personal scene partner, to
              tracking each step of your acting career — own every performance
              from script to stage.
            </p>
          </div>

          <ScrollStack
            useWindowScroll={true}
            itemDistance={50}
            itemStackDistance={0}
            stackPosition="30%"
          >
            {features.map((feature) => (
              <ScrollStackItem key={feature.id} itemClassName="bg-white">
                <article className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10 lg:gap-14 h-full">
                  {/* Hidden description for SEO */}
                  <span className="sr-only">
                    Feature: {feature.title} - {feature.description}
                  </span>

                  {/* Icon/Media Section */}
                  <div className="flex-shrink-0">
                    <div className="landing-feature-icon">
                      {feature.media?.node}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 space-y-3 md:space-y-4">
                    {/* Title */}
                    <h3 className="landing-feature-title">{feature.title}</h3>

                    {/* Description */}
                    <p className="landing-feature-body">
                      {feature.description}
                    </p>
                  </div>
                </article>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </section>

        <section
          className="bg-black text-white py-20 md:py-28 w-screen relative left-[50%] right-[50%] -mx-[50vw] mb-10 sm:mb-25"
          aria-label="Platform statistics"
        >
          <div className="landing-section-container">
            {/* Overline for context */}
            <p className="text-center text-sm md:text-base text-gray-400 uppercase tracking-wider mb-4">
              Built for serious actors
            </p>

            <h2 className="text-3xl md:text-5xl font-crimson font-light text-center mb-12 md:mb-16">
              Why actors choose tableread
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 md:gap-16 text-center">
              <div className="space-y-3">
                <p className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2">
                  24/7
                </p>
                <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                  Always available scene partner ready whenever you want to
                  practice
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2">
                  100+
                </p>
                <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                  Voice customization options to match any character or scene
                  requirement
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-center mb-2">
                  <Infinity
                    className="w-12 h-12 md:w-15 md:h-15 lg:w-18 lg:h-18 text-white"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                  Unlimited rehearsal takes to perfect your performance without
                  judgment
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          ref={featuresReveal.ref}
          id="how-it-works"
          aria-label="How it works"
          className={`
          mb-10 sm:mb-20
          landing-scroll-reveal
          ${
            featuresReveal.isVisible
              ? "landing-scroll-reveal-visible"
              : "landing-scroll-reveal-hidden"
          }
        `}
        >
          {/* Hidden for SEO and screen readers */}
          <div className="sr-only">
            {`This describes how to use tableread's key features: uploading your
            script, fine-tuning delivery of each line, entering the practice
            room for rehearsal, and tracking progress of your auditions.`}
          </div>

          {/* Section header - horizontal layout */}
          <div className="landing-section-container-flex mb-[2rem] lg:mb-[5rem]">
            {/* Headline - left side */}
            <div className="flex-shrink-0">
              <h2 className="landing-section-heading">
                Explore
                <br />
                how it works
              </h2>
            </div>

            {/* Description - right side */}
            <p className="landing-section-description lg:self-end lg:mb-[-2rem]">
              {`Upload your scripts, practice your lines, and track all your auditions
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

        {/* FAQ SECTION */}
        <section
          ref={faqReveal.ref}
          id="faq"
          aria-label="Frequently asked questions"
          itemScope
          itemType="https://schema.org/FAQPage"
          className={`
            pb-50
            landing-scroll-reveal
            ${
              faqReveal.isVisible
                ? "landing-scroll-reveal-visible"
                : "landing-scroll-reveal-hidden"
            }
          `}
        >
          {/* Section header */}
          <div className="landing-section-container text-center mb-12 sm:mb-16">
            <h2 className="landing-section-heading">
              {`Questions?`}
              <br />
              {`We've got answers`}
            </h2>
          </div>

          {/* FAQ Items */}
          <div className="landing-section-container lg:w-[60%] space-y-4">
            <FAQItem
              question="What is tableread and how does it work?"
              answer="tableread is your personal AI scene partner for script rehearsal and audition prep. Upload your script, customize how each line is delivered with emotional direction and timing controls, then step into your scene to practice whenever you're ready. Plus, track all your auditions in one organized dashboard so you never miss a beat in your acting career."
            />
            <FAQItem
              question="Do I need any special equipment to use tableread?"
              answer="Not at all! All you need is a microphone and speakers or headphones. If you're on a laptop or desktop, your built-in mic and speakers work great to get started."
            />
            <FAQItem
              question="Is tableread suitable for beginners or just professional actors?"
              answer="tableread is perfect for actors at every stage! Whether you're just starting out and building confidence with your lines, or you're a working professional prepping for your next audition, tableread adapts to your needs and helps you grow."
            />
            <FAQItem
              question="Can I use tableread on my phone or tablet?"
              answer="While tableread works on mobile devices, we recommend using it on a computer or laptop for the best experience. The larger screen and full keyboard make script editing and rehearsal controls much easier to navigate."
            />
            <FAQItem
              question="What kind of scripts can I upload?"
              answer="You can upload any script in PDF or DOCX format, as long as it's 3MB or smaller. Whether it's a film scene, TV script, theater monologue, or audition sides, tableread is ready to help you rehearse."
            />
            <FAQItem
              question="Does tableread support multiple languages or accents?"
              answer="Multiple languages and accents aren't available just yet, but they're definitely on our roadmap. We're working to bring these features to you in the future!"
            />
          </div>
        </section>

        <div className="landing-rounded-section-top landing-section-shadow mt-[-100px] pt-[100px] pb-10">
          <section
            ref={ctaReveal.ref}
            id="cta"
            className={`
          flex flex-col justify-center items-center py-28 bg-[#e1ddcf]
          landing-scroll-reveal
          ${
            ctaReveal.isVisible
              ? "landing-scroll-reveal-visible"
              : "landing-scroll-reveal-hidden"
          }
        `}
          >
            {/* Hidden for SEO and screen readers */}
            <div className="sr-only">
              {`This is tableread's final call to action. Offering a free trial
              for users who wish to sign up.`}
            </div>

            {/* Section header - centered */}
            <div className="w-full text-center mb-10">
              <h2 className="landing-section-heading">
                Ready
                <br />
                to land your
                <br />
                dream role?
              </h2>
            </div>
            {/* Right side: button */}
            <div className="flex justify-center">
              <Link
                href={
                  "https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog"
                }
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Request early access - opens in new tab"
                className="landing-cta-button"
              >
                Request Early Access{" "}
                <span className="text-[15px] sm:text-[20px] ml-2">🎉</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full bg-black">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 py-12">
          {/* Main footer content */}
          <div className="flex flex-col sm:flex-row justify-between gap-8 mb-8">
            {/* Company Info */}
            <div className="max-w-xs">
              <h3 className="landing-footer-heading">tableread</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI-powered scene reader and audition tracker for actors.
                Practice scripts, track auditions, and perfect your performance.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="landing-footer-heading">Product</h3>
              <nav aria-label="Product navigation">
                <ul className="space-y-3">
                  <li>
                    <Link href="/#features" className="landing-footer-link">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="/#how-it-works" className="landing-footer-link">
                      How It Works
                    </Link>
                  </li>
                  <li>
                    <Link href="/#faq" className="landing-footer-link">
                      FAQ
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Resources */}
            <div>
              <h3 className="landing-footer-heading">Resources</h3>
              <nav aria-label="Resources navigation">
                <ul className="space-y-3">
                  <li>
                    <Link href="/blog" className="landing-footer-link">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="landing-footer-link"
                    >
                      Request Early Access
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Company */}
            <div>
              <h3 className="landing-footer-heading">Company</h3>
              <nav aria-label="Company navigation">
                <ul className="space-y-3">
                  <li>
                    <Link href="/about" className="landing-footer-link">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <a
                      href="mailto:[email protected]"
                      className="landing-footer-link"
                    >
                      Contact
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Copyright */}
              <p className="text-slate-400 text-xs sm:text-sm">
                © {new Date().getFullYear()} tableread. All rights reserved.
              </p>

              {/* Legal links (add when ready) */}
              <nav aria-label="Legal navigation">
                <ul className="flex gap-6">
                  <li>
                    <Link href="/privacy" className="landing-footer-link">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="landing-footer-link">
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
