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
    orderBy: { travelDate: 'desc' },
    take: limit,
  })
}
