import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
const filename = `test-${randomBytes(6).toString("hex")}.db`;
process.env.DATABASE_URL = `file:./${filename}`;
process.env.JWT_SECRET = randomBytes(48).toString("hex");
process.env.CORS_ORIGIN = "http://localhost:5173";
writeFileSync(new URL(`../prisma/${filename}`, import.meta.url), "");
execFileSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { env: process.env, stdio: "pipe" },
);
const { yoga, prisma } = await import("../src/app.ts");
async function request(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
) {
  const response = await yoga.fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return (await response.json()) as any;
}
after(async () => {
  await prisma.$disconnect();
  rmSync(new URL(`../prisma/${filename}`, import.meta.url), { force: true });
});
test("Cadastro, autenticação, CRUD, valores exatos, filtros, CORS e isolamento entre contas", async () => {
  const register =
    "mutation($name:String!,$email:String!,$password:String!){register(name:$name,email:$email,password:$password){token user{id name email}}}";
  const a = await request(register, {
    name: "Alice Teste",
    email: "ALICE@example.com",
    password: "SenhaSegura123",
  });
  const b = await request(register, {
    name: "Bruno Teste",
    email: "bruno@example.com",
    password: "SenhaSegura123",
  });
  assert.ok(!a.errors, JSON.stringify(a.errors));
  assert.ok(!b.errors);
  const token = a.data.register.token;
  const other = b.data.register.token;
  assert.equal(a.data.register.user.email, "alice@example.com");
  assert.ok(
    (
      await request(register, {
        name: "Alice",
        email: "alice@example.com",
        password: "SenhaSegura123",
      })
    ).errors,
  );
  assert.ok((await request("query{me{id}}")).errors);
  assert.ok((await request("query{me{id}}", {}, "invalid-token")).errors);
  assert.ok(
    (
      await request(
        'mutation{login(email:"alice@example.com",password:"wrong"){token}}',
      )
    ).errors,
  );
  assert.ok(
    (
      await request(
        'mutation{login(email:"alice@example.com",password:"SenhaSegura123"){token}}',
      )
    ).data.login.token,
  );
  const input = {
    name: "Alimentação",
    description: "Restaurantes",
    color: "blue",
    icon: "utensils",
  };
  const c = await request(
    "mutation($input:CategoryInput!){createCategory(input:$input){id name}}",
    { input },
    token,
  );
  assert.ok(!c.errors);
  const categoryId = c.data.createCategory.id;
  const foreign = await request(
    "mutation($input:CategoryInput!){createCategory(input:$input){id}}",
    { input: { ...input, name: "Privada" } },
    other,
  );
  const foreignId = foreign.data.createCategory.id;
  const data = {
    description: "Almoço",
    amountCents: 12345,
    type: "EXPENSE",
    date: "2026-09-15",
    categoryId,
  };
  const create =
    "mutation($input:TransactionInput!){createTransaction(input:$input){id amountCents category{id}}}";
  assert.ok(
    (
      await request(
        create,
        { input: { ...data, categoryId: foreignId } },
        token,
      )
    ).errors,
  );
  assert.ok(
    (await request(create, { input: { ...data, amountCents: -1 } }, token))
      .errors,
  );
  assert.ok(
    (await request(create, { input: { ...data, date: "2026-02-30" } }, token))
      .errors,
  );
  const t = await request(create, { input: data }, token);
  assert.ok(!t.errors, JSON.stringify(t.errors));
  const id = t.data.createTransaction.id;
  assert.equal(t.data.createTransaction.amountCents, 12345);
  const update =
    "mutation($id:ID!,$input:TransactionInput!){updateTransaction(id:$id,input:$input){id amountCents}}";
  assert.ok(
    (await request(update, { id, input: { ...data, amountCents: 1 } }, other))
      .errors,
  );
  assert.ok(
    (
      await request(
        "mutation($id:ID!){deleteTransaction(id:$id)}",
        { id },
        other,
      )
    ).errors,
  );
  assert.ok(
    (
      await request(
        "mutation($id:ID!){deleteCategory(id:$id)}",
        { id: categoryId },
        other,
      )
    ).errors,
  );
  assert.ok(
    (
      await request(
        "mutation($id:ID!,$input:CategoryInput!){updateCategory(id:$id,input:$input){id}}",
        { id: categoryId, input },
        other,
      )
    ).errors,
  );
  const otherList = await request(
    "query{transactions{total} categories{id}}",
    {},
    other,
  );
  assert.equal(otherList.data.transactions.total, 0);
  assert.deepEqual(
    otherList.data.categories.map((c: any) => c.id),
    [foreignId],
  );
  const updated = await request(
    update,
    { id, input: { ...data, amountCents: 23456 } },
    token,
  );
  assert.equal(updated.data.updateTransaction.amountCents, 23456);
  const catUpdate = await request(
    "mutation($id:ID!,$input:CategoryInput!){updateCategory(id:$id,input:$input){name}}",
    { id: categoryId, input: { ...input, name: "Refeições" } },
    token,
  );
  assert.equal(catUpdate.data.updateCategory.name, "Refeições");
  assert.ok(
    (
      await request(
        "mutation($id:ID!){deleteCategory(id:$id)}",
        { id: categoryId },
        token,
      )
    ).errors,
  );
  const list = await request(
    "query($filter:TransactionFilter){transactions(filter:$filter){total items{description}}}",
    {
      filter: {
        month: "2026-09",
        search: "Almoço",
        type: "EXPENSE",
        categoryId,
        page: 1,
        pageSize: 1,
      },
    },
    token,
  );
  assert.equal(list.data.transactions.total, 1);
  assert.equal(
    (
      await request(
        'query{transactions(filter:{month:"2026-08"}){total}}',
        {},
        token,
      )
    ).data.transactions.total,
    0,
  );
  await request(
    create,
    {
      input: {
        ...data,
        description: "Salário",
        type: "INCOME",
        amountCents: 50000,
      },
    },
    token,
  );
  const dash = await request(
    'query{dashboard(month:"2026-09"){balanceCents incomeCents expenseCents transactionCount}}',
    {},
    token,
  );
  assert.deepEqual(dash.data.dashboard, {
    balanceCents: 26544,
    incomeCents: 50000,
    expenseCents: 23456,
    transactionCount: 2,
  });
  const profile = await request(
    'mutation{updateProfile(name:"Alice Silva"){name}}',
    {},
    token,
  );
  assert.equal(profile.data.updateProfile.name, "Alice Silva");
  // A new database connection must observe committed records.
  const { PrismaClient } = await import("@prisma/client");
  const independent = new PrismaClient();
  assert.equal(
    await independent.transaction.count({
      where: { userId: a.data.register.user.id },
    }),
    2,
  );
  await independent.$disconnect();
  const preflight = await yoga.fetch("http://localhost:4000/graphql", {
    method: "OPTIONS",
    headers: {
      origin: "http://localhost:5173",
      "access-control-request-method": "POST",
      "access-control-request-headers": "authorization,content-type",
    },
  });
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "http://localhost:5173",
  );
  const deleted = await request(
    "mutation($id:ID!){deleteTransaction(id:$id)}",
    { id },
    token,
  );
  assert.equal(deleted.data.deleteTransaction, true);
  const remaining = await prisma.transaction.findMany({
    where: { userId: a.data.register.user.id },
  });
  for (const r of remaining)
    await request(
      "mutation($id:ID!){deleteTransaction(id:$id)}",
      { id: r.id },
      token,
    );
  assert.equal(
    (
      await request(
        "mutation($id:ID!){deleteCategory(id:$id)}",
        { id: categoryId },
        token,
      )
    ).data.deleteCategory,
    true,
  );
});
