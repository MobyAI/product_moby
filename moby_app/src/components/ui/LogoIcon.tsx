import Image from "next/image";

interface LogoProps {
  variant?: "regular" | "large" | "black";
}

export default function Logo({ variant = "regular" }: LogoProps) {
  const sizes = {
    regular: {
      container: "w-10 h-10",
      image: { width: 40, height: 40 },
      src: "/icon.svg",
      bgColor: "bg-black",
    },
    large: {
      container: "w-12 h-12",
      image: { width: 45, height: 45 },
      src: "/icon.svg",
      bgColor: "bg-black",
    },
    black: {
      container: "w-10 h-10",
      image: { width: 40, height: 40 },
      src: "/icon-black-variant.svg",
      bgColor: "bg-transparent",
    },
  };

  const { container, image, src, bgColor } = sizes[variant];

  return (
    <div
      className={`${bgColor} rounded-lg ${container} flex items-center justify-center`}
    >
      <Image
        src={src}
        alt="Odee Logo"
        width={image.width}
        height={image.height}
        className="flex-shrink-0 rounded-xl"
        priority
      />
    </div>
  );
}
