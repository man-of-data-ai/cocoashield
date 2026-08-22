
export type User = {
  id: string;
  email: string;
  name: string;
  username?: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
};

export type AuthResponse = {
  user: User;
};

export type ApiErrorPayload = {
  message: string;
};
