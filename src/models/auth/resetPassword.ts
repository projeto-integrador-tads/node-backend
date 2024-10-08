import { FastifyReply, FastifyRequest } from "fastify";
import { models } from "../models";
import bcrypt from "bcrypt";
import { ResetPasswordRequestBody } from "../../types";
import { eventTypes } from "../../utils/constants";

export async function resetPassword(
  request: FastifyRequest<{
    Body: ResetPasswordRequestBody;
  }>,
  reply: FastifyReply
) {
  const { email, resetCode, newPassword } = request.body;

  try {
    const passwordReset = await models.passwordResetToken.findUnique({
      where: { email },
    });

    if (!passwordReset || passwordReset.resetCode !== resetCode) {
      return reply.status(400).send({ error: "Código inválido." });
    }

    if (passwordReset.expiresAt < new Date()) {
      return reply.status(400).send({ error: "Código expirado." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await models.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await models.passwordResetToken.delete({ where: { email } });

    request.server.eventBus.emit(eventTypes.passwordChanged, user);

    return reply.status(200).send({ message: "Senha alterada com sucesso." });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: "Erro interno no servidor." });
  }
}
