import { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { LucideIcon } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "danger" | "ghost";
	size?: "sm" | "md" | "lg";
	children?: ReactNode;
	icon?: LucideIcon;
	iconPosition?: "left" | "right";
	iconOnly?: boolean;
}

export function Button({
	variant = "primary",
	size = "md",
	className,
	children,
	icon: Icon,
	iconPosition = "left",
	iconOnly = false,
	...props
}: ButtonProps) {
	const iconSize = {
		sm: "h-3.5 w-3.5",
		md: "h-4 w-4",
		lg: "h-5 w-5"
	}[size];

	return (
		<button
			className={clsx(
				"font-medium rounded-3xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer",
				{
					"bg-action-primary text-white hover:bg-primary-dark": variant === "primary",
					"bg-primary-accent text-white hover:bg-primary-dark": variant === "secondary",
					"bg-red-600 text-white hover:bg-red-700": variant === "danger",
					"bg-transparent hover:bg-red-500/20 text-white/80 hover:text-white": variant === "ghost",
					"px-4 py-1 text-sm": size === "sm" && !iconOnly,
					"px-5 py-2": size === "md" && !iconOnly,
					"px-7 py-3": size === "lg" && !iconOnly,
					"p-1.5": size === "sm" && iconOnly,
					"p-2": size === "md" && iconOnly,
					"p-3": size === "lg" && iconOnly,
				},
				className
			)}
			{...props}
		>
			{Icon && iconPosition === "left" && (
				<Icon className={iconSize} aria-hidden="true" />
			)}
			{!iconOnly && children}
			{Icon && iconPosition === "right" && !iconOnly && (
				<Icon className={iconSize} aria-hidden="true" />
			)}
		</button>
	);
}