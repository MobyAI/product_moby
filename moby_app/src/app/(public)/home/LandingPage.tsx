import Navbar from "@/components/landingPage/Navbar";
import { Highlighter } from "@/components/ui/highlighter"
import RotatingText from "@/components/landingPage/RotatingText/RotatingText";

import LogoLoop from '@/components/landingPage/LogoLoop/LogoLoop';

import { PulsatingDiv } from "@/components/landingPage/PulsatingButton/PulsatingButton";
import { Button } from "@/components/ui";
import FeatureShowcase from "@/components/landingPage/FeatureCardsNew/FeatureCards";
import Link from "next/link";
import StepGuide from "@/components/landingPage/StepGuide/StepGuide";

const imageLogos = [
    { src: '/assets/elevenlabs-logo-black.png', alt: "ElevenLabs", href: "https://elevenlabs.io/" },
    { src: '/assets/OpenAI-black-wordmark.png', alt: "OpenAI", href: "https://openai.com/", scale: 2.5 },
    { src: 'assets/anthropic-text.png', alt: "Anthropic", href: "https://www.anthropic.com/" },
];

const LandingPage = () => {
    return (
        // <div className="min-h-[100vh] text-slate-900 antialiased">
        <div className="min-h-screen flex flex-col text-slate-900 antialiased bg-[#e1ddcf]">
            {/* Global navbar */}
            <Navbar />

            <main id="main" className="flex flex-col">
                {/* HERO */}
                <section
                    aria-labelledby="hero-heading"
                    className="relative flex items-center justify-center text-center text-white"
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
                                            style={{ marginTop: '-15px' }}
                                        >
                                            <span
                                                className="w-125 inline-flex items-center justify-center text-center mx-2 rounded-xl px-2"
                                                style={{ backgroundColor: '#f5d76e' }}
                                            >
                                                <RotatingText
                                                    texts={['mom', 'friend', 'partner', 'sibling', 'roomie']}
                                                    mainClassName="text-black overflow-hidden rounded-lg px-2"
                                                    staggerFrom="last"
                                                    initial={{ y: "100%" }}
                                                    animate={{ y: 0 }}
                                                    exit={{ y: "-120%" }}
                                                    staggerDuration={0.025}
                                                    splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                                                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                                                    rotationInterval={2000}
                                                />
                                            </span>
                                        </h1>
                                    </div>
                                    <div className="w-200 justify-center items-center flex" style={{ marginTop: '-15px' }} >
                                        <h1
                                            id="hero-heading"
                                            className="text-center font-extrabold tracking-tight leading-tight text-black mx-auto text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-[90%] sm:max-w-[700px] md:max-w-[900px] font-crimson"
                                        >
                                            to read your lines
                                        </h1>
                                    </div>

                                    <p className="mt-4 text-black/90 text-base sm:text-lg max-w-xl">
                                        Upload any script and rehearse line-by-line with <Highlighter action="underline" color="#FF9800">emotional nuance</Highlighter>,
                                        <Highlighter action="underline" color="#9369ff">timing control</Highlighter>, and <Highlighter action="underline" color="#ef86c1">track progress</Highlighter> anytime, anywhere
                                    </p>
                                    {/* <p className="mt-2 text-black/90 text-base sm:text-lg max-w-xl mt-16 font-crimson text-lg" style={{ fontSize: '2rem' }}> */}
                                    {/* Take control of your career — practice at <Highlighter action="circle" color="#FF9800">4am</Highlighter>! */}
                                    {/* Try it now!
									</p> */}

                                    <div className="mt-16 flex flex-col sm:flex-row gap-3 justify-center">
                                        {/* <PulsatingButton className="bg-black text-white"> */}
                                        <Button className="bg-[#363c54] text-white">
                                            <Link href={"https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog"} target="_blank">
                                                Sign up for beta
                                            </Link>
                                        </Button>
                                        {/* </PulsatingButton> */}
                                    </div>
                                {/* <p className="text-center text-sm text-slate-500 mt-2">or login <span style={{ textDecoration: 'underline'}}>here</span></p> */}
                                <p className="text-center text-sm text-gray-600 mt-2">or login <Link href="/signup" style={{ textDecoration: 'underline'}}>here</Link></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section aira-label="Powered by" className="my-1">
                    <p className="text-center text-sm text-slate-500 py-10">Powered by top companies</p>
                    <div style={{ height: '100px', position: 'relative', overflow: 'hidden' }}>
                        <LogoLoop
                            logos={imageLogos}
                            speed={120}
                            direction="left"
                            logoHeight={22}
                            gap={40}
                            pauseOnHover
                            scaleOnHover
                            // fadeOut
                            fadeOutColor="#eeede4"
                            ariaLabel="Technology partners"
                        />
                    </div>
                </section>

                <section id="features" className="relative overflow-hidden">
                    <FeatureShowcase />
                </section>

                <section id="how" className="py-12 sm:py-16">
                    <h2 className="text-header text-center">How do I use this?</h2>
                    <StepGuide
                        steps={[
                            { title: "Upload your script", body: "Drop your script right in and get ready to bring your lines to life.", media: "/assets/temp.gif" },
                            { title: "Add key details", body: "Enter scene info, character notes, or anything else to help shape your performance setup.", media: "/gifs/step2.gif" },
                            { title: "Fine-tune the delivery", body: "Refine each line with emotive tags and timing tweaks so the reader performs exactly how   you imagine.", media: "/gifs/step3.gif" },
                            { title: "Rehearse and refine", body: "Step into your scene and start practicing. Adjust as you go until every line feels perfect.", media: "/gifs/step4.gif" },
                        ]}
                        loop={false} // optional: stop at last step instead of cycling
                    />
                </section>
                <section id="cta" className="py-12 sm:py-25 items-center">
                    <PulsatingDiv className="mx-auto w-[60%] px-4 sm:px-6 lg:px-8 bg-white rounded-3xl">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="p-6 sm:p-10">
                                {/* Align items vertically centered on all screens */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                    {/* Left side: text block */}
                                    <div className="text-center sm:text-left">
                                        <h3 className="text-xl sm:text-2xl font-semibold text-slate-900">
                                            Ready to land the role?
                                        </h3>
                                        <p className="mt-2 text-slate-600">
                                            Join the beta and get early access.
                                        </p>
                                    </div>

                                    {/* Right side: button */}
                                    <div className="flex justify-center sm:justify-end px-15">
                                        <Button className="bg-[#363c54] text-white">
                                            <Link
                                                href="https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog"
                                                target="_blank"
                                            >
                                                Sign up for beta
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </PulsatingDiv>
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
    )
}

export default LandingPage;