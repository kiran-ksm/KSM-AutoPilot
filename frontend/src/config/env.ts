/**
 * Typed, centralised access to all Vite environment variables.
 * Import this instead of using import.meta.env directly throughout the app.
 */

export const env = {
  /** AWS region, e.g. "us-east-1" */
  awsRegion: import.meta.env.VITE_AWS_REGION as string,

  /** Cognito User Pool ID */
  cognitoUserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,

  /** Cognito App Client ID */
  cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,

  /** API Gateway base URL — no trailing slash */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string,

  /**
   * When true, SMS and email API calls are mocked and logged to the
   * Demo Console instead of sending real messages.
   */
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',

  /** Current deployment environment */
  appEnv: (import.meta.env.VITE_APP_ENV ?? 'dev') as 'dev' | 'staging' | 'prod',
} as const;
