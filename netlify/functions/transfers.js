prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
  datasources: {
    db: {
      url: 'file:/./prisma/db/custom.db'"
})
