// Test jose v6 API usage
const { SignJWT, jwtVerify } = require('jose');
const crypto = require('crypto');

async function testWithKeyObject() {
  console.log('\n=== Test 1: With KeyObject ===');
  try {
    const secret = 'test-secret-key-for-jwt-testing-minimum-32-bytes';
    const secretKey = crypto.createSecretKey(Buffer.from(secret));
    console.log('secretKey type:', secretKey.constructor.name);

    const token = await new SignJWT({ sub: 'user1' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secretKey);
    console.log('✓ Success with KeyObject:', token.substring(0, 50) + '...');
    return token;
  } catch (error) {
    console.log('✗ Failed:', error.message);
    return null;
  }
}

async function testWithUint8Array() {
  console.log('\n=== Test 2: With Uint8Array ===');
  try {
    const secret = 'test-secret-key-for-jwt-testing-minimum-32-bytes';
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);
    console.log('secretKey type:', secretKey.constructor.name, 'instanceof Uint8Array:', secretKey instanceof Uint8Array);

    const token = await new SignJWT({ sub: 'user1' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secretKey);
    console.log('✓ Success with Uint8Array:', token.substring(0, 50) + '...');
    return token;
  } catch (error) {
    console.log('✗ Failed:', error.message);
    return null;
  }
}

async function verifyToken(token) {
  console.log('\n=== Test 3: Verify Token ===');
  try {
    const secret = 'test-secret-key-for-jwt-testing-minimum-32-bytes';
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);

    const { payload } = await jwtVerify(token, secretKey);
    console.log('✓ Verified payload:', payload);
  } catch (error) {
    console.log('✗ Verification failed:', error.message);
  }
}

async function main() {
  console.log('Node.js version:', process.version);
  console.log('jose version:', require('jose/package.json').version);

  const token1 = await testWithKeyObject();
  const token2 = await testWithUint8Array();

  if (token1) await verifyToken(token1);
  if (token2) await verifyToken(token2);
}

main().catch(console.error);
