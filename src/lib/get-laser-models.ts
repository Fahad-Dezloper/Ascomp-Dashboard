import prisma from "./db"
import { sanitizeLaserProjectorModels, isLaserProjectorModel } from "./laser-projector-models"

/** Reads the saved laser projector model list from the active form configuration. */
export async function getLaserProjectorModels(): Promise<string[]> {
  try {
    const dbConfig = await prisma.formConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })
    if (dbConfig?.config) {
      const config = dbConfig.config as any
      if (Array.isArray(config?.laserProjectorModels)) {
        return sanitizeLaserProjectorModels(config.laserProjectorModels)
      }
    }
  } catch (e) {
    console.error("Failed to get laser projector models:", e)
  }
  return []
}

/** Returns true if the given projector model is in the admin-configured laser list. */
export async function checkIsLaserProjector(
  projectorModel: string | null | undefined,
): Promise<boolean> {
  const models = await getLaserProjectorModels()
  return isLaserProjectorModel(projectorModel, models)
}
