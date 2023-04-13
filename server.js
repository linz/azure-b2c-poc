const fastify = require("fastify")({
  logger: true,
});

fastify.get("/", async (request, reply) => {
  return { hello: "world" };
});

fastify.post("/user", async (request, reply) => {
  let user = "user1";
  let password = "password123";
  if (
    user == request.body.user &&
    password == request.body.password
  ) {
    reply.status(200).send();
  } else {
    let errorResponse = {
      version: "1.0",
      status: 409,
      code: "errorCode",
      requestId: "requestId",
      userMessage:
        "Invalid user name and password.",
      developerMessage: `The provided user ${request.body.user} and password cannot found.`,      
    };
    reply.status(409).send(errorResponse);
  }
})

// Run the server!
fastify.listen({ host: "::", port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});
