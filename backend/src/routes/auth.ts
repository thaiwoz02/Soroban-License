import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Keypair } from '@stellar/stellar-sdk';
import { db } from '../db/client';

const router = Router();

/**
 * POST /api/v1/auth/challenge
 * Returns a random challenge string for Stellar wallet signing.
 */
router.post('/challenge', async (_req: Request, res: Response) => {
  const challenge = `soroban-license-auth:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;
  res.json({ challenge });
});

/**
 * POST /api/v1/auth/verify
 * Verify a signed challenge and return a JWT.
 *
 * Body: { stellarAddress: string, challenge: string, signature: string }
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { stellarAddress, challenge, signature } = req.body as {
    stellarAddress: string;
    challenge: string;
    signature: string;
  };

  if (!stellarAddress || !challenge || !signature) {
    res.status(400).json({ error: 'stellarAddress, challenge, and signature are required' });
    return;
  }

  try {
    // Verify signature against stellar address
    const keypair = Keypair.fromPublicKey(stellarAddress);
    const messageBytes = Buffer.from(challenge, 'utf8');
    const sigBytes = Buffer.from(signature, 'base64');
    const valid = keypair.verify(messageBytes, sigBytes);

    if (!valid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Upsert user
    const [user] = await db('users')
      .insert({ stellar_address: stellarAddress })
      .onConflict('stellar_address')
      .merge()
      .returning('*');

    const token = jwt.sign(
      { userId: user.id, stellarAddress },
      process.env.JWT_SECRET ?? 'secret',
      { expiresIn: process.env.JWT_EXPIRY ?? '7d' }
    );

    res.json({ token, user: { id: user.id, stellarAddress } });
  } catch (err) {
    res.status(400).json({ error: 'Authentication failed' });
  }
});

export default router;
