import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403, headers: utf8Headers });
    }

    const id = request.nextUrl.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400, headers: utf8Headers });
    }

    const body = await request.json();
    const { balance, operation, amount } = body;

    // If operation-based adjustment
    if (operation && amount) {
      if (operation === "add") {
        const result = await queryOne<{ balance: number }>(
          `UPDATE "User" SET balance = balance + $1 WHERE id = $2 RETURNING balance`,
          [parseFloat(amount), id]
        );
        if (!result) {
          return NextResponse.json({ error: "User not found" }, { status: 404, headers: utf8Headers });
        }
        return NextResponse.json({ success: true, balance: result.balance }, { headers: utf8Headers });
      } else if (operation === "subtract") {
        const result = await queryOne<{ balance: number }>(
          `UPDATE "User" SET balance = balance - $1 WHERE id = $2 RETURNING balance`,
          [parseFloat(amount), id]
        );
        if (!result) {
          return NextResponse.json({ error: "User not found" }, { status: 404, headers: utf8Headers });
        }
        return NextResponse.json({ success: true, balance: result.balance }, { headers: utf8Headers });
      } else if (operation === "set") {
        const result = await queryOne<{ balance: number }>(
          `UPDATE "User" SET balance = $1 WHERE id = $2 RETURNING balance`,
          [parseFloat(amount), id]
        );
        if (!result) {
          return NextResponse.json({ error: "User not found" }, { status: 404, headers: utf8Headers });
        }
        return NextResponse.json({ success: true, balance: result.balance }, { headers: utf8Headers });
      }
    }

    // Direct balance set
    if (balance !== undefined) {
      const result = await queryOne<{ balance: number }>(
        `UPDATE "User" SET balance = $1 WHERE id = $2 RETURNING balance`,
        [parseFloat(balance), id]
      );
      if (!result) {
        return NextResponse.json({ error: "User not found" }, { status: 404, headers: utf8Headers });
      }
      return NextResponse.json({ success: true, balance: result.balance }, { headers: utf8Headers });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: utf8Headers });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("User update error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500, headers: utf8Headers }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403, headers: utf8Headers });
    }

    const id = request.nextUrl.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400, headers: utf8Headers });
    }

    // Delete user and all related data
    await execute(`DELETE FROM "DataTransaction" WHERE "userId" = $1`, [id]);
    await execute(`DELETE FROM "User" WHERE id = $1`, [id]);

    return NextResponse.json({ success: true }, { headers: utf8Headers });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("User delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500, headers: utf8Headers }
    );
  }
}
