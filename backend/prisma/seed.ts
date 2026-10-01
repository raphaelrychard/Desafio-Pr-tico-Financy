import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const db = new PrismaClient();
try {
  const existing = await db.user.findUnique({
    where: { email: "demo@financy.local" },
  });
  if (existing) {
    console.log("A conta de demonstração já existe. Nenhum dado foi alterado.");
  } else {
    const passwordHash = await hash("Financy@123", 12);
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: "Conta teste",
          email: "demo@financy.local",
          passwordHash,
        },
      });
      const definitions = [
        [
          "Alimentação",
          "Restaurantes, delivery e refeições",
          "blue",
          "utensils",
        ],
        ["Entretenimento", "Cinema, jogos e lazer", "pink", "ticket"],
        [
          "Investimento",
          "Aplicações e retornos financeiros",
          "green",
          "piggy-bank",
        ],
        [
          "Mercado",
          "Compras de supermercado e mantimentos",
          "orange",
          "shopping-cart",
        ],
        ["Salário", "Renda mensal e bonificações", "green", "briefcase"],
        ["Saúde", "Medicamentos, consultas e exames", "red", "heart"],
        [
          "Transporte",
          "Gasolina, transporte público e viagens",
          "purple",
          "car",
        ],
        [
          "Utilidades",
          "Energia, água, internet e telefone",
          "yellow",
          "receipt",
        ],
      ];
      const categories = await Promise.all(
        definitions.map(([name, description, color, icon]) =>
          tx.category.create({
            data: { name, description, color, icon, userId: user.id },
          }),
        ),
      );
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const rows: [string, number, string, number, number][] = [
        ["Pagamento de Salário", 425000, "INCOME", 4, 1],
        ["Jantar no Restaurante", 8950, "EXPENSE", 0, 2],
        ["Posto de Gasolina", 10000, "EXPENSE", 6, 3],
        ["Compras no Mercado", 15680, "EXPENSE", 3, 4],
        ["Retorno de Investimento", 34025, "INCOME", 2, 5],
        ["Aluguel", 170000, "EXPENSE", 7, 6],
        ["Freelance", 250000, "INCOME", 4, 7],
        ["Compras Jantar", 15000, "EXPENSE", 3, 8],
        ["Cinema", 8800, "EXPENSE", 1, 9],
        ["Internet", 9990, "EXPENSE", 7, 10],
        ["Almoço de domingo", 12550, "EXPENSE", 0, 11],
        ["Transporte por aplicativo", 3450, "EXPENSE", 6, 12],
      ];
      for (const [description, amountCents, type, categoryIndex, day] of rows)
        await tx.transaction.create({
          data: {
            description,
            amountCents,
            type,
            categoryId: categories[categoryIndex].id,
            userId: user.id,
            date: `${month}-${String(Math.min(day, now.getDate())).padStart(2, "0")}`,
          },
        });
    });
    console.log(
      "Conta de demonstração: demo@financy.local / Financy@123 (dados fictícios).",
    );
  }
} finally {
  await db.$disconnect();
}
