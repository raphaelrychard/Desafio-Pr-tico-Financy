import { createServer } from "node:http";
import { yoga, prisma } from "./app.ts";
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "127.0.0.1";
const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
    } catch {
      response.writeHead(503, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ status: "unavailable" }));
    }
    return;
  }
  return yoga(request, response);
});
server.listen(port, host, () =>
  console.log(`Financy API: http://localhost:${port}/graphql`),
);
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
