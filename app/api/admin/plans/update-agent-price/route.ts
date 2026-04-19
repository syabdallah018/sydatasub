import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { z } from "zod";

const updatePricesSchema = z
  .object({
    planId: z.string(),
    user_price: z.number().positive("User price must be positive"),
    agent_price: z.number().positive("Agent price must be positive"),
  })
  .refine((data) => data.agent_price <= data.user_price, {
    message: "Agent price cannot exceed user price",
    path: ["agent_price"],
  });

const bulkUpdateSchema = z.object({
  prices: z.array(updatePricesSchema),
});

export async function POST(req: NextRequest) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    const body = await req.json();
    const validated = bulkUpdateSchema.parse(body);

    const results = [];
    for (const update of validated.prices) {
      const plan = await prisma.plan.update({
        where: { id: update.planId },
        data: {
          user_price: update.user_price,
          agent_price: update.agent_price,
          price: update.user_price,
        },
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
    console.error("[ADMIN UPDATE PRICE ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
