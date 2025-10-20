import Navbar from "@/components/landingPage/Navbar";
import { Highlighter } from "@/components/ui/highlighter"
import RotatingText from "@/components/landingPage/RotatingText/RotatingText";

import LogoLoop from '@/components/landingPage/LogoLoop/LogoLoop';

import { PulsatingButton } from "@/components/landingPage/PulsatingButton/PulsatingButton";
import FeatureGrid from "@/components/landingPage/FeatureCards/FeatureCards";
  
import Stepper, { Step } from '@/components/landingPage/Stepper/Stepper';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const imageLogos = [
  { src: '/assets/elevenlabs-logo-black.png', alt: "ElevenLabs", href: "https://elevenlabs.io/" },
  { src: '/assets/OpenAI-black-wordmark.png', alt: "OpenAI", href: "https://openai.com/", scale: 2 },
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

                                    <div className="w-screen justify-center items-center flex py-5 mt-20">
                                        <h1 
                                            id="hero-heading" 
                                            className="text-center font-extrabold tracking-tight leading-tight text-black mx-auto mt-2 text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-[90%] sm:max-w-[700px] md:max-w-[900px]"
                                        >
                                            Stop asking your
                                            <span 
                                                className="inline-flex items-center justify-center text-center mx-2 rounded-xl px-2 w-[7ch] sm:w-[8ch]" 
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

									<p className="mt-4 text-black/90 text-base sm:text-lg max-w-xl">
										Upload any script and rehearse line-by-line with <Highlighter action="underline" color="#FF9800">emotional nuance</Highlighter>,
										timing control, and track progress anytime, anywhere.
									</p>
									<p className="mt-2 text-black/90 text-base sm:text-lg max-w-xl">
										Take control of your career — practice at <Highlighter action="circle" color="#FF9800">4am</Highlighter>!
									</p>

									<div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                                        <PulsatingButton className="bg-black text-white">
                                            Sign up for beta
                                        </PulsatingButton>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

                <section aira-label="Powered by" className="my-1">
                    <p className="text-center text-sm text-slate-500 py-10">Powered by top companies</p>
                    <div style={{ height: '200px', position: 'relative', overflow: 'hidden'}}>
                        <LogoLoop
                            logos={imageLogos}
                            speed={120}
                            direction="left"
                            logoHeight={22}
                            gap={40}
                            pauseOnHover
                            scaleOnHover
                            fadeOut
                            fadeOutColor="#ffffff"
                            ariaLabel="Technology partners"
                        />
                    </div>
                </section>

                <section id="features" className="relative p-0 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 text-center bg-[#eeede4] rounded-xl">   
                         <div className="max-w-2xl mx-auto mb-12">
							<h2 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
								Practice smarter, perform better
							</h2>
							<p className="mt-3 text-base sm:text-lg text-slate-600">
								Everything you need to rehearse, control delivery, and track your progress.
							</p>
						</div>    
                         <FeatureGrid
                            title="Your Title"
                            description="Your description"
                            bgColor="bg-blue-50"
                        />       
                    </div>
                </section>


                <section id="how" className="py-12 sm:py-16">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
							<StepCard step="1" title="Upload your sides" desc="Drag & drop your PDF or paste lines—auto‑formatting included." />
							<StepCard step="2" title="Set the vibe" desc="Describe emotion and pacing; your partner delivers it back instantly." />
							<StepCard step="3" title="Rehearse & refine" desc="Loop tricky sections, tweak timing, and save takes to review later." />
						</div>
					</div>
				</section>
                
                {/* <section id="how" className="">
                    <Stepper
                        initialStep={1}
                        onStepChange={(step) => {
                            console.log(step);
                        }}
                        onFinalStepCompleted={() => console.log("All steps completed!")}
                        backButtonText="Previous"
                        nextButtonText="Next"
                        >
                        <Step>
                            <h2>Welcome to the React Bits stepper!</h2>
                            <p>Check out the next step!</p>
                        </Step>
                        <Step>
                            <h2>Step 2</h2>
                            <img style={{ height: '100px', width: '100%', objectFit: 'cover', objectPosition: 'center -70px', borderRadius: '15px', marginTop: '1em' }} src="https://www.purrfectcatgifts.co.uk/cdn/shop/collections/Funny_Cat_Cards_640x640.png?v=1663150894" />
                            <p>Custom step content!</p>
                        </Step>
                        <Step>
                            <h2>How about an input?</h2>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name?" />
                        </Step>
                        <Step>
                            <h2>Final Step</h2>
                            <p>You made it!</p>
                        </Step>
                    </Stepper>
                </section> */}


                <section id="cta" className="py-12 sm:py-25 items-center">
                    <PulsatingButton className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 bg-white rounded-3xl">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="p-6 sm:p-10">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                                {/* Left side: text block */}
                                <div className="text-center sm:text-left">
                                    <h3 className="text-xl sm:text-2xl font-semibold text-slate-900">
                                    Ready to land the role?
                                    </h3>
                                    <p className="mt-2 text-slate-600">
                                    Join the beta and get early access.
                                    </p>
                                </div>

                                {/* Right side: CTA button */}
                                <div className="flex justify-center sm:justify-end">
                                    {/* TODO: need to update this to be a button without it being a button  */}
                                    <h2 className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition">
                                    Sign up for beta
                                    </h2>
                                </div>
                                </div>
                            </div>
                        </div>
                    </PulsatingButton>

                    {/* <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow">
							<div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center">
                                <PulsatingButton>Pulsating Button</PulsatingButton>
                            </div>
                        </div>
                    </div> */}
                </section>
            </main>
        </div>
    )
}

export default LandingPage;


function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
	return (
		<Card className="rounded-2xl">
			<CardHeader>
				<div className="inline-flex items-center gap-2 text-xs text-slate-500">
					<span className="h-6 w-6 grid place-items-center rounded-full border border-slate-200" aria-hidden>
						{step}
					</span>
					<span className="sr-only">Step</span>
					<span aria-hidden>Step</span>
				</div>
				<CardTitle className="text-lg font-semibold mt-1">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-slate-600">{desc}</p>
			</CardContent>
		</Card>
	);
}
