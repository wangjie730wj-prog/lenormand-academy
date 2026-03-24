import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function upsertUser(username: string, password: string, role: UserRole) {
  return prisma.user.upsert({
    where: { username },
    update: {
      role,
      passwordHash: await hashPassword(password),
    },
    create: {
      username,
      passwordHash: await hashPassword(password),
      role,
    },
  });
}

async function main() {
  const admin = await upsertUser("admin", "admin2024", "ADMIN");
  const student = await upsertUser("student01", "student2024", "STUDENT");
  const paid = await upsertUser("paid01", "paid2024", "PAID_STUDENT");

  const pendingCase = await prisma.personalCase.upsert({
    where: { id: "seed-case-student-1" },
    update: {},
    create: {
      id: "seed-case-student-1",
      userId: student.id,
      title: "示例案例：他为什么突然减少联系",
      category: "情感",
      tags: ["情感", "联系频率", "关系观察"],
      summary: "示例案例，用于验证个人案例、投稿与审核流。",
      content:
        "问题：他最近为什么突然减少联系？\n\n牌组：骑手 + 云 + 狐狸 + 十字路口 + 月亮\n\n简析：前段有消息变化，中段带不确定与试探，后段是情绪判断与关系走向的犹豫。",
      isSubmitted: true,
    },
  });

  await prisma.submission.upsert({
    where: { id: "seed-submission-1" },
    update: {},
    create: {
      id: "seed-submission-1",
      personalCaseId: pendingCase.id,
      userId: student.id,
      status: "PENDING",
    },
  });

  const approvedCase = await prisma.personalCase.upsert({
    where: { id: "seed-case-paid-1" },
    update: {},
    create: {
      id: "seed-case-paid-1",
      userId: paid.id,
      title: "示例共享案例：2 月财富收入状况",
      category: "财富",
      tags: ["财富", "顺序法", "收入"],
      summary: "这是一个预置共享案例，用来验证共享库阅读权限。",
      content:
        "问题：2026 年 2 月财富收入状况\n\n牌组：房子 + 树 + 塔 + 鱼 + 女人\n\n结论：收入基础仍在，但受平台、制度或边界限制，更像稳定进账，而不是明显放量。",
      isSubmitted: false,
    },
  });

  await prisma.submission.upsert({
    where: { id: "seed-approved-submission" },
    update: {},
    create: {
      id: "seed-approved-submission",
      personalCaseId: approvedCase.id,
      userId: paid.id,
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  await prisma.sharedCase.upsert({
    where: { sourceSubmissionId: "seed-approved-submission" },
    update: {},
    create: {
      sourceSubmissionId: "seed-approved-submission",
      sourcePersonalCaseId: approvedCase.id,
      sourceUserId: paid.id,
      title: approvedCase.title,
      category: approvedCase.category,
      tags: approvedCase.tags,
      summary: approvedCase.summary,
      content: approvedCase.content,
      status: "PUBLISHED",
    },
  });

  console.log("Seed completed", {
    admin: admin.username,
    student: student.username,
    paid: paid.username,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
