"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useFormConfig } from "@/hooks/use-form-config";
import { DynamicFormField } from "../workflow/dynamic-form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  Image as ImageIcon,
  Folder,
  ExternalLink,
  Download,
  Edit,
  Mail,
  Plus,
  Trash2,
  Filter,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Image from "next/image";
import ExportDataModal from "./modals/export-data-modal";
import { useAuth } from "@/lib/auth-context";
import { exhaustCfmStatusForStorage } from "@/lib/cfm-model-rules";
import { isLaserProjectorModel } from "@/lib/laser-projector-models";

type ServiceRecord = {
  id: string;
  [key: string]: any;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Normalize column keys so afterImages / After Images / after_images all match. */
const normalizeColumnKey = (key: string) =>
  key.replace(/[\s_]/g, "").toLowerCase();

function coerceImageUrlArray(value: unknown): string[] | null {
  if (value == null) return null;
  let raw: unknown[] | null = null;
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === "string") {
    const t = value.trim();
    if (!t) return null;
    try {
      const p = JSON.parse(t);
      if (Array.isArray(p)) raw = p;
    } catch {
      return null;
    }
  }
  if (!raw) return null;
  const urls = raw.filter((x): x is string => typeof x === "string" && x.length > 0);
  return urls.length > 0 ? urls : null;
}

const EXCLUDED_KEYS = new Set([
  "id",
  "fieldWorkerId",
  "assignedToId",
  "createdAt",
  "userId",
  "reportGenerated",
  "reportUrl",
  "completedAt",
  "lastServiceDate",
  "projectorId",
  "siteId",
]);

// Fields that have corresponding Note fields - merge them
const NOTE_FIELD_MAP: Record<string, string> = {
  reflector: "reflectorNote",
  uvFilter: "uvFilterNote",
  integratorRod: "integratorRodNote",
  coldMirror: "coldMirrorNote",
  foldMirror: "foldMirrorNote",
  touchPanel: "touchPanelNote",
  evbBoard: "evbBoardNote",
  ImcbBoard: "ImcbBoardNote",
  pibBoard: "pibBoardNote",
  IcpBoard: "IcpBoardNote",
  imbSBoard: "imbSBoardNote",
  serialNumberVerified: "serialNumberVerifiedNote",
  AirIntakeLadRad: "AirIntakeLadRadNote",
  coolantLevelColor: "coolantLevelColorNote",
  lightEngineWhite: "lightEngineWhiteNote",
  lightEngineRed: "lightEngineRedNote",
  lightEngineGreen: "lightEngineGreenNote",
  lightEngineBlue: "lightEngineBlueNote",
  lightEngineBlack: "lightEngineBlackNote",
  acBlowerVane: "acBlowerVaneNote",
  extractorVane: "extractorVaneNote",
  exhaustCfm: "exhaustCfmNote",
  lightEngineFans: "lightEngineFansNote",
  cardCageFans: "cardCageFansNote",
  radiatorFanPump: "radiatorFanPumpNote",
  pumpConnectorHose: "pumpConnectorHoseNote",
  lampLocMechanism: "lampLocMechanismNote",
  securityLampHouseLock: "securityLampHouseLockNote",
  focusBoresight: "focusBoresightNote",
  integratorPosition: "integratorPositionNote",
  spotsOnScreen: "spotsOnScreenNote",
  screenCroppingOk: "screenCroppingNote",
  convergenceOk: "convergenceNote",
  channelsCheckedOk: "channelsCheckedNote",
  pixelDefects: "pixelDefectsNote",
  imageVibration: "imageVibrationNote",
  liteloc: "litelocNote",
};

// Priority order for columns - most important first
const COLUMN_PRIORITY = [
  "action",
  "date",
  "serviceNumber",
  "siteName",
  "siteCode",
  "engineerVisited",
  "siteAddress",
  "siteContactDetails",
  "projectorModel",
  "projectorSerial",
  "workerName",
  "status",
  "scheduledDate",
  "projectorRunningHours",
  "cinemaName",
  "address",
  "location",
  "screenNumber",
  "contactDetails",
  "remarks",
];

const LABEL_OVERRIDES: Record<string, string> = {
  action: "",
  engineerVisited: "Engineer Visited",
  serviceNumber: "Service #",
  siteName: "Site",
  siteCode: "Site Code",
  siteAddress: "Address",
  siteContactDetails: "Site Contact",
  projectorName: "Projector",
  projectorModel: "Model #",
  projectorSerial: "Serial #",
  projectorStatus: "Projector Status",
  projectorServices: "Service Count",
  projectorLastServiceAt: "Last Service At",
  workerName: "Worker",
  status: "Status",
  scheduledDate: "Scheduled Date",
  date: "Date",
  createdAt: "Created At",
  updatedAt: "Updated At",
  startTime: "Start Time",
  endTime: "End Time",
  flLeft: "Fl Before",
  flRight: "Fl After",
  logs: "Projector Logs",
};

/**
 * When the "Laser" filter is active, these standard column keys are relabelled
 * to their true laser field names so the table header matches the DB.
 */
const LASER_LABEL_OVERRIDES: Record<string, string> = {
  // Opticals
  reflector: "Diffuser",
  uvFilter: "Coupling Fold Mirror",
  integratorRod: "Rotating Integrator",
  coldMirror: "Short Integrator",
  foldMirror: "Coupling Elbow",
  // Electronics
  touchPanel: "F Main Board",
  evbBoard: "Hub NX Board",
  ImcbBoard: "HKBB Board",
  pibBoard: "DTSM Board",
  // Consumables
  AirIntakeLadRad: "Filter Rad Filter",
  // Mechanical
  acBlowerVane: "LE Pump",
  extractorVane: "LOS Pump",
  exhaustCfm: "Radiator Fan",
  lightEngineFans: "Exhaust Fan",
  cardCageFans: "LE Intake Fan",
  radiatorFanPump: "LE Blower",
  pumpConnectorHose: "Shutter",
  // Lamp → Laser
  lampTotalRunningHours: "Laser Hours",
};

// Default columns to show on initial load
const DEFAULT_VISIBLE_COLUMNS = new Set([
  "action",
  "date",
  "serviceNumber",
  "siteName",
  "siteAddress",
  "screenNumber",
  "projectorSerial",
  "projectorModel",
  "engineerVisited",
]);

const toLabel = (key: string) => {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  // camelCase / snakeCase to Title Case
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Filter field definitions for advanced filtering
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
        "PACKED",
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
    { key: "engineerVisited", label: "Engineer Visited", type: "string" },
    { key: "serviceVisitType", label: "Service Visit Type", type: "string" },
    {
      key: "projectorRunningHours",
      label: "Projector Running Hours",
      type: "number",
    },
    { key: "softwareVersion", label: "Software Version", type: "string" },
    { key: "lampMakeModel", label: "Lamp Make/Model", type: "string" },
    {
      key: "lampTotalRunningHours",
      label: "Lamp Total Running Hours",
      type: "number",
    },
    {
      key: "lampCurrentRunningHours",
      label: "Lamp Current Running Hours",
      type: "number",
    },
    {
      key: "contentPlayerModel",
      label: "Content Player Model",
      type: "string",
    },
    { key: "acStatus", label: "AC Status", type: "string" },
    { key: "leStatus", label: "LE Status", type: "string" },
    {
      key: "reflector",
      label: "Reflector",
      type: "enum",
      options: ["OK", "YES"],
    },
    {
      key: "uvFilter",
      label: "UV Filter",
      type: "enum",
      options: ["OK", "YES"],
    },
    {
      key: "integratorRod",
      label: "Integrator Rod",
      type: "enum",
      options: ["OK", "YES"],
    },
    {
      key: "coldMirror",
      label: "Cold Mirror",
      type: "enum",
      options: ["OK", "YES"],
    },
    {
      key: "foldMirror",
      label: "Fold Mirror",
      type: "enum",
      options: ["OK", "YES"],
    },
    {
      key: "touchPanel",
      label: "Touch Panel",
      type: "enum",
      options: ["OK", "YES"],
    },
    {
      key: "lightEngineFans",
      label: "Light Engine Fans",
      type: "enum",
      options: ["OK", "YES"],
    },
    {
      key: "cardCageFans",
      label: "Card Cage Fans",
      type: "enum",
      options: ["OK", "YES"],
    },
    {
      key: "radiatorFanPump",
      label: "Radiator Fan/Pump",
      type: "enum",
      options: ["OK", "YES"],
    },
    { key: "remarks", label: "Remarks", type: "string" },
    { key: "startTime", label: "Start Time", type: "string" },
    { key: "endTime", label: "End Time", type: "string" },
    { key: "flLeft", label: "FL Before", type: "number" },
    { key: "flRight", label: "FL After", type: "number" },
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

// Utility function to clean repeated/duplicated patterns from note values
// Handles corrupted data like "Chipped - text - Chipped - text - Chipped - text"
const cleanRepeatedNote = (noteValue: string): string => {
  if (!noteValue || typeof noteValue !== "string") return noteValue;

  // Split by " - " separator
  const parts = noteValue.split(" - ");
  if (parts.length <= 2) return noteValue; // Normal format: "Choice - Text" or just "Choice"

  // Check if there's a repeating pattern
  // Pattern would be: Choice - Text - Choice - Text - Choice - Text...
  // So parts would be: [Choice, Text, Choice, Text, Choice, Text]
  const firstPart = parts[0]?.trim() || "";
  const secondPart = parts[1]?.trim() || "";

  // Check if the pattern repeats
  let isRepeating = true;
  for (let i = 2; i < parts.length; i += 2) {
    if ((parts[i]?.trim() || "") !== firstPart) {
      isRepeating = false;
      break;
    }
    if (i + 1 < parts.length && (parts[i + 1]?.trim() || "") !== secondPart) {
      isRepeating = false;
      break;
    }
  }

  if (isRepeating && firstPart) {
    // Return the cleaned version: just first occurrence
    if (secondPart) {
      return `${firstPart} - ${secondPart}`;
    }
    return firstPart;
  }

  return noteValue;
};

type IssueNotes = Record<string, string>;
type UploadedImage = string;
type ProjectorPart = {
  projector_model: string;
  part_number: string;
  description: string;
};
type RecommendedPart = {
  part_number: string;
  partNumber?: string;
  description: string;
  name?: string;
};

const createInitialFormData = () => ({
  cinemaName: "",
  date: new Date().toISOString().split("T")[0] ?? "",
  address: "",
  contactDetails: "",
  location: "",
  screenNumber: "",
  serviceVisitType: "",
  projectorModel: "",
  projectorSerialNumber: "",
  projectorRunningHours: "",
  reflector: "OK",
  uvFilter: "OK",
  integratorRod: "OK",
  coldMirror: "OK",
  foldMirror: "OK",
  touchPanel: "OK",
  evbBoard: "OK",
  ImcbBoard: "OK",
  pibBoard: "OK",
  IcpBoard: "OK",
  imbSBoard: "OK",
  reflectorNote: "",
  uvFilterNote: "",
  integratorRodNote: "",
  coldMirrorNote: "",
  foldMirrorNote: "",
  touchPanelNote: "",
  evbBoardNote: "",
  ImcbBoardNote: "",
  pibBoardNote: "",
  IcpBoardNote: "",
  imbSBoardNote: "",
  serialNumberVerified: "",
  serialNumberVerifiedNote: "",
  AirIntakeLadRad: "",
  AirIntakeLadRadNote: "",
  coolantLevelColor: "",
  coolantLevelColorNote: "",
  lightEngineWhite: "",
  lightEngineRed: "",
  lightEngineGreen: "",
  lightEngineBlue: "",
  lightEngineBlack: "",
  lightEngineWhiteNote: "",
  lightEngineRedNote: "",
  lightEngineGreenNote: "",
  lightEngineBlueNote: "",
  lightEngineBlackNote: "",
  acBlowerVane: "OK",
  extractorVane: "OK",
  exhaustCfm: "",
  lightEngineFans: "OK",
  cardCageFans: "OK",
  radiatorFanPump: "OK",
  pumpConnectorHose: "OK",
  securityLampHouseLock: "OK",
  securityLampHouseLockNote: "",
  lampLocMechanism: "OK",
  acBlowerVaneNote: "",
  extractorVaneNote: "",
  exhaustCfmNote: "",
  lightEngineFansNote: "",
  cardCageFansNote: "",
  radiatorFanPumpNote: "",
  pumpConnectorHoseNote: "",
  lampLocMechanismNote: "",
  projectorPlacementEnvironment: "",
  softwareVersion: "",
  screenHeight: "",
  screenWidth: "",
  flatHeight: "",
  flatWidth: "",
  screenGain: "",
  screenMake: "",
  throwDistance: "",
  lampMakeModel: "",
  lampTotalRunningHours: "",
  lampCurrentRunningHours: "",
  pvVsN: "",
  pvVsE: "",
  nvVsE: "",
  flLeft: "",
  flRight: "",
  contentPlayerModel: "",
  acStatus: "",
  leStatus: "",
  leStatusNote: "",
  remarks: "",
  lightEngineSerialNumber: "",
  white2Kx: "",
  white2Ky: "",
  white2Kfl: "",
  white4Kx: "",
  white4Ky: "",
  white4Kfl: "",
  red2Kx: "",
  red2Ky: "",
  red2Kfl: "",
  red4Kx: "",
  red4Ky: "",
  red4Kfl: "",
  green2Kx: "",
  green2Ky: "",
  green2Kfl: "",
  green4Kx: "",
  green4Ky: "",
  green4Kfl: "",
  blue2Kx: "",
  blue2Ky: "",
  blue2Kfl: "",
  blue4Kx: "",
  blue4Ky: "",
  blue4Kfl: "",
  BW_Step_10_2Kx: "",
  BW_Step_10_2Ky: "",
  BW_Step_10_2Kfl: "",
  BW_Step_10_4Kx: "",
  BW_Step_10_4Ky: "",
  BW_Step_10_4Kfl: "",
  focusBoresight: "",
  integratorPosition: "",
  spotsOnScreen: "",
  screenCroppingOk: "",
  convergenceOk: "",
  channelsCheckedOk: "",
  pixelDefects: "",
  imageVibration: "",
  liteloc: "",
  focusBoresightNote: "",
  integratorPositionNote: "",
  spotsOnScreenNote: "",
  screenCroppingNote: "",
  convergenceNote: "",
  channelsCheckedNote: "",
  pixelDefectsNote: "",
  imageVibrationNote: "",
  litelocNote: "",
  hcho: "",
  tvoc: "",
  pm1: "",
  pm2_5: "",
  pm10: "",
  temperature: "",
  humidity: "",
  airPollutionLevel: "",
  startTime: "",
  endTime: "",
  signatures: "",
  reportGenerated: false,
  reportUrl: "",
  photosDriveLink: "",
  issueNotes: {} as IssueNotes,
  recommendedParts: [] as RecommendedPart[],
  logs: "",
});

type RecordWorkForm = ReturnType<typeof createInitialFormData>;

const COLOR_ACCURACY = [
  {
    name: "White",
    fields: [
      "white2Kx",
      "white2Ky",
      "white2Kfl",
      "white4Kx",
      "white4Ky",
      "white4Kfl",
    ],
  },
  {
    name: "Red",
    fields: ["red2Kx", "red2Ky", "red2Kfl", "red4Kx", "red4Ky", "red4Kfl"],
  },
  {
    name: "Green",
    fields: [
      "green2Kx",
      "green2Ky",
      "green2Kfl",
      "green4Kx",
      "green4Ky",
      "green4Kfl",
    ],
  },
  {
    name: "Blue",
    fields: [
      "blue2Kx",
      "blue2Ky",
      "blue2Kfl",
      "blue4Kx",
      "blue4Ky",
      "blue4Kfl",
    ],
  },
] as const;

const StatusSelectWithNote = ({
  field,
  label,
  options,
  noteOptions,
  noteDefault,
  issueValues,
  form,
  required,
}: {
  field: keyof RecordWorkForm & string;
  label: string;
  options?: Array<{ value: string; label: string; description?: string }>;
  noteOptions?: string[];
  noteDefault?: string;
  issueValues?: string[];
  form: any;
  required?: boolean;
}) => {
  const { watch, register, setValue } = form;
  const statusVal = watch(field as keyof RecordWorkForm) as string;
  const status = statusVal || (options ? "" : "OK");
  const noteField = `${field}Note` as keyof RecordWorkForm;
  const currentNoteValue = (watch(noteField) as string) || "";

  const initialChoice = noteDefault || noteOptions?.[0] || "";
  const [noteChoice, setNoteChoice] = useState<string>(initialChoice);
  const [noteText, setNoteText] = useState<string>("");

  // Use ref to track if we've initialized from currentNoteValue
  const initializedRef = useRef(false);
  const embeddedMigrationRef = useRef(false);
  const prevStatusRef = useRef(status);

  // If a historical record stored the note inside the status value (e.g. "YES - damage hose"),
  // split it so the UI shows status + note correctly even before saving.
  useEffect(() => {
    if (embeddedMigrationRef.current) return;
    if (!statusVal || typeof statusVal !== "string") return;
    if (currentNoteValue.trim().length > 0) return;

    const idx = statusVal.indexOf(" - ");
    if (idx === -1) return;

    const prefix = statusVal.substring(0, idx).trim();
    const suffix = statusVal.substring(idx + 3).trim();
    if (!suffix) return;

    const allowed = options?.map((o) => o.value) ?? ["OK", "YES"];
    if (!allowed.includes(prefix)) return;

    // Hydrate form values without marking dirty; user didn't change anything yet.
    setValue(field as any, prefix, { shouldDirty: false });
    setValue(noteField as any, suffix, { shouldDirty: false });
    embeddedMigrationRef.current = true;
  }, [statusVal, currentNoteValue, options, field, noteField, setValue]);

  // Parse currentNoteValue once on mount or when it changes externally (e.g., from form.reset)
  // But only if we haven't manually set it ourselves
  useEffect(() => {
    if (!initializedRef.current && currentNoteValue && noteOptions?.length) {
      // Clean any repeated/corrupted patterns first
      const cleanedNoteValue = cleanRepeatedNote(currentNoteValue);

      const matchedOption = noteOptions.find(
        (opt) => cleanedNoteValue.startsWith(opt) || cleanedNoteValue === opt,
      );
      if (matchedOption) {
        setNoteChoice(matchedOption);
        const separator = " - ";
        const idx = cleanedNoteValue.indexOf(separator);
        if (
          idx !== -1 &&
          cleanedNoteValue.substring(0, idx) === matchedOption
        ) {
          setNoteText(cleanedNoteValue.substring(idx + separator.length));
        } else {
          setNoteText("");
        }
      } else {
        // Fallback: the stored note doesn't match the configured note options.
        // Still show it to the user so it doesn't look like data is missing.
        setNoteChoice(initialChoice);
        setNoteText(cleanedNoteValue);
      }
      initializedRef.current = true;
    }
  }, [currentNoteValue, noteOptions]);

  const statusRegister = register(field as keyof RecordWorkForm);

  const selectOptions =
    options && options.length
      ? options
      : [
          { value: "OK", label: "OK", description: "Part is OK" },
          { value: "YES", label: "YES", description: "Needs replacement" },
        ];

  const isIssue =
    issueValues && issueValues.length > 0
      ? issueValues.includes(status)
      : status === "YES" ||
        status === "Concern" ||
        status.startsWith("YES") ||
        status.includes("Concern") ||
        currentNoteValue.trim().length > 0;

  // Format note as "Choice - Text" for the note field only
  const formatNote = (choice: string, text: string) => {
    const c = choice?.trim();
    const t = text?.trim();
    if (c && t) return `${c} - ${t}`;
    if (c) return c;
    if (t) return t;
    return "";
  };

  // Handle reason dropdown change - update the NOTE field with combined format
  const handleReasonChange = (val: string) => {
    setNoteChoice(val);
    if (isIssue) {
      // Only update the NOTE field, never the status field
      setValue(noteField, formatNote(val, noteText), { shouldDirty: true });
    }
  };

  // Handle note text change - update the NOTE field with combined format
  const handleNoteTextChange = (text: string) => {
    setNoteText(text);
    if (isIssue) {
      // Only update the NOTE field, never the status field
      setValue(noteField, formatNote(noteChoice, text), { shouldDirty: true });
    }
  };

  // Clear note when status changes from Issue to non-Issue
  useEffect(() => {
    const statusChanged = prevStatusRef.current !== status;
    prevStatusRef.current = status;

    if (statusChanged && !isIssue) {
      setNoteChoice(initialChoice);
      setNoteText("");
      setValue(noteField, "", { shouldDirty: true });
    }
  }, [status, isIssue, noteField, setValue, initialChoice]);

  return (
    <div>
      <label className="block text-xs sm:text-sm font-semibold text-black mb-1">
        {label} {required && "*"}
      </label>
      <select
        name={statusRegister.name}
        ref={statusRegister.ref}
        onBlur={statusRegister.onBlur}
        required={required}
        value={status}
        onChange={(event) => {
          const value = event.target.value;
          setValue(field, value, { shouldDirty: true });
          statusRegister.onChange(event);
        }}
        className="w-full border-2 border-black p-2 text-black text-sm"
      >
        {options && (
          <option value="" disabled>
            Select Status
          </option>
        )}
        {selectOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} {option.description && `(${option.description})`}
          </option>
        ))}
      </select>

      {isIssue && noteOptions?.length ? (
        <>
          <select
            className="w-full border-2 border-black p-2 text-black text-sm mt-2"
            value={noteChoice}
            onChange={(e) => handleReasonChange(e.target.value)}
          >
            <option value="" disabled>
              Select reason
            </option>
            {noteOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <Input
            type="text"
            value={noteText}
            onChange={(e) => handleNoteTextChange(e.target.value)}
            placeholder="Add details"
            className="border-2 border-black text-sm mt-2"
          />
        </>
      ) : null}

      {isIssue && !noteOptions?.length && (
        <Input
          {...register(noteField)}
          defaultValue={noteDefault}
          placeholder="Enter details..."
          className="border-2 border-black text-sm mt-2"
        />
      )}
    </div>
  );
};

