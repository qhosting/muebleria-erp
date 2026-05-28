import * as fs from 'fs';
import * as readline from 'readline';

const logPath = 'C:\\Users\\AurumArch\\.gemini\\antigravity-ide\\brain\\97a2a01e-b6ff-42a8-ad91-65fb45cb8cb2\\.system_generated\\logs\\transcript.jsonl';
console.log('🔍 Buscando en los logs en:', logPath);

async function main() {
    try {
        const fileStream = fs.createReadStream(logPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let lineNum = 0;
        let found = 0;

        for await (const line of rl) {
            lineNum++;
            // Buscar términos clave
            if (line.includes('100.75.220.89') || line.includes('dasoplus-db') || line.includes('CTEXTOEXTRA1') || line.includes('DP2605075')) {
                found++;
                console.log(`\n📌 [Línea ${lineNum}] Coincidencia encontrada:`);
                // Parse JSON line and print a snippet
                try {
                    const parsed = JSON.parse(line);
                    console.log(`   Source: ${parsed.source}`);
                    console.log(`   Type: ${parsed.type}`);
                    console.log(`   Snippet: ${parsed.content ? parsed.content.slice(0, 300) : 'Sin contenido'}`);
                } catch {
                    console.log(`   Raw Snippet: ${line.slice(0, 300)}`);
                }
            }
        }

        console.log(`\n📊 Búsqueda finalizada. Total de coincidencias: ${found}`);
    } catch (error: any) {
        console.error('❌ Error leyendo el archivo de logs:', error.message);
    }
}

main();
