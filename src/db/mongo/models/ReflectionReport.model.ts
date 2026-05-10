import { Schema, model, Document } from 'mongoose';

export interface IReflectionReport extends Document {
  studentId: string;
  classId: string;
  sessionId?: string;
  content: string;
  generatedAt: Date;
}

const ReflectionReportSchema = new Schema<IReflectionReport>(
  {
    studentId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    sessionId: String,
    content: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const ReflectionReport = model<IReflectionReport>('ReflectionReport', ReflectionReportSchema);
