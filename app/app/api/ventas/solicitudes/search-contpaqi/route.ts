import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContpaqiService } from "@/lib/contpaqi-service";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const searchType = searchParams.get("type") || "nombre"; // nombre, telefono, direccion

    if (!query) {
        return NextResponse.json({ error: "Se requiere un término de búsqueda" }, { status: 400 });
    }

    try {
        const contpaqi = await getContpaqiService(prisma);
        
        // En una implementación real, el API Wrapper debería soportar filtros.
        // Por ahora, traemos la lista y filtramos aquí para la Fase 1.
        const clientes = await contpaqi.getClientes();
        
        const matches = clientes.filter((c: any) => {
            const val = query.toLowerCase();
            if (searchType === "nombre") return (c.nombre || "").toLowerCase().includes(val);
            if (searchType === "telefono") return (c.cTelefono1 || "").includes(val) || (c.cTelefono2 || "").includes(val);
            if (searchType === "direccion") return (c.cNombreCalle || "").toLowerCase().includes(val) || (c.cColonia || "").toLowerCase().includes(val);
            return false;
        });

        // Mapeamos a un formato simplificado y seguro con saldo real de estado de cuenta
        const results = await Promise.all(
            matches.slice(0, 15).map(async (c: any) => {
                const codigo = c.codigo || c.cCodigoCliente;
                let saldoReal = Number(c.cSaldoActual || c.saldo || 0);

                if (codigo) {
                    try {
                        const empresa = codigo.startsWith('DP') ? 'DP' : 'DQ';
                        const ec = await contpaqi.getClienteEstadoCuenta(codigo, empresa);
                        if (ec && (ec.saldoActual !== undefined || ec.saldoTotal !== undefined)) {
                            saldoReal = Number(ec.saldoActual ?? ec.saldoTotal ?? saldoReal);
                        }
                    } catch (_) {}
                }

                return {
                    codigo,
                    nombre: c.nombre || c.cNombreCliente,
                    rfc: c.cRFC,
                    saldo: saldoReal,
                    clasificacion: c.cNombreClasificacion1 || "Sin clasificar",
                    tipo: c.cTextoExtra1 || "Regular",
                    direccion: `${c.cNombreCalle || ''} ${c.cNumeroExterior || ''}, ${c.cColonia || ''}, ${c.cCiudad || ''}`.trim()
                };
            })
        );

        return NextResponse.json(results);
    } catch (error: any) {
        console.error("Error en búsqueda Contpaqi:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
