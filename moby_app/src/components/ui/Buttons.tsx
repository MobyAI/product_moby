import { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "danger";
	size?: "sm" | "md" | "lg";
	children: ReactNode;
}

export function Button({
	variant = "primary",
	size = "md",
	className,
	children,
	...props
}: ButtonProps) {
	return (
		<button
			className={clsx(
				"font-medium rounded-lg transition-colors",
				{
					"bg-primary text-white hover:bg-blue-700": variant === "primary",
					"bg-primary-accent text-gray-500 hover:bg-white":
						variant === "secondary",
					"bg-red-600 text-white hover:bg-red-700": variant === "danger",
					"px-3 py-1 text-sm": size === "sm",
					"px-4 py-2": size === "md",
					"px-6 py-3": size === "lg",
				},
				className
			)}
			{...props}
		>
			{children}
		</button>
	);
}
