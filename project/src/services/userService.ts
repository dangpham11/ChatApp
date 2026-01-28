import { axiosInstance } from "../config/api";

export interface SearchUserResult {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

export const userService = {
  searchUsers: async (searchQuery: string): Promise<SearchUserResult[]> => {
    const response = await axiosInstance.get(
      `/Users/search?query=${encodeURIComponent(searchQuery)}`
    );
    return response.data;
  },

  getUserByEmail: async (email: string): Promise<SearchUserResult | null> => {
    const response = await axiosInstance.get(
      `/Users/by-email?email=${encodeURIComponent(email)}`
    );
    return response.data;
  },
};
