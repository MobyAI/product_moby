"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// Adjustable scroll threshold (in pixels)
const SCROLL_THRESHOLD: number = 50;

const Navbar: React.FC = () => {
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

  // Smooth scroll behavior for anchor links
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();
    const section = document.querySelector(targetId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setOpen(false);
    }
  };

  const NavLink: React.FC<React.PropsWithChildren<{ href: string }>> = ({
    href,
    children,
  }) => (
    <a
      href={href}
      onClick={(e) => handleNavClick(e, href)}
      className="group text-white/90 hover:text-white transition-colors text-sm font-medium cursor-pointer"
    >
      {children}
    </a>
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
        className={`group overflow-hidden relative ${
          variant === "primary"
            ? "inline-flex items-center gap-2 rounded-full px-7 py-3.5 bg-black text-white shadow hover:shadow-md transition-shadow text-[17px]"
            : "inline-flex items-center gap-2 rounded-full px-7 py-3.5 bg-transparent text-black border border-black hover:bg-black/5 transition text-[17px]"
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
      <span className="inline-flex items-center text-black text-[17px] px-7 py-3.5 rounded-full border border-black group-hover:bg-black group-hover:text-white transition-all overflow-hidden relative group">
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
        className={`transition-all duration-300 py-4 ${
          scrolled ? "bg-white/40 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="px-4 sm:px-6 lg:px-15">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left section - Nav Links */}
            <nav className="hidden md:flex items-center gap-8 flex-1">
              <AnimatedNavButton href="#about">About</AnimatedNavButton>
              <AnimatedNavButton href="#features">
                Features
              </AnimatedNavButton>
            </nav>

            {/* Center section - Logo */}
            <div className="flex items-center justify-center flex-1">
              <span className="text-logo-lg tracking-tight">tableread</span>
            </div>

            {/* Right section - Login Button */}
            <div className="hidden md:flex items-center justify-end flex-1">
              <CTAButton variant="primary" href="/signup">
                Login
              </CTAButton>
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden mt-2 mx-4 rounded-2xl border border-white/20 bg-black/70 backdrop-blur-xl p-4">
          <div className="flex flex-col gap-3">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#how">How does it work?</NavLink>
            <div className="pt-2">
              <CTAButton variant="primary" href="#cta">
                Sign up for beta access
              </CTAButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
