import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';
import { checkPermission } from '@/lib/permissions';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        const hasModuleAccess = await checkPermission(userRole, 'ventas');

        if (!hasModuleAccess) {
            return NextResponse.json({ error: 'No tienes permisos para auditar con IA' }, { status: 403 });
        }

        const body = await request.json();
        const { documentoId } = body;

        if (!documentoId) {
            return NextResponse.json({ error: 'ID de documento requerido' }, { status: 400 });
        }

        const db = prisma as any;
        const documento = await db.documentoBoveda.findUnique({
            where: { id: documentoId }
        });

        if (!documento) {
            return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
        }

        if (!documento.url || !documento.url.startsWith('/uploads/')) {
            return NextResponse.json({ error: 'El archivo no está almacenado localmente' }, { status: 400 });
        }

        const filePath = join(process.cwd(), 'public', documento.url);
        
        let fileBuffer;
        try {
            fileBuffer = await readFile(filePath);
        } catch (e) {
            return NextResponse.json({ error: 'No se pudo leer el archivo físico' }, { status: 404 });
        }

        const base64Data = fileBuffer.toString('base64');
        const fileExtension = documento.url.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = fileExtension === 'png' ? 'image/png' : (fileExtension === 'pdf' ? 'application/pdf' : 'image/jpeg');

        if (mimeType === 'application/pdf') {
            return NextResponse.json({ error: 'La IA no soporta PDFs en este momento' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API Key de Gemini no configurada en .env' }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });
        
        const promptText = `
        Actúa como un auditor experto en prevención de fraude documental en México.
        Analiza esta imagen y determina si es un documento legítimo (como una credencial INE, comprobante de domicilio, etc.) o si es fraudulenta.
        
        Busca señales de fraude como:
        1. ¿Es una foto tomada a la pantalla de un celular, computadora o tablet? (Se ven píxeles, bordes de la pantalla, reflejos artificiales).
        2. ¿Tiene signos evidentes de edición digital o montaje?
        3. ¿Es un documento irrelevante (una foto de un mueble, un color sólido, etc.)?
        
        Responde ÚNICAMENTE con un objeto JSON con este formato exacto (sin bloques de código markdown, solo el JSON):
        {
          "isValid": true o false,
          "reason": "Explicación breve de por qué es válido o por qué se detecta como fraude."
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: promptText },
                        { inlineData: { data: base64Data, mimeType } }
                    ]
                }
            ],
            config: {
                responseMimeType: 'application/json'
            }
        });

        const textResponse = response.text;
        if (!textResponse) {
             throw new Error('Sin respuesta de Gemini');
        }

        let aiResult;
        try {
             aiResult = JSON.parse(textResponse);
        } catch(e) {
             console.error("Error parseando respuesta JSON de Gemini:", textResponse);
             const match = textResponse.match(/```(?:json)?\n([\s\S]*)\n```/);
             if (match && match[1]) {
                 aiResult = JSON.parse(match[1]);
             } else {
                 throw new Error("Respuesta de IA no tiene formato JSON válido");
             }
        }

        const newStatus = aiResult.isValid ? 'VALIDADO' : 'RECHAZADO';
        
        const updatedDoc = await db.documentoBoveda.update({
            where: { id: documentoId },
            data: {
                status: newStatus,
                motivoRechazo: aiResult.isValid ? null : aiResult.reason,
                validadoPorId: (session.user as any).id,
                fechaValidacion: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            isValid: aiResult.isValid,
            reason: aiResult.reason,
            documento: updatedDoc
        });

    } catch (error: any) {
        console.error('Error en validate-ai:', error);
        return NextResponse.json({ 
            error: 'Error al procesar con IA',
            details: error.message 
        }, { status: 500 });
    }
}
