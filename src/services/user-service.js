/**
 * Alta de usuarios y resolución por token de acceso
 */

import crypto from 'crypto'
import prisma from '../db/prisma.js'
import { DatabaseError } from '../utils/error-handler.js'

function generateAccessToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function createUser({ email, firstName, lastName } = {}) {
  try {
    return await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        accessToken: generateAccessToken(),
      },
    })
  } catch (error) {
    throw new DatabaseError('No se pudo crear el usuario', { cause: error.message })
  }
}

export async function getUserByAccessToken(token) {
  return prisma.user.findUnique({ where: { accessToken: token } })
}

export async function regenerateAccessToken(userId) {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { accessToken: generateAccessToken() },
    })
  } catch (error) {
    throw new DatabaseError('No se pudo regenerar el token de acceso', {
      userId,
      cause: error.message,
    })
  }
}
