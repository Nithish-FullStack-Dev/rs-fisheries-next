// app/api/agent/[id]/route.ts
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const DELETE = withAuth(
  apiHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const existing = await prisma.agent.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Agent not found");

    await prisma.agent.delete({ where: { id } });

    return NextResponse.json(
      new ApiResponse(200, null, "Agent deleted successfully"),
      { status: 200 }
    );
  })
);

export const PATCH = withAuth(
  apiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const existing = await prisma.agent.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Agent not found");

    const formData = await req.formData();

    const optionalString = (key: string) => {
      const value = formData.get(key);
      return value !== null ? String(value).trim() : undefined;
    };

    const name = optionalString("name");
    const phone = optionalString("phone");
    const address = optionalString("address");
    const isActiveRaw = formData.get("isActive");
    const isActive =
      isActiveRaw !== null ? isActiveRaw === "true" : undefined;

    try {
      const agent = await prisma.agent.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return NextResponse.json(
        new ApiResponse(200, agent, "Agent updated successfully"),
        { status: 200 }
      );
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ApiError(
            400,
            "An agent with this phone number already exists"
          );
        }
      }
      throw error;
    }
  })
);

export const GET = withAuth(
  apiHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        agentLoadings: {
          include: {
            items: true,
            vehicle: true,
          },
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    if (!agent) throw new ApiError(404, "Agent not found");

    return NextResponse.json(
      new ApiResponse(200, agent, "Agent fetched successfully"),
      { status: 200 }
    );
  })
);

