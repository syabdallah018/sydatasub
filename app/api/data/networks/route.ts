import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Logging helper - LOGS TO VERCEL IN PRODUCTION + DEVELOPMENT
const log = (step: string, data: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[NETWORKS] ${timestamp} ${step}: ${JSON.stringify(data, null, 2)}`;
  console.log(logMessage);  // Always logs - visible in Vercel
  console.error(`[NETWORKS_LOG] ${step}`, JSON.stringify(data, null, 2));
};

export async function GET() {
  try {
    log("REQUEST", { timestamp: new Date().toISOString() });

    const networks = [
      { id: 1, name: "MTN", logo: "/networks/mtn.jpeg" },
      { id: 2, name: "Glo", logo: "/networks/glo.jpeg" },
      { id: 3, name: "9mobile", logo: "/networks/9mobile.jpeg" },
      { id: 4, name: "Airtel", logo: "/networks/airtel.jpeg" },
    ];

    log("RESPONSE_200", { count: networks.length, networks });

    return NextResponse.json(networks, {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error: any) {
    log("ERROR_500", { error: error.message });
    return NextResponse.json(
      { error: "Failed to fetch networks" },
      { 
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      }
    );
  }
}
