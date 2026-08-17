import { getUserByAccessToken } from '../../services/user-service.js'

export const SESSION_COOKIE_NAME = 'session'

const SHARED_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  signed: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}

export const SESSION_COOKIE_OPTIONS = {
  ...SHARED_COOKIE_ATTRIBUTES,
  maxAge: 30 * 24 * 60 * 60 * 1000,
}

export const CLEAR_SESSION_COOKIE_OPTIONS = SHARED_COOKIE_ATTRIBUTES

export async function requireUser(req, res, next) {
  const token = req.signedCookies?.[SESSION_COOKIE_NAME]

  if (!token) {
    return res.redirect('/login')
  }

  const user = await getUserByAccessToken(token)

  if (!user) {
    res.clearCookie(SESSION_COOKIE_NAME, CLEAR_SESSION_COOKIE_OPTIONS)
    return res.redirect('/login')
  }

  req.user = user
  next()
}
