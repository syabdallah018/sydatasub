import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";
import { ensureRewardSchema, getRewardRules } from "@/lib/rewards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

async function requireAdmin(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "ADMIN") {
    return null;
  }
  return sessionUser;
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAdmin(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    const rules = await getRewardRules();
    return NextResponse.json({ rules }, { headers: utf8Headers });
  } catch (error) {
    console.error("[ADMIN][REWARD_SETTINGS][GET]", error);
    return NextResponse.json(
      { error: "Failed to load reward settings" },
      { status: 500, headers: utf8Headers }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await requireAdmin(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    await ensureRewardSchema();

    const body = await request.json();
    const rules = Array.isArray(body.rules) ? body.rules : null;
    if (!rules || rules.length === 0) {
      return NextResponse.json(
        { error: "rules array is required" },
        { status: 400, headers: utf8Headers }
      );
    }

    for (const rule of rules) {
      const id = typeof rule.id === "string" ? rule.id : "";
      if (!id) {
        return NextResponse.json(
          { error: "Each rule requires an id" },
          { status: 400, headers: utf8Headers }
        );
      }

      const triggerType = String(rule.triggerType || "").toUpperCase();
      if (!["SIGNUP", "DEPOSIT"].includes(triggerType)) {
        return NextResponse.json(
          { error: `Invalid trigger type for rule ${id}` },
          { status: 400, headers: utf8Headers }
        );
      }

      const title = String(rule.title || "").trim();
      if (!title) {
        return NextResponse.json(
          { error: `Title is required for rule ${id}` },
          { status: 400, headers: utf8Headers }
        );
      }

      const rewardAmount = Number(rule.rewardAmount);
      if (!Number.isFinite(rewardAmount) || rewardAmount < 0) {
        return NextResponse.json(
          { error: `Invalid reward amount for rule ${id}` },
          { status: 400, headers: utf8Headers }
        );
      }

      const depositThresholdAmount =
        triggerType === "DEPOSIT" ? Number(rule.thresholdAmount) : null;
      const maxThresholdAmount =
        triggerType === "DEPOSIT" && rule.maxThresholdAmount !== null && rule.maxThresholdAmount !== undefined && rule.maxThresholdAmount !== ""
          ? Number(rule.maxThresholdAmount)
          : null;

      if (
        triggerType === "DEPOSIT" &&
        (depositThresholdAmount === null ||
          !Number.isFinite(depositThresholdAmount) ||
          depositThresholdAmount < 0)
      ) {
        return NextResponse.json(
          { error: `Invalid threshold amount for rule ${id}` },
          { status: 400, headers: utf8Headers }
        );
      }

      if (
        triggerType === "DEPOSIT" &&
        maxThresholdAmount !== null &&
        (!Number.isFinite(maxThresholdAmount) || maxThresholdAmount < (depositThresholdAmount ?? 0))
      ) {
        return NextResponse.json(
          { error: `Invalid max threshold amount for rule ${id}` },
          { status: 400, headers: utf8Headers }
        );
      }

      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "RewardRule" WHERE id = $1`,
        [id]
      );

      if (!existing) {
        return NextResponse.json(
          { error: `Reward rule ${id} not found` },
          { status: 404, headers: utf8Headers }
        );
      }

      await execute(
        `UPDATE "RewardRule"
         SET title = $1,
             description = $2,
             "triggerType" = $3,
             "thresholdAmount" = $4,
             "maxThresholdAmount" = $5,
             "rewardAmount" = $6,
             "isActive" = $7,
             "displayOrder" = $8,
             "updatedAt" = NOW()
         WHERE id = $9`,
        [
          title,
          String(rule.description || "").trim() || null,
          triggerType,
          depositThresholdAmount,
          maxThresholdAmount,
          rewardAmount,
          Boolean(rule.isActive),
          Number(rule.displayOrder || 0),
          id,
        ]
      );
    }

    const updatedRules = await getRewardRules();
    return NextResponse.json({ rules: updatedRules }, { headers: utf8Headers });
  } catch (error) {
    console.error("[ADMIN][REWARD_SETTINGS][PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update reward settings" },
      { status: 500, headers: utf8Headers }
    );
  }
}
