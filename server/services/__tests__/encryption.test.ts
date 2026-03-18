import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from '../encryption';
import { randomBytes } from 'crypto';

beforeAll(() => {
  // Generate a test encryption key (32 bytes = 64 hex chars)
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
});

describe('encryption service', () => {
  it('should encrypt and decrypt a simple string', () => {
    const plaintext = 'hello-world-secret-token';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for the same input (random IV)', () => {
    const plaintext = 'same-input';
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(plaintext);
    expect(decrypt(encrypted2)).toBe(plaintext);
  });

  it('should handle empty strings', () => {
    const plaintext = '';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('should handle long strings', () => {
    const plaintext = 'a'.repeat(10000);
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('should handle special characters and unicode', () => {
    const plaintext = '🔑 access_token=abc123&refresh=xyz! @#$%^&*()';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('should produce output in iv:authTag:ciphertext format', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');

    expect(parts.length).toBe(3);
  });

  it('should throw on tampered ciphertext', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    // Tamper with ciphertext
    const tampered = `${parts[0]}:${parts[1]}:${Buffer.from('tampered').toString('base64')}`;

    expect(() => decrypt(tampered)).toThrow();
  });

  it('should throw on invalid format', () => {
    expect(() => decrypt('invalid-string')).toThrow(
      'Invalid encrypted string format',
    );
  });
});
