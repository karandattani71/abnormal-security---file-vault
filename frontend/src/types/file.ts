export interface File {
  id: string;
  original_filename: string;
  file_type: string;
  size: number;
  uploaded_at: string;
  file: string;
  file_hash: string;
  reference_count: number;
  saved_space: number;
  message?: string;

  // Enhanced metadata fields
  file_extension?: string;
  content_category?: string;
  last_modified?: string;
  description?: string;
  tags?: string[];
  is_favorite?: boolean;
}
