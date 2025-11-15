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
import FAQItem from "@/components/landingPage/FAQItem";
import ScriptUploadDemo from "./Graphics/ScriptUploadDemo";
import VoiceSelectDemo from "./Graphics/VoiceSelectDemo";
import AudioTagDemo from "./Graphics/AudioTagDemo";
import AuditionTrackerDemo from "./Graphics/AuditionTrackerDemo";
import { ChevronsDown, Infinity } from "lucide-react";
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
  const founderMessageReveal = useScrollReveal(0.1);
  const statisticsReveal = useScrollReveal(0.1);

  // Feature cards data
  const features: Feature[] = [
    {
      id: "practice",
      media: {
        node: <ScriptUploadDemo />,
      },
      title: "Practice anytime, anywhere",
      description:
        "Upload any script in PDF or DOCX format and our intelligent parsing technology automatically understands the structure and content, creating a rehearsal-ready version for you all on its own. Step into your scene with an AI partner that's always ready. Perfect for last-minute audition prep, script memorization, or developing your character at your own pace.",
    },
    {
      id: "speech",
      media: {
        node: <VoiceSelectDemo />,
      },
      title: "Bring every line to life",
      description:
        "Roles are automatically identified from your script, and you can select the perfect voice for each character from our extensive voice library. Your AI scene partner delivers their lines consistently every single time, and works tirelessly with you until you perfect your performance — no matter how long it takes.",
    },
    {
      id: "control",
      media: { node: <AudioTagDemo /> },
      title: "Command every moment",
      description:
        "Shape every detail of your scene with professional-level control. Add emotive descriptions and actions inside audio tags to fine-tune each line's delivery. Even insert custom pauses between lines, so the scene flows perfectly every single time. We handle the rest so that you can fully focus on practicing your lines.",
    },
    {
      id: "track",
      media: {
        node: <AuditionTrackerDemo />,
      },
      title: "Stay organized, stay ahead",
      description:
        "Add, organize, and track all your auditions in one centralized dashboard. Monitor the progress of each casting submission and never miss important dates or callbacks. Stay organized and stay prepared — when you manage your opportunities well, you set yourself up for success. Every audition is a chance to shine!",
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
                className="font-outfit font-[400] tracking-tight leading-tight text-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl max-w-[100%] sm:max-w-[700px] md:max-w-[900px]"
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
                    className="w-70 md:w-100 flex items-center justify-center text-center mx-auto rounded-xl px-2"
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

              <h2 className="mt-6 text-black font-outfit text-md sm:text-lg md:text-xl lg:text-2xl max-w-[90%] sm:max-w-[100%] text-center leading-tight">
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

              <p className="mt-1 text-black font-outfit text-md sm:text-lg md:text-xl lg:text-2xl max-w-[55%] leading-relaxed text-center break-words whitespace-normal">
                Jumpstart your acting career now!
              </p>

              <div className="mt-15 md:mt-10 flex flex-col sm:flex-row gap-3 justify-center">
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
            Odee is powered by industry-leading technology to power the AI scene
            reader for life-life voices, smart script parsing, as well as
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
              Technology partners powering odee: ElevenLabs, OpenAI, Anthropic,
              and Deepgram.
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
            Odee offers four key features: practice anytime with AI scene
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
              <ScrollStackItem
                key={feature.id}
                itemClassName="bg-primary-light-alt"
              >
                <article className="flex flex-col lg:flex-row items-center gap-6 md:gap-10 h-full">
                  {/* Hidden description for SEO */}
                  <span className="sr-only">
                    Feature: {feature.title} - {feature.description}
                  </span>

                  {/* Icon/Media Section */}
                  {/* <div className="flex-shrink-0">
                    <div className="landing-feature-icon">
                      {feature.media?.node}
                    </div>
                  </div> */}

                  {feature.media?.node}

                  {/* Content Section */}
                  <div className="flex-1 space-y-3 md:space-y-4 mr-4">
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

        <div className="bg-black w-screen">
          <section
            ref={statisticsReveal.ref}
            id="platform-statistics"
            className={`bg-black text-white pb-20 pt-40 w-screen ${
              statisticsReveal.isVisible
                ? "landing-scroll-reveal-visible"
                : "landing-scroll-reveal-hidden"
            }`}
            aria-label="Platform statistics"
          >
            <div className="landing-section-container h-full flex flex-col justify-center">
              {/* Overline for context */}
              <p className="text-center text-lg md:text-xl text-gray-400 uppercase tracking-wider mb-4">
                Built for serious actors
              </p>

              <h2 className="text-5xl md:text-7xl font-outfit font-light text-center mb-15 md:mb-20">
                Why actors choose Odee
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 md:gap-16 text-center">
                <div className="space-y-3">
                  <p className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2">
                    24/7
                  </p>
                  <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                    Always available scene partner ready to practice with you
                    whenever, wherever you want
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2">
                    100+
                  </p>
                  <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                    Voice customization options to match each character or scene
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
                    Unlimited rehearsal takes to practice and perfect your
                    performance without judgment
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            ref={founderMessageReveal.ref}
            id="our-story"
            aria-label="Message from founders"
            itemScope
            itemType="https://schema.org/Article"
            className={`
            py-30 md:py-40 bg-black
            landing-scroll-reveal
            ${
              founderMessageReveal.isVisible
                ? "landing-scroll-reveal-visible"
                : "landing-scroll-reveal-hidden"
            }
          `}
          >
            <div className="landing-section-container">
              {/* Section header */}
              <div className="text-center mb-12 md:mb-16">
                <h2
                  className="landing-section-heading text-white"
                  itemProp="headline"
                >
                  A Message from
                  <br />
                  Fellow Actors
                </h2>
              </div>

              {/* Message content */}
              <article className="max-w-3xl mx-auto space-y-6 text-center">
                <div
                  className="space-y-6 text-lg md:text-xl text-white leading-relaxed"
                  itemProp="articleBody"
                >
                  <p>
                    The acting industry in 2025 isn't easy. Auditions are
                    scarce, the work is unpredictable, and the grind is
                    relentless. But through it all, one thing remains constant:
                  </p>

                  <p className="text-2xl md:text-4xl font-crimson font-light italic text-white my-8">
                    Our craft demands relentless preparation.
                  </p>

                  <p>
                    We built Odee because we've lived this reality. We know what
                    it's like to get your sides at 9 PM for a 10 AM audition,
                    frantically texting everyone you know.
                  </p>

                  <p>
                    We built Odee because we want every actor to have access to
                    a scene partner who's always ready — whether it's late at
                    night before an important callback, or during the few hours
                    you have between your day job and rehearsal. We want to see
                    every actor reach their full potential and find fullfilment
                    in their careers.
                  </p>

                  <p className="text-2xl md:text-4xl font-crimson font-light italic text-white my-8">
                    The industry may be unpredictable, but your preparation
                    doesn't have to be.
                  </p>

                  <p>
                    Built for actors, by actors. Because we're in this together.
                  </p>
                </div>

                {/* Attribution */}
                <footer
                  className="pt-2"
                  itemProp="author"
                  itemScope
                  itemType="https://schema.org/Organization"
                >
                  <p className="text-lg md:text-xl text-white" itemProp="name">
                    — The Odee Team
                  </p>
                  <meta itemProp="url" content="https://odee.io" />
                </footer>
              </article>
            </div>
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
              <h2 className="landing-section-heading text-white">
                {`Questions?`}
                <br />
                {`We've got answers`}
              </h2>
            </div>

            {/* FAQ Items */}
            <div className="landing-section-container lg:w-[60%] space-y-4">
              <FAQItem
                question="What is Odee and how does it work?"
                answer="Odee is your personal AI scene partner for script rehearsal and audition prep. Upload your script, customize how each line is delivered with emotional direction and timing controls, then step into your scene to practice whenever you're ready. Plus, track all your auditions in one organized dashboard so you never miss a beat in your acting career."
              />
              <FAQItem
                question="Do I need any special equipment to use Odee?"
                answer="Not at all! All you need is a microphone and speakers or headphones. If you're on a laptop or desktop, your built-in mic and speakers work great to get started."
              />
              <FAQItem
                question="Is Odee suitable for beginners or just professional actors?"
                answer="Odee is perfect for actors at every stage! Whether you're just starting out and building confidence with your lines, or you're a working professional prepping for your next audition, ODee adapts to your needs and helps you grow."
              />
              <FAQItem
                question="Can I use Odee on my phone or tablet?"
                answer="While Odee works on mobile devices, we recommend using it on a computer or laptop for the best experience. The larger screen and full keyboard make script editing and rehearsal controls much easier to navigate."
              />
              <FAQItem
                question="What kind of scripts can I upload?"
                answer="You can upload any script in PDF or DOCX format, as long as it's 3MB or smaller. Whether it's a film scene, TV script, theater monologue, or audition sides, Odee is ready to help you rehearse."
              />
              <FAQItem
                question="Does Odee support multiple languages or accents?"
                answer="Multiple languages and accents aren't available just yet, but they're definitely on our roadmap. We're working to bring these features to you in the future!"
              />
            </div>
          </section>
        </div>

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
              {`This is Odee's final call to action. Offering a free trial
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
              <h3 className="landing-footer-heading">Odee</h3>
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
                    <Link href="/#our-story" className="landing-footer-link">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <a
                      href="mailto:hello@odee.io"
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
                © {new Date().getFullYear()} Odee. All rights reserved.
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
