import "dotenv/config";
import prisma from "./src/lib/prisma";
async function run() {
  await prisma.user.deleteMany({ where: { email: { contains: "phase13" } } });
  await prisma.user.deleteMany({ where: { name: { contains: "Test" } } });
  await prisma.alert.deleteMany({ where: { title: { contains: "Test" } } });
  console.log("Cleanup done.");
}
run();
