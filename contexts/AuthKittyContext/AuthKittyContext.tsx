'use client'

import { GrantTypes } from '@/lib/authkitty-helpers/constants/grantTypes'
import { type AccessTokenType, type AuthTokensType } from '@/lib/authkitty-helpers/types/tokenTypes'
import { type UserType } from '@/lib/authkitty-helpers/types/userType'
import jwt from 'jsonwebtoken'
import moment from 'moment/moment'
import { useRouter, useSearchParams } from 'next/navigation'
import React, {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useState
} from 'react'

interface AuthKittyContextValues {
  user: UserType | null
  setUser: Dispatch<SetStateAction<UserType | null>>
}

const AuthKittyContext = createContext<AuthKittyContextValues>({
  user: null,
  setUser: value => null
})

const AK_WEB_URL = 'https://authkitty.com'
const AK_API_URL = 'https://api.authkitty.com'

export function AuthKittyContextProvider ({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()

  const [user, setUser] = useState<UserType | null>(null)

  useEffect(() => {
    const refreshToken = localStorage.getItem('AKR')

    if (refreshToken !== null) {
      void exchangeRefreshToken(refreshToken)
    }
  }, [])

  useEffect(() => {
    const code = searchParams.get('code')

    if (code !== null) {
      void exchangeAuthorizationCode(code)
    }
  }, [searchParams])

  async function exchangeAuthorizationCode (code: string) {
    void fetch(`${AK_API_URL}/oauth/token`, {
      method: 'POST',
      body: JSON.stringify({ authorizationCode: code, grantType: 'authorization_code' }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(async (response) => {
        const { accessToken, refreshToken } = await response.json() as AuthTokensType

        localStorage.setItem('AKT', accessToken)
        localStorage.setItem('AKR', refreshToken)

        await fetchUserDetails(accessToken)
      })
  }

  async function exchangeRefreshToken (refreshToken: string) {
    void fetch(`${AK_API_URL}/oauth/token`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken, grantType: 'refresh_token' }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(async (response) => {
        const { accessToken, refreshToken } = await response.json() as AuthTokensType

        localStorage.setItem('AKT', accessToken)
        localStorage.setItem('AKR', refreshToken)

        await fetchUserDetails(accessToken)
      })
  }

  async function fetchUserDetails (accessToken: string) {
    const decodedAccessToken = jwt.decode(accessToken) as AccessTokenType
    const currentTimestamp = moment().unix()

    if (currentTimestamp < decodedAccessToken.exp) {
      fetch(`${AK_API_URL}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
        .then(async (res) => {
          const user = await res.json()
          setUser(user)
        })
        .catch(() => {})
        .finally(() => {})
    } else {
      setUser(null)
      localStorage.removeItem('AKT')
    }
  }

  return (
        <AuthKittyContext.Provider value={{ user, setUser }}>
            {children}
        </AuthKittyContext.Provider>
  )
}

interface UseAuthKittyValues extends Omit<AuthKittyContextValues, 'setUser'> {
  signIn: (redirectUri: string, state?: string) => void
  signOut: (redirectUri?: string) => void
}

export function useAuthKitty (): UseAuthKittyValues {
  const { setUser, ...context } = useContext(AuthKittyContext)
  const router = useRouter()

  if (context === null) {
    throw new Error('useAuthKitty may only be used within the AuthKittyContext')
  }

  function signIn (redirectUri: string, state?: string) {
    router.push(state !== undefined
      ? `${AK_WEB_URL}/login?redirect_uri=${redirectUri}&state=${state}`
      : `${AK_WEB_URL}/login?redirect_uri=${redirectUri}`)
  }

  function signOut (redirectUri?: string) {
    localStorage.removeItem('AKT')
    setUser(null)
    router.push(redirectUri !== undefined ? redirectUri : '/')
  }

  return {
    ...context,
    signIn,
    signOut
  }
}
