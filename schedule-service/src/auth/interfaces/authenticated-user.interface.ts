export interface AuthenticatedUser {
  id: string;
  email: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface TokenValidationResponse {
  isValid: boolean;
  user?: AuthenticatedUser | null;
  message?: string;
}
