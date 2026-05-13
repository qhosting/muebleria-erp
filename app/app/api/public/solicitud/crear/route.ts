import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { getContpaqiService } from "@/lib/contpaqi-service";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        
        // Extraer archivos
        const ineFront = formData.get("ineFront") as File;
        const ineBack = formData.get("ineBack") as File;
        const comprobanteDomicilio = formData.get("comprobanteDomicilio") as File;

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

        const [ineFrontUrl, ineBackUrl, comprobanteDomicilioUrl] = await Promise.all([
            saveFile(ineFront),
            saveFile(ineBack),
            saveFile(comprobanteDomicilio)
        ]);

        const nombreCompleto = formData.get("nombreCompleto") as string;
        const telefono = formData.get("telefono") as string;

        // SILENT VALIDATION: Consulta a Contpaqi en segundo plano
        let contpaqiData = { codigo: null, clasif: null, saldo: 0, tipo: null };
        try {
            const contpaqi = await getContpaqiService(prisma);
            const clientes = await contpaqi.getClientes();
            const match = clientes.find((c: any) => 
                (c.nombre || "").toLowerCase().includes(nombreCompleto.toLowerCase()) ||
                (c.cTelefono1 || "").includes(telefono)
            );
            if (match) {
                contpaqiData = {
                    codigo: match.codigo || match.cCodigoCliente,
                    clasif: match.cNombreClasificacion1,
                    saldo: Number(match.cSaldoActual || 0),
                    tipo: match.cTextoExtra1
                };
            }
        } catch (e) {
            console.warn("Error en validación silenciosa Contpaqi:", e);
        }

        // Crear solicitud
        const solicitud = await prisma.solicitudCredito.create({
            data: {
                nombreCompleto,
                telefono,
                direccion: formData.get("direccion") as string,
                tipoPropiedad: formData.get("tipoPropiedad") as string,
                productoInteres: formData.get("productoInteres") as string,
                montoSolicitado: parseFloat(formData.get("montoSolicitado") as string || "0"),
                plazoSemanas: parseInt(formData.get("plazoSemanas") as string || "24"),
                ineFrontUrl,
                ineBackUrl,
                comprobanteDomicilioUrl,
                contpaqiCodigo: contpaqiData.codigo,
                contpaqiClasif: contpaqiData.clasif,
                contpaqiSaldo: contpaqiData.saldo,
                contpaqiTipo: contpaqiData.tipo,
                status: "PENDIENTE"
            }
        });

        return NextResponse.json({ success: true, id: solicitud.id });
    } catch (error: any) {
        console.error("Error en solicitud pública:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
