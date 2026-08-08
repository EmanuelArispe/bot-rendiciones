import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de datos...')

  // Limpiar datos existentes (opcional, comentar si no quieres)
  // await prisma.auditLog.deleteMany({})
  // await prisma.expense.deleteMany({})
  // await prisma.rendicion.deleteMany({})
  // await prisma.whatsappSession.deleteMany({})
  // await prisma.user.deleteMany({})

  // Crear usuario de prueba
  const hashedGpsPassword = await bcrypt.hash('gps_password_123', 10)
  const hashedCompanyPassword = await bcrypt.hash('company_password_123', 10)

  const user = await prisma.user.create({
    data: {
      email: 'emanuel@example.com',
      firstName: 'Emanuel',
      lastName: 'Perez',
      gpsUsername: 'emanuelprueba',
      gpsPasswordHash: hashedGpsPassword,
      companyUsername: 'eperez',
      companyPasswordHash: hashedCompanyPassword,
      vehicleId: 'AC767UI',
      vehicleModel: 'VW AMAROK CONFORTLINE V6 2018',
      isActive: true,
    },
  })

  console.log('✅ Usuario creado:', user.email)

  // Crear una rendición de prueba
  const rendicion = await prisma.rendicion.create({
    data: {
      userId: user.id,
      travelDate: new Date('2026-01-15'),
      origin: 'Buenos Aires',
      originCode: 'TANDIL-B A-7000-0',
      destination: 'Tandil',
      destinationCode: 'TANDIL-B A-7000-0',
      kilometers: 147.07,
      vehicleUsed: 'VW AMAROK CONFORTLINE V6 2018 AC767UI',
      details: 'Viaje de negocios a Tandil',
      status: 'PENDING',
    },
  })

  console.log('✅ Rendición creada:', rendicion.id)

  // Crear gasto de combustible
  const expenseCombustible = await prisma.expense.create({
    data: {
      userId: user.id,
      rendicionId: rendicion.id,
      type: 'COMBUSTIBLE',
      description: 'Nafta Estación YPF Ruta 5',
      amount: 850.00,
      currency: 'ARS',
      paymentMethod: 'TARJETA',
      paymentReference: 'TARJETA NRO: 4484598012124',
      receiptIssuer: 'YPF Estación Ruta 5',
      receiptNumber: 'RCP-001234',
      ocrExtractedAmount: 850.00,
      ocrConfidence: 0.98,
      loadedToSystem: false,
    },
  })

  console.log('✅ Gasto de combustible creado:', expenseCombustible.id)

  // Crear log de auditoría
  const log = await prisma.auditLog.create({
    data: {
      userId: user.id,
      rendicionId: rendicion.id,
      expenseId: expenseCombustible.id,
      action: 'SEED_DATA_CREATED',
      status: 'SUCCESS',
      message: 'Datos de prueba creados exitosamente',
      details: JSON.stringify({
        purpose: 'Testing',
        createdAt: new Date(),
      }),
      source: 'system',
    },
  })

  console.log('✅ Audit log creado:', log.id)

  // Crear configuración del sistema
  const config = await prisma.systemConfig.upsert({
    where: { key: 'APP_VERSION' },
    update: { value: '0.1.0' },
    create: {
      key: 'APP_VERSION',
      value: '0.1.0',
      description: 'Versión actual de la aplicación',
    },
  })

  console.log('✅ Configuración del sistema creada:', config.key)

  console.log('✨ Seed completado exitosamente!')
  console.log('\n📊 Resumen:')
  console.log(`   - Usuarios: 1`)
  console.log(`   - Rendiciones: 1`)
  console.log(`   - Gastos: 1`)
  console.log(`   - Logs: 1`)
  console.log('\n💡 Credentials de prueba:')
  console.log(`   Email: ${user.email}`)
  console.log(`   GPS Username: ${user.gpsUsername}`)
  console.log(`   Company Username: ${user.companyUsername}`)
  console.log('\n⚠️  Nota: Las contraseñas están hasheadas. Usa resetDatabase si necesitas cambiarlas.')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