const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-6">
    <h3 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-1">
      {title}
    </h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const FormField = ({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <div>
    <Label className="block text-xs sm:text-sm font-semibold text-black mb-1">
      {label} {required && "*"}
    </Label>
    {children}
  </div>
);

const FormRow = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1  sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {children}
  </div>
);

// Edit Service Dialog Component
function EditServiceDialog({
  open,
  onOpenChange,
  serviceId,
  onSave,
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string | null;
  onSave: () => void;
  initialData?: any;
}) {
  const [loading, setLoading] = useState(false); // For save operation
  const [isFetching, setIsFetching] = useState(false); // For initial data fetch

  // Image states
  const [beforeImages, setBeforeImages] = useState<UploadedImage[]>([]);
  const [afterImages, setAfterImages] = useState<UploadedImage[]>([]);
  const [brokenImages, setBrokenImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Recommended Parts states (simplified for Admin view)
  const [recommendedParts, setRecommendedParts] = useState<RecommendedPart[]>(
    [],
  );

  // Signature states
  const [siteSignature, setSiteSignature] = useState<string | null>(null);
  const [engineerSignature, setEngineerSignature] = useState<string | null>(
    null,
  );
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [currentSignatureType, setCurrentSignatureType] = useState<
    "site" | "engineer" | null
  >(null);
  const siteCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { config: formConfig, cfmModelRules, loading: configLoading } =
    useFormConfig();

  const form = useForm<RecordWorkForm>({
    defaultValues: createInitialFormData(),
  });

  const { register, handleSubmit, reset, watch, setValue } = form;

  // Recommended Parts selection Logic
  const [partsDialogOpen, setPartsDialogOpen] = useState(false);
  const [partsData, setPartsData] = useState<ProjectorPart[]>([]);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(
    new Set(),
  );

  // Load projector parts data
  useEffect(() => {
    const loadPartsData = async () => {
      try {
        const response = await fetch("/api/admin/data-files/projector");
        if (response.ok) {
          const data = await response.json();
          setPartsData(data.data || []);
        }
      } catch (error) {
        console.error("Failed to load projector parts data:", error);
      }
    };
    loadPartsData();
  }, []);

  // State for dropdown options
  const [softwareVersions, setSoftwareVersions] = useState<string[]>([]);
  const [lampModelsData, setLampModelsData] = useState<
    Array<{ projector_model: string; Models: string[] }>
  >([]);
  const [lampModels, setLampModels] = useState<string[]>([]);
  const [contentPlayers, setContentPlayers] = useState<string[]>([]);

  // Load software versions
  useEffect(() => {
    const loadSoftwareVersions = async () => {
      try {
        const response = await fetch("/api/admin/data-files/software");
        if (!response.ok) return;
        const data = await response.json();
        setSoftwareVersions(data.values || []);
      } catch (error) {
        console.error("Failed to load software versions:", error);
      }
    };
    loadSoftwareVersions();
  }, []);

  // Load lamp models data structure
  useEffect(() => {
    const loadLampModelsData = async () => {
      try {
        const response = await fetch("/api/admin/data-files/lamp-models");
        if (!response.ok) return;
        const data = await response.json();
        setLampModelsData(data.data || []);
      } catch (error) {
        console.error("Failed to load lamp models data:", error);
      }
    };
    loadLampModelsData();
  }, []);

  // Load content players
  useEffect(() => {
    const loadContentPlayers = async () => {
      try {
        const response = await fetch("/api/admin/data-files/content-player");
        if (!response.ok) return;
        const data = await response.json();
        setContentPlayers(data.values || []);
      } catch (error) {
        console.error("Failed to load content players:", error);
      }
    };
    loadContentPlayers();
  }, []);

  // Filter lamp models based on selected projector model
  useEffect(() => {
    const currentProjectorModel = watch("projectorModel");
    if (!currentProjectorModel || lampModelsData.length === 0) {
      setLampModels([]);
      return;
    }

    // Find matching projector model (case-insensitive)
    const matchingProjector = lampModelsData.find(
      (item) =>
        item.projector_model?.toLowerCase() ===
        currentProjectorModel.toLowerCase(),
    );

    if (matchingProjector && Array.isArray(matchingProjector.Models)) {
      // Filter out invalid values and get unique models
      const cleaned = matchingProjector.Models.filter(
        (model): model is string =>
          typeof model === "string" &&
          model.trim().length > 0 &&
          model.toUpperCase() !== "NA",
      );
      setLampModels(cleaned);
    } else {
      setLampModels([]);
    }
  }, [watch("projectorModel"), lampModelsData, watch]);

  // Sync selected parts when dialog opens
  useEffect(() => {
    if (partsDialogOpen) {
      if (Array.isArray(recommendedParts) && recommendedParts.length > 0) {
        setSelectedPartIds(new Set(recommendedParts.map((p) => p.part_number)));
      } else {
        setSelectedPartIds(new Set());
      }
    }
  }, [partsDialogOpen, recommendedParts]);

  // Filter parts by projector model
  const projectorModel = watch("projectorModel");
  const filteredParts = partsData.filter(
    (part) =>
      part.projector_model.toLowerCase() === projectorModel?.toLowerCase(),
  );

  // Handle part selection
  const handlePartToggle = (part: ProjectorPart) => {
    const newSelectedIds = new Set(selectedPartIds);
    if (newSelectedIds.has(part.part_number)) {
      newSelectedIds.delete(part.part_number);
    } else {
      newSelectedIds.add(part.part_number);
    }
    setSelectedPartIds(newSelectedIds);
  };

  // Save selected parts to form state
  const handleSaveSelectedParts = () => {
    const selectedParts: RecommendedPart[] = filteredParts
      .filter((part) => selectedPartIds.has(part.part_number))
      .map((part) => ({
        part_number: part.part_number,
        description: part.description,
      }));
    setRecommendedParts(selectedParts);
    setPartsDialogOpen(false);
  };

  // Fetch or use provided service data on open
  useEffect(() => {
    if (open && (serviceId || initialData)) {
      const fetchService = async () => {
        try {
          setIsFetching(true);
          // `initialData` comes from the table list endpoint and is often partial.
          // Prefer fetching the full record by id to avoid wiping form fields.
          let data: any = initialData ?? null;
          if (serviceId) {
            const res = await fetch(`/api/admin/service-records/${serviceId}`, {
              credentials: "include",
            });
            if (res.ok) {
              const json = await res.json();
              data = json.service || json;
            }
          }

          if (data) {
            // Parse images
            const validImages = (imgs: any) => {
              if (Array.isArray(imgs)) return imgs;
              try {
                return JSON.parse(imgs);
              } catch {
                return [];
              }
            };

            // Map DB arrays to local state:
            // images -> beforeImages, afterImages -> afterImages, brokenImages -> brokenImages
            setBeforeImages(
              validImages(data.images || data.beforeImages || []),
            );
            setAfterImages(validImages(data.afterImages || []));
            setBrokenImages(validImages(data.brokenImages || []));

            if (data.recommendedParts) {
              try {
                const parts =
                  typeof data.recommendedParts === "string"
                    ? JSON.parse(data.recommendedParts)
                    : data.recommendedParts;
                setRecommendedParts(parts);
              } catch (e) {
                console.error("Failed to parse recommended parts", e);
              }
            }

            // Parse and load signatures
            if (data.signatures) {
              try {
                const sigs =
                  typeof data.signatures === "string"
                    ? JSON.parse(data.signatures)
                    : data.signatures;
                setSiteSignature(sigs?.site || sigs?.siteSignatureUrl || null);
                setEngineerSignature(
                  sigs?.engineer || sigs?.engineerSignatureUrl || null,
                );
              } catch (e) {
                console.error("Failed to parse signatures", e);
              }
            }

            // Map data to form
            const formData = createInitialFormData();
            const formAny = formData as any;

            Object.keys(formData).forEach((key) => {
              if (key in data) {
                // Handle special cases
                if (key === "date" && data[key]) {
                  formAny[key] = new Date(data[key])
                    .toISOString()
                    .split("T")[0];
                } else {
                  formAny[key] = data[key] ?? "";
                }
              }
            });

            // Also check for workDetails nesting which is common in some records
            if (data.workDetails) {
              const details =
                typeof data.workDetails === "string"
                  ? JSON.parse(data.workDetails)
                  : data.workDetails;
              Object.keys(details).forEach((k) => {
                if (k in formData) {
                  formAny[k] = details[k];
                }
              });
            }

          // Exhaust CFM persistence:
          // - status lives in `exhaustCfm` (OK/YES)
          // - value lives in `exhaustCfmNote` (e.g. "6.6 M/S")
          // Also handle legacy records where the number might be stored in `exhaustCfm`.
          const noteFromStatusValue = (raw: any) => {
            if (!raw) return "";
            const str = String(raw).trim();
            if (!str) return "";
            const match = str.replace(",", ".").match(/-?\d+(\.\d+)?/);
            if (!match) return "";
            // Preserve original unit if present
            return str.toUpperCase().includes("M/S") ? str : `${match[0]} M/S`;
          };

          if (!formAny.exhaustCfmNote && formAny.exhaustCfm) {
            const migrated = noteFromStatusValue(formAny.exhaustCfm);
            if (migrated) formAny.exhaustCfmNote = migrated;
          }

          // Band status (LOW/OK/HIGH) must be preserved when present; else legacy OK if note exists
          if (formAny.exhaustCfmNote && String(formAny.exhaustCfmNote).trim()) {
            const st = String(formAny.exhaustCfm || "").trim().toUpperCase();
            if (st === "LOW" || st === "HIGH") {
              formAny.exhaustCfm = st;
            } else {
              formAny.exhaustCfm = "OK";
            }
          } else {
            formAny.exhaustCfm = "YES";
          }

            // Explicitly map projectorSerial -> projectorSerialNumber if not already set or if data has it differently
            if (!formAny.projectorSerialNumber && data.projectorSerial) {
              formAny.projectorSerialNumber = data.projectorSerial;
            }
            // Ensure projectorModel is set if it's top level
            if (!formAny.projectorModel && data.projectorModel) {
              formAny.projectorModel = data.projectorModel;
            }

          // Prefer nested projector object from the admin GET endpoint
          if (!formAny.projectorModel && data.projector?.model) {
            formAny.projectorModel = data.projector.model;
          }
          if (!formAny.projectorSerialNumber && data.projector?.serialNo) {
            formAny.projectorSerialNumber = data.projector.serialNo;
          }

          // Persisted visit type lives in `serviceNumber` in DB; show it in the UI field.
          if (!formAny.serviceVisitType && data.serviceNumber) {
            formAny.serviceVisitType = String(data.serviceNumber);
          }

            reset(formData);
          }
        } catch (error) {
          console.error("Failed to fetch service:", error);
        } finally {
          setIsFetching(false);
        }
      };
      fetchService();
    } else {
      // Reset form when dialog closes or no ID
      reset(createInitialFormData());
      setBeforeImages([]);
      setAfterImages([]);
      setBrokenImages([]);
      setRecommendedParts([]);
      setSiteSignature(null);
      setEngineerSignature(null);
    }
  }, [open, serviceId, initialData, reset]);

  // Canvas drawing functions
  const startDrawing = (
    canvas: HTMLCanvasElement,
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const x =
      "touches" in e
        ? (e.touches[0]?.clientX ?? 0) - rect.left
        : e.clientX - rect.left;
    const y =
      "touches" in e
        ? (e.touches[0]?.clientY ?? 0) - rect.top
        : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    canvas: HTMLCanvasElement,
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    if (!isDrawing) return;
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const x =
      "touches" in e
        ? (e.touches[0]?.clientX ?? 0) - rect.left
        : e.clientX - rect.left;
    const y =
      "touches" in e
        ? (e.touches[0]?.clientY ?? 0) - rect.top
        : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async (type: "site" | "engineer") => {
    const canvas =
      type === "site" ? siteCanvasRef.current : engineerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check if canvas is empty
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = imageData.data.every(
      (pixel) => pixel === 0 || pixel === 255,
    );

    if (isEmpty) {
      toast.error("Please draw a signature first");
      return;
    }

    try {
      setUploading(true);

      // Create a smaller canvas to reduce file size (50% of original)
      const scaleFactor = 0.5;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width * scaleFactor;
      tempCanvas.height = canvas.height * scaleFactor;
      const tempCtx = tempCanvas.getContext("2d");

      if (!tempCtx) {
        throw new Error("Failed to create temporary canvas context");
      }

      // Draw the signature scaled down
      tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

      // Convert to PNG blob (keeps transparency, no black box)
      const blob = await new Promise<Blob>((resolve, reject) => {
        tempCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });

      // Upload to blob storage with folder parameter
      const formData = new FormData();
      formData.append("file", blob, `signature-${type}-${Date.now()}.png`);
      formData.append("folder", "signatures");

      const res = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload signature");

      const data = await res.json();

      // Update state with new signature URL
      if (type === "site") {
        setSiteSignature(data.url);
      } else {
        setEngineerSignature(data.url);
      }

      toast.success(`${type === "site" ? "Site" : "Engineer"} signature saved`);
      setIsDrawingSignature(false);
      setCurrentSignatureType(null);
    } catch (error) {
      console.error("Failed to save signature:", error);
      toast.error("Failed to save signature");
    } finally {
      setUploading(false);
    }
  };

  const removeSignature = (type: "site" | "engineer") => {
    if (type === "site") {
      setSiteSignature(null);
    } else {
      setEngineerSignature(null);
    }
    toast.success(`${type === "site" ? "Site" : "Engineer"} signature removed`);
  };

  const handleImageUpload = async (
    type: "before" | "after" | "broken" | "logs",
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setImageError(null);
      const newImages: UploadedImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        let fileToUpload = file;
        let folderName = `${type}-images`;

        if (type !== "logs") {
          // Import compression utility
          const { compressImage } = await import("@/lib/image-compression");
          // Compress image before upload (resize to max 1200x1200, JPEG 80% quality)
          const compressedBlob = await compressImage(file, 1200, 1200, 0.8);
          // Create a new File from the compressed blob
          fileToUpload = new File(
            [compressedBlob],
            file.name.replace(/\.[^/.]+$/, ".jpg"), // Change extension to .jpg
            { type: "image/jpeg" },
          );
        } else {
          folderName = "projector-logs";
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("folder", folderName);

        const res = await fetch("/api/blob/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(`Failed to upload ${file.name}`);

        const data = await res.json();
        newImages.push(data.url);
      }

      if (type === "before") setBeforeImages((prev) => [...prev, ...newImages]);
      else if (type === "after")
        setAfterImages((prev) => [...prev, ...newImages]);
      else if (type === "broken")
        setBrokenImages((prev) => [...prev, ...newImages]);
      else if (type === "logs" && newImages.length > 0) {
        const url =
          typeof newImages[0] === "string"
            ? newImages[0]
            : (newImages[0] as any)?.url;
        if (url) setValue("logs", url, { shouldDirty: true });
      }
    } catch (err) {
      console.error("Upload error:", err);
      setImageError("Failed to upload one or more files.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (
    type: "before" | "after" | "broken" | "logs",
    index: number,
  ) => {
    if (type === "before")
      setBeforeImages((prev) => prev.filter((_, i) => i !== index));
    else if (type === "after")
      setAfterImages((prev) => prev.filter((_, i) => i !== index));
    else if (type === "broken")
      setBrokenImages((prev) => prev.filter((_, i) => i !== index));
    else if (type === "logs") setValue("logs", "", { shouldDirty: true });
  };

  const onSubmit = async (values: RecordWorkForm) => {
    try {
      setLoading(true);

      const normalizeExhaustCfmNote = (raw: unknown) => {
        const str = raw == null ? "" : String(raw).trim();
        if (!str) return "";
        // If user entered a plain number, standardize to "<number> M/S"
        const match = str.replace(",", ".").match(/-?\d+(\.\d+)?/);
        if (!match) return str; // leave as-is (might be "NA", etc.)
        return str.toUpperCase().includes("M/S") ? str : `${match[0]} M/S`;
      };

      const exhaustCfmNote = normalizeExhaustCfmNote((values as any).exhaustCfmNote);
      const cfmNumericMatch = exhaustCfmNote.match(/-?\d+(\.\d+)?/);
      const cfmNumeric = cfmNumericMatch ? cfmNumericMatch[0] : "";

      const payload = {
        workDetails: {
          ...values,
          exhaustCfmNote,
          exhaustCfm: exhaustCfmStatusForStorage(
            String(values.projectorModel || ""),
            cfmNumeric,
            cfmModelRules,
          ),
          // Save "Service Visit Type" selection into DB field `serviceNumber`
          serviceNumber: values.serviceVisitType || undefined,
          // Ensure recommendedParts is saved with the rest of the work details
          recommendedParts,
        },
        // Map local image state to Prisma arrays
        images: beforeImages,
        afterImages,
        brokenImages,
        // Include signatures
        signatures: {
          site: siteSignature,
          engineer: engineerSignature,
        },
      };

      const res = await fetch(`/api/admin/service-records/${serviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to update service record");
      }

      // Refresh parent data first (while dialog still shows "Saving...")
      await onSave();

      // Show success toast (will be visible even after dialog closes)
      toast.success("Service record updated successfully!");

      // Close dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isOutOfRange = (value: any, min: number, max: number) => {
    if (value === "" || value === undefined || value === null) return false;
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    return num < min || num > max;
  };

  const renderFieldsBySection = (sectionName: string) => {
    const fields = formConfig.filter((f) => f.section === sectionName);
    if (fields.length === 0)
      return (
        <p className="text-sm text-gray-500 italic">
          No fields in this section.
        </p>
      );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => {
          // Always use the note-capable UI for fields that have a corresponding `<field>Note`
          // column, even if the config didn't explicitly set `componentType`.
          if (
            field.componentType === "statusSelectWithNote" ||
            NOTE_FIELD_MAP[field.key]
          ) {
            return (
              <StatusSelectWithNote
                key={field.key}
                field={field.key as keyof RecordWorkForm}
                label={field.label}
                form={form}
                required={field.required}
                options={field.options?.map((opt) => ({
                  value: opt,
                  label: opt,
                  description: field.optionDescriptions?.[opt],
                }))}
                noteOptions={field.noteOptions}
                noteDefault={field.noteDefault}
                issueValues={field.issueValues}
              />
            );
          }

          // Special handling for softwareVersion dropdown
          if (field.key === "softwareVersion" && softwareVersions.length > 0) {
            return (
              <FormField
                key={field.key}
                label={field.label}
                required={field.required}
              >
                <select
                  {...register(field.key as keyof RecordWorkForm)}
                  className="w-full border-2 border-black p-2 text-sm bg-white"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select software version
                  </option>
                  {softwareVersions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </select>
              </FormField>
            );
          }

          // Special handling for lampMakeModel dropdown
          if (field.key === "lampMakeModel" && lampModels.length > 0) {
            return (
              <FormField
                key={field.key}
                label={field.label}
                required={field.required}
              >
                <select
                  {...register(field.key as keyof RecordWorkForm)}
                  className="w-full border-2 border-black p-2 text-sm bg-white"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select lamp model
                  </option>
                  {lampModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </FormField>
            );
          }

          // Special handling for contentPlayerModel dropdown
          if (field.key === "contentPlayerModel" && contentPlayers.length > 0) {
            return (
              <FormField
                key={field.key}
                label={field.label}
                required={field.required}
              >
                <select
                  {...register(field.key as keyof RecordWorkForm)}
                  className="w-full border-2 border-black p-2 text-sm bg-white"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select content player
                  </option>
                  {contentPlayers.map((player) => (
                    <option key={player} value={player}>
                      {player}
                    </option>
                  ))}
                </select>
              </FormField>
            );
          }

          if (
            field.type === "number" &&
            (field.min !== undefined || field.max !== undefined)
          ) {
            const val = watch(field.key as keyof RecordWorkForm);
            const isInvalid = isOutOfRange(
              val,
              field.min ?? -Infinity,
              field.max ?? Infinity,
            );
            return (
              <FormField
                key={field.key}
                label={field.label}
                required={field.required}
              >
                <DynamicFormField
                  field={field}
                  register={register}
                  className="border-2 border-black p-2 text-sm bg-white"
                />
                {isInvalid && (
                  <p className="text-xs text-red-600 mt-1">
                    {field.min !== undefined && field.max !== undefined
                      ? `Enter between ${field.min} and ${field.max}.`
                      : field.min !== undefined
                        ? `Enter ${field.min} or greater.`
                        : `Enter ${field.max} or less.`}
                  </p>
                )}
              </FormField>
            );
          }

          return (
            <FormField
              key={field.key}
              label={field.label}
              required={field.required}
            >
              <DynamicFormField
                field={field}
                register={register}
                className="border-2 border-black p-2 text-sm bg-white"
              />
            </FormField>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[80vw] max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Service Record</DialogTitle>
          <DialogDescription>
            Modified fields will be saved to the database.
          </DialogDescription>
        </DialogHeader>

        {!isFetching && !configLoading ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormSection title="Cinema Details">
              {renderFieldsBySection("Cinema Details")}
            </FormSection>

            <FormSection title="Projector Information">
              {renderFieldsBySection("Projector Information")}
            </FormSection>

            <FormSection title="Opticals">
              {renderFieldsBySection("Opticals")}
            </FormSection>

            <FormSection title="Electronics">
              {renderFieldsBySection("Electronics")}
            </FormSection>

            <FormSection title="Serial Number Verified">
              {renderFieldsBySection("Serial Number Verified")}
            </FormSection>

            <FormSection title="Disposable Consumables">
              {renderFieldsBySection("Disposable Consumables")}
            </FormSection>

            <FormSection title="Coolant">
              {renderFieldsBySection("Coolant")}
            </FormSection>

            <FormSection title="Light Engine Test Pattern">
              {renderFieldsBySection("Light Engine Test Pattern")}
            </FormSection>

            <FormSection title="Mechanical">
              {renderFieldsBySection("Mechanical")}
            </FormSection>

            <FormSection title="Software & Screen Information">
              {renderFieldsBySection("Software & Screen Information")}
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Scope Dimensions
                </p>
                <FormRow>
                  <FormField label="Screen Height (m)">
                    <Input
                      type="number"
                      step="0.01"
                      {...register("screenHeight")}
                      className="border-2 border-black text-sm"
                    />
                  </FormField>
                  <FormField label="Screen Width (m)">
                    <Input
                      type="number"
                      step="0.01"
                      {...register("screenWidth")}
                      className="border-2 border-black text-sm"
                    />
                  </FormField>
                </FormRow>
              </div>
            </FormSection>

            <FormSection title="Lamp Information">
              {renderFieldsBySection("Lamp Information")}
            </FormSection>

            <FormSection title="Voltage Parameters">
              {renderFieldsBySection("Voltage Parameters")}
            </FormSection>

            <FormSection title="fL Measurements">
              {renderFieldsBySection("fL Measurements")}
            </FormSection>

            <FormSection title="Content Player & AC Status">
              {renderFieldsBySection("Content Player & AC Status")}
            </FormSection>

            <FormSection title="Color Accuracy - MCGD">
              {COLOR_ACCURACY.map(({ name, fields }) => (
                <div key={name} className="mb-4">
                  <p className="font-semibold text-black text-sm mb-2">
                    {name}
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="2K X"
                      {...register(fields[0] as any)}
                      className="border-2 border-black text-sm"
                    />
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="2K Y"
                      {...register(fields[1] as any)}
                      className="border-2 border-black text-sm"
                    />
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="2K fL"
                      {...register(fields[2] as any)}
                      className="border-2 border-black text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="4K X"
                      {...register(fields[3] as any)}
                      className="border-2 border-black text-sm"
                    />
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="4K Y"
                      {...register(fields[4] as any)}
                      className="border-2 border-black text-sm"
                    />
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="4K fL"
                      {...register(fields[5] as any)}
                      className="border-2 border-black text-sm"
                    />
                  </div>
                </div>
              ))}
            </FormSection>

            <FormSection title="Color Accuracy - CIE XYZ">
              <div className="mb-4">
                <p className="font-semibold text-black text-sm mb-2">
                  BW Step 10
                </p>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="2K X"
                    {...register("BW_Step_10_2Kx")}
                    className="border-2 border-black text-sm"
                  />
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="2K Y"
                    {...register("BW_Step_10_2Ky")}
                    className="border-2 border-black text-sm"
                  />
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="2K fL"
                    {...register("BW_Step_10_2Kfl")}
                    className="border-2 border-black text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="4K X"
                    {...register("BW_Step_10_4Kx")}
                    className="border-2 border-black text-sm"
                  />
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="4K Y"
                    {...register("BW_Step_10_4Ky")}
                    className="border-2 border-black text-sm"
                  />
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="4K fL"
                    {...register("BW_Step_10_4Kfl")}
                    className="border-2 border-black text-sm"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Image Evaluation">
              {renderFieldsBySection("Image Evaluation")}
            </FormSection>

            <FormSection title="Air Pollution Data">
              {renderFieldsBySection("Air Pollution Data")}
            </FormSection>

            <FormSection title="Remarks & Other">
              <div className="space-y-4">
                <FormField label="Remarks">
                  <textarea
                    {...register("remarks")}
                    className="w-full border-2 border-black p-2 min-h-[100px] text-sm"
                    rows={4}
                  />
                </FormField>
                <FormField label="Photos Drive Link">
                  <Input
                    {...register("photosDriveLink")}
                    className="border-2 border-black text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Paste a link to a Google Drive folder or similar.
                  </p>
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Recommended Parts">
              <div className="space-y-3">
                <Dialog
                  open={partsDialogOpen}
                  onOpenChange={setPartsDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-2 border-black text-black hover:bg-gray-100"
                      disabled={!projectorModel}
                    >
                      {recommendedParts.length > 0
                        ? `Update Selected Parts (${recommendedParts.length})`
                        : "Select Recommended Parts"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col z-[100]">
                    <DialogHeader>
                      <DialogTitle>
                        Select Recommended Parts
                        {projectorModel && (
                          <span className="text-sm font-normal text-gray-600 ml-2">
                            for {projectorModel}
                          </span>
                        )}
                      </DialogTitle>
                      <DialogDescription>
                        {projectorModel
                          ? `Select parts recommended for projector model ${projectorModel}`
                          : "Please enter a projector model first to view available parts"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-1">
                      {!projectorModel ? (
                        <p className="text-sm text-gray-600 py-4">
                          Please enter a projector model in the form above to
                          view available parts.
                        </p>
                      ) : filteredParts.length === 0 ? (
                        <p className="text-sm text-gray-600 py-4">
                          No parts found for projector model "{projectorModel}".
                          Please check the model name.
                        </p>
                      ) : (
                        <div className="space-y-3 py-2">
                          {filteredParts.map((part) => {
                            const isSelected = selectedPartIds.has(
                              part.part_number,
                            );
                            return (
                              <div
                                key={part.part_number}
                                className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-md hover:border-black transition-colors"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handlePartToggle(part)}
                                  id={part.part_number}
                                  className="mt-1"
                                />
                                <Label
                                  htmlFor={part.part_number}
                                  className="flex-1 cursor-pointer text-sm"
                                >
                                  <div className="font-semibold text-black">
                                    {part.description}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Part Number: {part.part_number}
                                  </div>
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPartsDialogOpen(false)}
                        className="border-2 border-black text-black hover:bg-gray-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveSelectedParts}
                        disabled={!projectorModel || filteredParts.length === 0}
                        className="bg-black text-white hover:bg-gray-800 border-2 border-black"
                      >
                        Save Selected ({selectedPartIds.size})
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                {recommendedParts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs sm:text-sm font-semibold text-black">
                      Selected Parts:
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-gray-200 p-3 rounded-md">
                      {recommendedParts.map((part, index) => (
                        <div
                          key={`${part.part_number}-${index}`}
                          className="text-xs sm:text-sm border-b border-gray-200 pb-2 last:border-b-0 last:pb-0"
                        >
                          <div className="font-semibold text-black">
                            {part.description}
                          </div>
                          <div className="text-gray-600">
                            Part Number: {part.part_number}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!projectorModel && (
                  <p className="text-xs text-gray-600">
                    Please enter a projector model above to select recommended
                    parts.
                  </p>
                )}
              </div>
            </FormSection>

            <FormSection title="Service Images">
              {imageError && (
                <p className="text-sm text-red-500 mb-2">{imageError}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Before Images */}
                <div>
                  <p className="font-semibold text-sm text-black mb-2">
                    Before Images
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      handleImageUpload("before", e.target.files)
                    }
                    className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50 mb-2"
                  />
                  {beforeImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {beforeImages.map((file, index) => (
                        <div
                          key={`before-${index}`}
                          className="relative border border-gray-200 p-1 group bg-white"
                        >
                          <img
                            src={file}
                            alt={"Before Image"}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("before", index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* After Images */}
                <div>
                  <p className="font-semibold text-sm text-black mb-2">
                    After Images
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload("after", e.target.files)}
                    className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50 mb-2 disabled:opacity-50"
                    disabled={uploading}
                  />
                  {afterImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {afterImages.map((file, index) => (
                        <div
                          key={`after-${index}`}
                          className="relative border border-gray-200 p-1 group bg-white"
                        >
                          <img
                            src={file}
                            alt={"After Images"}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("after", index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Broken Images */}
                <div>
                  <p className="font-semibold text-sm text-black mb-2">
                    Broken Parts
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      handleImageUpload("broken", e.target.files)
                    }
                    className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50 mb-2 disabled:opacity-50"
                    disabled={uploading}
                  />
                  {brokenImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {brokenImages.map((file, index) => (
                        <div
                          key={`broken-${index}`}
                          className="relative border border-gray-200 p-1 group bg-white"
                        >
                          <img
                            src={file}
                            alt={"broken images"}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("broken", index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projector Logs */}
                <div className="sm:col-span-3 border-t pt-4">
                  <p className="font-semibold text-sm text-black mb-2 flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    Projector Logs (Zip/Folder)
                  </p>
                  {!watch("logs") && (
                    <input
                      type="file"
                      accept=".zip,.rar,.7z"
                      onChange={(e) =>
                        handleImageUpload("logs", e.target.files)
                      }
                      className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50 mb-2 disabled:opacity-50"
                      disabled={uploading}
                    />
                  )}
                  {watch("logs") && (
                    <div className="mt-2 p-3 border-2 border-black bg-white flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="bg-green-100 p-2 rounded-full">
                          <Download className="h-4 w-4 text-green-700" />
                        </div>
                        <span className="text-xs font-bold text-black truncate">
                          Logs Uploaded
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <a
                          href={watch("logs")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-xs font-bold hover:underline bg-blue-50 px-3 py-1.5 border border-blue-200 rounded"
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage("logs", 0)}
                          className="text-red-600 text-xs font-bold hover:text-red-700 bg-red-50 px-3 py-1.5 border border-red-200 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </FormSection>

            <FormSection title="Signatures">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Site Signature */}
                <div className="space-y-3">
                  <p className="font-semibold text-sm text-black">
                    Site Signature
                  </p>
                  {siteSignature ? (
                    <div className="relative">
                      <div className="border-2 border-black p-4 bg-gray-50 rounded-md">
                        <img
                          src={siteSignature}
                          alt="Site Signature"
                          className="w-full h-32 object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSignature("site")}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                        title="Remove signature"
                      >
                        ✕
                      </button>
                    </div>
                  ) : isDrawingSignature && currentSignatureType === "site" ? (
                    <div className="space-y-2">
                      <canvas
                        ref={siteCanvasRef}
                        width={400}
                        height={150}
                        className="w-full border-2 border-black bg-white cursor-crosshair rounded-md"
                        onMouseDown={(e) => startDrawing(e.currentTarget, e)}
                        onMouseMove={(e) => draw(e.currentTarget, e)}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={(e) => startDrawing(e.currentTarget, e)}
                        onTouchMove={(e) => draw(e.currentTarget, e)}
                        onTouchEnd={stopDrawing}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => clearCanvas(siteCanvasRef.current)}
                          className="border-2 border-black"
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => saveSignature("site")}
                          disabled={uploading}
                          className="bg-black text-white"
                        >
                          {uploading ? "Saving..." : "Save Signature"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsDrawingSignature(false);
                            setCurrentSignatureType(null);
                            clearCanvas(siteCanvasRef.current);
                          }}
                          className="border-2 border-black"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDrawingSignature(true);
                        setCurrentSignatureType("site");
                      }}
                      className="w-full border-2 border-dashed border-black p-6 hover:bg-gray-50"
                    >
                      + Add Site Signature
                    </Button>
                  )}
                </div>

                {/* Engineer Signature */}
                <div className="space-y-3">
                  <p className="font-semibold text-sm text-black">
                    Engineer Signature
                  </p>
                  {engineerSignature ? (
                    <div className="relative">
                      <div className="border-2 border-black p-4 bg-gray-50 rounded-md">
                        <img
                          src={engineerSignature}
                          alt="Engineer Signature"
                          className="w-full h-32 object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSignature("engineer")}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                        title="Remove signature"
                      >
                        ✕
                      </button>
                    </div>
                  ) : isDrawingSignature &&
                    currentSignatureType === "engineer" ? (
                    <div className="space-y-2">
                      <canvas
                        ref={engineerCanvasRef}
                        width={400}
                        height={150}
                        className="w-full border-2 border-black bg-white cursor-crosshair rounded-md"
                        onMouseDown={(e) => startDrawing(e.currentTarget, e)}
                        onMouseMove={(e) => draw(e.currentTarget, e)}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={(e) => startDrawing(e.currentTarget, e)}
                        onTouchMove={(e) => draw(e.currentTarget, e)}
                        onTouchEnd={stopDrawing}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => clearCanvas(engineerCanvasRef.current)}
                          className="border-2 border-black"
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => saveSignature("engineer")}
                          disabled={uploading}
                          className="bg-black text-white"
                        >
                          {uploading ? "Saving..." : "Save Signature"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsDrawingSignature(false);
                            setCurrentSignatureType(null);
                            clearCanvas(engineerCanvasRef.current);
                          }}
                          className="border-2 border-black"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDrawingSignature(true);
                        setCurrentSignatureType("engineer");
                      }}
                      className="w-full border-2 border-dashed border-black p-6 hover:bg-gray-50"
                    >
                      + Add Engineer Signature
                    </Button>
                  )}
                </div>
              </div>
            </FormSection>

            <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white p-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || uploading}
                className="bg-black text-white"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        ) : isFetching ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-gray-500">Loading service details...</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

import { format } from "date-fns";
import { excelValueToDate } from "@/lib/excel-service-record-utils";

function UploadServiceRecordsDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<
    Array<{
      row: number;
      serialNo?: string;
      email?: string;
      errors: string[];
    }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [uploadJobId, setUploadJobId] = useState<string | null>(null);
  const [uploadJobState, setUploadJobState] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    percentage: number;
    stage?: string;
    message?: string;
    chunkIndex?: number;
    totalChunks?: number;
  }>({ percentage: 0 });
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];
    if (
      !allowedTypes.includes(selectedFile.type) &&
      !selectedFile.name.endsWith(".xlsx") &&
      !selectedFile.name.endsWith(".xls")
    ) {
      setUploadStatus({
        type: "error",
        message:
          "Invalid file type. Please upload an Excel file (.xlsx or .xls)",
      });
      return;
    }

    setFile(selectedFile);
    setValidationErrors([]);
    setUploadStatus({ type: null, message: "" });
    setUploadResult(null);
    setUploadJobId(null);
    setUploadJobState(null);
    setUploadProgress({ percentage: 0 });

    // Read and preview file
    try {
      const xlsx = await import("xlsx");
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: "array" });
      const sheet = workbook.Sheets["Data"];

      if (!sheet) {
        setUploadStatus({
          type: "error",
          message:
            'Sheet "Data" not found in Excel file. Please ensure your Excel file has a sheet named "Data"',
        });
        setFile(null);
        return;
      }

      const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet, {
        defval: null,
        raw: true, // Use raw values (numbers for dates)
      });

      // Show preview of first 10 rows
      setFilePreview(rows.slice(0, 10));
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      });
      setFile(null);
    }
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const fetchUploadJob = async (jobId: string) => {
    const response = await fetch(
      `/api/admin/service-records/upload-jobs/${jobId}`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      throw new Error("Failed to fetch upload job status");
    }
    return response.json();
  };

  const startPolling = (jobId: string) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const job = await fetchUploadJob(jobId);
        setUploadJobState(job.state);
        setUploadProgress(
          typeof job.progress === "number"
            ? { percentage: job.progress }
            : {
                percentage: job.progress?.percentage ?? 0,
                stage: job.progress?.stage,
                message: job.progress?.message,
                chunkIndex: job.progress?.chunkIndex,
                totalChunks: job.progress?.totalChunks,
              },
        );

        if (job.state === "completed") {
          stopPolling();
          setUploading(false);
          setUploadResult(job.result || null);
          const result = job.result || {};
          setValidationErrors(result.validationErrors || []);
          setUploadStatus({
            type: "success",
            message: `Upload complete. Created ${result.createdRecords ?? 0}, updated ${result.updatedRecords ?? 0}, skipped existing ${result.skippedExistingRecords ?? 0}, invalid ${result.invalidRows ?? 0}.`,
          });
          onSuccess();
        } else if (job.state === "failed") {
          stopPolling();
          setUploading(false);
          setUploadStatus({
            type: "error",
            message: job.failedReason || "Upload job failed",
          });
        }
      } catch (error) {
        stopPolling();
        setUploading(false);
        setUploadStatus({
          type: "error",
          message: `Failed to poll job: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }, 2000);
  };

  useEffect(() => {
    if (!open) {
      stopPolling();
      setUploadJobId(null);
      setUploadJobState(null);
      setUploadProgress({ percentage: 0 });
      setUploadResult(null);
    }
    return () => stopPolling();
  }, [open]);

  const handleValidate = async (mode: "upload" | "preflight" = "upload") => {
    if (!file) return;

    try {
      setUploading(true);
      setUploadStatus({ type: null, message: "" });
      setUploadResult(null);
      setValidationErrors([]);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);

      const response = await fetch("/api/admin/service-records/upload-excel", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setUploadStatus({
          type: "error",
          message: result.error || "Failed to queue upload job",
        });
        setUploading(false);
        return;
      }

      // Now both modes use the job queue for progress tracking.

      const queuedJobId = String(result.jobId);
      setUploadJobId(queuedJobId);
      setUploadJobState("waiting");
      setUploadProgress({ percentage: 0, stage: "queued" });
      setUploadStatus({
        type: "success",
        message: result.deduplicated
          ? `Identical upload already exists. Tracking job ${queuedJobId}.`
          : `Upload queued (${queuedJobId}). Processing ${result.totalRows} rows in background...`,
      });
      if (result.result) {
        setUploadResult(result.result);
      }
      startPolling(queuedJobId);
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: `Upload failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      setUploading(false);
    }
  };

  const handleDownloadExample = async () => {
    try {
      const response = await fetch(
        "/api/admin/service-records/download-example",
      );
      if (!response.ok) throw new Error("Failed to download example file");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Service_Records_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: `Failed to download example file: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const hasErrors = validationErrors.length > 0;
  const canUpload = file && !uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Service Records from Excel</DialogTitle>
          <DialogDescription>
            Upload service records from an Excel file. The file must match the
            required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Example Button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadExample}
              className="text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Example Excel File
            </Button>
          </div>

          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="excel-file">
              Select Excel File (.xlsx or .xls)
            </Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {file && (
              <p className="text-sm text-gray-600">
                Selected: <strong>{file.name}</strong> (
                {(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* File Preview */}
          {filePreview.length > 0 && (
            <div className="space-y-2">
              <Label>File Preview (first 10 rows)</Label>
              <div className="border rounded-md overflow-x-auto max-h-64">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      {Object.keys(filePreview[0] || {})
                        .slice(0, 8)
                        .map((key) => (
                          <th
                            key={key}
                            className="px-2 py-1 text-left border-b font-semibold"
                          >
                            {key}
                          </th>
                        ))}
                      {Object.keys(filePreview[0] || {}).length > 8 && (
                        <th className="px-2 py-1 text-left border-b font-semibold">
                          ...
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filePreview.map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        {Object.entries(row)
                          .slice(0, 8)
                          .map(([key, val]: [string, any], valIdx) => {
                            let displayValue =
                              val != null ? String(val).substring(0, 30) : "-";

                            // Try to format as date if it's a date-related column
                            if (
                              val &&
                              (key.toLowerCase().includes("date") ||
                                key.toLowerCase().includes("at"))
                            ) {
                              const dateObj = excelValueToDate(val);
                              if (dateObj) {
                                displayValue = format(dateObj, "d MMMM, yyyy");
                              }
                            }

                            return (
                              <td key={valIdx} className="px-2 py-1 border-r">
                                {displayValue}
                              </td>
                            );
                          })}
                        {Object.keys(row).length > 8 && (
                          <td className="px-2 py-1 text-gray-400">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {hasErrors && (
            <div className="space-y-2">
              <Label className="text-red-600">
                Validation Errors ({validationErrors.length} rows)
              </Label>
              <div className="border border-red-200 rounded-md bg-red-50 p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2 text-sm">
                  {validationErrors.map((error, idx) => (
                    <div key={idx} className="border-b border-red-200 pb-2">
                      <div className="font-semibold text-red-800">
                        Row {error.row}
                        {error.serialNo && ` (Serial: ${error.serialNo})`}
                        {error.email && ` (Email: ${error.email})`}
                      </div>
                      <ul className="list-disc list-inside text-red-700 mt-1">
                        {error.errors.map((err, errIdx) => (
                          <li key={errIdx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upload Status */}
          {uploadStatus.type && (
            <div
              className={`p-4 rounded-md ${
                uploadStatus.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {uploadStatus.message}
            </div>
          )}

          {uploadJobId && (
            <div className="border rounded-md p-3 bg-blue-50 text-sm space-y-1">
              <p className="font-semibold text-blue-900">
                Upload Job: {uploadJobId}
              </p>
              <p className="text-blue-800">
                State: {uploadJobState || "waiting"} | Progress:{" "}
                {uploadProgress.percentage}%
                {uploadProgress.stage
                  ? ` | Stage: ${uploadProgress.stage}`
                  : ""}
              </p>
              {uploadProgress.message && (
                <p className="text-blue-800">{uploadProgress.message}</p>
              )}
              {uploadProgress.chunkIndex && uploadProgress.totalChunks && (
                <p className="text-blue-800">
                  Chunk {uploadProgress.chunkIndex}/{uploadProgress.totalChunks}
                </p>
              )}
            </div>
          )}

          {uploadResult && (
            <div className="border rounded-md p-4 bg-gray-50 space-y-2 text-sm">
              <p className="font-semibold text-black">Upload Analysis</p>
              <p>Total rows in sheet: {uploadResult.totalRowsInSheet ?? 0}</p>
              <p>Processed rows: {uploadResult.processedRows ?? 0}</p>
              <p>Created records: {uploadResult.createdRecords ?? 0}</p>
              <p>Updated records: {uploadResult.updatedRecords ?? 0}</p>
              <p>
                Skipped existing records:{" "}
                {uploadResult.skippedExistingRecords ?? 0}
              </p>
              <p>
                Duplicate rows in file: {uploadResult.duplicateRowsInFile ?? 0}
              </p>
              <p>Invalid rows: {uploadResult.invalidRows ?? 0}</p>
              <p>Empty rows skipped: {uploadResult.emptyRowsSkipped ?? 0}</p>
              <p>Duration: {uploadResult.durationMs ?? 0} ms</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              {uploadResult ? "Close" : "Cancel"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleValidate("preflight")}
              disabled={!canUpload}
            >
              {uploading ? "Running..." : "Preflight"}
            </Button>
            <Button
              type="button"
              onClick={() => handleValidate("upload")}
              disabled={!canUpload}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExportJobsHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [jobs, setJobs] = useState<
    Array<{
      jobId: string;
      state: string;
      progress: number;
      result: any;
      failedReason?: string;
      createdAt: string;
      completedAt: string | null;
      email: string;
      totalRecords: number | null;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/export/jobs", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      toast.error("Failed to load export jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchJobs();
      // Poll less aggressively to reduce Redis reads
      const interval = setInterval(fetchJobs, 10000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const getStateColor = (state: string) => {
    switch (state) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "active":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "waiting":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "active":
        return "Processing";
      case "waiting":
        return "Queued";
      default:
        return state;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Jobs History
          </DialogTitle>
          <DialogDescription>
            View all your export jobs and their progress
          </DialogDescription>
        </DialogHeader>

        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">No export jobs found</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {jobs.map((job) => (
              <div
                key={job.jobId}
                className="border-2 border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStateColor(job.state)}`}
                    >
                      {getStateLabel(job.state)}
                    </span>
                    <span className="text-sm text-gray-600">
                      Job #{job.jobId}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(job.createdAt).toLocaleString()}
                  </div>
                </div>

                {(job.state === "active" || job.state === "waiting") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {job.state === "active"
                          ? "Processing..."
                          : "Waiting in queue..."}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {Math.round(job.progress)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {job.state === "completed" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Completed</span>
                      <span className="font-semibold text-green-600">100%</span>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Total Records:</span>{" "}
                        {job.totalRecords !== null &&
                        job.totalRecords !== undefined
                          ? job.totalRecords
                          : (job.result?.totalRecords ?? "N/A")}
                      </div>
                      <div className="flex flex-col gap-2">
                        {job.result?.fileUrl &&
                          job.result.fileUrl.startsWith("http") && (
                            <a
                              href={job.result.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-800 hover:underline font-medium"
                            >
                              <Download className="h-4 w-4" />
                              Download Excel File
                            </a>
                          )}
                        {job.result?.driveFolderLink && (
                          <a
                            href={job.result.driveFolderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M7.71 3.5L1.15 15l3.58 6.5L11.29 10l-3.58-6.5zM2.73 15l5.01-8.5 2.58 4.5-5.01 8.5L2.73 15zm6.86 0L15.6 3.5l3.58 6.5L13.17 21.5 9.59 15zm6.01-8.5L10.59 15l2.58 4.5 5.01-8.5-2.58-4.5z" />
                            </svg>
                            View PDFs in Google Drive
                          </a>
                        )}
                      </div>
                      {job.result?.fileUrl &&
                        !job.result.fileUrl.startsWith("http") && (
                          <div className="text-xs text-red-600">
                            Invalid file URL: {job.result.fileUrl}
                          </div>
                        )}
                      {job.completedAt && (
                        <div className="text-xs text-gray-500">
                          Completed:{" "}
                          {new Date(job.completedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {job.state === "failed" && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="text-sm font-medium text-red-800 mb-1">
                      Export Failed
                    </div>
                    {job.failedReason && (
                      <div className="text-xs text-red-600">
                        {job.failedReason}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 border-t pt-2">
                  Email: {job.email}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadJobsHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (stateFilter !== "all") params.set("state", stateFilter);
      const response = await fetch(
        `/api/admin/service-records/upload-jobs?${params.toString()}`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch upload jobs");
      }
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Failed to fetch upload jobs:", error);
      toast.error("Failed to load upload jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchJobs();
      const interval = setInterval(fetchJobs, 3000);
      return () => clearInterval(interval);
    }
  }, [open, query, stateFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Jobs History</DialogTitle>
          <DialogDescription>
            View queued Excel upload jobs and detailed outcomes
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by job id, filename, fingerprint..."
            className="text-sm"
          />
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">No upload jobs found</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {jobs.map((job) => (
              <div key={job.jobId} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-black">Job #{job.jobId}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(job.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm">
                  State: <span className="font-semibold">{job.state}</span> |
                  Progress: {Math.round(job.progress?.percentage || 0)}%
                  {job.progress?.stage ? ` | ${job.progress.stage}` : ""}
                </p>
                <p className="text-sm text-gray-700">File: {job.fileName}</p>
                {job.fingerprint && (
                  <p className="text-xs text-gray-500 break-all">
                    Fingerprint: {job.fingerprint}
                  </p>
                )}
                {job.result && (
                  <div className="text-sm bg-gray-50 border rounded p-3 space-y-1">
                    <p>Rows in sheet: {job.result.totalRowsInSheet ?? 0}</p>
                    <p>Processed rows: {job.result.processedRows ?? 0}</p>
                    <p>Created: {job.result.createdRecords ?? 0}</p>
                    <p>Updated: {job.result.updatedRecords ?? 0}</p>
                    <p>
                      Skipped existing: {job.result.skippedExistingRecords ?? 0}
                    </p>
                    <p>
                      Duplicates in file: {job.result.duplicateRowsInFile ?? 0}
                    </p>
                    <p>Invalid rows: {job.result.invalidRows ?? 0}</p>
                    <p>Duration: {job.result.durationMs ?? 0} ms</p>
                  </div>
                )}
                {job.failedReason && (
                  <p className="text-sm text-red-600">
                    Failed: {job.failedReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewDownloadDialog({
  open,
  onOpenChange,
  serviceId,
  onClose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [serviceData, setServiceData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (open && serviceId) {
      const fetchService = async () => {
        try {
          const res = await fetch(`/api/admin/service-records/${serviceId}`, {
            credentials: "include",
          });
          if (res.ok) {
            const json = await res.json();
            const service = json.service || json;
            setServiceData(service);

            // Set default email if site has contact email
            if (
              service.contactDetails &&
              service.contactDetails.includes("@")
            ) {
              setEmail(service.contactDetails);
            }

            // Generate default email content
            generateDefaultEmailContent(service);
          }
        } catch (error) {
          console.error("Failed to fetch service:", error);
        }
      };
      fetchService();
    }
  }, [open, serviceId]);

  const generateDefaultEmailContent = (service: any) => {
    const cinema = service.site?.name || service.location || "Valued Client";
    const serviceNum = service.serviceNumber || "N/A";
    const modelNo =
      service.projector?.model ||
      service.modelNo ||
      service.projectorModel ||
      "N/A";
    const serialNo =
      service.projector?.serialNo || service.projectorSerial || "N/A";
    const screenNo = service.screenNumber || service.site?.screenNo || "N/A";
    const date = service.date
      ? (() => {
          const d = new Date(service.date);
          const day = d.getDate();
          const month = d.toLocaleString("en-US", { month: "long" });
          const year = d.getFullYear();
          const ord = (n: number) => {
            if (n >= 11 && n <= 13) return n + "th";
            const s = ["th", "st", "nd", "rd"];
            return n + (s[n % 10] || "th");
          };
          return `${ord(day)} ${month}, ${year}`;
        })()
      : "N/A";

    // Parse recommended parts
    let recommendedPartsText = "";
    try {
      const workDetails =
        typeof service.workDetails === "string"
          ? JSON.parse(service.workDetails)
          : service.workDetails;

      const parts =
        workDetails?.recommendedParts || service.recommendedParts || [];
      const partsArray = typeof parts === "string" ? JSON.parse(parts) : parts;

      if (Array.isArray(partsArray) && partsArray.length > 0) {
        recommendedPartsText = `

${partsArray
  .map(
    (part, idx) =>
      `${idx + 1}. Part Number: ${part.part_number || part.partNumber}
   Description: ${part.description || part.name}`,
  )
  .join("\n\n")}`;
      }
    } catch (e) {
      console.error("Failed to parse recommended parts:", e);
    }

    setEmailSubject(`Projector Service Report - ${cinema} - ${serviceNum}`);
    setEmailBody(`Dear Team,
Good day!!!
The service was performed on ${date} for the Christie Projector – <strong>Model Number:</strong> ${modelNo}, <strong>Serial Number:</strong> ${serialNo} installed in <strong>Auditorium</strong> ${screenNo}. During the inspection, it was observed that the below parts require replacement due to aging/physical wear.${recommendedPartsText}

You are advised to provide the Purchase Order (PO) for the above-mentioned parts so that we can proceed with executing the replacement.
Thank you for choosing Ascomp Inc.

Best regards,
Ascomp INC
www.ascompinc.in`);
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleDownloadPDF = async () => {
    if (!serviceId) return;
    try {
      setLoading(true);
      const { constructAndGeneratePDF } = await import("@/lib/pdf-helper");
      const pdfBytes = await constructAndGeneratePDF(serviceId);

      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9-_#]/g, "_");
      console.log("serviceData", serviceData);
      const siteCode =
        serviceData?.site?.siteCode || serviceData?.siteCode || "NA";
      const address =
        serviceData?.address || serviceData?.site?.address || "NA";
      const screenNo = serviceData?.screenNumber || "NA";
      const serialNo =
        serviceData?.projector?.serialNo ||
        serviceData?.projectorSerial ||
        "NA";
      const serviceVisit = serviceData?.serviceNumber || "NA";

      link.download = `${sanitize(String(siteCode))}_${sanitize(String(address))}_SC#${sanitize(String(screenNo))}_${sanitize(String(serialNo))}_${sanitize(String(serviceVisit))}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShowEmailPreview = () => {
    setEmailError("");

    if (!email || !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (ccEmails) {
      const ccList = ccEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
      for (const cc of ccList) {
        if (!validateEmail(cc)) {
          setEmailError(`Invalid CC email address: ${cc}`);
          return;
        }
      }
    }

    setShowEmailPreview(true);
  };

  const handleSendEmail = async () => {
    if (!email || !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (ccEmails) {
      const ccList = ccEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
      for (const cc of ccList) {
        if (!validateEmail(cc)) {
          setEmailError(`Invalid CC email address: ${cc}`);
          return;
        }
      }
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Email subject and body cannot be empty");
      return;
    }

    try {
      setSendingEmail(true);
      const response = await fetch("/api/admin/service-records/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId,
          recipientEmail: email,
          ccEmails: ccEmails
            .split(",")
            .map((e) => e.trim())
            .filter((e) => e.length > 0),
          emailContent: {
            subject: emailSubject,
            body: emailBody.replace(/\n/g, "<br>"),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email");
      }

      toast.success("Email sent successfully", {
        description: `Service report has been sent to ${email}`,
      });

      // Reset email preview
      setShowEmailPreview(false);
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview & Send Service Report</DialogTitle>
        </DialogHeader>
        {serviceData ? (
          <div className="space-y-4 mt-4">
            {!showEmailPreview ? (
              <>
                {/* Service Preview */}
                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-semibold text-lg">Service Preview</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Service #:</span>{" "}
                      {serviceData.serviceNumber}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span>{" "}
                      {serviceData.date
                        ? new Date(serviceData.date).toLocaleDateString()
                        : "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Cinema:</span>{" "}
                      {serviceData.site.name || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Projector Model:</span>{" "}
                      {serviceData.projector.model ||
                        serviceData.modelNo ||
                        "N/A"}
                    </div>
                    {serviceData.logs && (
                      <div className="col-span-2 mt-2">
                        <span className="font-medium">Projector Logs:</span>{" "}
                        <a
                          href={serviceData.logs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <Folder className="h-4 w-4" />
                          <span>Download Logs</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-2 border-t pt-4">
                  <label className="block text-sm font-semibold">
                    Recipient Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="client@example.com"
                    className={`border-2 ${emailError ? "border-red-500" : "border-black"}`}
                  />
                  <label className="block text-sm font-semibold mt-4">
                    CC Email Addresses
                  </label>
                  <Input
                    type="text"
                    value={ccEmails}
                    onChange={(e) => {
                      setCcEmails(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="cc1@example.com, cc2@example.com"
                    className={`border-2 ${emailError && ccEmails ? "border-red-500" : "border-black"}`}
                  />
                  {emailError && (
                    <p className="text-sm text-red-600">{emailError}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the email addresses where the service report PDF
                    should be sent. Separate multiple CC emails with commas.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={loading}
                    className="bg-black text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? "Generating..." : "Download PDF"}
                  </Button>
                  <Button
                    onClick={handleShowEmailPreview}
                    disabled={!email || loading}
                    className="bg-black text-white"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Preview Email
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Email Preview & Edit */}
                <div className="space-y-4">
                  {/* <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-900">
                      <strong>✉️ Email Preview</strong> - Review and edit the email content below before sending.
                    </p>
                  </div> */}

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">To:</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-2 border-black"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">CC:</label>
                    <Input
                      type="text"
                      value={ccEmails}
                      onChange={(e) => setCcEmails(e.target.value)}
                      className="border-2 border-black"
                      placeholder="Comma-separated emails"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">
                      Subject:
                    </label>
                    <Input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="border-2 border-black"
                      placeholder="Enter email subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">
                      Message:
                    </label>
                    <Textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="border-2 border-black min-h-[300px] font-mono text-sm"
                      placeholder="Enter email message"
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs text-gray-600">
                      <strong>📎 Attachment:</strong>{" "}
                      {serviceData?.projector?.serialNo ||
                        serviceData?.projectorSerial ||
                        "Service_Report"}
                      .pdf
                    </p>
                  </div>
                </div>

                {/* Preview Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowEmailPreview(false)}
                    disabled={sendingEmail}
                  >
                    ← Back
                  </Button>
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !email || !validateEmail(email)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingEmail ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading service data...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type OverviewViewProps = {
  hideHeader?: boolean;
  limit?: number;
};

export default function OverviewView({ hideHeader, limit }: OverviewViewProps) {
  const { user } = useAuth();
  const { laserProjectorModels } = useFormConfig();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [workerFilter, setWorkerFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [columnKeys, setColumnKeys] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {},
  );
  const [page, setPage] = useState(1);
  const pageSize = limit ?? 20;
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewTitle, setPreviewTitle] = useState("");
  const [expandedRemarks, setExpandedRemarks] = useState<
    Record<string, boolean>
  >({});
  const [signaturePreviewOpen, setSignaturePreviewOpen] = useState(false);
  const [signatureUrls, setSignatureUrls] = useState<{
    site?: string;
    engineer?: string;
  }>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceData, setEditingServiceData] = useState<any | null>(
    null,
  );
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewServiceId, setPreviewServiceId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showJobHistoryDialog, setShowJobHistoryDialog] = useState(false);
  const [showUploadJobHistoryDialog, setShowUploadJobHistoryDialog] =
    useState(false);
  const [recommendedPartsDialogOpen, setRecommendedPartsDialogOpen] =
    useState(false);
  const [selectedRecommendedParts, setSelectedRecommendedParts] = useState<
    RecommendedPart[]
  >([]);

  // Report type filter: "all" | "standard" | "laser"
  const [reportTypeFilter, setReportTypeFilter] = useState<"all" | "standard" | "laser">("all");

  // Advanced filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [latestRecordsOnly, setLatestRecordsOnly] = useState(false);
  const [filterConditions, setFilterConditions] = useState<
    Array<{
      id: string;
      table: "projector" | "site" | "serviceRecord";
      field: string;
      operator: string;
      value: string;
      value2?: string;
    }>
  >([]);
  const [filterLogic, setFilterLogic] = useState<"AND" | "OR">("AND");

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch all service records; try multiple endpoints in order, tolerate missing ones.
        const tryEndpoints = ["/api/admin/tasks"];
        let json: any = null;
        let success = false;
        let lastErr: string | null = null;

        for (const endpoint of tryEndpoints) {
          try {
            const res = await fetch(endpoint, { credentials: "include" });
            if (!res.ok) {
              lastErr = `${endpoint} -> ${res.status} ${res.statusText}`;
              continue;
            }
            json = await res.json();
            success = true;
            break;
          } catch (err) {
            lastErr = `${endpoint} -> ${(err as Error).message}`;
            continue;
          }
        }

        if (!success || !json) {
          setRecords([]);
          setError(
            "Failed to fetch service records" +
              (lastErr ? ` (${lastErr})` : ""),
          );
          return;
        }

        const tasks = Array.isArray(json)
          ? json
          : json.tasks || json.data || [];
        const items: ServiceRecord[] = tasks.map((item: any, idx: number) => {
          const projector = item.projector ?? {};
          const site = item.site ?? {};

          const flattened: ServiceRecord = {
            id: item.id ?? `row-${idx}`,
            ...item,
            action: item.id ?? `row-${idx}`,
            engineerVisited: item.engineerVisited ?? item.user?.name ?? "",
            projectorModel:
              item.modelNo ?? projector.modelNo ?? item.projectorModel ?? "",
            projectorSerial:
              item.serialNo ?? projector.serialNo ?? item.projectorSerial ?? "",
            projectorStatus: projector.status ?? "",
            projectorServices: projector.noOfservices ?? "",
            projectorRegion: projector.region ?? "",
            projectorState: projector.state ?? "",
            projectorPvr: projector.pvr ?? "",
            siteName: site.siteName ?? item.siteName ?? "",
            siteCode: site.siteCode ?? "",
            siteAddress: site.address ?? item.address ?? "",
            siteContactDetails:
              item.contactDetails ?? site.contactDetails ?? "",
          };

          // Merge note fields with their parent fields
          Object.entries(NOTE_FIELD_MAP).forEach(([parentKey, noteKey]) => {
            const parentValue = flattened[parentKey];
            const noteValue = flattened[noteKey];
            if (parentValue || noteValue) {
              if (noteValue) {
                flattened[parentKey] =
                  `${parentValue || ""}${parentValue && noteValue ? " - " : ""}${noteValue}`;
              }
              // Keep note field for completeness but avoid duplicate columns
              EXCLUDED_KEYS.add(noteKey);
            }
          });

          // Remove nested objects and excluded fields
          delete flattened.projector;
          delete flattened.site;
          delete flattened.assignedToId;
          delete flattened.createdAt;
          delete flattened.userId;

          return flattened;
        });

        setRecords(items);
        const allKeys = Array.from(
          new Set(
            items
              .flatMap((r) => Object.keys(r))
              .filter((k) => !EXCLUDED_KEYS.has(k)),
          ),
        );

        // Sort by priority: priority fields first, then alphabetically
        const derivedKeys = allKeys.sort((a, b) => {
          const aPriority = COLUMN_PRIORITY.indexOf(a);
          const bPriority = COLUMN_PRIORITY.indexOf(b);
          if (aPriority !== -1 && bPriority !== -1)
            return aPriority - bPriority;
          if (aPriority !== -1) return -1;
          if (bPriority !== -1) return 1;
          return a.localeCompare(b);
        });

        setColumnKeys(derivedKeys);
        setVisibleColumns((prev) => {
          if (Object.keys(prev).length) return prev;
          // Only show default columns initially for faster rendering
          return derivedKeys.reduce(
            (acc, key) => ({
              ...acc,
              [key]: DEFAULT_VISIBLE_COLUMNS.has(key),
            }),
            {} as Record<string, boolean>,
          );
        });
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load records");
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  // Filter helper functions - must be defined before filtered useMemo
  const getFieldsForTable = (table: "projector" | "site" | "serviceRecord") => {
    const fields = FILTER_FIELDS[table] || [];
    // When visible records are all laser, rename service record fields to laser equivalents
    if (table === "serviceRecord" && useLaserLabels) {
      return fields.map((f) =>
        LASER_LABEL_OVERRIDES[f.key]
          ? { ...f, label: LASER_LABEL_OVERRIDES[f.key] }
          : f,
      );
    }
    return fields;
  };

  const getOperatorsForField = (
    table: "projector" | "site" | "serviceRecord",
    fieldKey: string,
  ) => {
    const field = FILTER_FIELDS[table].find((f) => f.key === fieldKey);
    if (!field) return OPERATORS.string;
    return OPERATORS[field.type as keyof typeof OPERATORS] || OPERATORS.string;
  };

  const getFieldDefinition = (
    table: "projector" | "site" | "serviceRecord",
    fieldKey: string,
  ): FilterField | undefined => {
    return FILTER_FIELDS[table].find((f) => f.key === fieldKey);
  };

  // Apply filter conditions to a record - must be defined before filtered useMemo
  const matchesFilterCondition = (
    record: ServiceRecord,
    condition: (typeof filterConditions)[0],
  ): boolean => {
    const fieldDef = getFieldDefinition(condition.table, condition.field);
    if (!fieldDef) return true;

    // If no value is provided, skip this condition (don't filter)
    if (!condition.value || condition.value.trim() === "") return true;

    let recordValue: any = null;

    // Get value from record based on table and field
    if (condition.table === "projector") {
      if (condition.field === "serialNo") recordValue = record.projectorSerial;
      else if (condition.field === "modelNo")
        recordValue = record.projectorModel;
      else if (condition.field === "region")
        recordValue = (record as any).projectorRegion || "";
      else if (condition.field === "state")
        recordValue = (record as any).projectorState || "";
      else if (condition.field === "pvr")
        recordValue = (record as any).projectorPvr || "";
      else if (condition.field === "status")
        recordValue = record.projectorStatus;
      else if (condition.field === "address")
        recordValue = record.siteAddress || (record as any).address || "";
      else if (condition.field === "noOfservices")
        recordValue = record.projectorServices;
    } else if (condition.table === "site") {
      if (condition.field === "siteName") recordValue = record.siteName;
      else if (condition.field === "siteCode") recordValue = record.siteCode;
      else if (condition.field === "address") recordValue = record.siteAddress;
      else if (condition.field === "contactDetails")
        recordValue = record.siteContactDetails;
    } else if (condition.table === "serviceRecord") {
      recordValue = record[condition.field];
    }

    // Handle null/undefined - for "contains" type searches, missing values should not match
    if (
      recordValue === null ||
      recordValue === undefined ||
      recordValue === ""
    ) {
      // For notEquals operator, missing value should match (it's not equal to the search value)
      if (condition.operator === "notEquals") return true;
      return false;
    }

    const filterValue = condition.value.toLowerCase().trim();
    const recordValueStr = String(recordValue).toLowerCase().trim();

    // Helper function to parse dates safely
    const parseDate = (val: any): Date | null => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    switch (condition.operator) {
      case "equals":
        if (fieldDef.type === "boolean") {
          // Handle boolean - record value could be true, false, "true", "false"
          const recordBool =
            String(recordValue).toLowerCase() === "true" ||
            recordValue === true;
          const filterBool = condition.value.toLowerCase() === "true";
          return recordBool === filterBool;
        }
        if (fieldDef.type === "date") {
          // For date equals, compare date strings (YYYY-MM-DD format)
          const recordDate = parseDate(recordValue);
          const filterDate = parseDate(condition.value);
          if (!recordDate || !filterDate) return false;
          return recordDate.toDateString() === filterDate.toDateString();
        }
        return recordValueStr === filterValue;

      case "contains":
        return recordValueStr.includes(filterValue);

      case "startsWith":
        return recordValueStr.startsWith(filterValue);

      case "endsWith":
        return recordValueStr.endsWith(filterValue);

      case "greaterThan":
        if (fieldDef.type === "number") {
          return Number(recordValue) > Number(condition.value);
        }
        return false;

      case "lessThan":
        if (fieldDef.type === "number") {
          return Number(recordValue) < Number(condition.value);
        }
        return false;

      case "between":
        if (!condition.value2 || condition.value2.trim() === "") return true;
        if (fieldDef.type === "number") {
          const val = Number(recordValue);
          return (
            val >= Number(condition.value) && val <= Number(condition.value2)
          );
        }
        if (fieldDef.type === "date") {
          const recordDate = parseDate(recordValue);
          const startDate = parseDate(condition.value);
          const endDate = parseDate(condition.value2);
          if (!recordDate || !startDate || !endDate) return false;
          return recordDate >= startDate && recordDate <= endDate;
        }
        return true;

      case "after":
        if (fieldDef.type === "date") {
          const recordDate = parseDate(recordValue);
          const filterDate = parseDate(condition.value);
          if (!recordDate || !filterDate) return false;
          return recordDate > filterDate;
        }
        return false;

      case "before":
        if (fieldDef.type === "date") {
          const recordDate = parseDate(recordValue);
          const filterDate = parseDate(condition.value);
          if (!recordDate || !filterDate) return false;
          return recordDate < filterDate;
        }
        return false;

      case "notEquals":
        if (fieldDef.type === "boolean") {
          const recordBool =
            String(recordValue).toLowerCase() === "true" ||
            recordValue === true;
          const filterBool = condition.value.toLowerCase() === "true";
          return recordBool !== filterBool;
        }
        return recordValueStr !== filterValue;

      default:
        return true;
    }
  };

  const filtered = useMemo(() => {
    const lower = search.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;

    const inRange = (d?: string | null) => {
      if (!d) return true;
      const dateVal = new Date(d);
      if (Number.isNaN(dateVal.getTime())) return true;
      if (start && dateVal < start) return false;
      return true;
    };

    // Always search in these key fields regardless of column visibility
    const alwaysSearchFields = [
      "siteName",
      "siteCode",
      "siteAddress",
      "siteContactDetails",
      "projectorSerial",
      "projectorModel",
      "serviceNumber",
      "engineerVisited",
      "cinemaName",
      "screenNumber",
      "remarks",
    ];

    const matchesSearch = (r: ServiceRecord) => {
      if (!lower) return true;

      // First check always-searchable fields
      const matchesAlwaysFields = alwaysSearchFields.some((key) => {
        const val = r[key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lower);
      });
      if (matchesAlwaysFields) return true;

      // Then check visible columns
      return columnKeys
        .filter((key) => visibleColumns[key])
        .some((key) => {
          const val = r[key];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(lower);
        });
    };

    const matchesWorker = (rec: ServiceRecord) =>
      workerFilter === "all" || rec.workerName === workerFilter;

    // Apply advanced filter conditions
    const matchesAdvancedFilters = (rec: ServiceRecord) => {
      if (filterConditions.length === 0) return true;

      if (filterLogic === "AND") {
        return filterConditions.every((condition) =>
          matchesFilterCondition(rec, condition),
        );
      } else {
        return filterConditions.some((condition) =>
          matchesFilterCondition(rec, condition),
        );
      }
    };

    const isLaserRecord = (rec: ServiceRecord) =>
      isLaserProjectorModel(rec.projectorModel, laserProjectorModels);

    let filteredRecords = records.filter((rec) => {
      if (reportTypeFilter === "laser" && !isLaserRecord(rec)) return false;
      if (reportTypeFilter === "standard" && isLaserRecord(rec)) return false;
      return (
        matchesWorker(rec) &&
        matchesSearch(rec) &&
        inRange(rec.date || rec.scheduledDate || rec.createdAt) &&
        matchesAdvancedFilters(rec)
      );
    });

    // Apply latest records only filter
    if (latestRecordsOnly) {
      const projectorMap = new Map<string, ServiceRecord>();
      filteredRecords.forEach((rec) => {
        const projectorSerial = rec.projectorSerial || "";
        if (!projectorSerial) return;

        const existing = projectorMap.get(projectorSerial);
        if (!existing) {
          projectorMap.set(projectorSerial, rec);
        } else {
          const existingDate =
            existing.date || existing.scheduledDate || existing.createdAt;
          const currentDate = rec.date || rec.scheduledDate || rec.createdAt;
          if (currentDate && existingDate) {
            const existingTime = new Date(existingDate).getTime();
            const currentTime = new Date(currentDate).getTime();
            if (currentTime > existingTime) {
              projectorMap.set(projectorSerial, rec);
            }
          }
        }
      });
      filteredRecords = Array.from(projectorMap.values());
    }

    return filteredRecords.sort((a, b) => {
      const aDate = a.date || a.scheduledDate || a.createdAt;
      const bDate = b.date || b.scheduledDate || b.createdAt;
      const aTime = aDate ? new Date(aDate).getTime() : 0;
      const bTime = bDate ? new Date(bDate).getTime() : 0;
      return bTime - aTime; // descending newest first
    });
  }, [
    records,
    search,
    workerFilter,
    startDate,
    columnKeys,
    visibleColumns,
    filterConditions,
    filterLogic,
    latestRecordsOnly,
    reportTypeFilter,
    laserProjectorModels,
  ]);

  useEffect(() => {
    setPage(1);
  }, [search, workerFilter, startDate, filterConditions, latestRecordsOnly, reportTypeFilter]);

  /**
   * True when every record currently visible in the table is a laser record.
   * Lets us auto-show laser column headers even while in "All" mode — e.g.
   * when the user searches for a specific laser projector serial number.
   */
  const allVisibleAreLaser = useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.every((r) =>
      isLaserProjectorModel(r.projectorModel, laserProjectorModels),
    );
  }, [filtered, laserProjectorModels]);

  /** Whether to use laser column labels in headers and filter field dropdowns */
  const useLaserLabels =
    reportTypeFilter === "laser" ||
    (reportTypeFilter !== "standard" && allVisibleAreLaser);

  // Filter UI helper functions
  const addFilterCondition = () => {
    const newCondition = {
      id: `filter-${Date.now()}-${Math.random()}`,
      table: "projector" as const,
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
    updates: Partial<(typeof filterConditions)[0]>,
  ) => {
    setFilterConditions(
      filterConditions.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  };

  const totalPages = limit
    ? 1
    : Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = limit
    ? filtered.slice(0, limit)
    : filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllColumns = (checked: boolean) => {
    setVisibleColumns((prev) =>
      columnKeys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: checked,
        }),
        { ...prev },
      ),
    );
  };

  const dateLikeKeys = new Set([
    "date",
    "completedAt",
    "scheduledDate",
    "createdAt",
    "updatedAt",
    "startTime",
    "endTime",
  ]);

  const handleImageClick = (images: string[], title: string) => {
    setPreviewImages(images);
    setPreviewTitle(title);
    setImagePreviewOpen(true);
  };

  const handleSignatureClick = (signatures: any) => {
    try {
      const sigs =
        typeof signatures === "string" ? JSON.parse(signatures) : signatures;
      setSignatureUrls({
        site: sigs?.site || sigs?.siteSignatureUrl,
        engineer: sigs?.engineer || sigs?.engineerSignatureUrl,
      });
      setSignaturePreviewOpen(true);
    } catch {
      setSignatureUrls({});
      setSignaturePreviewOpen(true);
    }
  };

  const toggleRemarks = (rowId: string) => {
    setExpandedRemarks((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const formatValue = (key: string, value: any, rowId: string) => {
    if (value === null || value === undefined) return "—";

    // Handle download action
    if (key === "action") {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setPreviewServiceId(rowId);
              setPreviewDialogOpen(true);
            }}
            className="inline-flex gap-4 rounded-md items-center justify-center text-white bg-black p-2 w-full transition-colors"
            title="Preview & Download PDF"
          >
            <Download className="h-4 w-4" />
          </button>
          {user?.email == "helpdesk@ascompinc.in" && (
            <button
              onClick={() => {
                setEditingServiceId(rowId);
                const rowData = records.find((r) => r.id === rowId);
                setEditingServiceData(rowData || null);
                setEditDialogOpen(true);
              }}
              className="inline-flex gap-4 rounded-md items-center justify-center text-white bg-black p-2 w-full transition-colors"
              title="Edit Service Record"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }

    // Handle signatures
    if (key === "signatures" && value) {
      const hasSignatures =
        typeof value === "object" ||
        (typeof value === "string" && value.includes("http"));
      if (hasSignatures) {
        return (
          <button
            onClick={() => handleSignatureClick(value)}
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ImageIcon className="h-4 w-4" />
            <span>View</span>
          </button>
        );
      }
      return "—";
    }

    // Handle logs download
    if (key === "logs" && value && typeof value === "string") {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
        >
          <Folder className="h-4 w-4" />
          <span>Download</span>
        </a>
      );
    }

    // Handle remarks with expand/collapse
    if (key === "remarks" && typeof value === "string" && value) {
      const isExpanded = expandedRemarks[rowId];
      const maxLength = 50;
      const shouldTruncate = value.length > maxLength;

      return (
        <button
          onClick={() => toggleRemarks(rowId)}
          className="text-left hover:text-blue-600 transition-colors"
          title={shouldTruncate ? "Click to expand/collapse" : ""}
        >
          {shouldTruncate && !isExpanded
            ? `${value.substring(0, maxLength)}...`
            : value}
        </button>
      );
    }

    // Handle fields with notes (merged format: "OK - Note")
    if (NOTE_FIELD_MAP[key] && typeof value === "string") {
      // Clean any repeated/corrupted patterns first
      const cleanedValue = cleanRepeatedNote(value);
      const parts = cleanedValue.split(" - ");
      const mainValue = parts[0] || "";
      const noteValue = parts.slice(1).join(" - ") || "";

      if (!noteValue) {
        return <span>{mainValue || "—"}</span>;
      }

      return (
        <div className="flex flex-col items-start gap-1">
          <span>{mainValue}</span>
          <span className="text-gray-600 text-xs bg-gray-200 p-2 rounded-sm">
            {noteValue}
          </span>
        </div>
      );
    }

    // Handle image arrays (normalize keys for imports / alternate casing)
    const nk = normalizeColumnKey(key);
    const imageUrls = coerceImageUrlArray(value);

    if (nk === "images" && imageUrls) {
      return (
        <button
          onClick={() => handleImageClick(imageUrls, "Images")}
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
        >
          <ImageIcon className="h-4 w-4" />
          <span>
            {imageUrls.length} image{imageUrls.length !== 1 ? "s" : ""}
          </span>
        </button>
      );
    }

    if (nk === "afterimages" && imageUrls) {
      return (
        <button
          onClick={() => handleImageClick(imageUrls, "After Images")}
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
        >
          <ImageIcon className="h-4 w-4" />
          <span>
            {imageUrls.length} image{imageUrls.length !== 1 ? "s" : ""}
          </span>
        </button>
      );
    }

    if (nk === "brokenimages" && imageUrls) {
      return (
        <button
          onClick={() => handleImageClick(imageUrls, "Broken Images")}
          className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-800 hover:underline"
        >
          <ImageIcon className="h-4 w-4" />
          <span>{imageUrls.length} broken</span>
        </button>
      );
    }

    // Handle drive link
    if (key === "photosDriveLink" && typeof value === "string" && value) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
        >
          <Folder className="h-4 w-4" />
          <span>Drive</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    }

    // Handle recommended parts
    if (key === "recommendedParts") {
      try {
        const parts = typeof value === "string" ? JSON.parse(value) : value;
        if (Array.isArray(parts) && parts.length > 0) {
          return (
            <button
              onClick={() => {
                setSelectedRecommendedParts(parts);
                setRecommendedPartsDialogOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span>
                {parts.length} item{parts.length !== 1 ? "s" : ""}
              </span>
            </button>
          );
        }
      } catch (e) {
        // If parsing fails, fall through to default handling
      }
    }

    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value))
      return value.length > 0 ? `${value.length} items` : "—";
    if (typeof value === "object") return JSON.stringify(value);
    if (dateLikeKeys.has(key) && typeof value === "string")
      return formatDate(value);
    return String(value);
  };

  return (
    <div className="space-y-4 ">
      <Card className={`rounded-none  border-none ${hideHeader && "p-0"}`}>
        {!hideHeader && (
          <CardHeader className="flex flex-col gap-3">
            <CardTitle className="text-lg font-semibold text-black">
              Service Records
            </CardTitle>
            <div className="flex flex-col w-full gap-3 border-b-2 pb-4">
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="Search site, projector, model, worker..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-2 border-black text-sm flex-1 min-w-[200px]"
                />
                <Popover open={columnMenuOpen} onOpenChange={setColumnMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-2 border-black text-sm"
                    >
                      Columns
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 max-h-96 overflow-hidden rounded-md border-2 border-black bg-white shadow-lg">
                    <div className="p-3 space-y-2">
                      <Input
                        placeholder="Search columns..."
                        value={columnSearch}
                        onChange={(e) => setColumnSearch(e.target.value)}
                        className="border-2 border-black text-sm"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">
                          Toggle visibility
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-black"
                          onClick={() => {
                            const allSelected = columnKeys.every(
                              (k) => visibleColumns[k],
                            );
                            setAllColumns(!allSelected);
                          }}
                        >
                          {columnKeys.every((k) => visibleColumns[k])
                            ? "Deselect all"
                            : "Select all"}
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto border-t border-black/20">
                      {columnKeys
                        .filter((key) => {
                          const label = useLaserLabels && LASER_LABEL_OVERRIDES[key]
                            ? LASER_LABEL_OVERRIDES[key]
                            : toLabel(key);
                          return label.toLowerCase().includes(columnSearch.toLowerCase());
                        })
                        .map((key) => {
                          const label = useLaserLabels && LASER_LABEL_OVERRIDES[key]
                            ? LASER_LABEL_OVERRIDES[key]
                            : toLabel(key);
                          return (
                            <label
                              key={key}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-black hover:bg-gray-50"
                            >
                              <Checkbox
                                checked={visibleColumns[key]}
                                onCheckedChange={() => toggleColumn(key as any)}
                                className="border-black"
                              />
                              {label}
                            </label>
                          );
                        })}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex flex-wrap gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-2 border-black text-sm w-fit justify-start"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? formatDate(startDate) : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setStartDate(formatIsoDate(date));
                          } else {
                            setStartDate("");
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    className="border-2 border-black text-sm"
                    onClick={() => {
                      setSearch("");
                      setWorkerFilter("all");
                      setStartDate("");
                      setFilterConditions([]);
                      setLatestRecordsOnly(false);
                      setFilterLogic("AND");
                      setShowAdvancedFilters(false);
                      setReportTypeFilter("all");
                      setPage(1);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reset filters
                  </Button>

                  {/* Report type toggle: All / Standard / Laser */}
                  <div className="flex items-center rounded-md border-2 border-black overflow-hidden text-sm font-medium">
                    {(["all", "standard", "laser"] as const).map((t, i) => (
                      <button
                        key={t}
                        onClick={() => { setReportTypeFilter(t); setPage(1); }}
                        className={`px-3 py-1.5 capitalize transition-colors ${
                          reportTypeFilter === t
                            ? "bg-black text-white"
                            : "bg-white text-black hover:bg-gray-100"
                        } ${i > 0 ? "border-l-2 border-black" : ""}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Button
                      variant="outline"
                      className={`border-2 text-sm ${filterConditions.filter((f) => f.value.trim() !== "").length > 0 ? "border-blue-600 bg-blue-50 text-blue-700" : "border-black"}`}
                      onClick={() => {
                        if (
                          !showAdvancedFilters &&
                          filterConditions.length === 0
                        ) {
                          // Add a default filter condition when opening for the first time
                          addFilterCondition();
                        }
                        setShowAdvancedFilters(!showAdvancedFilters);
                      }}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {showAdvancedFilters
                        ? "Hide Filters"
                        : filterConditions.filter((f) => f.value.trim() !== "")
                              .length > 0
                          ? `Filters (${filterConditions.filter((f) => f.value.trim() !== "").length})`
                          : "Advanced Filters"}
                    </Button>

                    {showAdvancedFilters && (
                      <div className="absolute right-0 mt-2 z-50 border border-gray-200 rounded-xl p-4 space-y-4 bg-white shadow-xl w-[95vw] sm:w-[85vw] md:w-[600px] lg:w-[700px] max-h-[75vh] overflow-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900">
                            Advanced Filters
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvancedFilters(false)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Latest Records Only Option */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Checkbox
                            id="latest-records"
                            checked={latestRecordsOnly}
                            onCheckedChange={(checked) =>
                              setLatestRecordsOnly(checked as boolean)
                            }
                            className="border-2 border-gray-400 data-[state=checked]:bg-black data-[state=checked]:border-black h-4 w-4"
                          />
                          <Label
                            htmlFor="latest-records"
                            className="text-sm font-medium cursor-pointer text-gray-700"
                          >
                            Latest records only (one record per projector)
                          </Label>
                        </div>

                        {/* Filter Logic (AND/OR) */}
                        {filterConditions.length > 1 && (
                          <div className="flex items-center gap-3 px-1">
                            <Label className="text-sm font-medium text-gray-700">
                              Combine filters with:
                            </Label>
                            <Select
                              value={filterLogic}
                              onValueChange={(v) =>
                                setFilterLogic(v as "AND" | "OR")
                              }
                            >
                              <SelectTrigger className="w-20 h-8 text-sm border border-gray-300 rounded-md">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Filter Conditions */}
                        <div className="space-y-3">
                          {filterConditions.length === 0 && (
                            <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg">
                              <p>No filter conditions added.</p>
                              <p className="text-xs mt-1">
                                Click the button below to add a filter.
                              </p>
                            </div>
                          )}

                          {filterConditions.map((condition, index) => {
                            const fields = getFieldsForTable(condition.table);
                            const operators = getOperatorsForField(
                              condition.table,
                              condition.field,
                            );
                            const fieldDef = getFieldDefinition(
                              condition.table,
                              condition.field,
                            );

                            return (
                              <div
                                key={condition.id}
                                className="border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 transition-colors"
                              >
                                {/* Filter Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Filter {index + 1}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeFilterCondition(condition.id)
                                    }
                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 rounded-full"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                {/* Filter Fields Grid - Responsive */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                  {/* Table Selection */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-gray-600">
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
                                    >
                                      <SelectTrigger className="h-9 text-sm border border-gray-300 rounded-md w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="projector">
                                          Projector
                                        </SelectItem>
                                        <SelectItem value="site">
                                          Site
                                        </SelectItem>
                                        <SelectItem value="serviceRecord">
                                          Service Record
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Field Selection */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-gray-600">
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
                                    >
                                      <SelectTrigger className="h-9 text-sm border border-gray-300 rounded-md w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-60">
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

                                  {/* Operator Selection */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-gray-600">
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
                                    >
                                      <SelectTrigger className="h-9 text-sm border border-gray-300 rounded-md w-full">
                                        <SelectValue placeholder="Select" />
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

                                  {/* Value Input */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-gray-600">
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
                                      >
                                        <SelectTrigger className="h-9 text-sm border border-gray-300 rounded-md w-full">
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
                                      >
                                        <SelectTrigger className="h-9 text-sm border border-gray-300 rounded-md w-full">
                                          <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="true">
                                            Yes
                                          </SelectItem>
                                          <SelectItem value="false">
                                            No
                                          </SelectItem>
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
                                        className="h-9 text-sm border border-gray-300 rounded-md w-full"
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
                                        className="h-9 text-sm border border-gray-300 rounded-md w-full"
                                      />
                                    )}
                                  </div>
                                </div>

                                {/* Second Value for "Between" Operator */}
                                {condition.operator === "between" && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                      <div className="lg:col-start-4 space-y-1.5">
                                        <Label className="text-xs font-medium text-gray-600">
                                          End Value
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
                                            updateFilterCondition(
                                              condition.id,
                                              { value2: e.target.value },
                                            )
                                          }
                                          placeholder="Enter end value"
                                          className="h-9 text-sm border border-gray-300 rounded-md w-full"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Add Filter Button */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addFilterCondition}
                          className="w-full h-10 text-sm border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Filter Condition
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    className="text-sm"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    Upload
                  </Button>
                  <Button
                    className="text-sm"
                    onClick={() => setShowExportModal(true)}
                  >
                    Export
                  </Button>
                  <Button
                    className="text-sm"
                    variant="outline"
                    onClick={() => setShowJobHistoryDialog(true)}
                  >
                    Export Jobs
                  </Button>
                  <Button
                    className="text-sm"
                    variant="outline"
                    onClick={() => setShowUploadJobHistoryDialog(true)}
                  >
                    Upload Jobs
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent
          className={`overflow-x-auto h-screen ${hideHeader && "px-0"}`}
        >
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-600">
              Loading records...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-600">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-82 text-center text-sm text-gray-600">
              No records found.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  {columnKeys
                    .filter((k) => visibleColumns[k])
                    .map((key) => (
                      <th
                        key={key}
                        className="text-left whitespace-nowrap py-3 px-4 font-semibold text-black"
                      >
                        {useLaserLabels && LASER_LABEL_OVERRIDES[key]
                          ? LASER_LABEL_OVERRIDES[key]
                          : toLabel(key)}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    {columnKeys
                      .filter((k) => visibleColumns[k])
                      .map((key) => (
                        <td
                          key={key}
                          className="py-3 px-4 whitespace-nowrap text-black"
                        >
                          {formatValue(key, row[key], row.id)}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
        {!loading && filtered.length > 0 && !limit && (
          <div className="flex items-center justify-between px-6 pb-4 text-sm text-black">
            <span>
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-black"
              >
                Prev
              </Button>
              <span>
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-black"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {previewImages.map((imageUrl, idx) => (
              <div
                key={idx}
                className="relative aspect-square border border-gray-200 rounded overflow-hidden bg-gray-50"
              >
                <Image
                  src={imageUrl}
                  alt={`${previewTitle} ${idx + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform cursor-pointer"
                  sizes="(max-width: 768px) 50vw, 33vw"
                  onClick={() => window.open(imageUrl, "_blank")}
                />
              </div>
            ))}
          </div>
          {previewImages.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No images available
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Signature Preview Dialog */}
      <Dialog
        open={signaturePreviewOpen}
        onOpenChange={setSignaturePreviewOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Signatures</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {signatureUrls.site && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">
                  Site Signature
                </h3>
                <div className="relative w-full h-32 border border-gray-200 rounded overflow-hidden bg-gray-50">
                  <Image
                    src={signatureUrls.site}
                    alt="Site Signature"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            )}
            {signatureUrls.engineer && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">
                  Engineer Signature
                </h3>
                <div className="relative w-full h-32 border border-gray-200 rounded overflow-hidden bg-gray-50">
                  <Image
                    src={signatureUrls.engineer}
                    alt="Engineer Signature"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            )}
            {!signatureUrls.site && !signatureUrls.engineer && (
              <p className="text-center text-gray-500 py-8 col-span-2">
                No signatures available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <EditServiceDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingServiceData(null);
            setEditingServiceId(null);
          }
        }}
        serviceId={editingServiceId}
        initialData={editingServiceData}
        onSave={async () => {
          // Refresh records after successful edit
          const fetchRecords = async () => {
            try {
              const res = await fetch("/api/admin/tasks", {
                credentials: "include",
              });
              if (res.ok) {
                const json = await res.json();
                const tasks = Array.isArray(json)
                  ? json
                  : json.tasks || json.data || [];
                const items: ServiceRecord[] = tasks.map(
                  (item: any, idx: number) => {
                    const projector = item.projector ?? {};
                    const site = item.site ?? {};
                    const flattened: ServiceRecord = {
                      id: item.id ?? `row-${idx}`,
                      ...item,
                      action: item.id ?? `row-${idx}`,
                      engineerVisited:
                        item.engineerVisited ?? item.user?.name ?? "",
                      projectorModel:
                        item.modelNo ??
                        projector.modelNo ??
                        item.projectorModel ??
                        "",
                      projectorSerial:
                        item.serialNo ??
                        projector.serialNo ??
                        item.projectorSerial ??
                        "",
                      projectorStatus: projector.status ?? "",
                      projectorServices: projector.noOfservices ?? "",
                      siteName: site.siteName ?? item.siteName ?? "",
                      siteCode: site.siteCode ?? "",
                      siteAddress: site.address ?? item.address ?? "",
                      siteContactDetails:
                        site.contactDetails ?? item.contactDetails ?? "",
                    };
                    Object.entries(NOTE_FIELD_MAP).forEach(
                      ([parentKey, noteKey]) => {
                        const parentValue = flattened[parentKey];
                        const noteValue = flattened[noteKey];
                        if (parentValue || noteValue) {
                          if (noteValue) {
                            flattened[parentKey] =
                              `${parentValue || ""}${parentValue && noteValue ? " - " : ""}${noteValue}`;
                          }
                          EXCLUDED_KEYS.add(noteKey);
                        }
                      },
                    );
                    delete flattened.projector;
                    delete flattened.site;
                    delete flattened.assignedToId;
                    delete flattened.createdAt;
                    delete flattened.userId;
                    return flattened;
                  },
                );
                setRecords(items);
              }
            } catch (error) {
              console.error("Failed to refresh records:", error);
            }
          };
          await fetchRecords();
        }}
      />

      {/* Preview & Download Dialog */}
      <PreviewDownloadDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        serviceId={previewServiceId}
        onClose={() => {
          setPreviewDialogOpen(false);
          setPreviewServiceId(null);
        }}
      />

      {/* Export Data Modal */}
      {showExportModal && (
        <ExportDataModal
          onClose={() => setShowExportModal(false)}
          columnKeys={columnKeys}
          toLabel={toLabel}
          filters={{
            search,
            workerFilter,
            startDate,
          }}
          currentAdvancedFilters={{
            latestRecordsOnly,
            filterConditions,
            filterLogic,
          }}
          reportType={reportTypeFilter}
        />
      )}

      {/* Export Jobs History Dialog */}
      <ExportJobsHistoryDialog
        open={showJobHistoryDialog}
        onOpenChange={setShowJobHistoryDialog}
      />

      <UploadJobsHistoryDialog
        open={showUploadJobHistoryDialog}
        onOpenChange={setShowUploadJobHistoryDialog}
      />

      {/* Recommended Parts Preview Dialog */}
      <Dialog
        open={recommendedPartsDialogOpen}
        onOpenChange={setRecommendedPartsDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recommended Parts</DialogTitle>
            <DialogDescription>
              Parts recommended for replacement or maintenance
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedRecommendedParts.length > 0 ? (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-black border-b">
                        Part Number
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-black border-b">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRecommendedParts.map((part, idx) => (
                      <tr
                        key={`${part.part_number}-${idx}`}
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-black font-mono">
                          {part.part_number
                            ? part.part_number
                            : part.partNumber}
                        </td>
                        <td className="py-3 px-4 text-black">
                          {part.description ? part.description : part.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No recommended parts
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Service Records Dialog */}
      <UploadServiceRecordsDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={() => {
          // Refresh records
          const fetchRecords = async () => {
            try {
              setLoading(true);
              setError(null);
              const tryEndpoints = ["/api/admin/tasks"];
              let json: any = null;
              let success = false;

              for (const endpoint of tryEndpoints) {
                try {
                  const res = await fetch(endpoint, { credentials: "include" });
                  if (!res.ok) {
                    continue;
                  }
                  json = await res.json();
                  success = true;
                  break;
                } catch (err) {
                  continue;
                }
              }

              if (success && json) {
                const tasks = Array.isArray(json)
                  ? json
                  : json.tasks || json.data || [];
                const items: ServiceRecord[] = tasks.map(
                  (item: any, idx: number) => {
                    const projector = item.projector ?? {};
                    const site = item.site ?? {};
                    const flattened: ServiceRecord = {
                      id: item.id ?? `row-${idx}`,
                      ...item,
                      action: item.id ?? `row-${idx}`,
                      engineerVisited:
                        item.engineerVisited ?? item.user?.name ?? "",
                      projectorModel:
                        item.modelNo ??
                        projector.modelNo ??
                        item.projectorModel ??
                        "",
                      projectorSerial:
                        item.serialNo ??
                        projector.serialNo ??
                        item.projectorSerial ??
                        "",
                      projectorStatus: projector.status ?? "",
                      projectorServices: projector.noOfservices ?? "",
                      siteName: site.siteName ?? item.siteName ?? "",
                      siteCode: site.siteCode ?? "",
                      siteAddress: site.address ?? item.address ?? "",
                      siteContactDetails:
                        site.contactDetails ?? item.contactDetails ?? "",
                    };
                    Object.entries(NOTE_FIELD_MAP).forEach(
                      ([parentKey, noteKey]) => {
                        const parentValue = flattened[parentKey];
                        const noteValue = flattened[noteKey];
                        if (parentValue || noteValue) {
                          if (noteValue) {
                            flattened[parentKey] =
                              `${parentValue || ""}${parentValue && noteValue ? " - " : ""}${noteValue}`;
                          }
                          EXCLUDED_KEYS.add(noteKey);
                        }
                      },
                    );
                    delete flattened.projector;
                    delete flattened.site;
                    delete flattened.assignedToId;
                    delete flattened.createdAt;
                    delete flattened.userId;
                    return flattened;
                  },
                );
                setRecords(items);
              }
            } catch (error) {
              console.error("Failed to refresh records:", error);
            } finally {
              setLoading(false);
            }
          };
          fetchRecords();
        }}
      />
    </div>
  );
}
