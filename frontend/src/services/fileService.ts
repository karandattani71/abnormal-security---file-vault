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
  content_category?: string;
  tag?: string;
  is_favorite?: boolean;
}

interface UploadOptions {
  description?: string;
  tags?: string[];
  is_favorite?: boolean;
}

interface BulkDeleteResponse {
  deleted_count: number;
  total_requested: number;
  errors: string[];
}

interface BulkTagResponse {
  updated_count: number;
  total_requested: number;
  errors: string[];
}

export const fileService = {
  async uploadFile(file: File, options: UploadOptions = {}): Promise<FileType> {
    const formData = new FormData();
    formData.append("file", file);

    // Add optional metadata if provided
    if (options.description) {
      formData.append("description", options.description);
    }

    if (options.tags && options.tags.length > 0) {
      formData.append("tags", JSON.stringify(options.tags));
    }

    if (options.is_favorite !== undefined) {
      formData.append("is_favorite", options.is_favorite.toString());
    }

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

    if (filters.content_category) {
      params.append("content_category", filters.content_category);
    }

    if (filters.tag) {
      params.append("tag", filters.tag);
    }

    if (filters.is_favorite !== undefined) {
      params.append("is_favorite", filters.is_favorite.toString());
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

  async advancedSearch(
    query: string,
    filters: FileFilters = {}
  ): Promise<FileType[]> {
    const params = new URLSearchParams();
    params.append("q", query);

    // Add all other filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== "search") {
        params.append(key, value.toString());
      }
    });

    const response = await axios.get(`${API_URL}/files/advanced_search/`, {
      params,
    });
    return response.data;
  },

  async bulkDeleteFiles(fileIds: string[]): Promise<BulkDeleteResponse> {
    const response = await axios.post(`${API_URL}/files/bulk_delete/`, {
      file_ids: fileIds,
    });
    return response.data;
  },

  async bulkTagFiles(
    fileIds: string[],
    tags: string[]
  ): Promise<BulkTagResponse> {
    const response = await axios.post(`${API_URL}/files/bulk_tag/`, {
      file_ids: fileIds,
      tags: tags,
    });
    return response.data;
  },

  async updateFileTags(fileId: string, tags: string[]): Promise<FileType> {
    const response = await axios.patch(`${API_URL}/files/${fileId}/`, {
      tags: tags,
    });
    return response.data;
  },

  async updateFileMetadata(
    fileId: string,
    metadata: {
      description?: string;
      is_favorite?: boolean;
    }
  ): Promise<FileType> {
    const response = await axios.patch(`${API_URL}/files/${fileId}/`, metadata);
    return response.data;
  },
};
