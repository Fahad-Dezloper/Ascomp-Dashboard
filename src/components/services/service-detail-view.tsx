"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";

const EDIT_WINDOW_MS = 10 * 60 * 1000;

function useEditCountdown(reportSubmittedAt: string | null | undefined) {
  const [remainingMs, setRemainingMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!reportSubmittedAt) { setRemainingMs(0); return; }
    const tick = () => {
      const elapsed = Date.now() - new Date(reportSubmittedAt).getTime();
      const rem = Math.max(0, EDIT_WINDOW_MS - elapsed);
      setRemainingMs(rem);
      if (rem === 0 && intervalRef.current) clearInterval(intervalRef.current);
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [reportSubmittedAt]);
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  return { remainingMs, label: `${minutes}:${seconds.toString().padStart(2, "0")}` };
}

export interface Service {
  id: string;
  engineerName?: string;
  serviceNumber: number;
  site: {
    id: string;
    name: string;
    address: string | null;
    contactDetails: string | null;
    screenNo: string | null;
    siteCode?: string | null;
  };
  projector: {
    id: string;
    model: string;
    serialNo: string;
    runningHours: number | null;
  };
  date: string | null;
  completedAt: string | null;
  cinemaName: string | null;
  address: string | null;
  location: string | null;
  screenNumber: string | null;
  contactDetails: string | null;
  projectorRunningHours: number | null;
  remarks: string | null;
  images: string[];
  afterImages: string[];
  brokenImages: string[];
  signatures: any;
  reportGenerated: boolean;
  reportSubmittedAt?: string | null;
  reportUrl: string | null;
  workDetails: any;
}

interface ServiceDetailViewProps {
  service: Service;
  onBack: () => void;
}

import { useAuth } from "@/lib/auth-context";

