import * as jose from 'jose';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret');

async function gen() {
  const token = await new jose.SignJWT({ email: 'test@example.com', username: 'test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('1')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
  process.stdout.write(token);
}
gen();
