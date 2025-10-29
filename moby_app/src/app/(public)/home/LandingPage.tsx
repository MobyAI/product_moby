import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Navbar from "@/components/landingPage/Navbar";
import { Highlighter } from "@/components/ui/highlighter";
import RotatingText from "@/components/landingPage/RotatingText/RotatingText";

import LogoLoop from "@/components/landingPage/LogoLoop/LogoLoop";

import { PulsatingDiv } from "@/components/landingPage/PulsatingButton/PulsatingButton";
import { Button } from "@/components/ui";
import FeatureShowcase from "@/components/landingPage/FeatureCardsNew/FeatureCards";
import Link from "next/link";
import StepGuide from "@/components/landingPage/StepGuide/StepGuide";
import HorizontalStepGuide from "@/components/landingPage/StepGuide/HorizontalStepGuide";
import SplashCursor from "./animatedCursor";
import { SP } from "next/dist/shared/lib/utils";
import { ChevronsDown } from "lucide-react";

const imageLogos = [
  {
    src: "/assets/elevenlabs-logo-black.png",
    alt: "ElevenLabs",
    href: "https://elevenlabs.io/",
  },
  {
    src: "/assets/OpenAI-black-wordmark.png",
    alt: "OpenAI",
    href: "https://openai.com/",
    scale: 2.5,
  },
  {
    src: "assets/anthropic-text.png",
    alt: "Anthropic",
    href: "https://www.anthropic.com/",
  },
];

const INDICATOR_MAX_SHIFT = 200;

