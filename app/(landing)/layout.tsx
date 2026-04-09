import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SY DATA SUB - Nigeria's Fastest Data Platform",
  description: "Buy data for all networks at the best prices. Instant delivery guaranteed.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
