const { users } = require("./users");
const fastify = require("fastify")({
  logger: true,
});

fastify.register(require("@fastify/formbody"));

fastify.post("/log", async (request, reply) => {
  console.log("request.body", request.body);
  reply.status(404);
});

fastify.get("/users/:email", async (request, reply) => {
  const email = request.params.email;
  const username = email.split("@")[0].toLowerCase();
  const found = users.find((obj) => obj.user === username);
  if (found) {
    const result = {
      username: found.user,
      givenName: found.givenName,
      surname: found.surname,
      email: found.email,
    };
    reply.status(200).send(result);
    return;
  }
  reply.status(404).send({
    version: "1.0",
    status: 404,
    code: "errorCode",
    requestId: "requestId",
    userMessage: "You are not allowed to login to Landonline.",
    developerMessage: `The user with email ${email} is not found (username ${username})`,
  });
});

fastify.post("/users", async (request, reply) => {
  // console.log(`user: ${request.body.user}`);
  // console.log(`pwd: ${request.body.password}`);

  // const found = users.find((obj) => {
  //   return (
  //     obj.user === request.body.user.toLowerCase() &&
  //     obj.password === request.body.password
  //   );
  // });

  const found = findUser(request);

  if (found) {
    if (found.status == "inactive") {
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
    if (found.status == "locked") {
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
    const result = {
      givenName: found.givenName,
      surname: found.surname,
      email: found.email,
    };
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

fastify.post("/users/changePassword", async (requst, reply) => {
  //const found = findUser();
  const result = {
    passwordChange: true,
    Remarks: "Your password has been change.",
  };
  reply.status(200).send(result);
});

// Run the server!
fastify.listen({ host: "::", port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});

function findUser(request) {
  return users.find((obj) => {
    return (
      obj.user === request.body.user.toLowerCase() &&
      obj.password === request.body.password
    );
  });
}

