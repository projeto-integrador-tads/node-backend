import { FastifyReply, FastifyRequest } from "fastify";
import { models } from "../../models/models";
import { ValidationError } from "../../exeptions/validationError";
import { handleValidationError } from "../../exeptions/handleValidationError";
import { getUser } from "../users/validations/validations";
import { getRideById } from "../rides/validations/validations";
import { getReservation, getReservationStatus } from "./valiations/validations";

export const cancelReservation = async (
  request: FastifyRequest<{ Params: { reservation_id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { reservation_id } = request.params;
    const passenger_id = request.userData?.id;

    if (!passenger_id) {
      throw new ValidationError("O usuário não está logado.");
    }

    await getUser(passenger_id);
    const reservation = await getReservation(reservation_id);
    getReservationStatus(reservation);

    if (reservation.passenger_id !== passenger_id) {
      throw new ValidationError(
        "Você não tem permissão para cancelar esta reserva."
      );
    }

    const updatedReservation = await models.reservation.update({
      where: { reservation_id },
      data: { status: "CANCELLED" },
    });

    const ride = await getRideById(reservation.ride_id);

    await models.ride.update({
      where: { ride_id: reservation.ride_id },
      data: { available_seats: ride.available_seats + 1 },
    });

    request.server.eventBus.emit("reservationCancelled", updatedReservation);

    return reply
      .status(200)
      .send({ message: "Reserva cancelada com sucesso." });
  } catch (error) {
    handleValidationError(error, reply);
    return reply.status(500).send({ error: "Erro interno no servidor." });
  }
};
