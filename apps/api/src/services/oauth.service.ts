import { OAuth2Client, TokenPayload } from 'google-auth-library'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string

let client: OAuth2Client | null = null

function getClient() {
  if (!client) {
    if (!GOOGLE_CLIENT_ID) {
      // eslint-disable-next-line no-console
      console.warn('GOOGLE_CLIENT_ID is not set. Google OAuth will not work correctly.')
    }
    client = new OAuth2Client(GOOGLE_CLIENT_ID)
  }
  return client
}

export interface GoogleUserInfo {
  email: string
  name: string
  googleId: string
  emailVerified: boolean
}

export class OAuthService {
  static async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    const oauthClient = getClient()

    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload() as TokenPayload | undefined
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('GOOGLE_OAUTH_INVALID_TOKEN')
    }

    return {
      email: payload.email,
      name: payload.name || payload.email,
      googleId: payload.sub,
      emailVerified: !!payload.email_verified,
    }
  }
}
