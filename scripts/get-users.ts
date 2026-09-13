import prisma from '../src/lib/prisma';
async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teacher: {
        select: {
          classTeacherAssignments: { select: { class: { select: { name: true } } } },
          teachingAssignments: { select: { subject: { select: { name: true } }, class: { select: { name: true } } } }
        }
      },
      student: {
        select: {
          enrollments: { select: { class: { select: { name: true } } } }
        }
      }
    }
  });
  console.log(JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
