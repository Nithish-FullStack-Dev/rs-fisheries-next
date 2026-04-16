import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";

export const PATCH = withAuth(
    async (
        req: Request,
        context: { params: Promise<{ id: string }> },
    ) => {
        try {
            const { id } = await context.params;
            const body = await req.json();

            const otherCharges = Array.isArray(body?.otherCharges)
                ? body.otherCharges
                : [];

            const sanitizedCharges = otherCharges
                .map((charge: any) => ({
                    label: String(charge?.label || "").trim(),
                    amount: Number(charge?.amount || 0),
                }))
                .filter(
                    (charge: any) =>
                        charge.label &&
                        Number.isFinite(charge.amount) &&
                        charge.amount >= 0,
                );

            const otherChargesTotal = sanitizedCharges.reduce(
                (sum: number, item: any) => sum + Number(item.amount || 0),
                0,
            );

            const updateLoadingBreakdown = async (
                loading: any,
                source: "farmer" | "agent",
            ) => {
                const existingBreakdown =
                    loading.dispatchBreakdown &&
                        typeof loading.dispatchBreakdown === "object"
                        ? (loading.dispatchBreakdown as Prisma.JsonObject)
                        : {};

                const iceCooling = Number(
                    (existingBreakdown?.iceCooling as number) || 0,
                );

                const transportCharges = Number(
                    (existingBreakdown?.transportCharges as number) || 0,
                );

                const dispatchChargesTotal =
                    iceCooling + transportCharges + otherChargesTotal;

                const updatedBreakdown: Prisma.JsonObject = {
                    ...existingBreakdown,
                    iceCooling,
                    transportCharges,
                    otherCharges: sanitizedCharges as Prisma.JsonArray,
                    dispatchChargesTotal,
                };

                const grandTotal =
                    Number(loading.totalPrice || 0) + dispatchChargesTotal;

                if (source === "farmer") {
                    const updated = await prisma.formerLoading.update({
                        where: { id },
                        data: {
                            dispatchBreakdown: updatedBreakdown,
                            dispatchChargesTotal,
                            grandTotal,
                        },
                    });

                    return NextResponse.json({
                        success: true,
                        source: "farmer",
                        data: updated,
                    });
                }

                const updated = await prisma.agentLoading.update({
                    where: { id },
                    data: {
                        dispatchBreakdown: updatedBreakdown,
                        dispatchChargesTotal,
                        grandTotal,
                    },
                });

                return NextResponse.json({
                    success: true,
                    source: "agent",
                    data: updated,
                });
            };

            const farmerLoading = await prisma.formerLoading.findUnique({
                where: { id },
                select: {
                    id: true,
                    totalPrice: true,
                    dispatchBreakdown: true,
                },
            });

            if (farmerLoading) {
                return await updateLoadingBreakdown(farmerLoading, "farmer");
            }

            const agentLoading = await prisma.agentLoading.findUnique({
                where: { id },
                select: {
                    id: true,
                    totalPrice: true,
                    dispatchBreakdown: true,
                },
            });

            if (agentLoading) {
                return await updateLoadingBreakdown(agentLoading, "agent");
            }

            return NextResponse.json(
                {
                    success: false,
                    message: "Bill not found",
                },
                { status: 404 },
            );
        } catch (error: any) {
            console.error("PATCH /api/vendor-bills/[id]/other-charges", error);

            return NextResponse.json(
                {
                    success: false,
                    message: error?.message || "Failed to update other charges",
                },
                { status: 500 },
            );
        }
    },
);
export const DELETE = withAuth(
    async (
        req: Request,
        context: { params: Promise<{ id: string }> },
    ) => {
        try {
            const { id } = await context.params;
            const body = await req.json();

            const chargeIndex = Number(body?.chargeIndex);

            if (!Number.isInteger(chargeIndex) || chargeIndex < 0) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Invalid charge index",
                    },
                    { status: 400 },
                );
            }

            const deleteChargeFromLoading = async (
                loading: {
                    totalPrice: number | null;
                    dispatchBreakdown: Prisma.JsonValue | null;
                    dispatchCharges?: Array<{
                        id: string;
                        type: string;
                        label: string | null;
                        amount: number | null;
                    }>;
                },
                source: "farmer" | "agent",
            ) => {
                const dispatchCharges = Array.isArray(loading.dispatchCharges)
                    ? loading.dispatchCharges
                    : [];

                const existingBreakdown =
                    loading.dispatchBreakdown &&
                        typeof loading.dispatchBreakdown === "object"
                        ? (loading.dispatchBreakdown as Prisma.JsonObject)
                        : {};

                const otherDispatchCharges = dispatchCharges
                    .filter(
                        (c) =>
                            c.type === "OTHER" &&
                            typeof c.label === "string" &&
                            c.label.trim().length > 0,
                    )
                    .map((c) => ({
                        id: c.id,
                        label: c.label!.trim(),
                        amount: Number(c.amount || 0),
                    }));

                const hasDispatchChargeRows = otherDispatchCharges.length > 0;

                let updatedBreakdown: Prisma.JsonObject;
                let dispatchChargesTotal: number;

                if (hasDispatchChargeRows) {
                    const targetCharge = otherDispatchCharges[chargeIndex];

                    if (!targetCharge) {
                        throw new Error("Other charge not found");
                    }

                    await prisma.dispatchCharge.delete({
                        where: { id: targetCharge.id },
                    });

                    const remainingCharges = dispatchCharges.filter(
                        (c) => c.id !== targetCharge.id,
                    );

                    const remainingOtherCharges = remainingCharges
                        .filter(
                            (c) =>
                                c.type === "OTHER" &&
                                typeof c.label === "string" &&
                                c.label.trim().length > 0,
                        )
                        .map((c) => ({
                            label: c.label!.trim(),
                            amount: Number(c.amount || 0),
                        }));

                    const iceCooling = remainingCharges.reduce(
                        (sum, c) =>
                            c.type === "ICE_COOLING"
                                ? sum + Number(c.amount || 0)
                                : sum,
                        0,
                    );

                    const transportCharges = remainingCharges.reduce(
                        (sum, c) =>
                            c.type === "TRANSPORT"
                                ? sum + Number(c.amount || 0)
                                : sum,
                        0,
                    );

                    dispatchChargesTotal = remainingCharges.reduce(
                        (sum, c) => sum + Number(c.amount || 0),
                        0,
                    );

                    updatedBreakdown = {
                        ...existingBreakdown,
                        iceCooling,
                        transportCharges,
                        otherCharges: remainingOtherCharges as Prisma.JsonArray,
                        dispatchChargesTotal,
                    };
                } else {
                    const currentOtherCharges = Array.isArray(
                        existingBreakdown.otherCharges,
                    )
                        ? (existingBreakdown.otherCharges as Prisma.JsonArray)
                        : [];

                    const updatedOtherCharges = currentOtherCharges.filter(
                        (_, index) => index !== chargeIndex,
                    ) as Prisma.JsonArray;

                    const otherChargesTotal = updatedOtherCharges.reduce(
                        (sum: number, item: any) =>
                            sum + Number((item as any)?.amount || 0),
                        0,
                    );

                    const iceCooling = Number(
                        (existingBreakdown.iceCooling as number) || 0,
                    );

                    const transportCharges = Number(
                        (existingBreakdown.transportCharges as number) || 0,
                    );

                    dispatchChargesTotal =
                        iceCooling + transportCharges + otherChargesTotal;

                    updatedBreakdown = {
                        ...existingBreakdown,
                        otherCharges: updatedOtherCharges,
                        dispatchChargesTotal,
                    };
                }

                const grandTotal =
                    Number(loading.totalPrice || 0) + dispatchChargesTotal;

                if (source === "farmer") {
                    const updated = await prisma.formerLoading.update({
                        where: { id },
                        data: {
                            dispatchBreakdown: updatedBreakdown,
                            dispatchChargesTotal,
                            grandTotal,
                        },
                    });

                    return NextResponse.json({
                        success: true,
                        source: "farmer",
                        data: updated,
                    });
                }

                const updated = await prisma.agentLoading.update({
                    where: { id },
                    data: {
                        dispatchBreakdown: updatedBreakdown,
                        dispatchChargesTotal,
                        grandTotal,
                    },
                });

                return NextResponse.json({
                    success: true,
                    source: "agent",
                    data: updated,
                });
            };

            const farmerLoading = await prisma.formerLoading.findUnique({
                where: { id },
                select: {
                    totalPrice: true,
                    dispatchBreakdown: true,
                    dispatchCharges: {
                        select: {
                            id: true,
                            type: true,
                            label: true,
                            amount: true,
                        },
                        orderBy: { createdAt: "desc" },
                    },
                },
            });

            if (farmerLoading) {
                return await deleteChargeFromLoading(farmerLoading, "farmer");
            }

            const agentLoading = await prisma.agentLoading.findUnique({
                where: { id },
                select: {
                    totalPrice: true,
                    dispatchBreakdown: true,
                    dispatchCharges: {
                        select: {
                            id: true,
                            type: true,
                            label: true,
                            amount: true,
                        },
                        orderBy: { createdAt: "desc" },
                    },
                },
            });

            if (agentLoading) {
                return await deleteChargeFromLoading(agentLoading, "agent");
            }

            return NextResponse.json(
                {
                    success: false,
                    message: "Bill not found",
                },
                { status: 404 },
            );
        } catch (error: any) {
            console.error("DELETE /api/vendor-bills/[id]/other-charges", error);

            return NextResponse.json(
                {
                    success: false,
                    message: error?.message || "Failed to delete other charge",
                },
                { status: 500 },
            );
        }
    },
);