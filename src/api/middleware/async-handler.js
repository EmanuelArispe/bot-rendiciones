/**
 * Envuelve un handler/middleware async para que sus rechazos lleguen a next(error)
 * en vez de quedar como unhandled rejection (que tira abajo todo el proceso)
 */
export function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
