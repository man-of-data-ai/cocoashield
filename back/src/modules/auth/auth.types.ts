import { Request } from 'express';
import type { Auth } from './auth.provider';

export type Session = Auth['$Infer']['Session']['session'];
export type User = Auth['$Infer']['Session']['user'];

export interface AuthenticatedRequest extends Request {
  session: Session | null;
  user: User | null;
}
