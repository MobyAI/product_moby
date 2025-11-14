"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Copy, Check, Mail, X } from "lucide-react";

export default function BlogNavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const pathname = usePathname();

  // Check if we're on a specific blog post page (not just /blog)
  const isOnBlogPost = pathname?.startsWith("/blog/") && pathname !== "/blog/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-200 ${
          isScrolled ? "shadow-[0_4px_12px_rgba(0,0,0,0.09)]" : ""
        } ${isOnBlogPost ? "bg-primary-light" : "bg-primary-light"}`}
      >
        <div className="max-w-6xl mx-auto py-3 px-5">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <div className="flex items-center gap-2">
              <Link href="/blog" className="text-logo font-light flex items-center gap-0.5">
                <Image
                  src="/icon-black-variant.svg"
                  alt="odee logo black variant"
                  width={48}
                  height={48}
                  className="w-8 h-8"
                />
                odee
              </Link>
              <span className="text-md font-medium text-gray-600 bg-gray-200 px-2.5 mt-0.5 rounded-md">
                Blog
              </span>
            </div>

            {/* Buttons - Right */}
            <div className="flex items-center gap-2">
              <CTAButton variant="ghost" href="/">
                Check us out
              </CTAButton>
              {isOnBlogPost && (
                <CTAButton
                  variant="primary"
                  onClick={() => setIsShareModalOpen(true)}
                >
                  Share
                </CTAButton>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Share Modal */}
      {isOnBlogPost && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </>
  );
}

// CTA Button Component
interface CTAButtonProps {
  variant?: "primary" | "ghost";
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const CTAButton: React.FC<CTAButtonProps> = ({
  variant = "primary",
  href,
  onClick,
  children,
}) => {
  const buttonContent = (
    <span
      className={`group overflow-hidden relative ${
        variant === "primary"
          ? "inline-flex items-center gap-2 rounded-full px-4 py-2 bg-black text-white border border-black shadow hover:shadow-md transition-shadow text-[13px] lg:text-[15px]"
          : "inline-flex items-center gap-2 rounded-full px-4 py-2 bg-transparent text-black border border-black hover:bg-black hover:text-white transition-all overflow-hidden text-[13px] lg:text-[15px]"
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
  );

  if (href) {
    return (
      <Link href={href} scroll={false}>
        {buttonContent}
      </Link>
    );
  }

  return (
    <button onClick={onClick} type="button">
      {buttonContent}
    </button>
  );
};

// Share Modal Component
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = typeof window !== "undefined" ? document.title : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareLinks = [
    {
      name: "LinkedIn",
      icon: "in",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        shareUrl
      )}`,
    },
    {
      name: "Facebook",
      icon: "f",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        shareUrl
      )}`,
    },
    {
      name: "Twitter",
      icon: "𝕏",
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        shareUrl
      )}&text=${encodeURIComponent(shareTitle)}`,
    },
    {
      name: "Email",
      icon: "email",
      url: `mailto:?subject=${encodeURIComponent(
        shareTitle
      )}&body=${encodeURIComponent(shareUrl)}`,
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-4xl p-10 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 text-gray-400 hover:text-gray-600 text-2xl leading-none hover:cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-semibold font-crimson mb-4">
            Share this article
          </h2>
          <div className="space-y-3 flex flex-col items-center">
            {/* Social Share Links */}
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-start gap-1 py-2 px-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors w-[100%] mx-auto"
              >
                <div className="w-10 h-10 rounded-full bg-transparent text-black flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {link.icon === "email" ? (
                    <Mail className="w-5 h-5" />
                  ) : (
                    link.icon
                  )}
                </div>
                <span className="text-lg font-medium font-crimson text-gray-900">
                  {link.name}
                </span>
              </a>
            ))}

            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-start gap-1 py-2 px-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors w-[100%] mx-auto"
            >
              <div className="w-10 h-10 rounded-full bg-transparent text-black flex items-center justify-center flex-shrink-0">
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </div>
              <span className="text-lg font-medium font-crimson text-gray-900">
                {copied ? "Copied!" : "Copy Link"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
