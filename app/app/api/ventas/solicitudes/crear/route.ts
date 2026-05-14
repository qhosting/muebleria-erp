import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    try {
        const formData = await req.formData();
        
        // Extraer archivos
        const ineFront = formData.get("ineFront") as File;
        const ineBack = formData.get("ineBack") as File;
        const comprobanteDomicilio = formData.get("comprobanteDomicilio") as File;
        const comprobanteIngresos = formData.get("comprobanteIngresos") as File;
        const comprobantePropiedad = formData.get("comprobantePropiedad") as File;

        const uploadDir = join(process.cwd(), "public", "uploads", "solicitudes");

        const saveFile = async (file: File | null) => {
            if (!file) return null;
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const fileName = `${uuidv4()}-${file.name}`;
            const path = join(uploadDir, fileName);
            await writeFile(path, new Uint8Array(buffer));
            return `/uploads/solicitudes/${fileName}`;
        };

        const [
            ineFrontUrl, 
            ineBackUrl, 
            comprobanteDomicilioUrl, 
            comprobanteIngresosUrl, 
            comprobantePropiedadUrl
        ] = await Promise.all([
            saveFile(ineFront),
            saveFile(ineBack),
            saveFile(comprobanteDomicilio),
            saveFile(comprobanteIngresos),
            saveFile(comprobantePropiedad)
        ]);

        // Extraer datos del formulario
        const data = {
            nombreCompleto: formData.get("nombreCompleto") as string,
            telefono: formData.get("telefono") as string,
            curp: formData.get("curp") as string,
            direccion: formData.get("direccion") as string,
            productoInteres: formData.get("productoInteres") as string,
            montoSolicitado: parseFloat(formData.get("montoSolicitado") as string || "0"),
            plazoSemanas: parseInt(formData.get("plazoSemanas") as string || "0"),
            scoreBuro: parseInt(formData.get("scoreBuro") as string || "0"),
            tipoPropiedad: formData.get("tipoPropiedad") as string,
            profesion: formData.get("profesion") as string,
            tieneTrabajo: formData.get("tieneTrabajo") === "true",
            contpaqiCodigo: formData.get("contpaqiCodigo") as string,
            contpaqiClasif: formData.get("contpaqiClasif") as string,
            contpaqiSaldo: parseFloat(formData.get("contpaqiSaldo") as string || "0"),
            contpaqiTipo: formData.get("contpaqiTipo") as string,
            nombreAval: formData.get("nombreAval") as string,
            telefonoAval: formData.get("telefonoAval") as string,
            vendedorId: userId,
            ineFrontUrl,
            ineBackUrl,
            comprobanteDomicilioUrl,
            comprobanteIngresosUrl,
            comprobantePropiedadUrl,
            status: "PENDIENTE"
        };

        const solicitud = await prisma.solicitudCredito.create({
            data
        });

        return NextResponse.json({ success: true, id: solicitud.id });
    } catch (error: any) {
        console.error("Error creando solicitud:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