const LandingPage = () => {
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const indicatorY = useTransform(
    scrollYProgress,
    [0, 0.5],
    [0, -INDICATOR_MAX_SHIFT]
  );

  return (
    // <div className="min-h-[100vh] text-slate-900 antialiased">
    <div className="min-h-screen flex flex-col text-slate-900 antialiased bg-primary-dark-alt">
      {/* Global navbar */}
      <Navbar />

      {/* Cursor in background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* <SplashCursor /> */}
      </div>

      <main id="main" className="flex flex-col">
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
                  {/* <h1 id="hero-heading" className="mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-black">
										Stop asking your mom
									</h1> */}

                  <div className="w-200 justify-center items-center flex py-5 mt-20">
                    <h1
                      id="hero-heading"
                      className="text-center font-extrabold tracking-tight leading-tight text-black mx-auto mt-2 text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-[90%] sm:max-w-[700px] md:max-w-[900px] font-crimson"
                    >
                      Stop asking your
                    </h1>
                  </div>
                  <div className="w-screen justify-center items-center flex">
                    <h1
                      id="hero-heading"
                      className="text-center font-extrabold tracking-tight leading-tight text-black mx-auto text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-[90%] sm:max-w-[700px] md:max-w-[900px] font-crimson"
                      style={{ marginTop: "-15px" }}
                    >
                      <span
                        className="w-125 inline-flex items-center justify-center text-center mx-2 rounded-xl px-2"
                        style={{ backgroundColor: "#f5d76e" }}
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
                    </h1>
                  </div>
                  <div
                    className="w-200 justify-center items-center flex"
                    style={{ marginTop: "-15px" }}
                  >
                    <h1
                      id="hero-heading"
                      className="text-center font-extrabold tracking-tight leading-tight text-black mx-auto text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-[90%] sm:max-w-[700px] md:max-w-[900px] font-crimson"
                    >
                      to read your lines
                    </h1>
                  </div>

                  <p className="mt-4 text-black/90 text-base sm:text-lg max-w-xl">
                    Upload any script and rehearse line-by-line with{" "}
                    <Highlighter action="underline" color="#FF9800">
                      emotional nuance
                    </Highlighter>
                    ,
                    <Highlighter action="underline" color="#9369ff">
                      timing control
                    </Highlighter>
                    , and{" "}
                    <Highlighter action="underline" color="#ef86c1">
                      track progress
                    </Highlighter>{" "}
                    anytime, anywhere
                  </p>
                  {/* <p className="mt-2 text-black/90 text-base sm:text-lg max-w-xl mt-16 font-crimson text-lg" style={{ fontSize: '2rem' }}> */}
                  {/* Take control of your career — practice at <Highlighter action="circle" color="#FF9800">4am</Highlighter>! */}
                  {/* Try it now!
									</p> */}

                  <div className="mt-16 flex flex-col sm:flex-row gap-3 justify-center">
                    {/* <PulsatingButton className="bg-black text-white"> */}
                    <Button className="bg-[#363c54] text-white px-7 py-3.5">
                      <Link
                        href={
                          "https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog"
                        }
                        target="_blank"
                      >
                        Sign up for beta
                      </Link>
                    </Button>
                    {/* </PulsatingButton> */}
                  </div>
                  {/* <p className="text-center text-sm text-slate-500 mt-2">or login <span style={{ textDecoration: 'underline'}}>here</span></p> */}
                  <p className="text-center text-sm text-gray-600 mt-2">
                    or login{" "}
                    <Link
                      href="/signup"
                      style={{ textDecoration: "underline" }}
                    >
                      here
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            style={{ y: indicatorY }}
            className="absolute bottom-10 left-20 flex flex-col items-center gap-2 text-black"
          >
            <span className="text-2xl font-crimson font-semibold">
              Scroll for more
            </span>
            <ChevronsDown className="h-8 w-8 animate-bounce mt-2" />
          </motion.div>
        </section>

        <div className="h-[300px]" />

        <section aria-label="Powered by" className="mb-[200px]">
          <div className="w-full text-center mb-15">
            <h2 className="text-5xl sm:text-6xl lg:text-[125px] font-inter font-[200] tracking-tight text-white">
              Powered by
              <br />
              industry leading
              <br />
              technology
            </h2>
          </div>
          <div
            style={{
              // height: "100px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <LogoLoop
              logos={imageLogos}
              speed={120}
              direction="left"
              logoHeight={30}
              gap={40}
              pauseOnHover
              scaleOnHover
              // fadeOut
              fadeOutColor="#eeede4"
              ariaLabel="Technology partners"
            />
            <LogoLoop
              logos={imageLogos}
              speed={120}
              direction="right"
              logoHeight={30}
              gap={40}
              pauseOnHover
              scaleOnHover
              // fadeOut
              fadeOutColor="#eeede4"
              ariaLabel="Technology partners"
            />
            <LogoLoop
              logos={imageLogos}
              speed={120}
              direction="left"
              logoHeight={30}
              gap={40}
              pauseOnHover
              scaleOnHover
              // fadeOut
              fadeOutColor="#eeede4"
              ariaLabel="Technology partners"
            />
          </div>
        </section>

        <section id="about" className="relative overflow-hidden">
          <FeatureShowcase />
        </section>

        <section id="features" className="py-16 sm:py-20 lg:py-30">
          {/* Section header - horizontal layout */}
          <div className="w-[85%] mx-auto mb-[5rem] flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-16">
            {/* Headline - left side */}
            <div className="flex-shrink-0">
              <h2 className="text-5xl sm:text-6xl lg:text-[125px] font-inter font-[200] tracking-tight text-white">
                Explore
                <br />
                <span className="ml-8 sm:ml-12 lg:ml-16">our features</span>
              </h2>
            </div>

            {/* Description - right side */}
            <p className="text-white/90 text-base sm:text-lg lg:text-xl max-w-xl lg:self-end lg:mb-[-3rem]">
              {`Upload your scripts, practice your lines, and track every audition
              in one place—designed to help you train smarter, perform
              better, and take control of your acting career.`}
            </p>
          </div>
          <HorizontalStepGuide
            steps={[
              {
                title: "Upload your script",
                body: "Drop your script right in and get ready to bring your lines to life.",
                media: "/assets/Upload.mp4",
              },
              {
                title: "Add key details",
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
            ]}
          />
        </section>
        <section
          id="cta"
          className="flex flex-col justify-center items-center py-28"
        >
          {/* Section header - centered */}
          <div className="w-full text-center mb-15">
            <h2 className="text-5xl sm:text-6xl lg:text-[125px] font-inter font-[200] tracking-tight text-white">
              Ready
              <br />
              to land your
              <br />
              dream role?
            </h2>
          </div>
          {/* Right side: button */}
          <div className="flex justify-center">
            <Button className="bg-primary-light text-black px-6 py-4">
              <Link
                href="https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog"
                target="_blank"
              >
                Get Started
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="w-full border-t border-slate-200 bg-[#363c54] mt-20">
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
