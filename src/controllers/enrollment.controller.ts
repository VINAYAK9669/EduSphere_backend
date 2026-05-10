import { Request, Response, NextFunction } from 'express';

export const enroll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: null });
  } catch (err) { next(err); }
};

export const getEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: [] });
  } catch (err) { next(err); }
};
