"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Download, Plus, Trash2, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface ExportDataModalProps {
  onClose: () => void;
  columnKeys?: string[];
  toLabel?: (key: string) => string;
  filters?: {
    search?: string;
    workerFilter?: string;
    startDate?: string;
  };
  currentAdvancedFilters?: {
    latestRecordsOnly?: boolean;
    filterConditions?: Array<{
      id: string;
      table: "projector" | "site" | "serviceRecord";
      field: string;
      operator: string;
      value: string;
      value2?: string;
    }>;
    filterLogic?: "AND" | "OR";
  };
}

// Filter field definitions
type FilterField = {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "enum" | "boolean";
  options?: string[];
};

const FILTER_FIELDS: {
  projector: FilterField[];
  site: FilterField[];
  serviceRecord: FilterField[];
} = {
  projector: [
    { key: "serialNo", label: "Serial Number", type: "string" },
    { key: "modelNo", label: "Model Number", type: "string" },
    { key: "region", label: "Region", type: "string" },
    { key: "state", label: "State", type: "string" },
    {
      key: "pvr",
      label: "PVR/Non-PVR",
      type: "enum",
      options: ["PVR", "NonPVR"],
    },
    {
      key: "status",
      label: "Status",
      type: "enum",
      options: [
        "DRAFT",
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "PENDING",
        "CANCELLED",
      ],
    },
    { key: "address", label: "Address", type: "string" },
    { key: "noOfservices", label: "Number of Services", type: "number" },
  ],
  site: [
    { key: "siteName", label: "Site Name", type: "string" },
    { key: "siteCode", label: "Site Code", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "contactDetails", label: "Contact Details", type: "string" },
  ],
  serviceRecord: [
    { key: "serviceNumber", label: "Service Number", type: "string" },
    { key: "date", label: "Date", type: "date" },
    { key: "cinemaName", label: "Cinema Name", type: "string" },
    { key: "screenNumber", label: "Screen Number", type: "string" },
    { key: "reportGenerated", label: "Report Generated", type: "boolean" },
  ],
};

const OPERATORS = {
  string: [
    { value: "equals", label: "Equals" },
    { value: "contains", label: "Contains" },
    { value: "startsWith", label: "Starts With" },
    { value: "endsWith", label: "Ends With" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "greaterThan", label: "Greater Than" },
    { value: "lessThan", label: "Less Than" },
    { value: "between", label: "Between" },
  ],
  date: [
    { value: "equals", label: "Equals" },
    { value: "after", label: "After" },
    { value: "before", label: "Before" },
    { value: "between", label: "Between" },
  ],
  enum: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Not Equals" },
  ],
  boolean: [{ value: "equals", label: "Equals" }],
};

interface FilterCondition {
  id: string;
  table: "projector" | "site" | "serviceRecord";
  field: string;
  operator: string;
  value: string;
  value2?: string;
}

