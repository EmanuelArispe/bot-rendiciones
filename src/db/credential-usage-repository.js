import prisma from './prisma.js'

export function create(data) {
  return prisma.credentialUsageLog.create({ data })
}

export function findFailuresByUserId(userId, limit) {
  return prisma.credentialUsageLog.findMany({
    where: { userId, success: false },
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
}
