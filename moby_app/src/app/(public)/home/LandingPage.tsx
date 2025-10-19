import Navbar from "@/components/landingPage/Navbar";
import { Highlighter } from "@/components/ui/highlighter"
import RotatingText from "@/components/landingPage/RotatingText/RotatingText";

import LogoLoop from '@/components/landingPage/LogoLoop/LogoLoop';

// Alternative with image sources
const imageLogos = [
  { src: "/logos/company1.png", alt: "Company 1", href: "https://company1.com" },
  { src: "/logos/company2.png", alt: "Company 2", href: "https://company2.com" },
  { src: "/logos/company3.png", alt: "Company 3", href: "https://company3.com" },
];

// const logos = [
// 	{ src: "/assets/elevenlabs-logo-black.svg", alt: "ElevenLabs logo", url: "https://elevenlabs.io" },
// 	{ src: "/assets/OpenAI-logos(new)/SVGs/OpenAI-black-wordmark.svg", alt: "OpenAI logo", url: "https://openai.com" },
// 	{ src: "/assets/Anthropic/Anthropic_Logo_0.svg", alt: "Anthropic logo", url: "https://www.anthropic.com" },
// ] as const;

const LandingPage = () => {
    return (
		<div className="min-h-screen text-slate-900 antialiased">
            {/* Global navbar */}
            <Navbar />

            <main id="main" className="relative">
                {/* HERO */}
				<section
					aria-labelledby="hero-heading"
					className="relative flex items-center justify-center text-center text-white overflow-hidden"
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
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

                {/* <section aria-label="Powered by" className="py-10 sm:py-12">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<p className="text-center text-sm text-slate-500">Powered by top companies</p>

						<ul className="mt-6 flex flex-wrap justify-center gap-6 sm:gap-8" role="list">
							{logos.map((logo, i) => (
								<li key={i} className="flex h-12 w-28 sm:w-32 items-center justify-center rounded-xl border border-slate-200 bg-white/60 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500">
									<Link
										href={logo.url}
										target="_blank"
										rel="noopener noreferrer"
										className="outline-none inline-flex items-center justify-center h-full w-full rounded-xl"
										aria-label={`Visit ${logo.alt.replace(/ logo$/i, "")}`}
									>
										<Image src={logo.src} alt={logo.alt} width={120} height={40} sizes="(max-width: 640px) 112px, 128px" />
									</Link>
								</li>
							))}
						</ul>
					</div>
				</section> */}
                <section aira-label="Powered by" className="my-10">
                    <div style={{ height: '200px', position: 'relative', overflow: 'hidden'}}>
                        <LogoLoop
                            logos={imageLogos}
                            speed={120}
                            direction="left"
                            logoHeight={48}
                            gap={40}
                            pauseOnHover
                            scaleOnHover
                            fadeOut
                            fadeOutColor="#ffffff"
                            ariaLabel="Technology partners"
                        />
                    </div>
                </section>


                {/* <section id="how" className="py-12 sm:py-16">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
							<StepCard step="1" title="Upload your sides" desc="Drag & drop your PDF or paste lines—auto‑formatting included." />
							<StepCard step="2" title="Set the vibe" desc="Describe emotion and pacing; your partner delivers it back instantly." />
							<StepCard step="3" title="Rehearse & refine" desc="Loop tricky sections, tweak timing, and save takes to review later." />
						</div>
					</div>
				</section> */}
            </main>
        </div>
    )
}

export default LandingPage;
