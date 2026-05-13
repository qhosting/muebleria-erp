import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("q");

    try {
        const where: any = {};
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { nombreCompleto: { contains: search, mode: 'insensitive' } },
                { telefono: { contains: search } }
            ];
        }

        const solicitudes = await prisma.solicitudCredito.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                vendedor: {
                    select: { name: true }
                }
            }
        });

        return NextResponse.json(solicitudes);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
