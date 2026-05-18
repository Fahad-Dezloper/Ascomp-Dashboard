import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import prisma from "@/lib/db"
import {
  sanitizeCfmModelRules,
  type CfmModelRule,
} from "@/lib/cfm-model-rules"
import { sanitizeLaserProjectorModels } from "@/lib/laser-projector-models"

const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "form-config.json")

const FILE_OVERRIDE_KEYS = new Set(["exhaustCfm"])

export type LaserFieldConfig = {
  options?: string[]
  subOptions?: Record<string, string[]>
  subOptionsInput?: Record<string, boolean>
  defaultValue?: string
}
export type LaserFieldOptions = Record<string, LaserFieldConfig>

function parseLaserFieldOptions(raw: unknown): LaserFieldOptions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const obj = raw as Record<string, unknown>
  const result: LaserFieldOptions = {}
  for (const [key, val] of Object.entries(obj)) {
    if (Array.isArray(val) && val.every((v) => typeof v === "string")) {
      // backward-compat: old format was string[]
      result[key] = { options: val }
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      const v = val as Record<string, unknown>
      const entry: LaserFieldConfig = {}
      if (Array.isArray(v.options)) entry.options = v.options.filter((o): o is string => typeof o === "string")
      if (v.subOptions && typeof v.subOptions === "object" && !Array.isArray(v.subOptions)) entry.subOptions = v.subOptions as Record<string, string[]>
      if (v.subOptionsInput && typeof v.subOptionsInput === "object" && !Array.isArray(v.subOptionsInput)) entry.subOptionsInput = v.subOptionsInput as Record<string, boolean>
      if (typeof v.defaultValue === "string") entry.defaultValue = v.defaultValue
      result[key] = entry
    }
  }
  return result
}

function parseStoredConfig(raw: unknown): {
  fields: any[]
  cfmModelRules: CfmModelRule[]
  laserProjectorModels: string[]
  laserFieldOptions: LaserFieldOptions
} {
  if (Array.isArray(raw)) {
    return { fields: raw, cfmModelRules: [], laserProjectorModels: [], laserFieldOptions: {} }
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.fields)) {
      return {
        fields: o.fields as any[],
        cfmModelRules: sanitizeCfmModelRules(o.cfmModelRules),
        laserProjectorModels: sanitizeLaserProjectorModels(o.laserProjectorModels),
        laserFieldOptions: parseLaserFieldOptions(o.laserFieldOptions),
      }
    }
  }
  return { fields: [], cfmModelRules: [], laserProjectorModels: [], laserFieldOptions: {} }
}

async function readConfigFromFile(): Promise<any[] | null> {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH)
    await fs.access(dir).catch(() => {})

    const data = await fs.readFile(CONFIG_FILE_PATH, "utf-8")
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return null
    }
    console.error("Error reading form config file:", error)
    return null
  }
}

export type FormConfigReadResult = {
  fields: any[]
  cfmModelRules: CfmModelRule[]
  laserProjectorModels: string[]
  laserFieldOptions: LaserFieldOptions
}

async function readConfig(): Promise<FormConfigReadResult | null> {
  try {
    const dbConfig = await prisma.formConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })

    if (dbConfig?.config) {
      let { fields, cfmModelRules, laserProjectorModels, laserFieldOptions } = parseStoredConfig(
        dbConfig.config,
      )
      const fileConfig = await readConfigFromFile()
      if (fileConfig && fileConfig.length > 0) {
        const fileByKey = new Map(fileConfig.map((f: any) => [f.key, f]))
        fields = fields.map((f: any) => {
          if (FILE_OVERRIDE_KEYS.has(f.key)) {
            const fileField = fileByKey.get(f.key)
            if (fileField) return fileField
          }
          return f
        })
      }
      return { fields, cfmModelRules, laserProjectorModels, laserFieldOptions }
    }

    console.log("No DB config found. Falling back to file...")
    const fileConfig = await readConfigFromFile()

    if (fileConfig) {
      console.log("Seeding form config from file to database...")
      try {
        await prisma.formConfiguration.create({
          data: {
            config: {
              fields: fileConfig,
              cfmModelRules: [],
              laserProjectorModels: [],
              laserFieldOptions: {},
            },
            version: 1,
            isActive: true,
          },
        })
      } catch (seedError) {
        console.error("Failed to seed form config to DB:", seedError)
      }
      return { fields: fileConfig, cfmModelRules: [], laserProjectorModels: [], laserFieldOptions: {} }
    }
  } catch (error) {
    console.error("Error in readConfig:", error)
    const fileOnly = await readConfigFromFile()
    if (fileOnly) {
      return {
        fields: fileOnly,
        cfmModelRules: [],
        laserProjectorModels: [],
        laserFieldOptions: {},
      }
    }
  }

  return null
}

async function writeConfig(payload: {
  fields: any[]
  cfmModelRules: CfmModelRule[]
  laserProjectorModels: string[]
  laserFieldOptions: LaserFieldOptions
}): Promise<void> {
  await prisma.formConfiguration.create({
    data: {
      config: payload as object,
      isActive: true,
    },
  })
  console.log("Form config saved to database.")
}

export async function GET() {
  try {
    const result = await readConfig()
    if (!result) {
      return NextResponse.json(
        { config: [], cfmModelRules: [], laserProjectorModels: [], laserFieldOptions: {} },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      )
    }
    return NextResponse.json(
      {
        config: result.fields,
        cfmModelRules: result.cfmModelRules,
        laserProjectorModels: result.laserProjectorModels,
        laserFieldOptions: result.laserFieldOptions,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("Error fetching form config:", error)
    return NextResponse.json(
      { error: "Failed to fetch form config" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { config, cfmModelRules: rawRules, laserProjectorModels: rawLaser, laserFieldOptions: rawLaserOptions } =
      body

    if (!config || !Array.isArray(config)) {
      console.error(
        "Invalid config format:",
        typeof config,
        Array.isArray(config),
      )
      return NextResponse.json(
        { error: "Invalid config format" },
        { status: 400 },
      )
    }

    const cfmModelRules = sanitizeCfmModelRules(rawRules)

    let laserProjectorModels: string[]
    if (Object.prototype.hasOwnProperty.call(body, "laserProjectorModels")) {
      laserProjectorModels = sanitizeLaserProjectorModels(rawLaser)
    } else {
      const previous = await readConfig()
      laserProjectorModels = previous?.laserProjectorModels ?? []
    }

    let laserFieldOptions: LaserFieldOptions
    if (Object.prototype.hasOwnProperty.call(body, "laserFieldOptions")) {
      laserFieldOptions = parseLaserFieldOptions(rawLaserOptions)
    } else {
      const previous = await readConfig()
      laserFieldOptions = previous?.laserFieldOptions ?? {}
    }

    await writeConfig({ fields: config, cfmModelRules, laserProjectorModels, laserFieldOptions })

    return NextResponse.json({
      success: true,
      message: "Form configuration saved",
      savedFields: config.length,
      savedCfmRules: cfmModelRules.length,
      savedLaserModels: laserProjectorModels.length,
    })
  } catch (error) {
    console.error("Error saving form config:", error)
    return NextResponse.json(
      { error: "Failed to save form config", details: String(error) },
      { status: 500 },
    )
  }
}
