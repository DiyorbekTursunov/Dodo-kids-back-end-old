export interface TokenPayload {
  userId: string;
  role: "ADMIN" | "USER";
  type: "access" | "refresh";
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    login: string;
    role: "ADMIN" | "USER";
    employee?: {
      id: string;
      name: string;
      departmentId: string;
    } | null;
  };
}

export interface RefreshResponse {
  message: string;
  accessToken: string;
  user: {
    id: string;
    login: string;
    role: "ADMIN" | "USER";
    employee?: {
      id: string;
      name: string;
      departmentId: string;
    } | null;
  };
}
