import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { auth } from "@/lib/auth";
import { EXCEL_AMC_TEMPLATE_HEADERS } from "@/lib/excel-amc-utils";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exampleRow = [
      "YOUR_SERIAL_FROM_DB",
      "2023-01-15",
      "",
      "PO-1001",
      "INV-500",
      "",
    ];

    const sheet = xlsx.utils.aoa_to_sheet([
      [...EXCEL_AMC_TEMPLATE_HEADERS],
      exampleRow,
    ]);
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, "Data");
    const buffer = xlsx.write(book, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          "attachment; filename=AMC_Import_Template.xlsx",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to generate template",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
