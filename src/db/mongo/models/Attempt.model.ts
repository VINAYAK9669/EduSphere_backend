import { Schema, model, Document } from 'mongoose';

export interface IAttempt extends Document {
  quizId: string;
  studentId: string;
  classId: string;
  answers: number[];
  score: number;
  createdAt: Date;
}

const AttemptSchema = new Schema<IAttempt>(
  {
    quizId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    answers: [Number],
    score: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Attempt = model<IAttempt>('Attempt', AttemptSchema);
