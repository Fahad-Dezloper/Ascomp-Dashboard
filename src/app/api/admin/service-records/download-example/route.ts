import { NextResponse } from "next/server"
import * as xlsx from "xlsx"
import fs from "fs"
import path from "path"
import { EXCEL_SERVICE_RECORD_TEMPLATE_HEADERS } from "@/lib/excel-service-record-utils"

export async function GET() {
  try {
    // Path to the example Excel file
    const excelPath = path.join(process.cwd(), "excel", "Project_dets.xlsx")

    // Build template from source workbook if present; otherwise use fallback headers.
    const newWorkbook = xlsx.utils.book_new()
    if (fs.existsSync(excelPath)) {
      fs.accessSync(excelPath, fs.constants.R_OK)
      const fileBuffer = fs.readFileSync(excelPath)
      const workbook = xlsx.read(fileBuffer, { type: "buffer" })
      const sheet = workbook.Sheets["Data"]
      if (!sheet) {
        throw new Error('Sheet "Data" not found in example file')
      }

      const headerRow: Record<string, any> = {}
      const range = xlsx.utils.decode_range(sheet["!ref"] || "A1")
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: 0, c: col })
        const cell = sheet[cellAddress]
        if (cell) {
          headerRow[cellAddress] = cell
        }
      }

      const newSheet: Record<string, any> = {
        ...headerRow,
        "!ref": xlsx.utils.encode_range({
          s: { r: 0, c: range.s.c },
          e: { r: 0, c: range.e.c },
        }),
      }
      xlsx.utils.book_append_sheet(newWorkbook, newSheet, "Data")
    } else {
      const fallbackSheet = xlsx.utils.aoa_to_sheet([EXCEL_SERVICE_RECORD_TEMPLATE_HEADERS])
      xlsx.utils.book_append_sheet(newWorkbook, fallbackSheet, "Data")
    }

    // Generate buffer
    const buffer = xlsx.write(newWorkbook, { type: "buffer", bookType: "xlsx" })

    // Return file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=Service_Records_Template.xlsx",
      },
    })
  } catch (error) {
    console.error("Error generating example Excel file:", error)
    return NextResponse.json(
      {
        error: "Failed to generate example Excel file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}