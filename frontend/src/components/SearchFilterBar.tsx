import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fileService, FileFilters } from "../services/fileService";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const sizeUnits = [
  { label: "KB", value: 1024 },
  { label: "MB", value: 1024 * 1024 },
  { label: "GB", value: 1024 * 1024 * 1024 },
];

const dateRangeOptions = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
];

interface SearchFilterBarProps {
  onFilterChange: (filters: FileFilters) => void;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  onFilterChange,
}) => {
  // State for search term
  const [searchTerm, setSearchTerm] = useState("");

  // State for filters
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FileFilters>({});

  // Size filter states
  const [minSize, setMinSize] = useState<string>("");
  const [maxSize, setMaxSize] = useState<string>("");
  const [minSizeUnit, setMinSizeUnit] = useState(1024); // Default to KB
  const [maxSizeUnit, setMaxSizeUnit] = useState(1024); // Default to KB

  // Date filter states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("");

  // File type filter state
  const [selectedFileType, setSelectedFileType] = useState<string>("");

  // Sorting state
  const [sortBy, setSortBy] = useState<string>("-uploaded_at"); // Default to newest first

  // Fetch available file types
  const { data: fileTypes = [] } = useQuery({
    queryKey: ["fileTypes"],
    queryFn: fileService.getFileTypes,
  });

  // Debounce search to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      const newFilters: FileFilters = { ...activeFilters };

      if (searchTerm) {
        newFilters.search = searchTerm;
      } else {
        delete newFilters.search;
      }

      setActiveFilters(newFilters);
      onFilterChange(newFilters);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, onFilterChange]);

  // Apply filters when filter button is clicked
  const applyFilters = () => {
    const newFilters: FileFilters = {};

    // Include search term if present
    if (searchTerm) {
      newFilters.search = searchTerm;
    }

    // Apply file type filter
    if (selectedFileType) {
      newFilters.file_type = selectedFileType;
    }

    // Apply size filters
    if (minSize && !isNaN(Number(minSize))) {
      newFilters.min_size = Number(minSize) * minSizeUnit;
    }

    if (maxSize && !isNaN(Number(maxSize))) {
      newFilters.max_size = Number(maxSize) * maxSizeUnit;
    }

    // Apply date filters
    if (startDate) {
      newFilters.start_date = startDate;
    }

    if (endDate) {
      newFilters.end_date = endDate;
    }

    // Apply date range shortcut if selected
    if (dateRange) {
      newFilters.date_range = dateRange;
    }

    // Apply sorting
    if (sortBy) {
      newFilters.ordering = sortBy;
    }

    setActiveFilters(newFilters);
    onFilterChange(newFilters);
    setFiltersVisible(false);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedFileType("");
    setMinSize("");
    setMaxSize("");
    setStartDate("");
    setEndDate("");
    setDateRange("");
    setSortBy("-uploaded_at");
    setActiveFilters({});
    onFilterChange({});
  };

  // Count active filters (excluding search and sorting)
  const activeFilterCount =
    (activeFilters.file_type ? 1 : 0) +
    (activeFilters.min_size || activeFilters.max_size ? 1 : 0) +
    (activeFilters.start_date ||
    activeFilters.end_date ||
    activeFilters.date_range
      ? 1
      : 0);

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      {/* Search Bar */}
      <div className="relative flex items-center mb-4">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3" />
        <input
          type="text"
          placeholder="Search by filename..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <button
          onClick={() => setFiltersVisible(!filtersVisible)}
          className={`ml-3 p-2 rounded-md ${
            activeFilterCount > 0
              ? "bg-primary-100 text-primary-700"
              : "bg-gray-100 text-gray-700"
          } hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500`}
        >
          <FunnelIcon className="h-5 w-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {filtersVisible && (
        <div className="bg-gray-50 rounded-md p-4 mb-4 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <button
              onClick={() => setFiltersVisible(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* File Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Type
              </label>
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Types</option>
                {fileTypes.map((type, index) => (
                  <option key={index} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Size Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size Range
              </label>
              <div className="flex space-x-2 items-center">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minSize}
                    onChange={(e) => setMinSize(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <select
                  value={minSizeUnit}
                  onChange={(e) => setMinSizeUnit(Number(e.target.value))}
                  className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {sizeUnits.map((unit) => (
                    <option key={unit.label} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">-</span>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxSize}
                    onChange={(e) => setMaxSize(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <select
                  value={maxSizeUnit}
                  onChange={(e) => setMaxSizeUnit(Number(e.target.value))}
                  className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {sizeUnits.map((unit) => (
                    <option key={unit.label} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Filter - Specific Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Date Range
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateRange(""); // Clear preset when custom dates are set
                    }}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <span className="text-gray-500">-</span>
                <div className="flex-1">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateRange(""); // Clear preset when custom dates are set
                    }}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Date Filter - Preset Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quick Date Filters
              </label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  // Clear custom date range when preset is selected
                  if (e.target.value) {
                    setStartDate("");
                    setEndDate("");
                  }
                }}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a range</option>
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="-uploaded_at">Newest First</option>
                <option value="uploaded_at">Oldest First</option>
                <option value="original_filename">Name (A-Z)</option>
                <option value="-original_filename">Name (Z-A)</option>
                <option value="size">Size (Small to Large)</option>
                <option value="-size">Size (Large to Small)</option>
                <option value="-reference_count">Most Referenced</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-sm text-gray-600">Active filters:</span>

          {activeFilters.file_type && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Type: {activeFilters.file_type}
              <button
                onClick={() => {
                  setSelectedFileType("");
                  const newFilters = { ...activeFilters };
                  delete newFilters.file_type;
                  setActiveFilters(newFilters);
                  onFilterChange(newFilters);
                }}
                className="ml-1 text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {(activeFilters.min_size || activeFilters.max_size) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Size:
              {activeFilters.min_size &&
                ` ≥ ${(activeFilters.min_size / 1024).toFixed(0)} KB`}
              {activeFilters.min_size && activeFilters.max_size && " and"}
              {activeFilters.max_size &&
                ` ≤ ${(activeFilters.max_size / 1024).toFixed(0)} KB`}
              <button
                onClick={() => {
                  setMinSize("");
                  setMaxSize("");
                  const newFilters = { ...activeFilters };
                  delete newFilters.min_size;
                  delete newFilters.max_size;
                  setActiveFilters(newFilters);
                  onFilterChange(newFilters);
                }}
                className="ml-1 text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {(activeFilters.start_date ||
            activeFilters.end_date ||
            activeFilters.date_range) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Date:
              {activeFilters.date_range &&
                ` ${
                  dateRangeOptions.find(
                    (d) => d.value === activeFilters.date_range
                  )?.label || activeFilters.date_range
                }`}
              {activeFilters.start_date &&
                !activeFilters.date_range &&
                ` From ${activeFilters.start_date}`}
              {activeFilters.end_date &&
                !activeFilters.date_range &&
                ` To ${activeFilters.end_date}`}
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setDateRange("");
                  const newFilters = { ...activeFilters };
                  delete newFilters.start_date;
                  delete newFilters.end_date;
                  delete newFilters.date_range;
                  setActiveFilters(newFilters);
                  onFilterChange(newFilters);
                }}
                className="ml-1 text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};
