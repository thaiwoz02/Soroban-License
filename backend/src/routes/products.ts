import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

const router = Router();

const CreateProductSchema = z.object({
  productId: z.string().min(3).max(128),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  productType: z.enum(['software', 'api', 'course', 'content', 'subscription']),
  licenseContractAddress: z.string().optional(),
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await db('products')
      .join('users', 'products.owner_id', 'users.id')
      .where('users.id', req.user!.userId)
      .select('products.*');
    res.json({ data: products });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await db('products').where('id', req.params.id).first();
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateProductSchema.parse(req.body);

    const existing = await db('products').where('product_id', body.productId).first();
    if (existing) {
      res.status(409).json({ error: 'Product ID already registered' });
      return;
    }

    const [product] = await db('products')
      .insert({
        owner_id: req.user!.userId,
        product_id: body.productId,
        name: body.name,
        description: body.description,
        product_type: body.productType,
        license_contract_address: body.licenseContractAddress,
      })
      .returning('*');

    res.status(201).json(product);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await db('products').where('id', req.params.id).first();
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    if (product.owner_id !== req.user!.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await db('products').where('id', req.params.id).update({ is_active: false });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
