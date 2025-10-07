import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1) Usuário demo
  const user = await prisma.user.upsert({
    where: { email: "demo@educ.local" },
    update: {},
    create: {
      email: "demo@educ.local",
      name: "Usuário Demo"
    }
  });

  // 2) Turma base
  const turma = await prisma.class.create({
    data: {
      name: "Turma Demo",
      description: "Turma inicial para testes.",
      ownerId: user.id,
      nextNo: 1
    }
  });

  // 3) Duas chamadas (lessons) sequenciais
  const lesson1 = await prisma.lesson.create({
    data: {
      classId: turma.id,
      number: 1,
      date: new Date(),
      title: "Chamada 1"
    }
  });

  const lesson2 = await prisma.lesson.create({
    data: {
      classId: turma.id,
      number: 2,
      date: new Date(),
      title: "Chamada 2"
    }
  });

  // Atualiza o próximo número da turma
  await prisma.class.update({
    where: { id: turma.id },
    data: { nextNo: 3 }
  });

  // 4) Dois conteúdos (vinculados às duas chamadas)
  await prisma.content.create({
    data: {
      classId: turma.id,
      lessonId: lesson1.id,
      title: "Conteúdo 1",
      text: "Introdução ao curso, regras e objetivos.",
      objetivos: "Apresentar o curso e alinhar expectativas.",
      desenvolvimento: "Discussão inicial e atividade leve.",
      recursos: "Quadro, slides.",
      bncc: "Geral"
    }
  });

  await prisma.content.create({
    data: {
      classId: turma.id,
      lessonId: lesson2.id,
      title: "Conteúdo 2",
      text: "Fundamentos básicos e revisão.",
      objetivos: "Consolidar conceitos e preparar prática.",
      desenvolvimento: "Exercícios guiados.",
      recursos: "Material impresso, laboratório.",
      bncc: "Geral"
    }
  });

  console.log("✅ Seed concluído:");
  console.log({
    user: { id: user.id, email: user.email },
    class: { id: turma.id, nextNo: 3 },
    lessons: [{ id: lesson1.id, number: 1 }, { id: lesson2.id, number: 2 }]
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed falhou:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
