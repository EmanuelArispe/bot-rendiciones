import prisma from './prisma.js'

export function create(data) {
  return prisma.rendicion.create({ data })
}

export function update(id, data) {
  return prisma.rendicion.update({ where: { id }, data })
}

export function findByUserId(userId, limit = 10) {
  return prisma.rendicion.findMany({
    where: { userId },
    orderBy: { travelDateFrom: 'desc' },
    take: limit,
  })
}

/**
 * Rendiciones a las que todavía les falta el kilometraje del GPS y no agotaron
 * los reintentos programados (ver src/jobs/gps-retry-job.js)
 */
export function findPendingWithoutKilometers(maxRetries) {
  return prisma.rendicion.findMany({
    where: {
      status: 'PENDING',
      kilometers: null,
      gpsRetryCount: { lt: maxRetries },
    },
    include: { user: true },
  })
}

export function incrementGpsRetryCount(id) {
  return prisma.rendicion.update({
    where: { id },
    data: { gpsRetryCount: { increment: 1 } },
  })
}
