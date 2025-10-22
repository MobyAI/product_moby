"use client";
import React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const Navbar: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  // Smooth scroll behavior for anchor links
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();
    const section = document.querySelector(targetId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setOpen(false); // close mobile menu when clicking
    }
  };

  const NavLink: React.FC<
    React.PropsWithChildren<{ href: string }>
  > = ({ href, children }) => (
    <a
      href={href}
      onClick={(e) => handleNavClick(e, href)}
      className="text-white/90 hover:text-white transition-colors text-sm font-medium cursor-pointer"
    >
      {children}
    </a>
  );

  const CTAButton: React.FC<
    React.PropsWithChildren<{ variant?: "primary" | "ghost"; href?: string }>
  > = ({ variant = "primary", href = "#", children }) => (
    <Link href={href} scroll={false} target="_blank">
      <span
        className={
          variant === "primary"
            ? "inline-flex items-center gap-2 rounded-2xl px-5 py-3 bg-white text-slate-900 shadow hover:shadow-md transition-shadow text-body-large"
            : "inline-flex items-center gap-2 rounded-2xl px-5 py-3 bg-white/20 text-white border border-white/30 hover:bg-white/30 transition"
        }
        style={{ backgroundColor: "#f5d76e" }}
      >
        {children}
      </span>
    </Link>
  );

  return (
    <header className="sticky top-10 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/40 backdrop-blur-xl border border-white/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight text-black text-logo">
              tableread
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <NavLink href="#features"><span className="text-black text-body-large">Features</span></NavLink>
            <NavLink href="#how"><span className="text-black text-body-large">How does it work?</span></NavLink>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <CTAButton variant="primary" href="https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform?usp=dialog">
              Sign up for beta access
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

        {/* Mobile panel */}
        {open && (
          <div className="md:hidden mt-2 rounded-2xl border border-white/20 bg-black/70 backdrop-blur-xl p-4">
            <div className="flex flex-col gap-3">
              <NavLink href="#features">Features</NavLink>
              <NavLink href="#how">Voices</NavLink>
              <div className="pt-2">
                <CTAButton variant="primary" href="#cta">
                  Sign up for beta access
                </CTAButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
