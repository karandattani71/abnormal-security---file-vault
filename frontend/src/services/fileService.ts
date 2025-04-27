import axios from "axios";
import { File as FileType } from "../types/file";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

interface StorageSavings {
  total_bytes: number;
  total_kb: number;
  total_mb: number;
}

interface FileStats {
  unique_files: number;
  total_uploads: number;
  duplication_rate: number;
  storage: {
    actual_bytes: number;
    actual_kb: number;
    actual_mb: number;
    saved_bytes: number;
    saved_kb: number;
    saved_mb: number;
    without_dedup_bytes: number;
    without_dedup_kb: number;
    without_dedup_mb: number;
    efficiency_percentage: number;
  };
  file_types: Array<{
    file_type: string;
    count: number;
    total_size: number;
  }>;
}

export interface FileFilters {
  search?: string;
  file_type?: string;
  min_size?: number;
  max_size?: number;
  start_date?: string;
  end_date?: string;
  date_range?: string;
  ordering?: string;
  page?: number;
}

export const fileService = {
  async uploadFile(file: File): Promise<FileType> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${API_URL}/files/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async getFiles(filters: FileFilters = {}): Promise<FileType[]> {
    // Build query params from filters
    const params = new URLSearchParams();

    if (filters.search) {
      params.append("search", filters.search);
    }

    if (filters.file_type) {
      params.append("file_type", filters.file_type);
    }

    if (filters.min_size) {
      params.append("min_size", filters.min_size.toString());
    }

    if (filters.max_size) {
      params.append("max_size", filters.max_size.toString());
    }

    if (filters.start_date) {
      params.append("start_date", filters.start_date);
    }

    if (filters.end_date) {
      params.append("end_date", filters.end_date);
    }

    if (filters.date_range) {
      params.append("date_range", filters.date_range);
    }

    if (filters.ordering) {
      params.append("ordering", filters.ordering);
    }

    if (filters.page) {
      params.append("page", filters.page.toString());
    }

    const response = await axios.get(`${API_URL}/files/`, { params });

    // Handle pagination
    return response.data.results || response.data;
  },

  async deleteFile(id: string): Promise<void> {
    await axios.delete(`${API_URL}/files/${id}/`);
  },

  async downloadFile(fileUrl: string, filename: string): Promise<void> {
    try {
      const response = await axios.get(fileUrl, {
        responseType: "blob",
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      throw new Error("Failed to download file");
    }
  },

  async getStorageSavings(): Promise<StorageSavings> {
    const response = await axios.get(`${API_URL}/files/savings/`);
    return response.data;
  },

  async getFileStats(): Promise<FileStats> {
    const response = await axios.get(`${API_URL}/files/stats/`);
    return response.data;
  },

  async getFileTypes(): Promise<string[]> {
    const response = await axios.get(`${API_URL}/files/file_types/`);
    return response.data;
  },
};
