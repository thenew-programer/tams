import { apiService, ApiResponse } from './apiService';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  phone?: string;
  created_at: string;
  last_login?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role?: string;
  department?: string;
  phone?: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  email?: string;
  department?: string;
  phone?: string;
}

export class AuthService {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>('/auth/login', {
      username,
      password,
    });

    // Store token and user data
    localStorage.setItem('taqa_token', response.access_token);
    localStorage.setItem('taqa_user', JSON.stringify(response.user));

    return response;
  }

  async register(userData: RegisterData): Promise<ApiResponse<User>> {
    return apiService.post<ApiResponse<User>>('/auth/register', userData);
  }

  async getProfile(): Promise<User> {
    const response = await apiService.get<ApiResponse<User>>('/auth/profile');
    return response.data!;
  }

  async updateProfile(updates: ProfileUpdateData): Promise<User> {
    const response = await apiService.put<ApiResponse<User>>('/auth/profile', updates);
    
    // Update stored user data
    const updatedUser = response.data!;
    localStorage.setItem('taqa_user', JSON.stringify(updatedUser));
    
    return updatedUser;
  }

  logout(): void {
    localStorage.removeItem('taqa_token');
    localStorage.removeItem('taqa_user');
  }

  getStoredUser(): User | null {
    const userData = localStorage.getItem('taqa_user');
    return userData ? JSON.parse(userData) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('taqa_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();