import { Request, Response, NextFunction } from 'express';

export const createClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: null });
  } catch (err) { next(err); }
};

export const getClasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: [] });
  } catch (err) { next(err); }
};

export const getClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
};
