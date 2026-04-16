// app/api/agent/route.ts (Force Refresh)
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const POST = withAuth(
  apiHandler(async (req: Request) => {
    const formData = await req.formData();

    const requiredString = (key: string) => {
      const value = formData.get(key);
      if (!value) throw new ApiError(400, `${key} is required`);
      return String(value).trim();
    };

    const optionalString = (key: string) => {
      const value = formData.get(key);
      return value ? String(value).trim() : null;
    };

    const name = requiredString("name");
    const phone = requiredString("phone");
    const address = optionalString("address");

    const isActive =
      formData.get("isActive") === null
        ? true
        : formData.get("isActive") === "true";

    try {
      const agent = await prisma.agent.create({
        data: {
          name,
          phone,
          address,
          isActive,
        },
      });

      return NextResponse.json(
        new ApiResponse(201, agent, "Agent created successfully"),
        { status: 201 }
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

export const GET = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);

  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 10), 1),
    100
  );
  const search = searchParams.get("search")?.trim() || "";

  // Support ?all=true for fetching all agents (e.g. for dropdown)
  const all = searchParams.get("all") === "true";

  const where: Prisma.AgentWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (all) {
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, address: true },
    });
    return NextResponse.json(
      new ApiResponse(200, agents, "Agents fetched successfully"),
      { status: 200 }
    );
  }

  const skip = (page - 1) * limit;

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.agent.count({ where }),
  ]);

  return NextResponse.json(
    new ApiResponse(200, agents, "Agents fetched successfully", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }),
    { status: 200 }
  );
});
