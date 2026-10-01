import { createServer } from "node:http";
import { yoga, prisma } from "./app.ts";
const port = Number(process.env.PORT ?? 4000);
const server = createServer(yoga);
server.listen(port, "127.0.0.1", () =>
  console.log(`Financy API: http://localhost:${port}/graphql`),
);
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
