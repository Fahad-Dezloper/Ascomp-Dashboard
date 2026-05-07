import prisma, { ServiceStatus } from "@/lib/db"
import type { ServiceRecord, Site } from "@prisma/client"

const ORDINAL_WORDS = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
  "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth",
  "Eighteenth", "Nineteenth", "Twentieth", "Twenty-First", "Twenty-Second", "Twenty-Third",
  "Twenty-Fourth", "Twenty-Fifth", "Twenty-Sixth", "Twenty-Seventh", "Twenty-Eighth",
  "Twenty-Ninth", "Thirtieth", "Thirty-First", "Thirty-Second", "Thirty-Third", "Thirty-Fourth",
  "Thirty-Fifth", "Thirty-Sixth", "Thirty-Seventh", "Thirty-Eighth", "Thirty-Ninth", "Fortieth",
  "Forty-First", "Forty-Second", "Forty-Third", "Forty-Fourth", "Forty-Fifth", "Forty-Sixth",
  "Forty-Seventh", "Forty-Eighth", "Forty-Ninth", "Fiftieth", "Fifty-First", "Fifty-Second",
  "Fifty-Third", "Fifty-Fourth", "Fifty-Fifth", "Fifty-Sixth", "Fifty-Seventh", "Fifty-Eighth",
  "Fifty-Ninth", "Sixtieth", "Sixty-First", "Sixty-Second", "Sixty-Third", "Sixty-Fourth",
  "Sixty-Fifth", "Sixty-Sixth", "Sixty-Seventh", "Sixty-Eighth", "Sixty-Ninth", "Seventieth",
  "Seventy-First", "Seventy-Second", "Seventy-Third", "Seventy-Fourth", "Seventy-Fifth",
  "Seventy-Sixth", "Seventy-Seventh", "Seventy-Eighth", "Seventy-Ninth", "Eightieth",
  "Eighty-First", "Eighty-Second", "Eighty-Third", "Eighty-Fourth", "Eighty-Fifth",
  "Eighty-Sixth", "Eighty-Seventh", "Eighty-Eighth", "Eighty-Ninth", "Ninetieth",
  "Ninety-First", "Ninety-Second", "Ninety-Third", "Ninety-Fourth", "Ninety-Fifth",
  "Ninety-Sixth", "Ninety-Seventh", "Ninety-Eighth", "Ninety-Ninth", "One Hundredth",
] as const

export const generateObjectId = () =>
  [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join("")

function numberToOrdinalWord(num: number): string {
  if (num >= 1 && num <= 100) {
    return ORDINAL_WORDS[num - 1]!
  }
  return `${num}th`
}

function ordinalToNumber(ordinal: string): number {
  const index = ORDINAL_WORDS.indexOf(ordinal as (typeof ORDINAL_WORDS)[number])
  return index !== -1 ? index + 1 : 0
}

export type FieldWorkerForAssignment = {
  id: string
  email: string | null
  name: string | null
  pvrAccess: string | null
}

export type AssignProjectorResult =
  | {
      ok: true
      record: ServiceRecord
      site: Site
      projector: { id: string; siteId: string; serialNo: string; modelNo: string; pvr: string | null }
      fieldWorker: FieldWorkerForAssignment
      scheduledDate: string
    }
  | { ok: false; status: number; error: string }

/**
 * Shared by admin schedule and engineer self-schedule: create or update the open service row,
 * set projector to SCHEDULED.
 * When allowOverrideAssignee is false, refuses to change assignment if another engineer already holds the open visit.
 */
export async function assignProjectorToFieldWorker(params: {
  siteId: string
  projectorId: string
  fieldWorker: FieldWorkerForAssignment
  recordUserId: string
  scheduledDate: string
  allowOverrideAssignee: boolean
}): Promise<AssignProjectorResult> {
  const { siteId, projectorId, fieldWorker, recordUserId, scheduledDate, allowOverrideAssignee } =
    params

  const site = await prisma.site.findUnique({
    where: { id: siteId },
  })
  if (!site) {
    return { ok: false, status: 404, error: "Site not found." }
  }

  const projector = await prisma.projector.findUnique({
    where: { id: projectorId },
    select: {
      id: true,
      siteId: true,
      serialNo: true,
      modelNo: true,
      pvr: true,
    },
  })
  if (!projector || projector.siteId !== siteId) {
    return { ok: false, status: 404, error: "Projector not found for this site." }
  }

  if (projector.pvr && fieldWorker.pvrAccess && fieldWorker.pvrAccess !== "BOTH") {
    if (fieldWorker.pvrAccess !== projector.pvr) {
      const workerLabel = fieldWorker.pvrAccess === "PVR" ? "PVR" : "Non-PVR"
      const projectorLabel = projector.pvr === "PVR" ? "PVR" : "Non-PVR"
      return {
        ok: false,
        status: 403,
        error: `You are restricted to ${workerLabel} projectors only, but this projector is ${projectorLabel}.`,
      }
    }
  }

  const parsedDate = new Date(scheduledDate)
  if (Number.isNaN(parsedDate.getTime())) {
    return { ok: false, status: 400, error: "Invalid scheduled date." }
  }

  const existingRecord = await prisma.serviceRecord.findFirst({
    where: {
      projectorId,
      date: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  let record: ServiceRecord

  if (existingRecord) {
    if (
      !allowOverrideAssignee &&
      existingRecord.assignedToId &&
      existingRecord.assignedToId !== fieldWorker.id
    ) {
      return {
        ok: false,
        status: 409,
        error:
          "This projector already has an active visit assigned to another engineer. Use “Request takeover” on that open visit, or ask an admin to reassign.",
      }
    }

    record = await prisma.serviceRecord.update({
      where: { id: existingRecord.id },
      data: {
        assignedToId: fieldWorker.id,
      },
    })
  } else {
    const existingRecords = await prisma.serviceRecord.findMany({
      where: { projectorId },
      select: { serviceNumber: true },
    })

    const maxServiceNumber = existingRecords.reduce((max, rec) => {
      const num = ordinalToNumber(rec.serviceNumber || "")
      return num > max ? num : max
    }, 0)

    const nextServiceNumber = maxServiceNumber + 1

    record = await prisma.serviceRecord.create({
      data: {
        id: generateObjectId(),
        userId: recordUserId,
        assignedToId: fieldWorker.id,
        projectorId: projector.id,
        siteId: site.id,
        serviceNumber: numberToOrdinalWord(nextServiceNumber) as string,
        cinemaName: site.siteName,
        address: site.address,
        contactDetails: site.contactDetails,
        location: site.address,
      },
    })
  }

  await prisma.projector.update({
    where: { id: projectorId },
    data: {
      status: ServiceStatus.SCHEDULED,
    },
  })

  return {
    ok: true,
    record,
    site,
    projector,
    fieldWorker,
    scheduledDate,
  }
}
