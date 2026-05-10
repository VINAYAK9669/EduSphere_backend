import { Request, Response, NextFunction } from 'express';
import { proxyToAI } from '../services/ai.service';

export const chatQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, noteId } = req.body;

    const aiRes = await proxyToAI('/rag/query', {
      question,
      note_id: noteId,
      student_id: req.user!.id,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    aiRes.body!.pipeTo(
      new WritableStream({
        write(chunk) { res.write(chunk); },
        close() { res.end(); },
      })
    );
  } catch (err) { next(err); }
};

export const generateReflection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId, sessionId } = req.body;

    const aiRes = await proxyToAI('/reflection/generate', {
      class_id: classId,
      session_id: sessionId,
      student_id: req.user!.id,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    aiRes.body!.pipeTo(
      new WritableStream({
        write(chunk) { res.write(chunk); },
        close() { res.end(); },
      })
    );
  } catch (err) { next(err); }
};
