import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useFormConfig } from "@/hooks/use-form-config";
import { DynamicFormField } from "./dynamic-form-field";

type IssueNotes = Record<string, string>;
type UploadedImage = { name: string; url: string; size?: number };
type ProjectorPart = {
  projector_model: string;
  part_number: string;
  description: string;
};
type RecommendedPart = {
  part_number: string;
  description: string;
};
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
  logs: "",
  issueNotes: {} as IssueNotes,
  recommendedParts: [] as RecommendedPart[],
});

const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-4 pb-4 border-b-2 border-black last:border-b-0">
    <h3 className="font-bold text-black mb-3 text-sm sm:text-base">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const FormRow = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
    {children}
  </div>
);

const FormField = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-xs sm:text-sm font-semibold text-black mb-1">
      {label} {required && "*"}
    </label>
    {children}
  </div>
);

export default function RecordWorkStep({ data, onNext, onBack }: any) {
  const [beforeImages, setBeforeImages] = useState<UploadedImage[]>([]);
  const [afterImages, setAfterImages] = useState<UploadedImage[]>([]);
  const [brokenImages, setBrokenImages] = useState<UploadedImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [partsData, setPartsData] = useState<ProjectorPart[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(
    new Set(),
  );
  const [partSearchQuery, setPartSearchQuery] = useState("");
  const [lampModelsData, setLampModelsData] = useState<
    Array<{ projector_model: string; Models: string[] }>
  >([]);
  const [lampModels, setLampModels] = useState<string[]>([]);
  const [softwareVersions, setSoftwareVersions] = useState<string[]>([]);
  const [contentPlayers, setContentPlayers] = useState<string[]>([]);
  const [contactName, setContactName] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const beforeImagesRef = useRef<UploadedImage[]>([]);
  const afterImagesRef = useRef<UploadedImage[]>([]);
  const brokenImagesRef = useRef<UploadedImage[]>([]);
  const { config: formConfig, loading: configLoading } = useFormConfig();

  const { register, handleSubmit, reset, watch, setValue, getValues } =
    useForm<RecordWorkForm>({
      defaultValues: createInitialFormData(),
    });

  // Helper function to parse contactDetails into name and phone
  const parseContactDetails = (
    contactDetails: string | undefined | null,
  ): { name: string; phone: string } => {
    if (!contactDetails) return { name: "", phone: "" };
    const parts = contactDetails.split(" - ");
    if (parts.length >= 2 && parts[0] !== undefined) {
      return {
        name: parts[0].trim(),
        phone: parts.slice(1).join(" - ").trim(),
      };
    }
    return { name: contactDetails.trim(), phone: "" };
  };

  // Helper function to combine name and phone into contactDetails format
  const combineContactDetails = (name: string, phone: string): string => {
    const nameTrimmed = name.trim();
    const phoneTrimmed = phone.trim();
    if (nameTrimmed && phoneTrimmed) {
      return `${nameTrimmed} - ${phoneTrimmed}`;
    }
    if (nameTrimmed) return nameTrimmed;
    if (phoneTrimmed) return phoneTrimmed;
    return "";
  };

  useEffect(() => {
    const initial = createInitialFormData();
    if (data?.workDetails) {
      const contactDetails =
        data.workDetails.contactDetails ||
        data.selectedService?.contactDetails ||
        initial.contactDetails;
      const parsedContact = parseContactDetails(contactDetails);
      setContactName(parsedContact.name);
      setContactPhone(parsedContact.phone);

      reset({
        ...initial,
        ...data.workDetails,
        // Override with selectedService values only if workDetails doesn't have them (user's saved changes take precedence)
        cinemaName:
          data.workDetails.cinemaName ||
          data.selectedService?.site ||
          initial.cinemaName,
        // Use saved workDetails date if exists, otherwise use today's date (initial.date)
        date: data.workDetails.date || initial.date,
        address:
          data.workDetails.address ||
          data.selectedService?.address ||
          initial.address,
        contactDetails: contactDetails,
        projectorModel:
          data.workDetails.projectorModel ||
          data.selectedService?.projectorModel ||
          initial.projectorModel,
        projectorSerialNumber:
          data.workDetails.projectorSerialNumber ||
          data.selectedService?.projector ||
          initial.projectorSerialNumber,
        screenNumber:
          data.workDetails.screenNumber ||
          data.selectedService?.screenNumber ||
          initial.screenNumber,
        issueNotes: data.workDetails.issueNotes || {},
        recommendedParts: data.workDetails.recommendedParts || [],
      });
    } else if (typeof window !== "undefined" && data?.selectedService?.id) {
      const storageKey = `recordWorkFormData_${data.selectedService.id}`;
      const savedFormData = localStorage.getItem(storageKey);
      if (savedFormData) {
        const parsed = JSON.parse(savedFormData);
        const contactDetails =
          parsed.contactDetails ||
          data.selectedService?.contactDetails ||
          initial.contactDetails;
        const parsedContact = parseContactDetails(contactDetails);
        setContactName(parsedContact.name);
        setContactPhone(parsedContact.phone);

        reset({
          ...initial,
          ...parsed,
          // Override with selectedService values only if parsed doesn't have them (user's saved changes take precedence)
          cinemaName:
            parsed.cinemaName ||
            data.selectedService?.site ||
            initial.cinemaName,
          // Use saved form date if exists, otherwise use today's date (initial.date)
          date: parsed.date || initial.date,
          address:
            parsed.address || data.selectedService?.address || initial.address,
          contactDetails: contactDetails,
          projectorModel:
            parsed.projectorModel ||
            data.selectedService?.projectorModel ||
            initial.projectorModel,
          projectorSerialNumber:
            parsed.projectorSerialNumber ||
            data.selectedService?.projector ||
            initial.projectorSerialNumber,
          screenNumber:
            parsed.screenNumber ||
            data.selectedService?.screenNumber ||
            initial.screenNumber,
          issueNotes: parsed.issueNotes || {},
          recommendedParts: parsed.recommendedParts || [],
        });
      } else {
        // No saved data, but we have service details - use today's date
        const contactDetails =
          data.selectedService?.contactDetails || initial.contactDetails;
        const parsedContact = parseContactDetails(contactDetails);
        setContactName(parsedContact.name);
        setContactPhone(parsedContact.phone);

        reset({
          ...initial,
          cinemaName: data.selectedService?.site || initial.cinemaName,
          date: initial.date,
          address: data.selectedService?.address || initial.address,
          contactDetails: contactDetails,
          projectorModel:
            data.selectedService?.projectorModel || initial.projectorModel,
          projectorSerialNumber:
            data.selectedService?.projector || initial.projectorSerialNumber,
          screenNumber:
            data.selectedService?.screenNumber || initial.screenNumber,
        });
      }
    }

    if (data?.workImages) {
      setBeforeImages(data.workImages.images || []);
      setAfterImages(data.workImages.afterImages || []);
      setBrokenImages(data.workImages.brokenImages || []);
    } else if (typeof window !== "undefined" && data?.selectedService?.id) {
      const storageKey = `recordWorkImages_${data.selectedService.id}`;
      const savedImages = localStorage.getItem(storageKey);
      if (savedImages) {
        const parsed = JSON.parse(savedImages);
        setBeforeImages(parsed.before || []);
        setAfterImages(parsed.after || []);
        setBrokenImages(parsed.broken || []);
      }
    }
  }, [data, reset]);

  // Update contactDetails when contactName or contactPhone changes
  useEffect(() => {
    const combined = combineContactDetails(contactName, contactPhone);
    setValue("contactDetails", combined, { shouldDirty: true });
  }, [contactName, contactPhone, setValue]);

  useEffect(() => {
    if (typeof window === "undefined" || !data?.selectedService?.id) return;
    const subscription = watch((value) => {
      // Ensure contactDetails is updated with current split values before saving
      const combined = combineContactDetails(contactName, contactPhone);
      const updatedValue = { ...value, contactDetails: combined };
      const storageKey = `recordWorkFormData_${data.selectedService.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedValue));
    });
    return () => subscription.unsubscribe();
  }, [watch, data?.selectedService?.id, contactName, contactPhone]);

  useEffect(() => {
    const lastServiceData = data?.selectedService?.lastServiceData;
    if (!lastServiceData) return;

    const preFillLastServiceData = () => {
      const currentValues = getValues();

      const fieldsToPreFill: Array<{
        key: keyof RecordWorkForm;
        value: string | number | null | undefined;
      }> = [
        { key: "softwareVersion", value: lastServiceData.softwareVersion },
        { key: "screenGain", value: lastServiceData.screenGain },
        { key: "screenMake", value: lastServiceData.screenMake },
        { key: "throwDistance", value: lastServiceData.throwDistance },
        { key: "screenHeight", value: lastServiceData.screenHeight },
        { key: "screenWidth", value: lastServiceData.screenWidth },
        { key: "flatHeight", value: lastServiceData.flatHeight },
        { key: "flatWidth", value: lastServiceData.flatWidth },
      ];

      let hasUpdates = false;
      fieldsToPreFill.forEach(({ key, value }) => {
        const currentValue = currentValues[key];
        if (
          (!currentValue || currentValue === "") &&
          value != null &&
          value !== ""
        ) {
          const stringValue =
            typeof value === "number" ? String(value) : String(value);
          setValue(key, stringValue, { shouldDirty: false });
          hasUpdates = true;
        }
      });

      if (
        hasUpdates &&
        typeof window !== "undefined" &&
        data?.selectedService?.id
      ) {
        const updatedValues = getValues();
        const storageKey = `recordWorkFormData_${data.selectedService.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedValues));
      }
    };

    const timeoutId = setTimeout(() => {
      preFillLastServiceData();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    data?.selectedService?.lastServiceData,
    getValues,
    setValue,
    data?.selectedService?.id,
  ]);

  useEffect(() => {
    beforeImagesRef.current = beforeImages;
  }, [beforeImages]);

  useEffect(() => {
    afterImagesRef.current = afterImages;
  }, [afterImages]);

  useEffect(() => {
    brokenImagesRef.current = brokenImages;
  }, [brokenImages]);

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

  useEffect(() => {
    const projectorModel = watch("projectorModel");
    if (!projectorModel || lampModelsData.length === 0) {
      setLampModels([]);
      return;
    }

    const matchingProjector = lampModelsData.find(
      (item) =>
        item.projector_model?.toLowerCase() === projectorModel.toLowerCase(),
    );

    if (matchingProjector && Array.isArray(matchingProjector.Models)) {
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
  }, [watch("projectorModel"), lampModelsData]);

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

  useEffect(() => {
    if (isDialogOpen) {
      const currentParts = getValues("recommendedParts") || [];
      if (Array.isArray(currentParts) && currentParts.length > 0) {
        setSelectedPartIds(
          new Set(currentParts.map((p: RecommendedPart) => p.part_number)),
        );
      } else {
        setSelectedPartIds(new Set());
      }

      setPartSearchQuery("");
    }
  }, [isDialogOpen, getValues]);

  const persistImages = (
    before: UploadedImage[],
    after: UploadedImage[],
    broken: UploadedImage[],
  ) => {
    setBeforeImages(before);
    setAfterImages(after);
    setBrokenImages(broken);
    if (typeof window !== "undefined" && data?.selectedService?.id) {
      const storageKey = `recordWorkImages_${data.selectedService.id}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({ before, after, broken }),
      );
    }
  };

  const MAX_MEDIA_SIZE_MB = 100
  const MAX_LOG_SIZE_MB = 200
  const SERVER_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024 // 4 MB - server route limit ~4.5 MB

  const uploadToBlob = async (
    file: File,
    category: "before" | "after" | "broken" | "logs",
  ): Promise<UploadedImage> => {
    let fileToUpload = file
    let folderName = `${category}-media`

    const isVideo =
      file.type.startsWith("video/") ||
      /\.(mp4|mov|m4v|avi|mkv|webm)$/i.test(file.name)

    if (category === "logs") {
      folderName = "projector-logs"
    } else if (!isVideo) {
      // Only compress images; upload videos as-is
      const { compressImage } = await import("@/lib/image-compression")
      const compressedBlob = await compressImage(file, 1200, 1200, 0.8)

      fileToUpload = new File(
        [compressedBlob],
        file.name.replace(/\.[^/.]+$/, ".jpg"),
        { type: "image/jpeg" },
      )
    }

    const useClientUpload =
      isVideo ||
      category === "logs" ||
      fileToUpload.size > SERVER_UPLOAD_LIMIT_BYTES

    if (useClientUpload) {
      const { upload } = await import("@vercel/blob/client")
      const pathname = `${folderName}/${Date.now()}-${fileToUpload.name.replace(/\s+/g, "-")}`

      const blob = await upload(pathname, fileToUpload, {
        access: "public",
        handleUploadUrl: "/api/blob/client-upload",
        clientPayload: JSON.stringify({ folder: folderName }),
      })

      return {
        name: file.name,
        url: blob.url,
        size: (blob as { size?: number }).size ?? fileToUpload.size,
      }
    }

    const formData = new FormData()
    formData.append("file", fileToUpload)
    formData.append("folder", folderName)

    const response = await fetch("/api/blob/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const message = await response
        .json()
        .catch(() => ({ error: "Upload failed" }))
      throw new Error(message.error || "Upload failed")
    }

    const result = await response.json()
    return { name: file.name, url: result.url, size: result.size }
  }

  const handleLogsUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > MAX_LOG_SIZE_MB * 1024 * 1024) {
      setImageError(
        `Log file is too large. Maximum allowed size is ${MAX_LOG_SIZE_MB} MB.`,
      );
      return;
    }

    setUploading(true);
    try {
      if (file) {
        const upload = await uploadToBlob(file, "logs");
        setValue("logs", upload.url, { shouldDirty: true });
        setImageError(null);
      }
    } catch (error) {
      console.error("Logs upload failed:", error);
      setImageError("Failed to upload logs. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (
    type: "before" | "after" | "broken",
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;

    const tooLarge = Array.from(files).find(
      (file) => file.size > MAX_MEDIA_SIZE_MB * 1024 * 1024,
    );
    if (tooLarge) {
      setImageError(
        `One or more files are too large. Maximum allowed size is ${MAX_MEDIA_SIZE_MB} MB per file.`,
      );
      return;
    }

    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map((file) => uploadToBlob(file, type)),
      );
      setImageError(null);

      const nextBefore =
        type === "before"
          ? [...beforeImagesRef.current, ...uploads]
          : beforeImagesRef.current;
      const nextAfter =
        type === "after"
          ? [...afterImagesRef.current, ...uploads]
          : afterImagesRef.current;
      const nextBroken =
        type === "broken"
          ? [...brokenImagesRef.current, ...uploads]
          : brokenImagesRef.current;

      persistImages(nextBefore, nextAfter, nextBroken);
    } catch (error) {
      console.error("Image upload failed:", error);
      setImageError("Failed to upload images. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (
    type: "before" | "after" | "broken",
    index: number,
  ) => {
    if (type === "before") {
      const newImages = [...beforeImages];
      newImages.splice(index, 1);
      persistImages(newImages, afterImages, brokenImages);
    } else if (type === "after") {
      const newImages = [...afterImages];
      newImages.splice(index, 1);
      persistImages(beforeImages, newImages, brokenImages);
    } else {
      const newImages = [...brokenImages];
      newImages.splice(index, 1);
      persistImages(beforeImages, afterImages, newImages);
    }
  };

  const handleResetForm = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Reset all saved data?")
    ) {
      return;
    }
    reset(createInitialFormData());
    setContactName("");
    setContactPhone("");
    persistImages([], [], []);
    setImageError(null);
    if (typeof window !== "undefined" && data?.selectedService?.id) {
      localStorage.removeItem(`recordWorkFormData_${data.selectedService.id}`);
      localStorage.removeItem(`recordWorkImages_${data.selectedService.id}`);
    }
  };

  const projectorModel = watch("projectorModel");
  const filteredParts = partsData.filter((part) => {
    const matchesModel =
      part.projector_model.toLowerCase() === projectorModel?.toLowerCase();
    if (!matchesModel) return false;

    if (!partSearchQuery) return true;

    const searchLower = partSearchQuery.toLowerCase();
    const matchesDescription = part.description
      .toLowerCase()
      .includes(searchLower);
    const matchesPartNumber = part.part_number
      .toLowerCase()
      .includes(searchLower);

    return matchesDescription || matchesPartNumber;
  });

  const handlePartToggle = (part: ProjectorPart) => {
    const newSelectedIds = new Set(selectedPartIds);
    if (newSelectedIds.has(part.part_number)) {
      newSelectedIds.delete(part.part_number);
    } else {
      newSelectedIds.add(part.part_number);
    }
    setSelectedPartIds(newSelectedIds);
  };

  const handleSaveSelectedParts = () => {
    const selectedParts: RecommendedPart[] = filteredParts
      .filter((part) => selectedPartIds.has(part.part_number))
      .map((part) => ({
        part_number: part.part_number,
        description: part.description,
      }));
    setValue("recommendedParts", selectedParts, { shouldDirty: true });
    setIsDialogOpen(false);
  };

  const recommendedParts = watch("recommendedParts") || [];

  const getValidationStatus = (
    field: any,
    value: any,
    allValues: RecordWorkForm,
  ): { status: "normal" | "error" | "warning"; message: string | null } => {
    if (value === undefined || value === null || value === "")
      return { status: "normal", message: null };

    // 1. Specific Rule: Projector Running Hours > Lamp Total Running Hours
    if (field.key === "projectorRunningHours") {
      const lampTotal = Number(allValues.lampTotalRunningHours);
      const projectorHours = Number(value);
      if (
        !isNaN(lampTotal) &&
        !isNaN(projectorHours) &&
        projectorHours <= lampTotal
      ) {
        return {
          status: "error",
          message: "Projector hours must be greater than Lamp Total hours.",
        };
      }
    }

    // 1b. Lamp Total Running Hours cannot exceed Projector Running Hours
    if (field.key === "lampTotalRunningHours") {
      const projectorHours = Number(allValues.projectorRunningHours);
      const lampTotal = Number(value);
      if (
        !isNaN(projectorHours) &&
        !isNaN(lampTotal) &&
        projectorHours > 0 &&
        lampTotal > projectorHours
      ) {
        return {
          status: "error",
          message:
            "Lamp Total hours cannot be more than Projector running hours.",
        };
      }
    }

    // 2. Specific Rule: CFM Value for Projector Models
    if (field.key === "exhaustCfm") {
      const model = allValues.projectorModel?.toUpperCase() || "";
      const numValue = Number(value);

      if (!isNaN(numValue)) {
        if (model.includes("CP2220") || model.includes("CP4220")) {
          if (numValue < 6.6)
            return {
              status: "warning",
              message: "Low CFM (Standard: 6.6 - 7.3)",
            };
          if (numValue > 7.3)
            return {
              status: "warning",
              message: "High CFM (Standard: 6.6 - 7.3)",
            };
        } else if (model.includes("CP2230") || model.includes("CP4230")) {
          if (numValue < 8.8)
            return {
              status: "warning",
              message: "Low CFM (Standard: 8.8 - 9.5)",
            };
          if (numValue > 9.5)
            return {
              status: "warning",
              message: "High CFM (Standard: 8.8 - 9.5)",
            };
        }
      }
    }

    // 3. Specific Rule: FL Value < 10
    if (
      field.key === "flLeft" ||
      field.key === "flRight" ||
      field.key.includes("fl") ||
      field.key.includes("fL")
    ) {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue < 10) {
        return { status: "warning", message: "Low fL value (Standard: >= 10)" };
      }
    }

    // 4. Cross-field validation: White and Black must both be filled if either is filled
    if (field.key === "lightEngineWhite" || field.key === "lightEngineBlack") {
      const whiteValue = allValues.lightEngineWhite;
      const blackValue = allValues.lightEngineBlack;
      const whiteFilled = whiteValue && whiteValue.trim() !== "";
      const blackFilled = blackValue && blackValue.trim() !== "";

      if (field.key === "lightEngineWhite" && whiteFilled && !blackFilled) {
        return {
          status: "error",
          message: "Black must also be selected when White is selected.",
        };
      }

      if (field.key === "lightEngineBlack" && blackFilled && !whiteFilled) {
        return {
          status: "error",
          message: "White must also be selected when Black is selected.",
        };
      }
    }

    // Generic Min/Max Validation (Error)
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      if (field.min !== undefined && numValue < field.min) {
        return {
          status: "error",
          message: `Value must be at least ${field.min}`,
        };
      }
      if (field.max !== undefined && numValue > field.max) {
        return {
          status: "error",
          message: `Value must be at most ${field.max}`,
        };
      }

      // Generic Warning Validation
      if (field.warningMin !== undefined && numValue < field.warningMin) {
        return {
          status: "warning",
          message: `Value is low (Standard: >= ${field.warningMin})`,
        };
      }
      if (field.warningMax !== undefined && numValue > field.warningMax) {
        return {
          status: "warning",
          message: `Value is high (Standard: <= ${field.warningMax})`,
        };
      }
    }

    return { status: "normal", message: null };
  };

  const renderFieldsBySection = (sectionTitle: string) => {
    if (!formConfig || formConfig.length === 0) {
      return null;
    }

    const excludedFields = [
      "screenHeight",
      "screenWidth",
      "flatHeight",
      "flatWidth",
    ];
    const sectionFields = formConfig.filter((f) => {
      if (f.section === sectionTitle) {
        if (
          sectionTitle === "Software & Screen Information" &&
          excludedFields.includes(f.key)
        ) {
          return false;
        }
        return true;
      }
      return false;
    });
    if (sectionFields.length === 0) {
      return null;
    }

    const rows: (typeof sectionFields)[] = [];
    let currentRow: typeof sectionFields = [];

    sectionFields.forEach((field, idx) => {
      currentRow.push(field);

      if (
        currentRow.length >= 2 ||
        field.type === "textarea" ||
        idx === sectionFields.length - 1
      ) {
        rows.push([...currentRow]);
        currentRow = [];
      }
    });

    return (
      <>
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={
              row.length > 1 && row[0]?.type !== "textarea"
                ? "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3"
                : ""
            }
          >
            {row.map((field) => {
              if (!field) return null;

              // Explicit handling for contactDetails - split into name and phone inputs
              if (field.key === "contactDetails") {
                return (
                  <FormField
                    key={field.key}
                    label={field.label}
                    required={field.required}
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={contactName}
                        onChange={(e) => {
                          setContactName(e.target.value);
                        }}
                        placeholder="Mr. Name"
                        className="border-2 border-black text-sm flex-1"
                      />
                      <span className="text-black font-semibold">-</span>
                      <Input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => {
                          setContactPhone(e.target.value);
                        }}
                        placeholder="Phone Number"
                        className="border-2 border-black text-sm flex-1"
                      />
                    </div>
                    {/* Hidden input to maintain form field registration */}
                    <input
                      type="hidden"
                      {...register(field.key as keyof RecordWorkForm)}
                    />
                  </FormField>
                );
              }

              // Explicit handling for exhaustCfm to ensure it's always a number input
              // This must come before any other checks to override incorrect config
              if (field.key === "exhaustCfm") {
                return (
                  <FormField
                    key={field.key}
                    label={field.label}
                    required={field.required}
                  >
                    <Input
                      type="number"
                      step="any"
                      {...register(field.key as keyof RecordWorkForm)}
                      placeholder={field.placeholder || "Enter exhaust CFM"}
                      className="border-2 border-black text-sm"
                    />
                  </FormField>
                );
              }

              // Explicit handling for contactDetails - split into name and phone inputs
              if (field.key === "contactDetails") {
                return (
                  <FormField
                    key={field.key}
                    label={field.label}
                    required={field.required}
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={contactName}
                        onChange={(e) => {
                          setContactName(e.target.value);
                        }}
                        placeholder="Mr. Name"
                        className="border-2 border-black text-sm flex-1"
                      />
                      <span className="text-black font-semibold">-</span>
                      <Input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => {
                          setContactPhone(e.target.value);
                        }}
                        placeholder="Phone Number"
                        className="border-2 border-black text-sm flex-1"
                      />
                    </div>
                    {/* Hidden input to maintain form field registration */}
                    <input
                      type="hidden"
                      {...register(field.key as keyof RecordWorkForm)}
                    />
                  </FormField>
                );
              }

              if (
                field.key === "softwareVersion" &&
                softwareVersions.length > 0
              ) {
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

              if (
                field.key === "contentPlayerModel" &&
                contentPlayers.length > 0
              ) {
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

              // Handle numeric fields with validation
              if (
                field.type === "number" ||
                field.key === "projectorRunningHours" ||
                field.key === "lampTotalRunningHours" ||
                field.key === "lampCurrentRunningHours"
              ) {
                const value = watch(field.key as keyof RecordWorkForm);
                const allValues = watch();
                const validation = getValidationStatus(
                  field,
                  value,
                  allValues as RecordWorkForm,
                );

                const borderColor =
                  validation.status === "error"
                    ? "border-red-600"
                    : validation.status === "warning"
                      ? "border-yellow-500"
                      : "border-black";

                return (
                  <FormField
                    key={field.key}
                    label={field.label}
                    required={field.required}
                  >
                    <DynamicFormField
                      field={field}
                      register={register}
                      watch={watch}
                      setValue={setValue}
                      className={`border-2 ${borderColor} text-sm`}
                    />
                    {validation.message && (
                      <p
                        className={`text-xs mt-1 ${validation.status === "error" ? "text-red-600" : "text-yellow-600 font-medium"}`}
                      >
                        {validation.message}
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
                    watch={watch}
                    setValue={setValue}
                    className="border-2 border-black text-sm"
                  />
                </FormField>
              );
            })}
          </div>
        ))}
      </>
    );
  };

  const onSubmit = (values: RecordWorkForm) => {
    const validationErrors: string[] = [];

    // Check all fields for ERROR status (pass invalid: true, so warnings are ignored)
    if (formConfig && Array.isArray(formConfig)) {
      formConfig.forEach((field) => {
        const value = values[field.key as keyof RecordWorkForm];
        const validation = getValidationStatus(field, value, values);

        if (validation.status === "error" && validation.message) {
          validationErrors.push(`${field.label}: ${validation.message}`);
        }
      });
    }

    // Cross-field validation: White and Black must both be filled if either is filled
    const whiteValue = values.lightEngineWhite;
    const blackValue = values.lightEngineBlack;

    // Check if White is filled (has value)
    const whiteFilled = whiteValue && whiteValue.trim() !== "";
    // Check if Black is filled (has value)
    const blackFilled = blackValue && blackValue.trim() !== "";

    if (whiteFilled && !blackFilled) {
      validationErrors.push(
        "Light Engine Test Pattern: If White is selected, Black must also be selected.",
      );
    }

    if (blackFilled && !whiteFilled) {
      validationErrors.push(
        "Light Engine Test Pattern: If Black is selected, White must also be selected.",
      );
    }

    // Original range check logic is now subsumed by getValidationStatus, but we keep the error collector structure

    if (validationErrors.length > 0) {
      setImageError(validationErrors.join("\n"));
      // Scroll to top or just allow user to see the error message
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Ensure contactDetails is properly formatted before submission
    const combinedContactDetails = combineContactDetails(
      contactName,
      contactPhone,
    );

    const formattedValues = {
      ...values,
      contactDetails: combinedContactDetails,
      exhaustCfm: values.exhaustCfm ? `${values.exhaustCfm} M/S` : "",
    };

    onNext({
      workDetails: formattedValues,
      workImages: {
        images: beforeImages,
        afterImages: afterImages,
        brokenImages: brokenImages,
      },
    });
  };

  useEffect(() => {}, [configLoading, formConfig]);

  if (configLoading && formConfig.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Loading form configuration...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-lg sm:text-xl font-bold text-black mb-2">
        Record Work Details
      </h2>
      <p className="text-sm text-gray-700 mb-4">
        Document work performed, issues found, and component status.
      </p>

      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          onClick={handleResetForm}
          variant="outline"
          className="border-2 border-red-600 text-red-600 hover:bg-red-50 text-sm"
        >
          Reset Form
        </Button>
      </div>

      <div
        className="border-2 border-black p-3 sm:p-4 mb-4 space-y-6"
        key={`form-${formConfig.length}`}
      >
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
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">
              Scope Dimensions
            </p>
            <FormRow>
              <FormField label="Screen Height (m)">
                <Input
                  type="number"
                  step="0.01"
                  {...register("screenHeight")}
                  placeholder="Height"
                  className="border-2 border-black text-sm"
                />
              </FormField>
              <FormField label="Screen Width (m)">
                <Input
                  type="number"
                  step="0.01"
                  {...register("screenWidth")}
                  placeholder="Width"
                  className="border-2 border-black text-sm"
                />
              </FormField>
            </FormRow>
          </div>
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">
              Flat Dimensions
            </p>
            <FormRow>
              <FormField label="Flat Height (m)">
                <Input
                  type="number"
                  step="0.01"
                  {...register("flatHeight")}
                  placeholder="Height"
                  className="border-2 border-black text-sm"
                />
              </FormField>
              <FormField label="Flat Width (m)">
                <Input
                  type="number"
                  step="0.01"
                  {...register("flatWidth")}
                  placeholder="Width"
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
              <p className="font-semibold text-black text-sm mb-2">{name}</p>
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  2K Values
                </p>
                <FormRow>
                  <FormField label="X">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[0] as keyof RecordWorkForm)}
                      placeholder="X"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                  <FormField label="Y">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[1] as keyof RecordWorkForm)}
                      placeholder="Y"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                  <FormField label="fL">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[2] as keyof RecordWorkForm)}
                      placeholder="fL"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                </FormRow>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  4K Values
                </p>
                <FormRow>
                  <FormField label="X">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[3] as keyof RecordWorkForm)}
                      placeholder="X"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                  <FormField label="Y">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[4] as keyof RecordWorkForm)}
                      placeholder="Y"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                  <FormField label="fL">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[5] as keyof RecordWorkForm)}
                      placeholder="fL"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                </FormRow>
              </div>
            </div>
          ))}
        </FormSection>

        <FormSection title="Color Accuracy - CIE XYZ">
          <div className="mb-4">
            <p className="font-semibold text-black text-sm mb-2">BW Step 10</p>
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">
                2K Values
              </p>
              <FormRow>
                <FormField label="X">
                  <Input
                    type="number"
                    step="0.001"
                    {...register("BW_Step_10_2Kx")}
                    placeholder="X"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
                <FormField label="Y">
                  <Input
                    type="number"
                    step="0.001"
                    {...register("BW_Step_10_2Ky")}
                    placeholder="Y"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
                <FormField label="fL">
                  <Input
                    type="number"
                    step="0.001"
                    {...register("BW_Step_10_2Kfl")}
                    placeholder="fL"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
              </FormRow>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">
                4K Values
              </p>
              <FormRow>
                <FormField label="X">
                  <Input
                    type="number"
                    step="0.001"
                    {...register("BW_Step_10_4Kx")}
                    placeholder="X"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
                <FormField label="Y">
                  <Input
                    type="number"
                    step="0.001"
                    {...register("BW_Step_10_4Ky")}
                    placeholder="Y"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
                <FormField label="fL">
                  <Input
                    type="number"
                    step="0.001"
                    {...register("BW_Step_10_4Kfl")}
                    placeholder="fL"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
              </FormRow>
            </div>
          </div>
        </FormSection>

        <FormSection title="Image Evaluation">
          {renderFieldsBySection("Image Evaluation")}
        </FormSection>

        <FormSection title="Air Pollution Data">
          {renderFieldsBySection("Air Pollution Data")}
        </FormSection>

        <FormSection title="Recommended Parts">
          <div className="space-y-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
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
                {projectorModel && (
                  <div className="pb-2">
                    <Input
                      type="text"
                      placeholder="Search by part name or number..."
                      value={partSearchQuery}
                      onChange={(e) => setPartSearchQuery(e.target.value)}
                      className="border-2 border-gray-300 focus:border-black text-sm"
                    />
                  </div>
                )}
                <div className="flex-1 overflow-y-auto px-1">
                  {!projectorModel ? (
                    <p className="text-sm text-gray-600 py-4">
                      Please enter a projector model in the form above to view
                      available parts.
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
                    onClick={() => setIsDialogOpen(false)}
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
                  {recommendedParts.map(
                    (part: RecommendedPart, index: number) => (
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
                    ),
                  )}
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

        <FormSection title="Remarks">
          {renderFieldsBySection("Remarks")}
        </FormSection>

        <FormSection title="Service Images">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-sm text-black mb-2">
                Before Media (Images / Videos, Optional)
              </p>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => handleImageUpload("before", e.target.files)}
                className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50 disabled:opacity-50"
                disabled={uploading}
              />
              {beforeImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {beforeImages.map((file, index) => (
                    <div
                      key={`before-${index}`}
                      className="relative border border-gray-200 p-1 group"
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("before", index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        ✕
                      </button>
                      <p className="text-[11px] text-gray-600 truncate mt-1">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold text-sm text-black mb-2">
                After Media (Images / Videos, Optional)
              </p>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => handleImageUpload("after", e.target.files)}
                className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50"
              />
              {afterImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {afterImages.map((file, index) => (
                    <div
                      key={`after-${index}`}
                      className="relative border border-gray-200 p-1 group"
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("after", index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        ✕
                      </button>
                      <p className="text-[11px] text-gray-600 truncate mt-1">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold text-sm text-black mb-2">
                Broken Parts Media (Images / Videos, Optional)
              </p>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => handleImageUpload("broken", e.target.files)}
                className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50 disabled:opacity-50"
                disabled={uploading}
              />
              {brokenImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {brokenImages.map((file, index) => (
                    <div
                      key={`broken-${index}`}
                      className="relative border border-gray-200 p-1 group"
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("broken", index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        ✕
                      </button>
                      <p className="text-[11px] text-gray-600 truncate mt-1">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold text-sm text-black mb-2">
                Projector Logs (Zip/Folder)
              </p>
              {!watch("logs") && (
                <input
                  type="file"
                  accept=".zip,.rar,.7z"
                  onChange={(e) => handleLogsUpload(e.target.files)}
                  className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50 disabled:opacity-50"
                  disabled={uploading}
                />
              )}
              {watch("logs") && (
                <div className="mt-2 p-2 border-2 border-black bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-medium truncate flex-1">
                    Logs Uploaded
                  </span>
                  <button
                    type="button"
                    onClick={() => setValue("logs", "", { shouldDirty: true })}
                    className="text-red-500 text-xs font-bold ml-2 cursor-pointer hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          {imageError && (
            <p className="text-sm text-red-600 mt-2 font-semibold">
              {imageError}
            </p>
          )}
          {uploading && (
            <p className="text-xs text-blue-600 mt-2 font-semibold animate-pulse">
              Uploading file(s), please wait...
            </p>
          )}
        </FormSection>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="border-2 border-black text-black hover:bg-gray-100 flex-1"
          disabled={uploading}
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={uploading}
          className="bg-black text-white hover:bg-gray-800 border-2 border-black font-bold flex-1 disabled:opacity-50"
        >
          {uploading ? "Wait for Uploads..." : "Continue to Signatures"}
        </Button>
      </div>
    </form>
  );
}
