import express from 'express';

export const healthRouter = express.Router();

healthRouter.get('/health', async (_, res) => {
  return res.send({});
});