export default function ExportDataModal({
  onClose,
  columnKeys = [],
  toLabel,
  filters = {},
  currentAdvancedFilters,
}: ExportDataModalProps) {
  const { user } = useAuth();
  const [selectAllColumns, setSelectAllColumns] = useState(true);
  const [selectSpecificColumns, setSelectSpecificColumns] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set()
  );
  const [columnSearch, setColumnSearch] = useState("");
  const [isColumnPopoverOpen, setIsColumnPopoverOpen] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const [noFilter, setNoFilter] = useState(true);
  const [useCurrentFilter, setUseCurrentFilter] = useState(false);
  const [selectFilter, setSelectFilter] = useState(false);
  const [latestRecordsOnly, setLatestRecordsOnly] = useState(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>(
    []
  );
  const [filterLogic, setFilterLogic] = useState<"AND" | "OR">("AND");

  const getLabel = (key: string) => {
    if (toLabel) return toLabel(key);
    return key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const filteredColumns = useMemo(() => {
    if (!columnSearch) return columnKeys;
    const searchLower = columnSearch.toLowerCase();
    return columnKeys.filter((key) =>
      getLabel(key).toLowerCase().includes(searchLower)
    );
  }, [columnKeys, columnSearch, getLabel]);

  const handleAllChange = (checked: boolean) => {
    setSelectAllColumns(checked);
    if (checked) {
      setSelectSpecificColumns(false);
      setSelectedColumns(new Set());
    }
  };

  const handleSelectColumnChange = (checked: boolean) => {
    setSelectSpecificColumns(checked);
    if (checked) {
      setSelectAllColumns(false);
      setSelectedColumns(new Set());
    } else {
      setSelectedColumns(new Set());
    }
  };

  const toggleColumn = (columnKey: string) => {
    const newSet = new Set(selectedColumns);
    if (newSet.has(columnKey)) {
      newSet.delete(columnKey);
    } else {
      newSet.add(columnKey);
    }
    setSelectedColumns(newSet);
  };

  const selectAllFilteredColumns = () => {
    setSelectedColumns(new Set(filteredColumns));
  };

  const deselectAllFilteredColumns = () => {
    setSelectedColumns(new Set());
  };

  const handleNoFilterChange = (checked: boolean) => {
    setNoFilter(checked);
    if (checked) {
      setUseCurrentFilter(false);
      setSelectFilter(false);
      setFilterConditions([]);
      setLatestRecordsOnly(false);
    }
  };

  const handleUseCurrentFilterChange = (checked: boolean) => {
    setUseCurrentFilter(checked);
    if (checked) {
      setNoFilter(false);
      setSelectFilter(false);
      if (currentAdvancedFilters) {
        setLatestRecordsOnly(currentAdvancedFilters.latestRecordsOnly || false);
        setFilterConditions(currentAdvancedFilters.filterConditions || []);
        setFilterLogic(currentAdvancedFilters.filterLogic || "AND");
      } else {
        setFilterConditions([]);
        setLatestRecordsOnly(false);
        setFilterLogic("AND");
      }
    } else {
      setFilterConditions([]);
      setLatestRecordsOnly(false);
      setFilterLogic("AND");
    }
  };

  const handleSelectFilterChange = (checked: boolean) => {
    setSelectFilter(checked);
    if (checked) {
      setNoFilter(false);
      setUseCurrentFilter(false);
      if (filterConditions.length === 0) {
        addFilterCondition();
      }
    } else {
      setFilterConditions([]);
      setLatestRecordsOnly(false);
    }
  };

  const addFilterCondition = () => {
    const newCondition: FilterCondition = {
      id: `filter-${Date.now()}-${Math.random()}`,
      table: "projector",
      field: FILTER_FIELDS.projector[0]!.key,
      operator: "equals",
      value: "",
    };
    setFilterConditions([...filterConditions, newCondition]);
  };

  const removeFilterCondition = (id: string) => {
    setFilterConditions(filterConditions.filter((f) => f.id !== id));
  };

  const updateFilterCondition = (
    id: string,
    updates: Partial<FilterCondition>
  ) => {
    setFilterConditions(
      filterConditions.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const getFieldsForTable = (table: "projector" | "site" | "serviceRecord") => {
    return FILTER_FIELDS[table] || [];
  };

  const getOperatorsForField = (
    table: "projector" | "site" | "serviceRecord",
    fieldKey: string
  ) => {
    const field = FILTER_FIELDS[table].find((f) => f.key === fieldKey);
    if (!field) return OPERATORS.string;
    return OPERATORS[field.type as keyof typeof OPERATORS] || OPERATORS.string;
  };

  const getFieldDefinition = (
    table: "projector" | "site" | "serviceRecord",
    fieldKey: string
  ): FilterField | undefined => {
    return FILTER_FIELDS[table].find((f) => f.key === fieldKey);
  };

  const handleExport = () => {
    if (!selectAllColumns && !selectSpecificColumns) {
      toast.error("Please select column option");
      return;
    }

    if (selectSpecificColumns && selectedColumns.size === 0) {
      toast.error("Please select at least one column");
      return;
    }

    if (selectFilter) {
      if (filterConditions.length === 0) {
        toast.error("Please add at least one filter condition");
        return;
      }

      for (const condition of filterConditions) {
        if (!condition.value.trim()) {
          toast.error("Please fill in all filter values");
          return;
        }
        if (condition.operator === "between" && !condition.value2?.trim()) {
          toast.error("Please fill in both values for 'between' filter");
          return;
        }
      }
    }

    if (email && !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    const exportConfig = {
      columns: selectAllColumns ? "all" : Array.from(selectedColumns),
      filters: {
        type: noFilter ? "none" : useCurrentFilter ? "current" : "custom",
        latestRecordsOnly,
        conditions: filterConditions,
        logic: filterLogic,
        currentFilters: useCurrentFilter ? filters : undefined,
      },
      email: email || undefined,
    };

    console.log("Export Config:", exportConfig);
    toast.info("Export configuration ready (Backend not connected yet)");
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="flex gap-4 flex-col">
            <div className="flex gap-24">
              <Label className="text-base font-semibold">Column</Label>

              <div className="flex gap-8">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="all-columns"
                    checked={selectAllColumns}
                    onCheckedChange={handleAllChange}
                    className="border-2 border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                  />
                  <Label
                    htmlFor="all-columns"
                    className="text-sm font-medium cursor-pointer"
                  >
                    All
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-columns"
                    checked={selectSpecificColumns}
                    onCheckedChange={handleSelectColumnChange}
                    className="border-2 border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                  />
                  <Label
                    htmlFor="select-columns"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Select Column
                  </Label>
                </div>
              </div>
            </div>

            {selectSpecificColumns && (
              <Popover
                open={isColumnPopoverOpen}
                onOpenChange={setIsColumnPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <div
                    className="min-h-[40px] w-full border-2 border-gray-300 rounded-md px-3 py-2 cursor-text flex flex-wrap gap-2 items-center"
                    onClick={() => setIsColumnPopoverOpen(true)}
                  >
                    {selectedColumns.size === 0 ? (
                      <span className="text-sm text-gray-500">
                        Select columns...
                      </span>
                    ) : (
                      Array.from(selectedColumns).map((columnKey) => (
                        <div
                          key={columnKey}
                          className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-gray-900">
                            {getLabel(columnKey)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumn(columnKey);
                            }}
                            className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                            aria-label={`Remove ${getLabel(columnKey)}`}
                          >
                            <X className="h-3 w-3 text-gray-600" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[400px] p-0 overflow-y-auto flex flex-col"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="p-4 space-y-3 flex flex-col">
                    <Input
                      placeholder="Search columns..."
                      value={columnSearch}
                      onChange={(e) => setColumnSearch(e.target.value)}
                      className="border-2 border-gray-300 flex-shrink-0"
                      autoFocus
                    />

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deselectAllFilteredColumns}
                        className="border-2 border-black text-xs"
                      >
                        Deselect All
                      </Button>
                    </div>

                    <div className="border flex flex-col gap-8 border-gray-200 h-[25vh] rounded-md p-2">
                      {filteredColumns.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-8">
                          No columns found
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 w-full h-full overflow-y-auto">
                          {filteredColumns.map((columnKey) => {
                            const isSelected = selectedColumns.has(columnKey);
                            return (
                              <label
                                key={columnKey}
                                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-black/5 border-2 border-black"
                                    : "hover:bg-gray-50 border-2 border-transparent"
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleColumn(columnKey)
                                  }
                                  className="border-2 border-gray-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
                                />
                                <span className="text-sm text-gray-900 flex-1">
                                  {getLabel(columnKey)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-6 mt-4">
            <div className="flex gap-4 flex-col">
              <div className="flex gap-24">
                <Label className="text-base font-semibold">Filters</Label>

                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="no-filter"
                      checked={noFilter}
                      onCheckedChange={handleNoFilterChange}
                      className="border-2 border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                    />
                    <Label
                      htmlFor="no-filter"
                      className="text-sm font-medium cursor-pointer"
                    >
                      No filter
                    </Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="use-current-filter"
                      checked={useCurrentFilter}
                      onCheckedChange={handleUseCurrentFilterChange}
                      className="border-2 border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                    />
                    <Label
                      htmlFor="use-current-filter"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Use current filter
                    </Label>
                    {useCurrentFilter && filters && (
                      <div className="text-xs text-gray-500 ml-2">
                        ({filters.search && `Search: "${filters.search}"`}
                        {filters.workerFilter &&
                          filters.workerFilter !== "all" &&
                          ` | Worker: ${filters.workerFilter}`}
                        {filters.startDate && ` | Date: ${filters.startDate}`})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="select-filter"
                      checked={selectFilter}
                      onCheckedChange={handleSelectFilterChange}
                      className="border-2 border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                    />
                    <Label
                      htmlFor="select-filter"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Select filter
                    </Label>
                  </div>
                </div>
              </div>
                {(selectFilter || useCurrentFilter) && (
                  <div className="border-2 border-gray-200 rounded-lg p-4 space-y-2">
                    {useCurrentFilter && (
                      <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs text-blue-800">
                          {filterConditions.length > 0 || latestRecordsOnly
                            ? "Using current filters from overview table"
                            : "No filters currently applied in overview table"}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 pb-3 border-b">
                      <Checkbox
                        id="latest-records"
                        checked={latestRecordsOnly}
                        onCheckedChange={(checked) =>
                          setLatestRecordsOnly(checked as boolean)
                        }
                        disabled={useCurrentFilter}
                        className="border-2 border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                      />
                      <Label
                        htmlFor="latest-records"
                        className={`text-sm font-medium ${useCurrentFilter ? "cursor-default text-gray-600" : "cursor-pointer"}`}
                      >
                        Latest records only (one record per projector)
                      </Label>
                    </div>

                    {filterConditions.length > 1 && (
                      <div className="flex items-center gap-3">
                        <Label className="text-sm font-medium">
                          Combine filters with:
                        </Label>
                        <Select
                          value={filterLogic}
                          onValueChange={(v) =>
                            setFilterLogic(v as "AND" | "OR")
                          }
                        >
                          <SelectTrigger className="w-32 border-2 border-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-3">
                      {filterConditions.map((condition, index) => {
                        const fields = getFieldsForTable(condition.table);
                        const operators = getOperatorsForField(
                          condition.table,
                          condition.field
                        );
                        const fieldDef = getFieldDefinition(
                          condition.table,
                          condition.field
                        );

                        return (
                          <div
                            key={condition.id}
                            className="border-2 border-gray-200 rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-700">
                                Filter {index + 1}
                              </span>
                              {filterConditions.length > 1 && !useCurrentFilter && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeFilterCondition(condition.id)
                                  }
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">
                                  Table
                                </Label>
                                <Select
                                  value={condition.table}
                                  onValueChange={(value) =>
                                    updateFilterCondition(condition.id, {
                                      table: value as
                                        | "projector"
                                        | "site"
                                        | "serviceRecord",
                                      field:
                                        FILTER_FIELDS[
                                          value as keyof typeof FILTER_FIELDS
                                        ][0]!.key,
                                      operator: "equals",
                                      value: "",
                                    })
                                  }
                                  disabled={useCurrentFilter}
                                >
                                  <SelectTrigger className={`border-2 border-gray-300 ${useCurrentFilter ? "opacity-60 cursor-not-allowed" : ""}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="projector">
                                      Projector
                                    </SelectItem>
                                    <SelectItem value="site">Site</SelectItem>
                                    <SelectItem value="serviceRecord">
                                      Service Record
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">
                                  Field
                                </Label>
                                <Select
                                  value={condition.field}
                                  onValueChange={(value) =>
                                    updateFilterCondition(condition.id, {
                                      field: value,
                                      operator: "equals",
                                      value: "",
                                    })
                                  }
                                  disabled={useCurrentFilter}
                                >
                                  <SelectTrigger className={`border-2 border-gray-300 ${useCurrentFilter ? "opacity-60 cursor-not-allowed" : ""}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fields.map((field) => (
                                      <SelectItem
                                        key={field.key}
                                        value={field.key}
                                      >
                                        {field.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">
                                  Operator
                                </Label>
                                <Select
                                  value={condition.operator}
                                  onValueChange={(value) =>
                                    updateFilterCondition(condition.id, {
                                      operator: value,
                                      value2:
                                        value === "between"
                                          ? condition.value2
                                          : undefined,
                                    })
                                  }
                                  disabled={useCurrentFilter}
                                >
                                  <SelectTrigger className={`border-2 border-gray-300 ${useCurrentFilter ? "opacity-60 cursor-not-allowed" : ""}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {operators.map((op) => (
                                      <SelectItem
                                        key={op.value}
                                        value={op.value}
                                      >
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">
                                  Value
                                </Label>
                                {fieldDef?.type === "enum" ? (
                                  <Select
                                    value={condition.value}
                                    onValueChange={(value) =>
                                      updateFilterCondition(condition.id, {
                                        value,
                                      })
                                    }
                                    disabled={useCurrentFilter}
                                  >
                                    <SelectTrigger className={`border-2 border-gray-300 ${useCurrentFilter ? "opacity-60 cursor-not-allowed" : ""}`}>
                                      <SelectValue placeholder="Select value" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fieldDef.options?.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                          {opt}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : fieldDef?.type === "boolean" ? (
                                  <Select
                                    value={condition.value}
                                    onValueChange={(value) =>
                                      updateFilterCondition(condition.id, {
                                        value,
                                      })
                                    }
                                    disabled={useCurrentFilter}
                                  >
                                    <SelectTrigger className={`border-2 border-gray-300 ${useCurrentFilter ? "opacity-60 cursor-not-allowed" : ""}`}>
                                      <SelectValue placeholder="Select value" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">Yes</SelectItem>
                                      <SelectItem value="false">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : fieldDef?.type === "date" ? (
                                  <Input
                                    type="date"
                                    value={condition.value}
                                    onChange={(e) =>
                                      updateFilterCondition(condition.id, {
                                        value: e.target.value,
                                      })
                                    }
                                    disabled={useCurrentFilter}
                                    className={`border-2 border-gray-300 ${useCurrentFilter ? "opacity-60 cursor-not-allowed" : ""}`}
                                  />
                                ) : (
                                  <Input
                                    type={
                                      fieldDef?.type === "number"
                                        ? "number"
                                        : "text"
                                    }
                                    value={condition.value}
                                    onChange={(e) =>
                                      updateFilterCondition(condition.id, {
                                        value: e.target.value,
                                      })
                                    }
                                    placeholder="Enter value"
                                    disabled={useCurrentFilter}
                                    className={`border-2 border-gray-300 ${useCurrentFilter ? "opacity-60 cursor-not-allowed" : ""}`}
                                  />
                                )}
                              </div>
                            </div>

                            {condition.operator === "between" && (
                              <div className="md:col-span-4">
                                <div className="space-y-1 max-w-xs">
                                  <Label className="text-xs text-gray-600">
                                    Second Value
                                  </Label>
                                  <Input
                                    type={
                                      fieldDef?.type === "date"
                                        ? "date"
                                        : fieldDef?.type === "number"
                                        ? "number"
                                        : "text"
                                    }
                                    value={condition.value2 || ""}
                                    onChange={(e) =>
                                      updateFilterCondition(condition.id, {
                                        value2: e.target.value,
                                      })
                                    }
                                    placeholder="Enter second value"
                                    disabled={useCurrentFilter}
                                    className={`border-2 border-gray-300 ${useCurrentFilter ? "opacity-60 cursor-not-allowed" : ""}`}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!useCurrentFilter && (
                      <Button
                      type="button"
                      variant="outline"
                      onClick={addFilterCondition}
                      className="w-full border-2 border-dashed border-gray-300 hover:border-black"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Filter Condition
                    </Button>
                    )}
                  </div>
                )}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-2 border-gray-300"
            />
            <p className="text-xs text-gray-500">
              Email address for export notifications or delivery
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-2 border-black"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              className="bg-black text-white hover:bg-gray-800 border-2 border-black"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
