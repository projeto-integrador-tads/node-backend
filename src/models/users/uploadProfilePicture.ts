import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { resizeImage } from "../../utils/resizeImage";
import { env } from "process";
import { models } from "../models";
import { FastifyReply, FastifyRequest } from "fastify";
import { s3 } from "../../services/aws/s3";
import { handleImageResizeError } from "../../exeptions/handleResizeError";

export async function uploadProfilePicture(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const id = request.userData?.id;

  try {
    const data = await request.file({ limits: { fileSize: 5242880 } });

    if (!data) {
      return reply.status(400).send({ error: "Nenhum arquivo foi enviado." });
    }

    const allowedMimeTypes = ["image/jpeg", "image/png"];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      return reply.status(400).send({
        error:
          "Tipo de arquivo não suportado. Por favor, envie uma imagem JPG ou PNG",
      });
    }

    const resizedImageBuffer = await resizeImage(await data.toBuffer(), 512);
    const fileName = crypto.randomUUID().concat(data.filename);

    const putObjectCommand = new PutObjectCommand({
      Bucket: env.BUCKET_NAME,
      Key: fileName,
      Body: resizedImageBuffer,
      ContentType: data.mimetype,
    });

    await s3.send(putObjectCommand);

    const user = await models.user.findUnique({
      where: { id: id },
      select: { profile_picture: true },
    });

    if (user?.profile_picture) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: env.BUCKET_NAME,
        Key: user.profile_picture,
      });
      await s3.send(deleteCommand);
    }

    await models.user.update({
      data: { profile_picture: fileName },
      where: { id: id },
    });

    return reply
      .status(200)
      .send({ message: "Foto de perfil atualizada com sucesso!" });
  } catch (error) {
    handleImageResizeError(error, reply);
    return reply.status(500).send({
      error:
        "Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.",
    });
  }
}
