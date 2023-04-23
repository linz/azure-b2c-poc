const { users } = require("./users");
const fastify = require("fastify")({
  logger: true,
});

fastify.register(require("@fastify/formbody"));

fastify.get("/users/:user/:password", async (request, reply) => {
  let user = "user1";
  let password = "password123";
  let res = {
    validUserCode: "88888",
  };
  if (user == request.params.user && password == request.params.password) {
    reply.status(200).send(res);
  } else {
    let errorResponse = {
      version: "1.0",
      status: 409,
      code: "errorCode",
      requestId: "requestId",
      userMessage: "Invalid user name and password.",
      developerMessage: `The provided user ${request.params.user} and password cannot found.`,
    };
    reply.status(409).send(errorResponse);
  }
});


fastify.post("/users", async (request, reply) => {
  // console.log(`user: ${request.body.user}`);
  // console.log(`pwd: ${request.body.password}`);

  const found = users.find((obj) => {
    return (
      obj.user === request.body.user.toLowerCase() &&
      obj.password === request.body.password
    );
  });
  if(found.status == "inactive"){
    let errorResponse = {
      version: "1.0",
      status: 409,
      code: "errorCode",
      requestId: "requestId",
      userMessage: "LINZ User is inactive.",
      developerMessage: `The user: ${request.body.user} has status inactive`,
    };
    reply.status(409).send(errorResponse);
  }
  if(found.status == "locked"){
    let errorResponse = {
      version: "1.0",
      status: 409,
      code: "errorCode",
      requestId: "requestId",
      userMessage: "LINZ User is locked.",
      developerMessage: `The user: ${request.body.user} has status locked`,
    };
    reply.status(409).send(errorResponse);
  }

  if (found) {
    const result = { givenName: found.givenName, surname: found.surname, email: found.email}
    reply.status(200).send(result);
  } else {
    let errorResponse = {
      version: "1.0",
      status: 409,
      code: "errorCode",
      requestId: "requestId",
      userMessage: "Invalid LINZ user name and password.",
      developerMessage: `The provided user ${request.body.user} and password cannot found.`,
    };
    reply.status(409).send(errorResponse);
  }
});

// Run the server!
fastify.listen({ host: "::", port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});
