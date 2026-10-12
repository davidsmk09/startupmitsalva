/**
 * Stellt das Prisma-Schema auf PostgreSQL um (für Produktion).
 * Danach: DATABASE_URL auf Postgres setzen und
 *   npx prisma migrate dev --name init   (neue Postgres-Migrationen erzeugen)
 * bzw. in Produktion: npx prisma migrate deploy
 *
 * Die vorhandenen SQLite-Migrationen werden nach prisma/migrations-sqlite
 * verschoben, da Migrationen providerspezifisch sind.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const file = "prisma/schema.prisma";
const schema = readFileSync(file, "utf8");
if (schema.includes('provider = "postgresql"')) {
  console.log("Schema nutzt bereits PostgreSQL.");
  process.exit(0);
}
writeFileSync(file, schema.replace('provider = "sqlite"', 'provider = "postgresql"'));
if (existsSync("prisma/migrations") && !existsSync("prisma/migrations-sqlite")) {
  renameSync("prisma/migrations", "prisma/migrations-sqlite");
}
console.log('Schema auf provider = "postgresql" umgestellt. SQLite-Migrationen liegen unter prisma/migrations-sqlite.');
console.log("Nächste Schritte: DATABASE_URL setzen, dann `npx prisma migrate dev --name init`.");
