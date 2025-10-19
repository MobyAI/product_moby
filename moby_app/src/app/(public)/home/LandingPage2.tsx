import Navbar from "@/components/landingPage/Navbar";

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
									<h1 id="hero-heading" className="mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-black">
										Stop asking your mom
									</h1>

									<p className="mt-4 text-black/90 text-base sm:text-lg max-w-xl">
										Upload any script and rehearse line-by-line with emotional nuance,
										timing control, and track progress anytime, anywhere.
									</p>
									<p className="mt-2 text-black/90 text-base sm:text-lg max-w-xl">
										Take control of your career — practice at 4am!
									</p>

									<div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
										{/* <Link href="#demo" prefetch>
											<Button className="rounded-xl h-11 px-6 inline-flex items-center">
												<span>Sign up for beta</span>
												<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
											</Button>
										</Link> */}
										{/* <Link href="/signup" prefetch>
  <Button
    className="group rounded-xl h-11 px-6 inline-flex items-center 
               bg-slate-900 text-white border border-slate-700 
               transition-all duration-300 hover:scale-105 hover:shadow-lg 
               hover:[animation:glow-pulse_1.2s_ease-in-out_infinite]"
  >
    <span>Sign up for beta</span>
    <ArrowRight
      className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
      aria-hidden="true"
    />
  </Button>
</Link>

										<Link href="#demo" scroll>
											<Button variant="outline" className="rounded-xl h-11 px-6" style={{ color: '#000'}}>
												Watch demo
											</Button>
										</Link> */}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
            </main>
        </div>
    )
}

export default LandingPage;