import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import prisma from "@/lib/db"
import {
  sanitizeCfmModelRules,
  type CfmModelRule,
} from "@/lib/cfm-model-rules"

const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "form-config.json")

const FILE_OVERRIDE_KEYS = new Set(["exhaustCfm"])

function parseStoredConfig(raw: unknown): {
  fields: any[]
  cfmModelRules: CfmModelRule[]
} {
  if (Array.isArray(raw)) {
    return { fields: raw, cfmModelRules: [] }
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.fields)) {
      return {
        fields: o.fields as any[],
        cfmModelRules: sanitizeCfmModelRules(o.cfmModelRules),
      }
    }
  }
  return { fields: [], cfmModelRules: [] }
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
}

async function readConfig(): Promise<FormConfigReadResult | null> {
  try {
    const dbConfig = await prisma.formConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })

    if (dbConfig?.config) {
      let { fields, cfmModelRules } = parseStoredConfig(dbConfig.config)
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
      return { fields, cfmModelRules }
    }

    console.log("No DB config found. Falling back to file...")
    const fileConfig = await readConfigFromFile()

    if (fileConfig) {
      console.log("Seeding form config from file to database...")
      try {
        await prisma.formConfiguration.create({
          data: {
            config: { fields: fileConfig, cfmModelRules: [] },
            version: 1,
            isActive: true,
          },
        })
      } catch (seedError) {
        console.error("Failed to seed form config to DB:", seedError)
      }
      return { fields: fileConfig, cfmModelRules: [] }
    }
  } catch (error) {
    console.error("Error in readConfig:", error)
    const fileOnly = await readConfigFromFile()
    if (fileOnly) {
      return { fields: fileOnly, cfmModelRules: [] }
    }
  }

  return null
}

async function writeConfig(payload: {
  fields: any[]
  cfmModelRules: CfmModelRule[]
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
        { config: [], cfmModelRules: [] },
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
      { config: result.fields, cfmModelRules: result.cfmModelRules },
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
    const { config, cfmModelRules: rawRules } = body

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

    await writeConfig({ fields: config, cfmModelRules })

    return NextResponse.json({
      success: true,
      message: "Form configuration saved",
      savedFields: config.length,
      savedCfmRules: cfmModelRules.length,
    })
  } catch (error) {
    console.error("Error saving form config:", error)
    return NextResponse.json(
      { error: "Failed to save form config", details: String(error) },
      { status: 500 },
    )
  }
}
