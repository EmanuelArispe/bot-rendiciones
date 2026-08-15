/**
 * Provincias del selector de la empresa (Rendición de Gastos)
 * Valores extraídos del <select> real. Las ciudades no se listan acá:
 * varían por provincia y se cargan dinámicamente del lado de la empresa,
 * así que se ingresan como texto libre y se matchean recién en el
 * Form Automation (Skill 4), cuando esa página esté realmente abierta.
 */
export const PROVINCES = [
  { code: '0', name: 'BUENOS AIRES' },
  { code: '1', name: 'CAPITAL FEDERAL' },
  { code: '2', name: 'CATAMARCA' },
  { code: '3', name: 'CHACO' },
  { code: '4', name: 'CHUBUT' },
  { code: '5', name: 'CORDOBA' },
  { code: '6', name: 'CORRIENTES' },
  { code: '7', name: 'ENTRE RIOS' },
  { code: '8', name: 'FORMOSA' },
  { code: '9', name: 'JUJUY' },
  { code: '10', name: 'LA PAMPA' },
  { code: '11', name: 'LA RIOJA' },
  { code: '12', name: 'MENDOZA' },
  { code: '13', name: 'MISIONES' },
  { code: '14', name: 'NEUQUEN' },
  { code: '15', name: 'RIO NEGRO' },
  { code: '16', name: 'SALTA' },
  { code: '17', name: 'SAN JUAN' },
  { code: '18', name: 'SAN LUIS' },
  { code: '19', name: 'SANTA CRUZ' },
  { code: '20', name: 'SANTA FE' },
  { code: '21', name: 'SANTIAGO DEL ESTERO' },
  { code: '22', name: 'TIERRA DEL FUEGO' },
  { code: '23', name: 'TUCUMAN' },
]

export function isValidProvinceCode(code) {
  return PROVINCES.some((province) => province.code === code)
}

export function getProvinceName(code) {
  return PROVINCES.find((province) => province.code === code)?.name ?? null
}
