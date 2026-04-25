import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  variant?: "default" | "horizontal" | "compact";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

const sizeMap = {
  sm: { logo: 32, text: 14 },
  md: { logo: 46, text: 16 },
  lg: { logo: 58, text: 20 },
};

export function Logo({
  variant = "default",
  size = "md",
  href = "/",
  className = "",
}: LogoProps) {
  const dimensions = sizeMap[size];

  const logoContent = (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/brand/logo-mark.svg"
        alt="SY Data"
        width={dimensions.logo}
        height={dimensions.logo}
        className="block object-contain"
      />
      {variant !== "compact" && (
        <div className="flex flex-col">
          <span className="font-bold tracking-[-0.04em] text-slate-950" style={{ fontSize: dimensions.text }}>
            <span className="text-[#1C3E88]">SY</span>{" "}
            <span className="bg-[linear-gradient(90deg,#198EC0,#79C94E)] bg-clip-text text-transparent">
              Data
            </span>
          </span>
          {variant === "horizontal" && (
            <span className="text-[11px] font-medium tracking-[0.18em] text-slate-500 uppercase">
              Affordable, always connected
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{logoContent}</Link>;
  }

  return logoContent;
}

// Icon-only variant for compact use cases
export function LogoIcon({ size = "md", className = "" }: Omit<LogoProps, "variant" | "href">) {
  const dimensions = sizeMap[size];

  return (
    <Image
      src="/brand/logo-mark.svg"
      alt="SY Data"
      width={dimensions.logo}
      height={dimensions.logo}
      className={className}
    />
  );
}
