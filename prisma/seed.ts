import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.businessType.upsert({
    where: { key: "restaurant" },
    update: {},
    create: { key: "restaurant", name: "Restoran / Kafe" },
  });
  console.log("Seed tamamlandı: işletme türleri hazır.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
