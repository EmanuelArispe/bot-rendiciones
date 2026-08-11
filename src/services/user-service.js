/**
 * Resolución de User a partir del número de WhatsApp
 */

import prisma from '../db/prisma.js'
import { DatabaseError } from '../utils/error-handler.js'

/**
 * Busca el User vinculado a un phoneNumber, o lo crea si no existe
 */
export async function getOrCreateUserByPhoneNumber(phoneNumber) {
  try {
    const user = await prisma.user.upsert({
      where: { phoneNumber },
      update: {},
      create: { phoneNumber },
    })

    return user
  } catch (error) {
    throw new DatabaseError('No se pudo resolver el usuario por número de WhatsApp', {
      phoneNumber,
      cause: error.message,
    })
  }
}
