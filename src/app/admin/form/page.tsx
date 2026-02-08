"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save } from "lucide-react";

type FieldType =
  | "text"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "checkbox";

type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  section?: string;
  defaultValue?: string;
  min?: number;
  max?: number;
  warningMin?: number;
  warningMax?: number;
};

const FORM_SECTIONS = [
  "Cinema Details",
  "Projector Information",
  "Opticals",
  "Electronics",
  "Serial Number Verified",
  "Disposable Consumables",
  "Coolant",
  "Light Engine Test Pattern",
  "Mechanical",
  "Software & Screen Information",
  "Lamp Information",
  "Voltage Parameters",
  "fL Measurements",
  "Content Player & AC Status",
  "Color Accuracy - MCGD",
  "Color Accuracy - CIE XYZ",
  "Image Evaluation",
  "Air Pollution Data",
  "Recommended Parts",
  "Remarks",
  "Service Images",
];

const getInitialFieldConfigs = (): FieldConfig[] => {
  return [
    // Cinema Details
    {
      key: "cinemaName",
      label: "Cinema Name",
      type: "text",
      required: true,
      section: "Cinema Details",
    },
    {
      key: "date",
      label: "Date",
      type: "date",
      required: true,
      section: "Cinema Details",
    },
    {
      key: "address",
      label: "Address",
      type: "textarea",
      required: true,
      section: "Cinema Details",
    },
    {
      key: "contactDetails",
      label: "Contact Details",
      type: "text",
      section: "Cinema Details",
    },
    {
      key: "screenNumber",
      label: "Screen No",
      type: "number",
      section: "Cinema Details",
    },
    {
      key: "serviceVisitType",
      label: "Service Visit Type",
      type: "select",
      section: "Cinema Details",
      options: ["1", "2", "3", "4", "5", "6", "special"],
    },
    // Projector Information
    {
      key: "projectorModel",
      label: "Projector Model",
      type: "text",
      required: true,
      section: "Projector Information",
    },
    {
      key: "projectorSerialNumber",
      label: "Serial Number",
      type: "text",
      required: true,
      section: "Projector Information",
    },
    {
      key: "projectorRunningHours",
      label: "Running Hours",
      type: "number",
      required: true,
      section: "Projector Information",
    },
    // Opticals
    {
      key: "reflector",
      label: "Reflector",
      type: "select",
      section: "Opticals",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "uvFilter",
      label: "UV Filter",
      type: "select",
      section: "Opticals",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "integratorRod",
      label: "Integrator Rod",
      type: "select",
      section: "Opticals",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "coldMirror",
      label: "Cold Mirror",
      type: "select",
      section: "Opticals",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "foldMirror",
      label: "Fold Mirror",
      type: "select",
      section: "Opticals",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    // Electronics
    {
      key: "touchPanel",
      label: "Touch Panel",
      type: "select",
      section: "Electronics",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "evbBoard",
      label: "EVB Board",
      type: "select",
      section: "Electronics",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "ImcbBoard",
      label: "IMCB Board",
      type: "select",
      section: "Electronics",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "pibBoard",
      label: "PIB Board",
      type: "select",
      section: "Electronics",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "IcpBoard",
      label: "ICP Board",
      type: "select",
      section: "Electronics",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "imbSBoard",
      label: "IMB/S Board",
      type: "select",
      section: "Electronics",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    // Mechanical
    {
      key: "acBlowerVane",
      label: "AC Blower Vane",
      type: "select",
      section: "Mechanical",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "extractorVane",
      label: "Extractor Vane",
      type: "select",
      section: "Mechanical",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "lightEngineFans",
      label: "Light Engine Fans",
      type: "select",
      section: "Mechanical",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "cardCageFans",
      label: "Card Cage Fans",
      type: "select",
      section: "Mechanical",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "radiatorFanPump",
      label: "Radiator Fan Pump",
      type: "select",
      section: "Mechanical",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "pumpConnectorHose",
      label: "Pump Connector & Hose",
      type: "select",
      section: "Mechanical",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "securityLampHouseLock",
      label: "Security & Lamp Lock",
      type: "select",
      section: "Mechanical",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "lampLocMechanism",
      label: "Lamp LOC Mechanism",
      type: "select",
      section: "Mechanical",
      options: ["OK", "YES"],
      defaultValue: "OK",
    },
    {
      key: "exhaustCfm",
      label: "Exhaust CFM (M/s)",
      type: "number",
      section: "Mechanical",
    },
    {
      key: "projectorPlacementEnvironment",
      label: "Projector Placement & Environment",
      type: "textarea",
      section: "Mechanical",
    },
    // Software & Screen Information
    {
      key: "softwareVersion",
      label: "Software Version",
      type: "select",
      section: "Software & Screen Information",
    },
    {
      key: "screenHeight",
      label: "Screen Height (m)",
      type: "number",
      section: "Software & Screen Information",
    },
    {
      key: "screenWidth",
      label: "Screen Width (m)",
      type: "number",
      section: "Software & Screen Information",
    },
    {
      key: "flatHeight",
      label: "Flat Height (m)",
      type: "number",
      section: "Software & Screen Information",
    },
    {
      key: "flatWidth",
      label: "Flat Width (m)",
      type: "number",
      section: "Software & Screen Information",
    },
    {
      key: "screenGain",
      label: "Screen Gain",
      type: "number",
      section: "Software & Screen Information",
    },
    {
      key: "screenMake",
      label: "Screen Make",
      type: "text",
      section: "Software & Screen Information",
    },
    {
      key: "throwDistance",
      label: "Throw Distance (m)",
      type: "number",
      section: "Software & Screen Information",
    },
    // Lamp Information
    {
      key: "lampMakeModel",
      label: "Lamp Make & Model",
      type: "select",
      section: "Lamp Information",
    },
    {
      key: "lampTotalRunningHours",
      label: "Total Running Hours",
      type: "number",
      section: "Lamp Information",
    },
    {
      key: "lampCurrentRunningHours",
      label: "Current Running Hours",
      type: "number",
      section: "Lamp Information",
    },
    // Voltage Parameters
    {
      key: "pvVsN",
      label: "P vs N",
      type: "number",
      section: "Voltage Parameters",
    },
    {
      key: "pvVsE",
      label: "P vs E",
      type: "number",
      section: "Voltage Parameters",
    },
    {
      key: "nvVsE",
      label: "N vs E",
      type: "number",
      section: "Voltage Parameters",
    },
    // fL Measurements
    {
      key: "flLeft",
      label: "Before",
      type: "number",
      section: "fL Measurements",
    },
    {
      key: "flRight",
      label: "After",
      type: "number",
      section: "fL Measurements",
    },
    // Content Player & AC Status
    {
      key: "contentPlayerModel",
      label: "Content Player Model",
      type: "select",
      section: "Content Player & AC Status",
    },
    {
      key: "acStatus",
      label: "AC Status",
      type: "select",
      section: "Content Player & AC Status",
      options: ["Working", "Not Working", "Not Available"],
    },
    {
      key: "leStatus",
      label: "LE Status",
      type: "select",
      section: "Content Player & AC Status",
      options: ["Removed", "Not removed – Good fL", "Not removed – De-bonded"],
    },
    // Image Evaluation
    {
      key: "focusBoresight",
      label: "Focus/Boresight OK",
      type: "select",
      section: "Image Evaluation",
      options: ["OK", "YES"],
    },
    {
      key: "integratorPosition",
      label: "Integrator Position OK",
      type: "select",
      section: "Image Evaluation",
      options: ["OK", "YES"],
    },
    {
      key: "spotsOnScreen",
      label: "Spots on Screen OK",
      type: "select",
      section: "Image Evaluation",
      options: ["OK", "YES"],
    },
    {
      key: "screenCroppingOk",
      label: "Screen Cropping OK",
      type: "select",
      section: "Image Evaluation",
      options: ["OK", "YES"],
    },
    {
      key: "convergenceOk",
      label: "Convergence OK",
      type: "select",
      section: "Image Evaluation",
      options: ["OK", "YES"],
    },
    {
      key: "channelsCheckedOk",
      label: "Channels Checked OK",
      type: "select",
      section: "Image Evaluation",
      options: ["OK", "YES"],
    },
    {
      key: "pixelDefects",
      label: "Pixel Defects",
      type: "select",
      section: "Image Evaluation",
      options: ["OK", "YES"],
    },
    {
      key: "imageVibration",
      label: "Image Vibration",
      type: "select",
      section: "Image Evaluation",
      options: ["OK", "YES"],
    },
    {
      key: "liteloc",
      label: "LiteLOC Status",
      type: "select",
      section: "Image Evaluation",
      options: ["OK", "YES"],
    },
    // Air Pollution Data
    {
      key: "hcho",
      label: "HCHO",
      type: "number",
      section: "Air Pollution Data",
    },
    {
      key: "tvoc",
      label: "TVOC",
      type: "number",
      section: "Air Pollution Data",
    },
    { key: "pm1", label: "PM1", type: "number", section: "Air Pollution Data" },
    {
      key: "pm2_5",
      label: "PM2.5",
      type: "number",
      section: "Air Pollution Data",
    },
    {
      key: "pm10",
      label: "PM10",
      type: "number",
      section: "Air Pollution Data",
    },
    {
      key: "temperature",
      label: "Temperature (°C)",
      type: "number",
      section: "Air Pollution Data",
    },
    {
      key: "humidity",
      label: "Humidity (%)",
      type: "number",
      section: "Air Pollution Data",
    },
    {
      key: "airPollutionLevel",
      label: "Air Pollution Level",
      type: "text",
      section: "Air Pollution Data",
    },
    // Remarks
    { key: "remarks", label: "Remarks", type: "textarea", section: "Remarks" },
    {
      key: "lightEngineSerialNumber",
      label: "Light Engine Serial Number",
      type: "text",
      section: "Remarks",
    },
  ];
};

export default function FormBuilderPage() {
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>(
    getInitialFieldConfigs(),
  );
  const [newOption, setNewOption] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/admin/form-config", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (
            data.config &&
            Array.isArray(data.config) &&
            data.config.length > 0
          ) {
            setFieldConfigs(data.config);
          }
        }
      } catch (error) {
        console.error("Failed to load form config:", error);
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async () => {
    console.log("saveConfig called with", fieldConfigs.length, "fields");
    console.log(
      "Sample field:",
      fieldConfigs.find((f) => f.key === "serviceVisitType"),
    );

    try {
      const payload = { config: fieldConfigs };
      console.log(
        "Sending payload:",
        JSON.stringify(payload).substring(0, 200) + "...",
      );

      const res = await fetch("/api/admin/form-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      console.log("Response status:", res.status, res.statusText);

      if (res.ok) {
        const result = await res.json();
        console.log("Config saved successfully:", result);
        alert(
          `Form configuration saved successfully! ${result.savedFields || fieldConfigs.length} fields saved.`,
        );
      } else {
        const errorText = await res.text();
        console.error("Failed to save config - Response:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        alert(
          `Failed to save: ${errorData.error || "Unknown error"}\nDetails: ${errorData.details || "No details provided"}`,
        );
      }
    } catch (error) {
      console.error("Failed to save form config - Exception:", error);
      alert(
        `Failed to save form configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const updateField = (key: string, updates: Partial<FieldConfig>) => {
    setFieldConfigs((prev) =>
      prev.map((field) =>
        field.key === key ? { ...field, ...updates } : field,
      ),
    );
  };

  const addOption = (fieldKey: string) => {
    const option = newOption[fieldKey]?.trim();
    if (!option) return;

    updateField(fieldKey, {
      options: [
        ...(fieldConfigs.find((f) => f.key === fieldKey)?.options || []),
        option,
      ],
    });
    setNewOption((prev) => ({ ...prev, [fieldKey]: "" }));
  };

  const removeOption = (fieldKey: string, optionIndex: number) => {
    const field = fieldConfigs.find((f) => f.key === fieldKey);
    if (!field?.options) return;

    updateField(fieldKey, {
      options: field.options.filter((_, i) => i !== optionIndex),
    });
  };

  const fieldsBySection = fieldConfigs.reduce(
    (acc, field) => {
      const section = field.section || "Other";
      if (!acc[section]) acc[section] = [];
      acc[section].push(field);
      return acc;
    },
    {} as Record<string, FieldConfig[]>,
  );

  return (
    <div className="min-h-screen bg-white p-6 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black">Form Builder</h1>
            <p className="text-gray-600 mt-2">
              Customize form fields, types, and dropdown options
            </p>
          </div>
          <Button
            onClick={saveConfig}
            className="bg-black text-white hover:bg-gray-800"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>

        <div className="space-y-6">
          {FORM_SECTIONS.map((section) => {
            const fields = fieldsBySection[section] || [];
            if (fields.length === 0) return null;

            return (
              <Card key={section} className="border-2 border-black">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-black">
                    {section}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      className="border border-gray-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Label className="font-semibold text-black">
                            {field.label}
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Field: {field.key}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={field.type}
                            onValueChange={(value) =>
                              updateField(field.key, {
                                type: value as FieldType,
                              })
                            }
                          >
                            <SelectTrigger className="w-40 border-2 border-black">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text Input</SelectItem>
                              <SelectItem value="number">
                                Number Input
                              </SelectItem>
                              <SelectItem value="date">Date Input</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="select">Dropdown</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600">Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              updateField(field.key, { label: e.target.value })
                            }
                            className="border-2 border-black text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">
                            Placeholder
                          </Label>
                          <Input
                            value={field.placeholder || ""}
                            onChange={(e) =>
                              updateField(field.key, {
                                placeholder: e.target.value,
                              })
                            }
                            className="border-2 border-black text-sm"
                            placeholder="Optional placeholder"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={(e) =>
                            updateField(field.key, {
                              required: e.target.checked,
                            })
                          }
                          className="border-2 border-black"
                        />
                        <Label className="text-sm">Required field</Label>
                      </div>

                      {field.type === "select" && (
                        <div className="border-t pt-3 space-y-2">
                          <Label className="text-sm font-semibold">
                            Dropdown Options
                          </Label>
                          <div className="space-y-2">
                            {field.options?.map((option, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <Input
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [
                                      ...(field.options || []),
                                    ];
                                    newOptions[idx] = e.target.value;
                                    updateField(field.key, {
                                      options: newOptions,
                                    });
                                  }}
                                  className="border-2 border-black text-sm flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeOption(field.key, idx)}
                                  className="border-red-600 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex items-center gap-2">
                              <Input
                                value={newOption[field.key] || ""}
                                onChange={(e) =>
                                  setNewOption((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                placeholder="Add new option"
                                className="border-2 border-black text-sm flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addOption(field.key);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(field.key)}
                                className="border-black"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {field.type === "number" && (
                        <div className="grid grid-cols-2 gap-3 border-t pt-3">
                          <div>
                            <Label className="text-xs text-gray-600">
                              Min Value
                            </Label>
                            <Input
                              type="number"
                              value={field.min ?? ""}
                              onChange={(e) =>
                                updateField(field.key, {
                                  min: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                })
                              }
                              className="border-2 border-black text-sm"
                              placeholder="No min limit"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">
                              Max Value
                            </Label>
                            <Input
                              type="number"
                              value={field.max ?? ""}
                              onChange={(e) =>
                                updateField(field.key, {
                                  max: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                })
                              }
                              className="border-2 border-black text-sm"
                              placeholder="No max limit"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">
                              Warning Below
                            </Label>
                            <Input
                              type="number"
                              value={field.warningMin ?? ""}
                              onChange={(e) =>
                                updateField(field.key, {
                                  warningMin: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                })
                              }
                              className="border-2 border-black text-sm"
                              placeholder="Warn if below"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">
                              Warning Above
                            </Label>
                            <Input
                              type="number"
                              value={field.warningMax ?? ""}
                              onChange={(e) =>
                                updateField(field.key, {
                                  warningMax: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                })
                              }
                              className="border-2 border-black text-sm"
                              placeholder="Warn if above"
                            />
                          </div>
                        </div>
                      )}

                      {field.type === "select" && field.defaultValue && (
                        <div>
                          <Label className="text-xs text-gray-600">
                            Default Value
                          </Label>
                          <Select
                            value={field.defaultValue}
                            onValueChange={(value) =>
                              updateField(field.key, { defaultValue: value })
                            }
                          >
                            <SelectTrigger className="border-2 border-black text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
