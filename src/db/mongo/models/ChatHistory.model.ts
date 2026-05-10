import { Schema, model, Document } from 'mongoose';

interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatHistory extends Document {
  studentId: string;
  classId: string;
  noteId: string;
  messages: IMessage[];
}

const ChatHistorySchema = new Schema<IChatHistory>(
  {
    studentId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    noteId: { type: String, required: true },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const ChatHistory = model<IChatHistory>('ChatHistory', ChatHistorySchema);
