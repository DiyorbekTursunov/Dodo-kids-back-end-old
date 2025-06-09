export interface User {
  id: string;
  username: string;
  password: string;
  role: 'user' | 'admin';
}
