"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { X, Save, Check } from "lucide-react";
import {
  sanitizeLaserProjectorModels,
  normalizeProjectorModelKey,
} from "@/lib/laser-projector-models";

type Props = {
  models: string[];
  onChange: (models: string[]) => void;
  onSave?: () => Promise<void>;
  compact?: boolean;
};

export function LaserProjectorModelsEditor({
  models,
  onChange,
  onSave,
  compact = false,
}: Props) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addDraft = () => {
    const next = sanitizeLaserProjectorModels([...models, draft]);
    if (next.length === models.length) {
      setDraft("");
      return;
    }
    onChange(next);
    setDraft("");
    setSaved(false);
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

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDraft();
    }
  };

  const removeAt = (index: number) => {
    onChange(models.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-border/60 bg-card shadow-sm rounded-lg overflow-hidden">
      <div className="py-2.5 px-4 border-b border-border/50 bg-muted/20">
        <div className="font-semibold text-foreground tracking-tight text-sm">
          Laser projector models
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xl">
          Projector models that use the laser report template. Match is exact
          on the model string after trim; comparison is case-insensitive (e.g.{" "}
          <span className="font-mono">CP4450-RGB</span> matches{" "}
          <span className="font-mono">cp4450-rgb</span>). Duplicates are merged
          when saving.
        </p>
      </div>
      <CardContent className={`p-2.5 ${compact ? "space-y-2" : "space-y-3"}`}>
        <div className="flex flex-wrap gap-2 min-h-8">
          {models.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">
              No models — all projectors use the standard (lamp) template until
              you add at least one.
            </span>
          ) : (
            models.map((m, idx) => (
              <Badge
                key={`${normalizeProjectorModelKey(m)}-${idx}`}
                variant="secondary"
                className="pl-2 pr-1 py-1 gap-1 text-xs font-normal"
              >
                <span className="font-mono">{m}</span>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="rounded-sm p-0.5 hover:bg-muted-foreground/20 text-foreground"
                  aria-label={`Remove ${m}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. CP4450-RGB"
            className="h-8 text-xs border-border max-w-xs font-mono"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={addDraft}
          >
            Add model
          </Button>
          {onSave && (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-black text-white hover:bg-gray-800"
              onClick={handleSave}
              disabled={saving}
            >
              {saved ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  {saving ? "Saving..." : "Save laser models"}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </div>
  );
}
