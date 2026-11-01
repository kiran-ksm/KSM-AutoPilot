import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Amplify / auth globals for test environment
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(() => Promise.resolve({ tokens: { idToken: { toString: () => 'test-token' } } })),
}));

// Mock window.crypto.randomUUID for contexts
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
  },
});
