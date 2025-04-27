import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fileService } from "../services/fileService";
import { ChartBarIcon } from "@heroicons/react/24/outline";

interface FileStatsProps {
  refreshKey?: number;
}

export const FileStats: React.FC<FileStatsProps> = ({ refreshKey = 0 }) => {
  const queryClient = useQueryClient();

  // Force refetch when refreshKey changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["fileStats"] });
  }, [refreshKey, queryClient]);

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["fileStats", refreshKey], // Include refreshKey in queryKey to trigger refetch
    queryFn: fileService.getFileStats,
    refetchOnWindowFocus: true,
    staleTime: 0, // Consider data immediately stale to force refetch
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-white shadow rounded-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-white shadow rounded-lg">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Failed to load statistics. Please try again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white shadow rounded-lg">
      <div className="flex items-center mb-4">
        <ChartBarIcon className="h-6 w-6 text-primary-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">File Statistics</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* File counts */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Files</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">
                Unique Files:
              </dt>
              <dd className="text-sm font-bold text-gray-900">
                {stats.unique_files}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">
                Total Uploads:
              </dt>
              <dd className="text-sm font-bold text-gray-900">
                {stats.total_uploads}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">
                Duplication Rate:
              </dt>
              <dd className="text-sm font-bold text-green-600">
                {stats.duplication_rate}%
              </dd>
            </div>
          </dl>
        </div>

        {/* Storage */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Storage</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">
                Actual Storage:
              </dt>
              <dd className="text-sm font-bold text-gray-900">
                {stats.storage.actual_mb >= 1
                  ? `${stats.storage.actual_mb.toFixed(2)} MB`
                  : `${stats.storage.actual_kb.toFixed(2)} KB`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">
                Saved Storage:
              </dt>
              <dd className="text-sm font-bold text-green-600">
                {stats.storage.saved_mb >= 1
                  ? `${stats.storage.saved_mb.toFixed(2)} MB`
                  : `${stats.storage.saved_kb.toFixed(2)} KB`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">
                Without Deduplication:
              </dt>
              <dd className="text-sm font-bold text-gray-900">
                {stats.storage.without_dedup_mb >= 1
                  ? `${stats.storage.without_dedup_mb.toFixed(2)} MB`
                  : `${stats.storage.without_dedup_kb.toFixed(2)} KB`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">
                Efficiency Gain:
              </dt>
              <dd className="text-sm font-bold text-green-600">
                {stats.storage.efficiency_percentage}%
              </dd>
            </div>
          </dl>
        </div>

        {/* File Types */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 sm:col-span-2 lg:col-span-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">File Types</h3>
          {stats.file_types.length === 0 ? (
            <p className="text-sm text-gray-500">No files uploaded yet</p>
          ) : (
            <ul className="space-y-2">
              {stats.file_types.map((type, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {type.file_type}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {type.count} {type.count === 1 ? "file" : "files"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Storage Efficiency Visualization */}
      {stats.storage.without_dedup_bytes > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Storage Efficiency
          </h3>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{
                width: `${stats.storage.efficiency_percentage}%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">0%</span>
            <span className="text-xs text-gray-500">
              {stats.storage.efficiency_percentage}% saved
            </span>
            <span className="text-xs text-gray-500">100%</span>
          </div>
        </div>
      )}
    </div>
  );
};
