import { Schema, model, Document } from 'mongoose';

interface IQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  competencyId?: string;
}

export interface IQuiz extends Document {
  classId: string;
  sessionId?: string;
  title: string;
  questions: IQuestion[];
  createdBy: string;
  createdAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    classId: { type: String, required: true, index: true },
    sessionId: { type: String, index: true },
    title: { type: String, required: true },
    questions: [
      {
        text: { type: String, required: true },
        options: [String],
        correctIndex: { type: Number, required: true },
        competencyId: String,
      },
    ],
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const Quiz = model<IQuiz>('Quiz', QuizSchema);
