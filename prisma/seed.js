import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import { encrypt } from '../src/utils/crypto.js'

const prisma = new PrismaClient()

const SEED_PASSWORD = 'password123'

async function main() {
  console.log('🌱 Iniciando seed de datos...')

  // Limpiar datos existentes (opcional, comentar si no quieres)
  // await prisma.auditLog.deleteMany({})
  // await prisma.expense.deleteMany({})
  // await prisma.rendicion.deleteMany({})
  // await prisma.credentialUsageLog.deleteMany({})
  // await prisma.user.deleteMany({})

  const user = await prisma.user.create({
    data: {
      email: 'emanuel@example.com',
      passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
      firstName: 'Emanuel',
      lastName: 'Perez',
      vehicleId: 'AC767UI',
      vehicleModel: 'VW AMAROK CONFORTLINE V6 2018',
      originProvinceCode: '0',
      originProvince: 'BUENOS AIRES',
      originCity: 'Tandil',
      isActive: true,
      isAdmin: true,
      accessToken: crypto.randomBytes(32).toString('hex'),
      gpsUsername: 'emanuelprueba',
      gpsPasswordEncrypted: encrypt('gps_password_123'),
      gpsCredentialsStatus: 'ACTIVE',
      gpsLastValidationSuccess: new Date(),
      companyUsername: 'eperez',
      companyPasswordEncrypted: encrypt('company_password_123'),
      companyCredentialsStatus: 'ACTIVE',
      companyLastValidationSuccess: new Date(),
    },
  })

  console.log('✅ Usuario creado:', user.email)

  const rendicion = await prisma.rendicion.create({
    data: {
      userId: user.id,
      travelDateFrom: new Date('2026-01-15'),
      travelDateTo: new Date('2026-01-15'),
      originProvinceCode: user.originProvinceCode,
      originProvince: user.originProvince,
      originCity: user.originCity,
      destinationProvinceCode: '0',
      destinationProvince: 'BUENOS AIRES',
      destinationCity: 'Tandil',
      kilometers: 147.07,
      vehicleUsed: 'VW AMAROK CONFORTLINE V6 2018 AC767UI',
      details: 'Viaje de negocios a Tandil',
      status: 'PENDING',
    },
  })

  console.log('✅ Rendición creada:', rendicion.id)

  const expenseCombustible = await prisma.expense.create({
    data: {
      userId: user.id,
      rendicionId: rendicion.id,
      type: 'COMBUSTIBLE',
      expenseDate: new Date('2026-01-15'),
      description: 'Nafta Estación YPF Ruta 5',
      amount: 850.00,
      currency: 'ARS',
      paymentMethod: 'TARJETA',
      paymentReference: '****2124',
      receiptIssuer: 'YPF Estación Ruta 5',
      receiptNumber: 'RCP-001234',
      ocrExtractedAmount: 850.00,
      ocrConfidence: 0.98,
      loadedToSystem: false,
    },
  })

  console.log('✅ Gasto de combustible creado:', expenseCombustible.id)

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
      source: 'SYSTEM',
    },
  })

  console.log('✅ Audit log creado:', log.id)

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
  console.log('\n💡 Datos de prueba:')
  console.log(`   Email: ${user.email}`)
  console.log(`   Contraseña: ${SEED_PASSWORD}`)
  console.log(`   GPS Username: ${user.gpsUsername}`)
  console.log(`   Company Username: ${user.companyUsername}`)
  console.log('\n⚠️  Nota: Las contraseñas están cifradas (AES-256-GCM), no en texto plano.')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
