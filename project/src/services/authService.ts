/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosInstance } from "../config/api";

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  bio?: string;
  isOnline: boolean;
}

export interface UpdateProfileDto {
  Name: string;
  Bio?: string;
  PhoneNumber?: string;
  Location?: string;
  DateBirth?: string;
  avatarFile?: File;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}
export interface SendVerificationDto {
  name: string;
  email: string;
  password: string;
}

export const authService = {
  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      const { data } = await axiosInstance.post<AuthResponse>(
        "/Auth/register",
        dto
      );
      localStorage.setItem("token", data.token);
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  },

  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      const { data } = await axiosInstance.post<AuthResponse>(
        "/Auth/login",
        dto
      );
      localStorage.setItem("token", data.token);
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  },

  async getCurrentUser(): Promise<UserResponse> {
    try {
      const { data } = await axiosInstance.get<UserResponse>("/Auth/me");
      return data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to get current user"
      );
    }
  },

  async updateProfile(dto: UpdateProfileDto): Promise<UserResponse> {
    try {
      const formData = new FormData();
      formData.append("Name", dto.Name);
      formData.append("Bio", dto.Bio || "");
      formData.append("PhoneNumber", dto.PhoneNumber || "");
      formData.append("Location", dto.Location || "");
      formData.append("DateBirth", dto.DateBirth || "");

      if (dto.avatarFile) {
        formData.append("avatarFile", dto.avatarFile);
      }

      const { data } = await axiosInstance.put(
        "/Auth/update-profile",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Trả về user mới
      return {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatarUrl: data.user.avatar,
        bio: data.user.bio,
        isOnline: true, // hoặc lấy từ server nếu có
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to update profile"
      );
    }
  },

  async changePassword(dto: ChangePasswordDto): Promise<void> {
    try {
      await axiosInstance.post("/Auth/change-password", dto);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Password change failed"
      );
    }
  },

  async logout(): Promise<void> {
    try {
      await axiosInstance.post("/Auth/logout");
      localStorage.removeItem("token");
    } catch (error: any) {
      localStorage.removeItem("token");
      throw new Error(error.response?.data?.message || "Logout failed");
    }
  },
  async sendVerification(dto: SendVerificationDto): Promise<void> {
    try {
      await axiosInstance.post("/Auth/send-verification", dto);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to send verification email"
      );
    }
  },
};
