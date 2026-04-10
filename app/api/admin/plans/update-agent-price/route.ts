import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { z } from "zod";

const updateAgentPricesSchema = z.object({
  planId: z.string(),
  agent_price: z.number().positive("Agent price must be positive"),
});

const bulkUpdateSchema = z.object({
  prices: z.array(updateAgentPricesSchema),
});

export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.cookies.get("sy_session")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - no token" },
        { status: 401 }
      );
    }

    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - not admin" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Support both single update and bulk update
    let updates: z.infer<typeof updateAgentPricesSchema>[] = [];

    if (body.prices && Array.isArray(body.prices)) {
      // Bulk update
      const validated = bulkUpdateSchema.parse(body);
      updates = validated.prices;
    } else {
      // Single update
      const validated = updateAgentPricesSchema.parse(body);
      updates = [validated];
    }

    // Update all plans
    const results = [];
    for (const update of updates) {
      const plan = await prisma.plan.update({
        where: { id: update.planId },
        data: { agent_price: update.agent_price },
      });

      console.log("[ADMIN] Updated agent price for plan:", {
        planId: plan.id,
        network: plan.network,
        sizeLabel: plan.sizeLabel,
        user_price: plan.user_price,
        agent_price: plan.agent_price,
        margin: plan.user_price - plan.agent_price,
      });

      results.push({
        planId: plan.id,
        network: plan.network,
        sizeLabel: plan.sizeLabel,
        user_price: plan.user_price,
        agent_price: plan.agent_price,
        margin: plan.user_price - plan.agent_price,
      });
    }

    return NextResponse.json(
      {
        message: `Successfully updated ${results.length} plan(s)`,
        data: results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ADMIN UPDATE AGENT PRICE ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
