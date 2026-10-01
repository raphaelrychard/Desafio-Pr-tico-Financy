import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { createSchema, createYoga } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import { z, ZodError } from "zod";

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32)
  throw new Error(
    "Configure JWT_SECRET com pelo menos 32 caracteres em backend/.env.",
  );
const jwtSecret: string = secret;
export const prisma = new PrismaClient();
const fail = (message: string, code = "BAD_USER_INPUT"): never => {
  throw new GraphQLError(message, { extensions: { code } });
};
type Context = { userId: string | null };
const owner = (ctx: Context) =>
  ctx.userId ?? fail("Sua sessão expirou. Entre novamente.", "UNAUTHENTICATED");
const text = z
  .string()
  .trim()
  .min(2, "Informe pelo menos 2 caracteres.")
  .max(100, "Use no máximo 100 caracteres.");
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.")
  .max(254);
const password = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(72, "Use no máximo 72 caracteres.")
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "A senha deve ocupar no máximo 72 bytes.",
  );
const categoryInput = z.object({
  name: text,
  description: z.string().trim().max(180).default(""),
  color: z.enum([
    "blue",
    "purple",
    "pink",
    "red",
    "orange",
    "yellow",
    "green",
    "gray",
  ]),
  icon: z.enum([
    "utensils",
    "briefcase",
    "car",
    "heart",
    "ticket",
    "shopping-cart",
    "gift",
    "house",
    "paw-print",
    "book-open",
    "dumbbell",
    "wallet",
    "piggy-bank",
    "laptop",
    "receipt",
    "tag",
  ]),
});
const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Informe uma data válida.");
const transactionInput = z.object({
  description: text,
  amountCents: z
    .number()
    .int()
    .positive("O valor deve ser maior que zero.")
    .max(2_000_000_000),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: dateInput,
  categoryId: z.string().min(1, "Selecione uma categoria."),
});
const filterInput = z.object({
  search: z.string().max(100).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  categoryId: z.string().optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

function safe<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      if (error instanceof ZodError) return fail(error.issues[0].message);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002")
          return fail("Este e-mail ou nome de categoria já está em uso.");
        if (error.code === "P2003")
          return fail(
            "Esta categoria possui transações. Reclassifique ou exclua as transações antes de excluí-la.",
          );
      }
      console.error(error);
      return fail(
        "Não foi possível concluir a operação. Tente novamente.",
        "INTERNAL_SERVER_ERROR",
      );
    }
  }) as T;
}
async function ownedCategory(id: string, userId: string) {
  return (
    (await prisma.category.findFirst({ where: { id, userId } })) ??
    fail("Categoria não encontrada.", "NOT_FOUND")
  );
}
async function ownedTransaction(id: string, userId: string) {
  return (
    (await prisma.transaction.findFirst({ where: { id, userId } })) ??
    fail("Transação não encontrada.", "NOT_FOUND")
  );
}
function authPayload(
  user: { id: string; name: string; email: string },
  remember = false,
) {
  return {
    user,
    token: jwt.sign({}, jwtSecret, {
      subject: user.id,
      expiresIn: remember ? "30d" : "8h",
      issuer: "financy",
      audience: "financy-web",
      algorithm: "HS256",
    }),
  };
}
const loginAttempts = new Map<string, { count: number; until: number }>();
function throttle(emailAddress: string) {
  const now = Date.now();
  for (const [key, value] of loginAttempts)
    if (value.until < now) loginAttempts.delete(key);
  const entry = loginAttempts.get(emailAddress) ?? {
    count: 0,
    until: now + 15 * 60 * 1000,
  };
  if (entry.count >= 10)
    fail("Muitas tentativas. Tente novamente em 15 minutos.", "RATE_LIMITED");
  entry.count++;
  loginAttempts.set(emailAddress, entry);
}
const typeDefs = /* GraphQL */ `
  enum TransactionType {
    INCOME
    EXPENSE
  }
  type User {
    id: ID!
    name: String!
    email: String!
  }
  type AuthPayload {
    token: String!
    user: User!
  }
  type Category {
    id: ID!
    name: String!
    description: String!
    color: String!
    icon: String!
    transactionCount: Int!
  }
  type Transaction {
    id: ID!
    description: String!
    amountCents: Int!
    type: TransactionType!
    date: String!
    category: Category!
  }
  type TransactionPage {
    items: [Transaction!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }
  type CategorySummary {
    category: Category!
    count: Int!
    amountCents: Float!
  }
  type Dashboard {
    balanceCents: Float!
    incomeCents: Float!
    expenseCents: Float!
    transactionCount: Int!
    recent: [Transaction!]!
    categories: [CategorySummary!]!
  }
  input CategoryInput {
    name: String!
    description: String
    color: String!
    icon: String!
  }
  input TransactionInput {
    description: String!
    amountCents: Int!
    type: TransactionType!
    date: String!
    categoryId: ID!
  }
  input TransactionFilter {
    search: String
    type: TransactionType
    categoryId: ID
    month: String
    page: Int
    pageSize: Int
  }
  type Query {
    me: User!
    categories: [Category!]!
    transactions(filter: TransactionFilter): TransactionPage!
    dashboard(month: String!): Dashboard!
  }
  type Mutation {
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!, remember: Boolean): AuthPayload!
    updateProfile(name: String!): User!
    createCategory(input: CategoryInput!): Category!
    updateCategory(id: ID!, input: CategoryInput!): Category!
    deleteCategory(id: ID!): Boolean!
    createTransaction(input: TransactionInput!): Transaction!
    updateTransaction(id: ID!, input: TransactionInput!): Transaction!
    deleteTransaction(id: ID!): Boolean!
  }
`;
export const yoga = createYoga({
  graphqlEndpoint: "/graphql",
  cors: {
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
      .split(",")
      .map((s) => s.trim()),
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  context: ({ request }): Context => {
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    if (!token) return { userId: null };
    try {
      const data = jwt.verify(token, jwtSecret, {
        algorithms: ["HS256"],
        issuer: "financy",
        audience: "financy-web",
      });
      return { userId: typeof data !== "string" && data.sub ? data.sub : null };
    } catch {
      return { userId: null };
    }
  },
  schema: createSchema<Context>({
    typeDefs,
    resolvers: {
      Category: {
        transactionCount: (parent: any, _: unknown, ctx: Context) =>
          parent._count?.transactions ??
          prisma.transaction.count({
            where: { categoryId: parent.id, userId: owner(ctx) },
          }),
      },
      Query: {
        me: safe(
          async (_: unknown, __: unknown, ctx: Context) =>
            (await prisma.user.findUnique({ where: { id: owner(ctx) } })) ??
            fail("Conta não encontrada.", "UNAUTHENTICATED"),
        ),
        categories: safe(async (_: unknown, __: unknown, ctx: Context) =>
          prisma.category.findMany({
            where: { userId: owner(ctx) },
            include: { _count: { select: { transactions: true } } },
            orderBy: { name: "asc" },
          }),
        ),
        transactions: safe(
          async (_: unknown, args: { filter?: unknown }, ctx: Context) => {
            const f = filterInput.parse(args.filter ?? {});
            const where: Prisma.TransactionWhereInput = {
              userId: owner(ctx),
              ...(f.search && { description: { contains: f.search } }),
              ...(f.type && { type: f.type }),
              ...(f.categoryId && { categoryId: f.categoryId }),
              ...(f.month && { date: { startsWith: f.month } }),
            };
            const [total, items] = await prisma.$transaction([
              prisma.transaction.count({ where }),
              prisma.transaction.findMany({
                where,
                include: { category: true },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                take: f.pageSize,
                skip: (f.page - 1) * f.pageSize,
              }),
            ]);
            return { items, total, page: f.page, pageSize: f.pageSize };
          },
        ),
        dashboard: safe(
          async (_: unknown, { month }: { month: string }, ctx: Context) => {
            filterInput.parse({ month });
            const userId = owner(ctx);
            const rows = await prisma.transaction.findMany({
              where: { userId },
              include: { category: true },
              orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            });
            const monthRows = rows.filter((r) => r.date.startsWith(month));
            const groups = new Map<
              string,
              {
                category: (typeof rows)[number]["category"];
                count: number;
                amountCents: number;
              }
            >();
            for (const r of monthRows) {
              const g = groups.get(r.categoryId) ?? {
                category: r.category,
                count: 0,
                amountCents: 0,
              };
              g.count++;
              g.amountCents += r.amountCents;
              groups.set(r.categoryId, g);
            }
            return {
              balanceCents: rows.reduce(
                (sum, r) =>
                  sum + (r.type === "INCOME" ? r.amountCents : -r.amountCents),
                0,
              ),
              incomeCents: monthRows
                .filter((r) => r.type === "INCOME")
                .reduce((s, r) => s + r.amountCents, 0),
              expenseCents: monthRows
                .filter((r) => r.type === "EXPENSE")
                .reduce((s, r) => s + r.amountCents, 0),
              transactionCount: rows.length,
              recent: rows.slice(0, 5),
              categories: [...groups.values()].sort(
                (a, b) => b.count - a.count,
              ),
            };
          },
        ),
      },
      Mutation: {
        register: safe(async (_: unknown, args: unknown) => {
          const data = z.object({ name: text, email, password }).parse(args);
          const user = await prisma.user.create({
            data: {
              name: data.name,
              email: data.email,
              passwordHash: await hash(data.password, 12),
            },
          });
          return authPayload(user);
        }),
        login: safe(async (_: unknown, args: unknown) => {
          const data = z
            .object({
              email,
              password: z.string().min(1).max(72),
              remember: z.boolean().optional().nullable(),
            })
            .parse(args);
          throttle(data.email);
          const user = await prisma.user.findUnique({
            where: { email: data.email },
          });
          if (!user || !(await compare(data.password, user.passwordHash)))
            return fail("E-mail ou senha incorretos.", "INVALID_CREDENTIALS");
          loginAttempts.delete(data.email);
          return authPayload(user, data.remember ?? false);
        }),
        updateProfile: safe(
          async (_: unknown, { name }: { name: string }, ctx: Context) =>
            prisma.user.update({
              where: { id: owner(ctx) },
              data: { name: text.parse(name) },
            }),
        ),
        createCategory: safe(
          async (_: unknown, { input }: { input: unknown }, ctx: Context) =>
            prisma.category.create({
              data: { ...categoryInput.parse(input), userId: owner(ctx) },
            }),
        ),
        updateCategory: safe(
          async (
            _: unknown,
            { id, input }: { id: string; input: unknown },
            ctx: Context,
          ) => {
            const userId = owner(ctx);
            await ownedCategory(id, userId);
            return prisma.category.update({
              where: { id, userId },
              data: categoryInput.parse(input),
            });
          },
        ),
        deleteCategory: safe(
          async (_: unknown, { id }: { id: string }, ctx: Context) => {
            const userId = owner(ctx);
            await ownedCategory(id, userId);
            await prisma.category.delete({ where: { id, userId } });
            return true;
          },
        ),
        createTransaction: safe(
          async (_: unknown, { input }: { input: unknown }, ctx: Context) => {
            const userId = owner(ctx);
            const data = transactionInput.parse(input);
            await ownedCategory(data.categoryId, userId);
            return prisma.transaction.create({
              data: { ...data, userId },
              include: { category: true },
            });
          },
        ),
        updateTransaction: safe(
          async (
            _: unknown,
            { id, input }: { id: string; input: unknown },
            ctx: Context,
          ) => {
            const userId = owner(ctx);
            const data = transactionInput.parse(input);
            await ownedTransaction(id, userId);
            await ownedCategory(data.categoryId, userId);
            return prisma.transaction.update({
              where: { id, userId },
              data,
              include: { category: true },
            });
          },
        ),
        deleteTransaction: safe(
          async (_: unknown, { id }: { id: string }, ctx: Context) => {
            const userId = owner(ctx);
            await ownedTransaction(id, userId);
            await prisma.transaction.delete({ where: { id, userId } });
            return true;
          },
        ),
      },
    },
  }),
});
