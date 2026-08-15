import prisma from './prisma.js'

export function create(data) {
  return prisma.expense.create({ data })
}

export function findByUserId(userId, limit = 10) {
  return prisma.expense.findMany({
    where: { userId },
    orderBy: { expenseDate: 'desc' },
    take: limit,
  })
}
