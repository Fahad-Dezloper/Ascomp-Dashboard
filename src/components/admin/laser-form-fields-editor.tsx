"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronRight, Save, Check } from "lucide-react";

export type LaserFieldConfig = {
  options?: string[];
  subOptions?: Record<string, string[]>;
  subOptionsInput?: Record<string, boolean>;
  defaultValue?: string;
};

export type LaserFieldOptions = Record<string, LaserFieldConfig>;

export type LaserFieldDef = {
  key: string;
  label: string;
  section: string;
};

export const LASER_FIELD_DEFS: LaserFieldDef[] = [
  { key: "reflector",         label: "Diffuser",              section: "Opticals" },
  { key: "uvFilter",          label: "Coupling Fold Mirror",  section: "Opticals" },
  { key: "integratorRod",     label: "Rotating Integrator",   section: "Opticals" },
  { key: "coldMirror",        label: "Short Integrator",      section: "Opticals" },
  { key: "foldMirror",        label: "Coupling Elbow",        section: "Opticals" },
  { key: "touchPanel",        label: "F Main Board",          section: "Electronics" },
  { key: "evbBoard",          label: "HUB-NX Board",          section: "Electronics" },
  { key: "ImcbBoard",         label: "HKBB-Board",            section: "Electronics" },
  { key: "pibBoard",          label: "DTSM Board",            section: "Electronics" },
  { key: "AirIntakeLadRad",   label: "Filter + RAD Filter",   section: "Disposable Consumables" },
  { key: "acBlowerVane",      label: "LE Pump",               section: "Mechanical" },
  { key: "extractorVane",     label: "LOS Pump",              section: "Mechanical" },
  { key: "exhaustCfm",        label: "Radiator Fan",          section: "Mechanical" },
  { key: "lightEngineFans",   label: "Exhaust Fan",           section: "Mechanical" },
  { key: "cardCageFans",      label: "LE intake Fan",         section: "Mechanical" },
  { key: "radiatorFanPump",   label: "LE Blower",             section: "Mechanical" },
  { key: "pumpConnectorHose", label: "Shutter",               section: "Mechanical" },
];

const SECTIONS = [...new Set(LASER_FIELD_DEFS.map((f) => f.section))];

const INPUT_COMPACT = "px-2 py-0.5";
const SELECT_TRIGGER_CLASS =
  "h-7 text-xs font-medium rounded-md border-border/70 bg-muted/30 hover:bg-muted/50 transition-colors data-[state=open]:bg-muted/50";
const SELECT_CONTENT_CLASS = "rounded-lg border-border/80 shadow-lg py-1";

type Props = {
  options: LaserFieldOptions;
  onChange: (options: LaserFieldOptions) => void;
  onSave?: () => Promise<void>;
};

