declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        login: string;
        role: "ADMIN" | "USER";
      };
    }
  }
}
