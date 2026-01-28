import { axiosInstance } from '../config/api';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  isOnline: boolean;
  lastSeenAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export const authService = {
  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      const { data } = await axiosInstance.post<AuthResponse>('/Auth/register', dto);
      localStorage.setItem('token', data.token);
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      const { data } = await axiosInstance.post<AuthResponse>('/Auth/login', dto);
      localStorage.setItem('token', data.token);
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  async getCurrentUser(): Promise<UserResponse> {
    try {
      const { data } = await axiosInstance.get<UserResponse>('/Auth/me');
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get current user');
    }
  },

  async updateProfile(dto: UpdateProfileDto): Promise<void> {
    try {
      await axiosInstance.put('/Auth/update-profile', dto);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Profile update failed');
    }
  },

  async changePassword(dto: ChangePasswordDto): Promise<void> {
    try {
      await axiosInstance.post('/Auth/change-password', dto);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password change failed');
    }
  },

  async logout(): Promise<void> {
    try {
      await axiosInstance.post('/Auth/logout');
      localStorage.removeItem('token');
    } catch (error: any) {
      localStorage.removeItem('token');
      throw new Error(error.response?.data?.message || 'Logout failed');
    }
  },
};
