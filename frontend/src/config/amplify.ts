import { Amplify } from 'aws-amplify';

// Placeholder values written into .env.dev before a CDK deploy
const PLACEHOLDER_PATTERN = /^REPLACE_/;

const _userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '';
const _clientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? '';
const _region = import.meta.env.VITE_AWS_REGION ?? 'us-east-1';

/**
 * Returns true only when all required Cognito env vars are present
 * and are not the placeholder strings written into .env.dev.
 */
export function isAmplifyConfigured(): boolean {
  return (
    Boolean(_userPoolId) &&
    Boolean(_clientId) &&
    Boolean(_region) &&
    !PLACEHOLDER_PATTERN.test(_userPoolId) &&
    !PLACEHOLDER_PATTERN.test(_clientId)
  );
}

/**
 * Configure AWS Amplify.
 *
 * MUST be called before any aws-amplify/auth import executes.
 * When real Cognito values are present, configures fully.
 * When values are missing/placeholder, configures with dummy values so the
 * Amplify context exists and no module-level throws occur — auth calls
 * are guarded by isAmplifyConfigured() in AuthContext.
 */
export function configureAmplify(): void {
  const configured = isAmplifyConfigured();

  if (!configured) {
    console.warn(
      '[Amplify] Cognito environment variables are missing or not yet set. ' +
        'Run: python scripts/export_env.py --env dev  then restart the dev server. ' +
        'Auth features will be disabled until Cognito is configured.'
    );
  }

  // Always call Amplify.configure() — even with placeholder values — so the
  // Amplify context is initialised and module-level SDK code does not throw.
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId:       configured ? _userPoolId : 'us-east-1_placeholder',
        userPoolClientId: configured ? _clientId   : 'placeholderClientId000000000',
        loginWith: {
          email: true,
        },
      },
    },
  });
}
