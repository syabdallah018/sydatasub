"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface AppButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
}

export function AppButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  fullWidth = false,
  disabled,
  className = "",
  ...props
}: AppButtonProps) {
  const baseClasses =
    "font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-2";

  const variantClasses = {
    primary:
      "bg-gradient-brand text-white shadow-button hover:shadow-brand-glow active:scale-95",
    secondary:
      "bg-card-elevated border border-border-primary text-text-primary hover:border-brand active:scale-95",
    danger:
      "bg-error/10 border border-error text-error hover:bg-error/20 active:scale-95",
    ghost:
      "bg-transparent text-text-primary hover:bg-card-elevated active:scale-95",
  };

  const sizeClasses = {
    sm: "px-4 py-2 text-sm h-10",
    md: "px-6 py-3 text-base h-12",
    lg: "px-8 py-4 text-lg h-14",
  };

  const disabledClasses = disabled
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "";

  return (
    <motion.button
      disabled={disabled || isLoading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${disabledClasses}
        ${className}
      `}
      whileTap={!disabled && !isLoading ? { scale: 0.97 } : {}}
      whileHover={!disabled && !isLoading ? { y: -1 } : {}}
      {...(props as any)}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="flex items-center justify-center">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex items-center justify-center">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
}
