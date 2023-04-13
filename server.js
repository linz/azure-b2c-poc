const fastify = require("fastify")({
  logger: true,
});

fastify.get("/", async (request, reply) => {
  return { hello: "world" };
});

// Run the server!
fastify.listen({ host: "::", port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});