export function LaserFormFieldsEditor({ options, onChange, onSave }: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSubOptions, setExpandedSubOptions] = useState<Set<string>>(new Set());
  const [newOption, setNewOption] = useState<Record<string, string>>({});
  const [newSubOption, setNewSubOption] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleSection = (section: string) =>
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });

  const toggleSubExpand = (compositeKey: string) =>
    setExpandedSubOptions((prev) => {
      const next = new Set(prev);
      next.has(compositeKey) ? next.delete(compositeKey) : next.add(compositeKey);
      return next;
    });

  const getFieldConfig = (key: string): LaserFieldConfig =>
    options[key] || {};

  const updateField = (key: string, updates: Partial<LaserFieldConfig>) => {
    onChange({ ...options, [key]: { ...getFieldConfig(key), ...updates } });
  };

  // ─── option CRUD ────────────────────────────────────────────────────────────
  const addOption = (fieldKey: string) => {
    const draft = (newOption[fieldKey] || "").trim();
    if (!draft) return;
    const cfg = getFieldConfig(fieldKey);
    const current = cfg.options || [];
    if (current.map((o) => o.toLowerCase()).includes(draft.toLowerCase())) {
      setNewOption((d) => ({ ...d, [fieldKey]: "" }));
      return;
    }
    updateField(fieldKey, { options: [...current, draft] });
    setNewOption((d) => ({ ...d, [fieldKey]: "" }));
  };

  const removeOption = (fieldKey: string, idx: number) => {
    const cfg = getFieldConfig(fieldKey);
    const current = cfg.options || [];
    const removed = current[idx] ?? "";
    const newOpts = current.filter((_, i) => i !== idx);
    const newSub = { ...(cfg.subOptions || {}) };
    if (removed) delete newSub[removed];
    const newSubIn = { ...(cfg.subOptionsInput || {}) };
    if (removed) delete newSubIn[removed];
    updateField(fieldKey, {
      options: newOpts,
      subOptions: Object.keys(newSub).length ? newSub : undefined,
      subOptionsInput: Object.keys(newSubIn).length ? newSubIn : undefined,
      defaultValue: cfg.defaultValue === removed ? undefined : cfg.defaultValue,
    });
  };

  const renameOption = (fieldKey: string, idx: number, newVal: string) => {
    const cfg = getFieldConfig(fieldKey);
    const current = [...(cfg.options || [])];
    const oldVal = current[idx];
    current[idx] = newVal;
    const newSub = { ...(cfg.subOptions || {}) };
    const newSubIn = { ...(cfg.subOptionsInput || {}) };
    if (oldVal && oldVal !== newVal) {
      if (newSub[oldVal]) { newSub[newVal] = newSub[oldVal]; delete newSub[oldVal]; }
      if (newSubIn[oldVal] !== undefined) { newSubIn[newVal] = newSubIn[oldVal]; delete newSubIn[oldVal]; }
    }
    updateField(fieldKey, {
      options: current,
      subOptions: Object.keys(newSub).length ? newSub : undefined,
      subOptionsInput: Object.keys(newSubIn).length ? newSubIn : undefined,
    });
  };

  // ─── sub-option CRUD ─────────────────────────────────────────────────────────
  const compositeKey = (fieldKey: string, opt: string) => `${fieldKey}:${opt}`;

  const addSubOption = (fieldKey: string, parentOpt: string) => {
    const ck = compositeKey(fieldKey, parentOpt);
    const draft = (newSubOption[ck] || "").trim();
    if (!draft) return;
    const cfg = getFieldConfig(fieldKey);
    const subs = { ...(cfg.subOptions || {}), [parentOpt]: [...(cfg.subOptions?.[parentOpt] || []), draft] };
    updateField(fieldKey, { subOptions: subs });
    setNewSubOption((d) => ({ ...d, [ck]: "" }));
  };

  const removeSubOption = (fieldKey: string, parentOpt: string, subIdx: number) => {
    const cfg = getFieldConfig(fieldKey);
    const subs = { ...(cfg.subOptions || {}) };
    subs[parentOpt] = (subs[parentOpt] || []).filter((_, i) => i !== subIdx);
    if (!subs[parentOpt].length) delete subs[parentOpt];
    updateField(fieldKey, { subOptions: Object.keys(subs).length ? subs : undefined });
  };

  const renameSubOption = (fieldKey: string, parentOpt: string, subIdx: number, newVal: string) => {
    const cfg = getFieldConfig(fieldKey);
    const subs = { ...(cfg.subOptions || {}) };
    const arr = [...(subs[parentOpt] || [])];
    arr[subIdx] = newVal;
    subs[parentOpt] = arr;
    updateField(fieldKey, { subOptions: subs });
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border/60 bg-card shadow-sm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="py-2.5 px-4 border-b border-border/50 bg-muted/20 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-foreground tracking-tight text-sm">
            Laser Report Fields
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xl">
            Configure dropdown options for each laser-specific checklist field. These replace
            the standard options when the projector is a laser model.
          </p>
        </div>
        {onSave && (
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs shrink-0 bg-black text-white hover:bg-gray-800"
            onClick={handleSave}
            disabled={saving}
          >
            {saved ? (
              <><Check className="h-3 w-3 mr-1" />Saved!</>
            ) : (
              <><Save className="h-3 w-3 mr-1" />{saving ? "Saving…" : "Save laser fields"}</>
            )}
          </Button>
        )}
      </div>

      {/* Sections */}
      <div className="divide-y divide-border/40">
        {SECTIONS.map((section) => {
          const fields = LASER_FIELD_DEFS.filter((f) => f.section === section);
          const isOpen = expandedSections.has(section);
          return (
            <div key={section}>
              {/* Section toggle */}
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
                onClick={() => toggleSection(section)}
              >
                <span>{section}</span>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-2 grid grid-cols-1 gap-3 bg-muted/10">
                  {fields.map((fieldDef) => {
                    const cfg = getFieldConfig(fieldDef.key);
                    const opts = cfg.options || [];

                    return (
                      <div
                        key={fieldDef.key}
                        className="rounded-md border border-border/60 bg-white p-2 shadow-sm flex flex-col md:col-span-full"
                      >
                        {/* Label row (read-only label + Dropdown badge) */}
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex-1 min-w-0 px-2 py-0.5 rounded text-xs font-medium bg-muted/30 border border-border/60 text-foreground truncate">
                            {fieldDef.label}
                            <span className="ml-1.5 text-[10px] text-muted-foreground font-normal font-mono">
                              ({fieldDef.key})
                            </span>
                          </div>
                          <div className={`${SELECT_TRIGGER_CLASS} h-7 min-w-[90px] shrink-0 flex items-center justify-center rounded-md border px-2 text-xs font-medium`}>
                            Dropdown
                          </div>
                        </div>

                        {/* Options section */}
                        <div className="mt-1 pt-1 border-t border-border/40">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                              Options
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-muted-foreground">Default:</span>
                              <Select
                                value={cfg.defaultValue || "__none__"}
                                onValueChange={(v) =>
                                  updateField(fieldDef.key, {
                                    defaultValue: v === "__none__" ? undefined : v,
                                  })
                                }
                              >
                                <SelectTrigger className={`${SELECT_TRIGGER_CLASS} h-6 min-w-[90px]`}>
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent className={SELECT_CONTENT_CLASS}>
                                  <SelectItem value="__none__" className="text-xs py-1.5 text-muted-foreground">
                                    None
                                  </SelectItem>
                                  {opts.map((opt) => (
                                    <SelectItem key={opt} value={opt} className="text-xs py-1.5">
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {opts.map((option, idx) => {
                              const ck = compositeKey(fieldDef.key, option);
                              const isExpanded = expandedSubOptions.has(ck);
                              const subOpts = cfg.subOptions?.[option] || [];
                              const hasSubOpts = subOpts.length > 0;

                              return (
                                <div key={idx} className="group">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={option}
                                      onChange={(e) => renameOption(fieldDef.key, idx, e.target.value)}
                                      className={`py-4 text-xs border-border/60 flex-1 rounded bg-white ${INPUT_COMPACT}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleSubExpand(ck)}
                                      className={`rounded shrink-0 ${hasSubOpts ? "border-primary/50 text-primary" : "border-border/60 text-muted-foreground"}`}
                                    >
                                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeOption(fieldDef.key, idx)}
                                      className="rounded shrink-0 border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>

                                  {isExpanded && (
                                    <div className="ml-2 pl-2 border-l border-border/50 space-y-0.5 py-0.5">
                                      <p className="text-[9px] text-muted-foreground">
                                        Sub for &ldquo;{option}&rdquo;
                                      </p>
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={cfg.subOptionsInput?.[option] || false}
                                          onChange={(e) => {
                                            const curr = { ...(cfg.subOptionsInput || {}) };
                                            if (e.target.checked) curr[option] = true;
                                            else delete curr[option];
                                            updateField(fieldDef.key, {
                                              subOptionsInput: Object.keys(curr).length ? curr : undefined,
                                            });
                                          }}
                                          className="w-3 h-3 rounded border-border"
                                        />
                                        <span className="text-[10px] text-muted-foreground">Custom input</span>
                                      </label>
                                      {subOpts.map((subOpt, subIdx) => (
                                        <div key={subIdx} className="flex items-center gap-1">
                                          <Input
                                            value={subOpt}
                                            onChange={(e) =>
                                              renameSubOption(fieldDef.key, option, subIdx, e.target.value)
                                            }
                                            className={`h-5 text-[11px] border-border/60 flex-1 rounded ${INPUT_COMPACT}`}
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSubOption(fieldDef.key, option, subIdx)}
                                            className="h-5 w-5 p-0 rounded text-muted-foreground hover:text-destructive"
                                          >
                                            <Trash2 className="h-2 w-2" />
                                          </Button>
                                        </div>
                                      ))}
                                      <div className="flex items-center gap-1">
                                        <Input
                                          value={newSubOption[ck] || ""}
                                          onChange={(e) =>
                                            setNewSubOption((d) => ({ ...d, [ck]: e.target.value }))
                                          }
                                          placeholder="Add sub..."
                                          className={`h-5 text-[11px] border-border/60 flex-1 rounded ${INPUT_COMPACT}`}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              addSubOption(fieldDef.key, option);
                                            }
                                          }}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => addSubOption(fieldDef.key, option)}
                                          className="h-5 w-5 p-0 rounded"
                                        >
                                          <Plus className="h-2 w-2" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Add option row */}
                            <div className="flex items-center gap-1 pt-0.5">
                              <Input
                                value={newOption[fieldDef.key] || ""}
                                onChange={(e) =>
                                  setNewOption((d) => ({ ...d, [fieldDef.key]: e.target.value }))
                                }
                                placeholder="Add option..."
                                className={`h-6 text-xs border-dashed border-border/60 flex-1 rounded ${INPUT_COMPACT}`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addOption(fieldDef.key);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(fieldDef.key)}
                                className="h-6 px-2 rounded shrink-0 text-xs"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