export function ServiceDetailView({ service, onBack }: ServiceDetailViewProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { remainingMs, label: countdownLabel } = useEditCountdown(service.reportSubmittedAt);
  const canEdit = remainingMs > 0;

  const handleEditReport = () => {
    // Store service info into workflowData so RecordWork can pre-fill from it
    const workflowData = {
      selectedService: {
        id: service.id,
        site: service.site?.name,
        address: service.address || service.site?.address,
        contactDetails: service.contactDetails || service.site?.contactDetails,
        serviceNumber: service.serviceNumber,
      },
      workDetails: service.workDetails || {},
    };
    localStorage.setItem("workflowData", JSON.stringify(workflowData));
    localStorage.setItem("workflowStep", "2"); // Record Work step
    router.push("/user/workflow");
  };

  const handleDownloadPDF = async (service: Service) => {
    try {
      setIsGeneratingPdf(true);
      const { constructAndGeneratePDF } = await import("@/lib/pdf-helper");

      if (!service.id) {
        console.error("Service ID missing for PDF generation");
        toast.error("Service ID missing for PDF generation");
        setIsGeneratingPdf(false);
        return;
      }

      const isDraft = user?.role === "FIELD_WORKER";
      const pdfBytes = await constructAndGeneratePDF(service.id, isDraft);

      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9-_#]/g, "_");
      const siteCode = sanitize(String(service?.site?.siteCode || "NA"));
      const address = sanitize(
        String(service?.address || service?.site?.address || "NA"),
      );
      const screenNo = sanitize(
        String(service?.site?.screenNo || service?.screenNumber || "NA"),
      );
      const serialNo = sanitize(String(service?.projector?.serialNo || "NA"));
      const serviceVisit = sanitize(String(service?.serviceNumber || "NA"));
      const downloadFileName = `${siteCode}_${address}_SC#${screenNo}_${serialNo}_${serviceVisit}.pdf`;

      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="border border-black mb-4 break-inside-avoid shadow-sm rounded-sm bg-white">
      <div className="bg-gray-100 border-b border-black px-3 py-2 font-bold text-sm text-black uppercase tracking-wide">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  const GridRow = ({ items }: { items: { label: string; value: any }[] }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 mb-2">
      {items.map((item, idx) =>
        item.value ? (
          <div key={idx} className="flex flex-col text-sm">
            <span className="text-gray-500 text-xs uppercase tracking-wider mb-1">
              {item.label}
            </span>
            <span className="font-medium text-black break-words">
              {item.value.toString()}
            </span>
          </div>
        ) : null,
      )}
    </div>
  );

  const StatusTable = ({
    items,
  }: {
    items: { label: string; status: string | undefined }[];
  }) => {
    // Extract the first word before parentheses (e.g., "OK (Part is Ok)" -> "OK")
    const extractStatus = (status: string | undefined): string => {
      if (!status) return "";
      const safeStatus = status as string;
      const match = safeStatus.match(/^([^\s(]+)/);
      return match ? (match[1] ?? safeStatus) : safeStatus;
    };

    return (
      <div className="w-full text-sm">
        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-2 mb-2 font-semibold text-gray-600 uppercase text-xs tracking-wider">
          <div>Item</div>
          <div>Status</div>
        </div>
        {items.map((item, idx) =>
          item.status ? (
            <div
              key={idx}
              className="grid grid-cols-2 gap-4 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-1 -mx-1 rounded"
            >
              <div className="text-gray-700">{item.label}</div>
              <div className="font-medium text-black">
                {extractStatus(item.status)}
              </div>
            </div>
          ) : null,
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white w-full pb-12">
      {/* Header */}
      <div className="border-b-2 border-black p-4 sticky top-0 bg-white/95 backdrop-blur z-20 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={onBack}
              size="sm"
              className="border-2 border-transparent hover:border-black hover:bg-transparent transition-all"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-black flex items-center gap-2">
                Service #{service.serviceNumber}
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                  {service.date
                    ? new Date(service.date).toLocaleDateString()
                    : "N/A"}
                </span>
              </h1>
              <p className="text-sm text-gray-600 truncate max-w-[300px]">
                {service.site.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {service.workDetails?.photosDriveLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(service.workDetails.photosDriveLink, "_blank")
                }
                className="flex-1 sm:flex-none border-2 border-black text-black hover:bg-gray-100 font-medium"
              >
                <span className="mr-2">📂</span> Photos
              </Button>
            )}
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditReport}
                className="flex-1 sm:flex-none border-2 border-amber-500 text-amber-700 hover:bg-amber-50 font-semibold flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Report
                <span className="flex items-center gap-1 text-xs font-normal text-amber-600">
                  <Clock className="h-3 w-3" />
                  {countdownLabel}
                </span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => handleDownloadPDF(service)}
              disabled={isGeneratingPdf}
              className="flex-1 sm:flex-none bg-black text-white hover:bg-gray-800 border-2 border-black transition-all"
            >
              {isGeneratingPdf ? (
                "Generating..."
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Top Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Section title="Site & Projector">
            <GridRow
              items={[
                { label: "Site Name", value: service.site.name },
                {
                  label: "Address",
                  value: service.site.address || service.address,
                },
                {
                  label: "Contact",
                  value: service.contactDetails || service.site.contactDetails,
                },
                { label: "Location", value: service.location },
                { label: "Cinema", value: service.cinemaName },
                {
                  label: "Screen",
                  value: service.site.screenNo || service.screenNumber,
                },
                { label: "Model", value: service.projector.model },
                { label: "Serial", value: service.projector.serialNo },
                { label: "Running Hrs", value: service.projectorRunningHours },
                {
                  label: "Software",
                  value: service.workDetails?.softwareVersion,
                },
              ]}
            />
          </Section>

          <Section title="Environment & Lamp">
            <GridRow
              items={[
                {
                  label: "Environment",
                  value: service.workDetails?.projectorPlacementEnvironment,
                },
                {
                  label: "Lamp Make",
                  value: service.workDetails?.lampMakeModel,
                },
                {
                  label: "Lamp Total Hrs",
                  value: service.workDetails?.lampTotalRunningHours,
                },
                {
                  label: "Lamp Curr Hrs",
                  value: service.workDetails?.lampCurrentRunningHours,
                },
                {
                  label: "Content Player",
                  value: service.workDetails?.contentPlayerModel,
                },
                { label: "AC Status", value: service.workDetails?.acStatus },
                { label: "LE Status", value: service.workDetails?.leStatus },
                {
                  label: "LE Serial",
                  value: service.workDetails?.lightEngineSerialNumber,
                },
              ]}
            />
          </Section>
        </div>

        {/* Technical Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Section title="Opticals">
            <StatusTable
              items={[
                { label: "Reflector", status: service.workDetails?.reflector },
                { label: "UV Filter", status: service.workDetails?.uvFilter },
                {
                  label: "Integrator Rod",
                  status: service.workDetails?.integratorRod,
                },
                {
                  label: "Cold Mirror",
                  status: service.workDetails?.coldMirror,
                },
                {
                  label: "Fold Mirror",
                  status: service.workDetails?.foldMirror,
                },
              ]}
            />
          </Section>

          <Section title="Electronics">
            <StatusTable
              items={[
                {
                  label: "Touch Panel",
                  status: service.workDetails?.touchPanel,
                },
                { label: "EVB Board", status: service.workDetails?.evbBoard },
                { label: "IMCB Board", status: service.workDetails?.ImcbBoard },
                { label: "PIB Board", status: service.workDetails?.pibBoard },
                { label: "ICP Board", status: service.workDetails?.IcpBoard },
                { label: "IMB/S", status: service.workDetails?.imbSBoard },
                {
                  label: "Serial Verified",
                  status: service.workDetails?.serialNumberVerified
                    ? "Yes"
                    : "No",
                },
              ]}
            />
          </Section>

          <Section title="Mechanical">
            <StatusTable
              items={[
                {
                  label: "AC Blower Vane",
                  status: service.workDetails?.acBlowerVane,
                },
                {
                  label: "Extractor Vane",
                  status: service.workDetails?.extractorVane,
                },
                {
                  label: "Exhaust CFM",
                  status: service.workDetails?.exhaustCfm,
                },
                {
                  label: "LE Fans",
                  status: service.workDetails?.lightEngineFans,
                },
                {
                  label: "Card Cage Fans",
                  status: service.workDetails?.cardCageFans,
                },
                {
                  label: "Radiator Fan",
                  status: service.workDetails?.radiatorFanPump,
                },
                {
                  label: "Connector Hose",
                  status: service.workDetails?.pumpConnectorHose,
                },
                {
                  label: "Security Lock",
                  status: service.workDetails?.securityLampHouseLock,
                },
                {
                  label: "Lamp LOC Mech",
                  status: service.workDetails?.lampLocMechanism,
                },
              ]}
            />
          </Section>

          <Section title="Light Engine & Color">
            <StatusTable
              items={[
                {
                  label: "White",
                  status: service.workDetails?.lightEngineWhite,
                },
                { label: "Red", status: service.workDetails?.lightEngineRed },
                {
                  label: "Green",
                  status: service.workDetails?.lightEngineGreen,
                },
                { label: "Blue", status: service.workDetails?.lightEngineBlue },
                {
                  label: "Black",
                  status: service.workDetails?.lightEngineBlack,
                },
              ]}
            />
          </Section>
        </div>

        {/* Consumables & Coolant */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Section title="Consumables">
            <StatusTable
              items={[
                {
                  label: "Air Intake/Rad",
                  status: service.workDetails?.AirIntakeLadRad,
                },
              ]}
            />
          </Section>
          <Section title="Coolant">
            <StatusTable
              items={[
                {
                  label: "Level and Color",
                  status: service.workDetails?.coolantLevelColor,
                },
              ]}
            />
          </Section>
        </div>

        {/* Measurements & Calibration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Section title="Screen & Image">
            <GridRow
              items={[
                {
                  label: "Throw Dist",
                  value: service.workDetails?.throwDistance,
                },
                {
                  label: "Screen Make",
                  value: service.workDetails?.screenMake,
                },
                { label: "Scope H", value: service.workDetails?.screenHeight },
                { label: "Scope W", value: service.workDetails?.screenWidth },
                { label: "Flat H", value: service.workDetails?.flatHeight },
                { label: "Flat W", value: service.workDetails?.flatWidth },
                { label: "Gain", value: service.workDetails?.screenGain },
                { label: "fL Left", value: service.workDetails?.flLeft },
                { label: "fL Right", value: service.workDetails?.flRight },
              ]}
            />
            <div className="mt-4 pt-4 border-t border-gray-200">
              <StatusTable
                items={[
                  {
                    label: "Focus/Boresight",
                    status: service.workDetails?.focusBoresight ? "Yes" : "No",
                  },
                  {
                    label: "Integrator Pos",
                    status: service.workDetails?.integratorPosition
                      ? "Yes"
                      : "No",
                  },
                  {
                    label: "Spots",
                    status: service.workDetails?.spotsOnScreen ? "Yes" : "No",
                  },
                  {
                    label: "Cropping",
                    status: service.workDetails?.screenCropping
                      ? "Yes"
                      : service.workDetails?.screenCroppingOk
                        ? "Yes"
                        : "No",
                  },
                  {
                    label: "Convergence",
                    status: service.workDetails?.convergence
                      ? "Yes"
                      : service.workDetails?.convergenceOk
                        ? "Yes"
                        : "No",
                  },
                  {
                    label: "Channels",
                    status: service.workDetails?.channelsChecked
                      ? "Yes"
                      : service.workDetails?.channelsCheckedOk
                        ? "Yes"
                        : "No",
                  },
                  {
                    label: "Pixel Defects",
                    status: service.workDetails?.pixelDefects,
                  },
                  {
                    label: "Vibration",
                    status: service.workDetails?.imageVibration,
                  },
                  { label: "LiteLOC", status: service.workDetails?.liteloc },
                ]}
              />
            </div>
          </Section>

          <Section title="Color Calibration (MCGD)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="py-2 text-gray-600 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="py-2 text-gray-600 uppercase tracking-wider">
                      2K (x, y, fL)
                    </th>
                    <th className="py-2 text-gray-600 uppercase tracking-wider">
                      4K (x, y, fL)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="font-semibold py-2">White</td>
                    <td className="py-2">
                      {service.workDetails?.white2Kx},{" "}
                      {service.workDetails?.white2Ky},{" "}
                      {service.workDetails?.white2Kfl}
                    </td>
                    <td className="py-2">
                      {service.workDetails?.white4Kx},{" "}
                      {service.workDetails?.white4Ky},{" "}
                      {service.workDetails?.white4Kfl}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-2">Red</td>
                    <td className="py-2">
                      {service.workDetails?.red2Kx},{" "}
                      {service.workDetails?.red2Ky},{" "}
                      {service.workDetails?.red2Kfl}
                    </td>
                    <td className="py-2">
                      {service.workDetails?.red4Kx},{" "}
                      {service.workDetails?.red4Ky},{" "}
                      {service.workDetails?.red4Kfl}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-2">Green</td>
                    <td className="py-2">
                      {service.workDetails?.green2Kx},{" "}
                      {service.workDetails?.green2Ky},{" "}
                      {service.workDetails?.green2Kfl}
                    </td>
                    <td className="py-2">
                      {service.workDetails?.green4Kx},{" "}
                      {service.workDetails?.green4Ky},{" "}
                      {service.workDetails?.green4Kfl}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-2">Blue</td>
                    <td className="py-2">
                      {service.workDetails?.blue2Kx},{" "}
                      {service.workDetails?.blue2Ky},{" "}
                      {service.workDetails?.blue2Kfl}
                    </td>
                    <td className="py-2">
                      {service.workDetails?.blue4Kx},{" "}
                      {service.workDetails?.blue4Ky},{" "}
                      {service.workDetails?.blue4Kfl}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-bold text-xs mb-2 uppercase tracking-wide">
                CIE XYZ (BW Step 10)
              </h4>
              <div className="grid grid-cols-2 text-xs gap-4">
                <div>
                  <span className="font-semibold block mb-1">2K:</span> x:
                  {service.workDetails?.BW_Step_10_2Kx}, y:
                  {service.workDetails?.BW_Step_10_2Ky}, fL:
                  {service.workDetails?.BW_Step_10_2Kfl}
                </div>
                <div>
                  <span className="font-semibold block mb-1">4K:</span> x:
                  {service.workDetails?.BW_Step_10_4Kx}, y:
                  {service.workDetails?.BW_Step_10_4Ky}, fL:
                  {service.workDetails?.BW_Step_10_4Kfl}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Air & Voltage">
            <GridRow
              items={[
                {
                  label: "Pollution Lvl",
                  value: service.workDetails?.airPollutionLevel,
                },
                { label: "Temp", value: service.workDetails?.temperature },
                { label: "Humidity", value: service.workDetails?.humidity },
                { label: "HCHO", value: service.workDetails?.hcho },
                { label: "TVOC", value: service.workDetails?.tvoc },
                { label: "PM1.0", value: service.workDetails?.pm1 },
                { label: "PM2.5", value: service.workDetails?.pm2_5 },
                { label: "PM10", value: service.workDetails?.pm10 },
              ]}
            />
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-bold text-xs mb-2 uppercase tracking-wide">
                Voltage
              </h4>
              <GridRow
                items={[
                  { label: "P vs N", value: service.workDetails?.pvVsN },
                  { label: "P vs E", value: service.workDetails?.pvVsE },
                  { label: "N vs E", value: service.workDetails?.nvVsE },
                ]}
              />
            </div>
          </Section>
        </div>

        {/* Remarks & Parts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {service.remarks && (
            <Section title="Remarks">
              <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">
                {service.remarks}
              </p>
            </Section>
          )}

          {service.workDetails?.recommendedParts &&
            service.workDetails.recommendedParts.length > 0 && (
              <Section title="Recommended Parts">
                <ul className="list-disc list-inside text-sm text-black space-y-1">
                  {service.workDetails.recommendedParts.map(
                    (part: any, idx: number) => (
                      <li key={idx}>
                        <span className="font-semibold">
                          {part.partNumber || (part as any).part_number}
                        </span>{" "}
                        - {part.name ? part.name : part.description}
                      </li>
                    ),
                  )}
                </ul>
              </Section>
            )}
        </div>

        {/* Images */}
        <div className="space-y-6">
          {service.images && service.images.length > 0 && (
            <Section title={`Before Images (${service.images.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {service.images.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="relative aspect-square border border-gray-200 rounded-md overflow-hidden bg-gray-50 shadow-sm"
                  >
                    <Image
                      src={imageUrl}
                      alt={`Before image ${index + 1}`}
                      fill
                      className="object-cover hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {service.afterImages && service.afterImages.length > 0 && (
            <Section title={`After Images (${service.afterImages.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {service.afterImages.map((imageUrl: string, index: number) => (
                  <div
                    key={index}
                    className="relative aspect-square border border-gray-200 rounded-md overflow-hidden bg-gray-50 shadow-sm"
                  >
                    <Image
                      src={imageUrl}
                      alt={`After image ${index + 1}`}
                      fill
                      className="object-cover hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {service.brokenImages && service.brokenImages.length > 0 && (
            <Section
              title={`Broken Parts / Other Images (${service.brokenImages.length})`}
            >
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {service.brokenImages.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="relative aspect-square border border-gray-200 rounded-md overflow-hidden bg-gray-50 shadow-sm"
                  >
                    <Image
                      src={imageUrl}
                      alt={`Broken part image ${index + 1}`}
                      fill
                      className="object-cover hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end border-t-2 border-dashed border-gray-300 pt-8 mt-12 pb-8">
          <div className="text-center">
            {service.signatures?.site ||
            (service.signatures as any)?.siteSignatureUrl ? (
              <div className="relative w-40 h-20 mb-3 mx-auto">
                <Image
                  src={
                    service.signatures?.site ||
                    (service.signatures as any)?.siteSignatureUrl
                  }
                  alt="Site Signature"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="h-20 w-40 mb-3 bg-gray-50 border border-dashed border-gray-300 mx-auto rounded flex items-center justify-center text-gray-400 text-xs">
                No Signature
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
              Client Signature
            </p>
          </div>

          <div className="text-center">
            {service.signatures?.engineer ||
            (service.signatures as any)?.engineerSignatureUrl ? (
              <div className="relative w-40 h-20 mb-3 mx-auto">
                <Image
                  src={
                    service.signatures?.engineer ||
                    (service.signatures as any)?.engineerSignatureUrl
                  }
                  alt="Engineer Signature"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="h-20 w-40 mb-3 bg-gray-50 border border-dashed border-gray-300 mx-auto rounded flex items-center justify-center text-gray-400 text-xs">
                No Signature
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
              Engineer Signature
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
