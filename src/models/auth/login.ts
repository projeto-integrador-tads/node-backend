import { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";
import { models } from "../models";
import { LoginRequestBody } from "../../types";
import { eventTypes } from "../../utils/constants";

export default async function loginHandler(
  request: FastifyRequest<{ Body: LoginRequestBody }>,
  reply: FastifyReply
) {
  const { email, password } = request.body;

  try {
    const user = await models.user.findUnique({
      where: { email },
    });

    if (!user) {
      return reply.status(401).send({ error: "Usuário não encontrado." });
    }

    if (!user.active) {
      await models.user.update({
        where: { id: user.id },
        data: { active: true },
      });
      request.server.eventBus.emit(eventTypes.accountReactivated, user);
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return reply.status(401).send({ error: "Senha incorreta." });
    }

    const token = request.server.jwt.sign({
      email,
      firstName: user.name,
      lastName: user.last_name,
      id: user.id,
    });

    reply.send({ token });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: "Erro interno no servidor." });
  }
}
