import { type UserType } from '@/lib/authkitty-helpers/types/userType'

export interface AuthTokensType {
  accessToken: string
  refreshToken: string
}

export interface AccessTokenType extends Omit<UserType, 'id'> {
  iss: string
  sub: string
  jti: string
  iat: number
  exp: number
}

export interface RefreshTokenType {
  iss: string
  sub: string
  jti: string
  iat: number
  exp: number
}
