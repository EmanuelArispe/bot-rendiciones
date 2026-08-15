import prisma from './prisma.js'

export function create(data) {
  return prisma.user.create({ data })
}

export function findById(id) {
  return prisma.user.findUnique({ where: { id } })
}

export function findByAccessToken(accessToken) {
  return prisma.user.findUnique({ where: { accessToken } })
}

export function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } })
}

export function update(id, data) {
  return prisma.user.update({ where: { id }, data })
}
