import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import prisma from "@/lib/db"

const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "form-config.json")

// Fields that must always match form-config.json (file is source of truth)
// Use when DB has stale/incorrect type (e.g. exhaustCfm should be number, not select)
const FILE_OVERRIDE_KEYS = new Set(["exhaustCfm"])

async function readConfigFromFile(): Promise<any[] | null> {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH)
    // Ensure access to file system just in case, but ignore errors if it doesn't exist
    await fs.access(dir).catch(() => { })

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

async function readConfig(): Promise<any[] | null> {
  try {
    // Try reading from Database
    const dbConfig = await prisma.formConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    if (dbConfig?.config) {
      const dbConfigArray = dbConfig.config as any[]
      const fileConfig = await readConfigFromFile()
      if (fileConfig && fileConfig.length > 0) {
        const fileByKey = new Map(fileConfig.map((f: any) => [f.key, f]))
        return dbConfigArray.map((f: any) => {
          if (FILE_OVERRIDE_KEYS.has(f.key)) {
            const fileField = fileByKey.get(f.key)
            if (fileField) return fileField
          }
          return f
        })
      }
      return dbConfigArray
    }

    // If no DB config, fallback to file and seed DB
    console.log("No DB config found. Falling back to file...")
    const fileConfig = await readConfigFromFile()

    if (fileConfig) {
      console.log("Seeding form config from file to database...")
      try {
        await prisma.formConfiguration.create({
          data: {
            config: fileConfig,
            version: 1,
            isActive: true
          }
        })
      } catch (seedError) {
        console.error("Failed to seed form config to DB:", seedError)
      }
      return fileConfig
    }
  } catch (error) {
    console.error("Error in readConfig:", error)
    // Fallback solely to file if DB fails completely
    return readConfigFromFile()
  }

  return null
}

async function writeConfig(config: any[]): Promise<void> {
  try {
    await prisma.formConfiguration.create({
      data: {
        config: config,
        isActive: true
      }
    })
    console.log("Form config saved to database.")
  } catch (error) {
    console.error("Error writing form config to DB:", error)
    throw error
  }
}

export async function GET() {
  try {
    const config = await readConfig()
    return NextResponse.json({ config }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    })
  } catch (error) {
    console.error("Error fetching form config:", error)
    return NextResponse.json({ error: "Failed to fetch form config" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { config } = body

    if (!config || !Array.isArray(config)) {
      console.error("Invalid config format:", typeof config, Array.isArray(config))
      return NextResponse.json({ error: "Invalid config format" }, { status: 400 })
    }

    await writeConfig(config)

    return NextResponse.json({ success: true, message: "Form configuration saved", savedFields: config.length })
  } catch (error) {
    console.error("Error saving form config:", error)
    return NextResponse.json({ error: "Failed to save form config", details: String(error) }, { status: 500 })
  }
}
