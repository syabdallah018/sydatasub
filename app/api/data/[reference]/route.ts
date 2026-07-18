import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeveloperRequest } from "@/lib/developer-auth";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ reference: string }> }
) {
  try {
    const params = await props.params;
    const { reference } = params;
    const authResult = await verifyDeveloperRequest(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { user } = authResult;

    const transaction = await prisma.transaction.findFirst({
      where: {
        reference,
        userId: user.id,
      },
      select: {
        id: true,
        reference: true,
        externalReference: true,
        type: true,
        status: true,
        amount: true,
        phone: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        transaction: {
          id: transaction.id,
          reference: transaction.reference,
          externalReference: transaction.externalReference,
          type: transaction.type,
          status: transaction.status,
          amount: transaction.amount, // Naira
          recipient: transaction.phone,
          description: transaction.description,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DEV TRANSACTION FETCH ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
