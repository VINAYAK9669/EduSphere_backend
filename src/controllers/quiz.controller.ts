import { Request, Response, NextFunction } from 'express';

export const createQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: null });
  } catch (err) { next(err); }
};

export const getQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
};

export const submitAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: null });
  } catch (err) { next(err); }
};
