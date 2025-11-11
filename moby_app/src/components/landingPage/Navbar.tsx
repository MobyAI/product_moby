"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type Lenis from "lenis";

// Adjustable scroll threshold (in pixels)
const SCROLL_THRESHOLD: number = 50;

interface NavbarProps {
  lenisInstance?: Lenis | null;
}

const Navbar: React.FC<NavbarProps> = ({ lenisInstance }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrolled(scrollPosition > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /// Smooth scroll behavior for anchor links
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();
    const section = document.querySelector(targetId);

    // Type guard to check if it's an HTMLElement
    if (section instanceof HTMLElement && lenisInstance) {
      const navbarHeight = 90;

      // Get the section's position relative to viewport
      const rect = section.getBoundingClientRect();

      // Calculate absolute scroll position using window.scrollY
      const targetPosition = window.scrollY + rect.top - navbarHeight;

      lenisInstance.scrollTo(targetPosition, {
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else if (section) {
      // Fallback to native scroll if Lenis not available
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setOpen(false);
  };

  const NavLink: React.FC<React.PropsWithChildren<{ href: string }>> = ({
    href,
    children,
  }) => (
    <Link
      href={href}
      onClick={(e) => handleNavClick(e, href)}
      className="group text-black/90 hover:text-black transition-colors text-md font-medium cursor-pointer"
    >
      {children}
    </Link>
  );

  interface CTAButtonProps {
    variant?: "primary" | "ghost";
    href?: string;
    children: React.ReactNode;
  }

  const CTAButton: React.FC<CTAButtonProps> = ({
    variant = "primary",
    href = "#",
    children,
  }) => (
    <Link href={href} scroll={false}>
      <span
        className={`group overflow-hidden relative font-sans ${
          variant === "primary"
            ? "inline-flex items-center gap-2 rounded-full px-4 lg:px-7 py-3.5 bg-black text-white border border-black shadow hover:shadow-md transition-shadow text-[15px] lg:text-[17px]"
            : "inline-flex items-center gap-2 rounded-full px-4 lg:px-7 py-3.5 bg-transparent text-black border border-black hover:bg-black hover:text-white transition-all overflow-hidden text-[15px] lg:text-[17px]"
        }`}
      >
        <span className="invisible">{children}</span>
        <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-full">
          {children}
        </span>
        <span className="absolute inset-0 flex items-center justify-center translate-y-full transition-transform duration-300 group-hover:translate-y-0">
          {children}
        </span>
      </span>
    </Link>
  );

  const AnimatedNavButton: React.FC<{ children: string; href: string }> = ({
    children,
    href,
  }) => (
    <NavLink href={href}>
      <span className="inline-flex items-center font-sans text-black text-[15px] lg:text-[17px] px-4 lg:px-7 py-3.5 rounded-full border border-black group-hover:bg-black group-hover:text-white transition-all overflow-hidden relative group">
        <span className="invisible">{children}</span>
        <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-full">
          {children}
        </span>
        <span className="absolute inset-0 flex items-center justify-center translate-y-full transition-transform duration-300 group-hover:translate-y-0">
          {children}
        </span>
      </span>
    </NavLink>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`transition-all duration-300 py-2 md:py-4 ${
          scrolled ? "bg-white/50 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left section - Nav Links */}
            <nav className="hidden md:flex items-center gap-4 flex-1">
              <AnimatedNavButton href="#features">Features</AnimatedNavButton>
              <AnimatedNavButton href="#how-it-works">
                How it works
              </AnimatedNavButton>
            </nav>

            {/* Center section - Logo */}
            <div className="flex items-center justify-center flex-1">
              <a
                href="#main"
                onClick={(e) => handleNavClick(e, "#main")}
                className="font-crimson font-bold text-[2rem] lg:text-[2.5rem] leading-[2.5rem] tracking-tight"
              >
                tableread
              </a>
            </div>

            {/* Right section - Login Button */}
            <nav className="hidden md:flex items-center justify-end gap-4 flex-1">
              <CTAButton variant="ghost" href="/signup">
                Login
              </CTAButton>
              <CTAButton
                variant="primary"
                href="https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog"
              >
                Get Started
              </CTAButton>
            </nav>

            {/* Mobile toggle */}
            <button
              className="md:hidden fixed top-4.5 left-3 z-[60] inline-flex h-10 w-10 items-center justify-center rounded-xl text-black"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile panel (slide-in left) */}
      <div
        className={`fixed inset-0 z-100 transition-all duration-300 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />

        {/* Sliding panel */}
        <div
          className={`absolute top-0 left-0 w-74 bg-[#e1ddcf] shadow-xl border-r border-black/10 transform transition-transform duration-300 ${
            open ? "translate-x-0" : "-translate-x-full"
          } rounded-br-2xl flex flex-col justify-between pb-10`}
        >
          <div className="p-8 mt-8 flex flex-col items-center gap-8">
            <div
              className="absolute top-5 left-5 text-black"
              onClick={() => setOpen(false)}
            >
              <X className="h-7 w-7" />
            </div>

            <span className="text-logo pb-4 border-b border-gray-500">tableread</span>

            <nav className="flex flex-col items-center gap-3">
              <NavLink href="#features">
                <span className="w-40 inline-flex items-center justify-center text-black text-[17px] px-7 py-3 rounded-full border border-black overflow-hidden">
                  Features
                </span>
              </NavLink>
              <NavLink href="#how-it-works">
                <span className="w-40 inline-flex items-center justify-center text-black text-[17px] px-7 py-3 rounded-full border border-black overflow-hidden">
                  How it works
                </span>
              </NavLink>
              <Link
                href="https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog"
                scroll={false}
              >
                <span
                  className={`group overflow-hidden relative inline-flex items-center gap-2 rounded-full w-40 px-4 lg:px-7 py-3.5 bg-black text-white border border-black shadow hover:shadow-md transition-shadow text-[15px] lg:text-[17px]`}
                >
                  <span className="invisible">Get Started</span>
                  <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-full">
                    Get Started
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center translate-y-full transition-transform duration-300 group-hover:translate-y-0">
                    Get Started
                  </span>
                </span>
              </Link>
            </nav>
          </div>

          {/* <div className="mx-auto p-6">
            <CTAButton variant="primary" href="#cta">
              Get Started
            </CTAButton>
          </div> */}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
