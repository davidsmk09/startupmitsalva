import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Ablage generierter Reports im lokalen Dateisystem (storage/reports).
 * Auf Serverless-Hosting ist das Dateisystem flüchtig – Reports werden dann
 * bei Bedarf einfach neu erzeugt.
 */
function fileName(scanId: string) {
  return `${scanId.replace(/[^a-z0-9]/gi, "")}.pdf`;
}

export async function saveReport(scanId: string, pdf: Buffer): Promise<string> {
  await mkdir(path.join(process.cwd(), "storage", "reports"), { recursive: true });
  const name = fileName(scanId);
  await writeFile(path.join(process.cwd(), "storage", "reports", name), pdf);
  return `storage/reports/${name}`;
}

export async function readReport(storedPath: string): Promise<Buffer | null> {
  const name = path.basename(storedPath).replace(/[^a-z0-9.]/gi, "");
  try {
    return await readFile(path.join(process.cwd(), "storage", "reports", name));
  } catch {
    return null;
  }
}
