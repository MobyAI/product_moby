import { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { LucideIcon } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
	size?: "sm" | "md" | "lg";
	children?: ReactNode;
	icon?: LucideIcon;
	iconPosition?: "left" | "right";
	iconOnly?: boolean;
	title?: string;
}

export function Button({
	variant,
	size = "md",
	className,
	children,
	icon: Icon,
	iconPosition = "left",
	iconOnly = false,
	title,
	...props
}: ButtonProps) {
	const iconSize = {
		sm: "h-4 w-4",
		md: "h-4.5 w-4.5",
		lg: "h-5 w-5"
	}[size];

	// Base styles with 3D effect
	const baseStyles = "font-medium rounded-full transition-all inline-flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden transform hover:scale-108 active:scale-95";

	// 3D shadow styles
	const shadowStyles = "shadow-lg hover:shadow-xl";

	return (
		<button
			disabled={props.disabled}
			className={clsx(
				baseStyles,
				shadowStyles,
				{
					// Primary with gradient overlay
					"bg-primary-dark text-white before:absolute before:inset-0 before:pointer-events-none hover:bg-btn-primary-hover": variant === "primary",

					// Secondary with gradient overlay
					"bg-primary-dark-alt text-white before:absolute before:inset-0 before:pointer-events-none hover:bg-btn-secondary-hover": variant === "secondary",

					// Accent with gradient overlay
					"bg-btn-accent text-white before:absolute before:inset-0 before:bg-gradient-to-t before:from-white/20 before:to-transparent before:pointer-events-none hover:bg-btn-accent-hover": variant === "accent",

					// Danger with gradient overlay
					"bg-red-600 text-white before:absolute before:inset-0 before:bg-gradient-to-t before:from-white/20 before:to-transparent before:pointer-events-none hover:bg-red-700": variant === "danger",

					// Ghost (no 3D effect)
					"bg-gray-300/60 hover:bg-gray-400 text-white/80 hover:text-white shadow-none": variant === "ghost",

					// Size styles
					"px-3 py-2 text-sm": size === "sm" && !iconOnly,
					"px-4 py-3": size === "md" && !iconOnly,
					"px-5 py-4 text-lg": size === "lg" && !iconOnly,
					"p-2": size === "sm" && iconOnly,
					"p-3": size === "md" && iconOnly,
					"p-4": size === "lg" && iconOnly,

					// Disabled
					"opacity-50 cursor-not-allowed hover:scale-100 active:scale-100 hover:shadow-none":
						props.disabled,
				},
				className
			)}
			style={{
				// Additional inline styles for enhanced 3D effect
				boxShadow: variant !== "ghost" ? "0 4px 14px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)" : undefined,
			}}
			title={title}
			{...props}
		>
			<span className="relative z-10 flex items-center gap-2 font-semibold">
				{Icon && iconPosition === "left" && (
					<Icon className={iconSize} aria-hidden="true" />
				)}
				{!iconOnly && children}
				{Icon && iconPosition === "right" && !iconOnly && (
					<Icon className={iconSize} aria-hidden="true" />
				)}
			</span>
		</button>
	);
}