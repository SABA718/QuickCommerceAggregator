export {};
declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: {phoneNumber: string} | null;
      validatedBody?: {phoneNumber: string};
    }
  }
}
