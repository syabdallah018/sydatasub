import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400, headers: utf8Headers });
    }

    // Verify admin access using JWT role
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    const body = await request.json();
    const { role } = body;

    // Validate role
    if (!role || !["USER", "AGENT"].includes(role.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'USER' or 'AGENT'" },
        { status: 400, headers: utf8Headers }
      );
    }

    const normalizedRole = role.toUpperCase();

    // Update user role
    const user = await queryOne<{
      id: string;
      email: string;
      name: string;
      phone: string;
      role: string;
    }>(
      `UPDATE "User" SET role = $1 WHERE id = $2 RETURNING id, email, name, phone, role`,
      [normalizedRole, id]
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404, headers: utf8Headers });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      },
      { headers: utf8Headers }
    );
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') console.error("Role update error:", error);
    return NextResponse.json(
      { error: "Failed to update user role", details: error.message },
      { status: 500, headers: utf8Headers }
    );
  }
}
