import { PDFDocument, rgb, StandardFonts, PDFString, PDFName } from 'pdf-lib';

type StatusItem = {
  status: string;
  yesNo?: string;
};

type LeStatusItem = {
  status: string;
  remarks: string;
};

export interface MaintenanceReportData {
  cinemaName: string
  date: string
  address: string
  contactDetails: string
  location: string
  screenNo: string
  serviceVisit: string
  projectorModel: string
  serialNo: string
  runningHours: string
  projectorEnvironment?: string
  startTime?: string
  endTime?: string

  opticals: {
    reflector: StatusItem;
    uvFilter: StatusItem;
    integratorRod: StatusItem;
    coldMirror: StatusItem;
    foldMirror: StatusItem;
  };

  electronics: {
    touchPanel: StatusItem;
    evbBoard: StatusItem;
    ImcbBoard: StatusItem;
    pibBoard: StatusItem;
    IcpBoard: StatusItem;
    imbSBoard: StatusItem;
  };

  serialVerified: StatusItem;
  AirIntakeLadRad: StatusItem;
  coolant: StatusItem;

  lightEngineTest: {
    white: StatusItem;
    red: StatusItem;
    green: StatusItem;
    blue: StatusItem;
    black: StatusItem;
  };

  mechanical: {
    acBlower: StatusItem;
    extractor: StatusItem;
    exhaustCFM: StatusItem;
    lightEngine4Fans: StatusItem;
    cardCageFans: StatusItem;
    radiatorFan: StatusItem;
    connectorHose: StatusItem;
    securityLock: StatusItem;
  };

  lampLOC: StatusItem;

  lampMake: string;
  lampHours: string;
  currentLampHours: string;
  voltageParams: { pvn: string; pve: string; nve: string };
  flBefore: string;
  flAfter: string;
  contentPlayer: string;
  acStatus: string;
  leStatus: LeStatusItem;
  remarks: string;
  leSerialNo: string;

  mcgdData: {
    white2K: { fl: string; x: string; y: string };
    white4K: { fl: string; x: string; y: string };
    red2K: { fl: string; x: string; y: string };
    red4K: { fl: string; x: string; y: string };
    green2K: { fl: string; x: string; y: string };
    green4K: { fl: string; x: string; y: string };
    blue2K: { fl: string; x: string; y: string };
    blue4K: { fl: string; x: string; y: string };
  };

  cieXyz2K: { x: string; y: string; fl: string };
  cieXyz4K: { x: string; y: string; fl: string };

  softwareVersion: string;
  screenInfo: {
    scope: { height: string; width: string; gain: string };
    flat: { height: string; width: string; gain: string };
    make: string;
  };
  throwDistance: string;

  imageEvaluation: {
    focusBoresite: StatusItem;
    integratorPosition: StatusItem;
    spotOnScreen: StatusItem;
    screenCropping: StatusItem;
    convergence: StatusItem;
    channelsChecked: StatusItem;
    pixelDefects: StatusItem;
    imageVibration: StatusItem;
    liteLOC: StatusItem;
  };

  airPollution: {
    airPollutionLevel: string;
    hcho: string
    tvoc: string
    pm10: string
    pm25: string
    pm100: string
    temperature: string
    humidity: string
  }

  recommendedParts?: Array<{ partNumber: string; description?: string }>
  issueNotes?: Array<{ label: string; note: string }>
  detectedIssues?: Array<{ label: string; value: string }>
  reportGenerated?: boolean
  reportUrl?: string
  engineerSignatureUrl?: string
  siteSignatureUrl?: string
  imagesUrl?: string
  imagesLink?: string
  serviceId?: string
}

// Normalize yes/no strings to consistent 'Yes' / 'No' for PDF display
const normalizeYesNo = (value?: string) => {
  if (!value) return '';
  const v = value.trim().toLowerCase();
  if (v === 'yes') return 'Yes';
  if (v === 'no') return 'No';
  return value;
};

// Convert number to ordinal text (1 -> "First", 2 -> "Second", etc.)
// If already text format, capitalize and return. If other text, keep as-is.
export const convertServiceVisitToText = (value: string | number | null | undefined): string => {
  if (!value) return '';
  const str = String(value).trim();
  const lowerStr = str.toLowerCase();

  // Map of valid ordinals (case-insensitive)
  const ordinalMap: Record<string, string> = {
    'first': 'First',
    'second': 'Second',
    'third': 'Third',
    'fourth': 'Fourth',
    'fifth': 'Fifth',
    'sixth': 'Sixth',
    'seventh': 'Seventh',
    'eighth': 'Eighth',
    'ninth': 'Ninth',
    'tenth': 'Tenth',
    'special': 'Special'
  };

  // If already in text format, return capitalized version
  if (ordinalMap[lowerStr]) {
    return ordinalMap[lowerStr];
  }

  // Convert number to ordinal
  const num = parseInt(str, 10);
  if (!isNaN(num)) {
    const ordinals = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
    return ordinals[num] || `${num}th`;
  }

  // If not a number and not a known ordinal, return as-is (capitalize first letter)
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export async function generateMaintenanceReport(data: MaintenanceReportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Load fonts in parallel
  const [timesRoman, timesRomanBold] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.TimesRoman),
    pdfDoc.embedFont(StandardFonts.TimesRomanBold),
  ]);

  // Helper function to load and embed an image
  const loadImage = async (url: string): Promise<any> => {
    try {
      let imageBytes: ArrayBuffer;

      // Handle data URLs (base64)
      if (url.startsWith('data:')) {
        const base64Data = url.split(',')[1];
        if (!base64Data) return null;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        imageBytes = bytes.buffer;
      } else {
        // Handle regular URLs with a timeout for slow connections
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
          const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; PDFGenerator/1.0)',
            },
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
            console.warn(`Image fetch failed for ${url}: ${response.status} ${response.statusText}`);
            return null;
          }
          imageBytes = await response.arrayBuffer();
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          console.warn(`Image fetch timeout or error for ${url}:`, fetchError?.message || fetchError);
          return null;
        }
      }

      // Try PNG first, then JPG
      try {
        return await pdfDoc.embedPng(imageBytes);
      } catch {
        try {
          return await pdfDoc.embedJpg(imageBytes);
        } catch {
          return null;
        }
      }
    } catch (error) {
      console.warn('Could not load image:', error);
      return null;
    }
  };

  // Load ALL images in PARALLEL for maximum speed
  const imagePromises: Promise<any>[] = [
    loadImage('https://bpkad12ybfat3cyp.public.blob.vercel-storage.com/logo/Ascomp.png').catch(() => {
      // Gracefully handle 403 or other errors for Ascomp logo
      console.warn('Could not load Ascomp logo, continuing without it');
      return null;
    }),
    loadImage('https://bpkad12ybfat3cyp.public.blob.vercel-storage.com/logo/Christie.png').catch(() => {
      // Gracefully handle 403 or other errors for Christie logo
      console.warn('Could not load Christie logo, continuing without it');
      return null;
    }),
  ];

  // Only add signature fetches if URLs are provided
  if (data.engineerSignatureUrl) {
    imagePromises.push(loadImage(data.engineerSignatureUrl));
  } else {
    imagePromises.push(Promise.resolve(null));
  }

  if (data.siteSignatureUrl) {
    imagePromises.push(loadImage(data.siteSignatureUrl));
  } else {
    imagePromises.push(Promise.resolve(null));
  }

  // Wait for all images to load simultaneously
  const [logoImage, logoImage2, engineerSignatureImage, siteSignatureImage] = await Promise.all(imagePromises);

  const page1 = pdfDoc.addPage([595, 842]);
  const page2 = pdfDoc.addPage([595, 842]);

  const { width, height } = page1.getSize();

  let yPos = height - 50;

  page1.drawRectangle({
    x: 40,
    y: yPos - 30,
    width: width - 60,
    height: 30,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  if (logoImage) {
    const logoScale = 0.016;
    const logoDims = logoImage.scale(logoScale);
    const logoHeight = logoDims.height;
    const headerCenterY = yPos - 15;
    page1.drawImage(logoImage, {
      x: 50,
      y: headerCenterY - logoHeight / 2,
      width: logoDims.width,
      height: logoHeight,
    });
  } else {
    page1.drawText('ASCOMP INC.', {
      x: 50,
      y: yPos - 20,
      size: 16,
      font: timesRomanBold,
      color: rgb(0.2, 0.6, 0.8),
    });
  }

  if (logoImage2) {
    const logoScale = 0.2;
    const logoDims = logoImage2.scale(logoScale);
    const logoHeight = logoDims.height;
    const headerCenterY = yPos - 15;
    page1.drawImage(logoImage2, {
      x: 500,
      y: headerCenterY - logoHeight / 2,
      width: logoDims.width,
      height: logoHeight,
    });
  } else {
    page1.drawText('ASCOMP INC.', {
      x: 450,
      y: 10,
      size: 16,
      font: timesRomanBold,
      color: rgb(0.2, 0.6, 0.8),
    });
  }

  page1.drawText('EW - Preventive Maintenance Report', {
    x: 220,
    y: yPos - 20,
    size: 14,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  yPos -= 35;

  const contactBoxHeight = 50;
  const contactBoxY = yPos - contactBoxHeight;

  page1.drawRectangle({
    x: 40,
    y: contactBoxY,
    width: width - 60,
    height: contactBoxHeight,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  page1.drawText('Contact Details', {
    x: 50,
    y: yPos - 12,
    size: 10,
    font: timesRomanBold,
    color: rgb(0.2, 0.6, 0.8),
  });

  page1.drawText('Address:', {
    x: 50,
    y: yPos - 28,
    size: 9,
    font: timesRomanBold,
  });
  page1.drawText('9, Community Centre, 2nd Floor, Phase I, Mayapuri, New Delhi, Delhi 110064', {
    x: 120,
    y: yPos - 28,
    size: 8,
    font: timesRoman,
  });

  page1.drawText('Landline:', {
    x: 50,
    y: yPos - 40,
    size: 9,
    font: timesRomanBold,
  });
  page1.drawText('011-45501226', {
    x: 120,
    y: yPos - 40,
    size: 8,
    font: timesRoman,
  });

  page1.drawText('Mobile:', {
    x: 240,
    y: yPos - 40,
    size: 9,
    font: timesRomanBold,
  });
  page1.drawText('8882475207', {
    x: 300,
    y: yPos - 40,
    size: 8,
    font: timesRoman,
  });

  page1.drawText('Email:', {
    x: 400,
    y: yPos - 40,
    size: 9,
    font: timesRomanBold,
  });
  page1.drawText('helpdesk@ascompinc.in', {
    x: 450,
    y: yPos - 40,
    size: 8,
    font: timesRoman,
  });

  yPos -= 50;

  drawTableRow(page1, timesRomanBold, timesRoman, 40, yPos, width - 80,
    ['CINEMA NAME:', data.cinemaName, 'DATE:', data.date], [100, 150, 80, 205], 20);
  yPos -= 20;

  drawTableRow(page1, timesRomanBold, timesRoman, 40, yPos, width - 80,
    ['Address:', data.address], [100, 435], 20);
  yPos -= 20;

  drawTableRow(page1, timesRomanBold, timesRoman, 40, yPos, width - 80,
    ['Contact Details', data.contactDetails, 'LOCATION:', data.location], [100, 150, 80, 205], 20);
  yPos -= 20;

  drawTableRow(page1, timesRomanBold, timesRoman, 40, yPos, width - 80,
    ['SCREEN No:', data.screenNo, 'Engg and EW Service visit:', convertServiceVisitToText(data.serviceVisit)], [100, 150, 120, 165], 20);
  yPos -= 20;

  drawTableRow(page1, timesRomanBold, timesRoman, 40, yPos, width - 80,
    ['Projector Model:', data.projectorModel, 'Serial No.:', data.serialNo, 'Running Hours:', data.runningHours, 'Replacement Required'], [80, 80, 70, 70, 70, 80, 85], 20);
  yPos -= 20;

  drawTableRow(page1, timesRomanBold, timesRomanBold, 40, yPos, width - 80,
    ['SECTIONS', 'DESCRIPTION', 'STATUS', 'YES/NO - OK'], [120, 170, 165, 80], 20);
  yPos -= 20;

  yPos = drawSection(page1, timesRomanBold, timesRoman, 40, yPos, width - 80, 'OPTICALS', [
    ['Reflector', data.opticals.reflector.status, data.opticals.reflector.yesNo || ''],
    ['UV filter', data.opticals.uvFilter.status, data.opticals.uvFilter.yesNo || ''],
    ['Integrator Rod', data.opticals.integratorRod.status, data.opticals.integratorRod.yesNo || ''],
    ['Cold Mirror', data.opticals.coldMirror.status, data.opticals.coldMirror.yesNo || ''],
    ['Fold Mirror', data.opticals.foldMirror.status, data.opticals.foldMirror.yesNo || ''],
  ]);

  yPos = drawSection(page1, timesRomanBold, timesRoman, 40, yPos, width - 80, 'ELECTRONICS', [
    ['Touch Panel', data.electronics.touchPanel.status, data.electronics.touchPanel.yesNo || ''],
    ['EVB Board', data.electronics.evbBoard.status, data.electronics.evbBoard.yesNo || ''],
    ['IMCB Board', data.electronics.ImcbBoard.status, data.electronics.ImcbBoard.yesNo || ''],
    ['PIB Board', data.electronics.pibBoard.status, data.electronics.pibBoard.yesNo || ''],
    ['ICP Board', data.electronics.IcpBoard.status, data.electronics.IcpBoard.yesNo || ''],
    ['IMB/S Board', data.electronics.imbSBoard.status, data.electronics.imbSBoard.yesNo || ''],
  ]);

  yPos = drawSection(page1, timesRomanBold, timesRoman, 40, yPos, width - 80, 'Serial Number verified', [
    ['Chassis label vs Touch Panel', data.serialVerified.status, data.serialVerified.yesNo || ''],
  ]);

  yPos = drawSection(page1, timesRomanBold, timesRoman, 40, yPos, width - 80, 'Coolant', [
    ['Level and Color', data.coolant.status, data.coolant.yesNo || ''],
  ]);

  yPos = drawSection(page1, timesRomanBold, timesRoman, 40, yPos, width - 80, 'Disposable Consumables', [
    ['Air Intake, LAD and RAD', data.AirIntakeLadRad.status, data.AirIntakeLadRad.yesNo || ''],
  ]);

  yPos = drawSection(page1, timesRomanBold, timesRoman, 40, yPos, width - 80, 'Light Engine Test Pattern', [
    ['White', data.lightEngineTest.white.status, data.lightEngineTest.white.yesNo || ''],
    ['Red', data.lightEngineTest.red.status, data.lightEngineTest.red.yesNo || ''],
    ['Green', data.lightEngineTest.green.status, data.lightEngineTest.green.yesNo || ''],
    ['Blue', data.lightEngineTest.blue.status, data.lightEngineTest.blue.yesNo || ''],
    ['Black', data.lightEngineTest.black.status, data.lightEngineTest.black.yesNo || ''],
  ]);

  yPos = drawSection(page1, timesRomanBold, timesRoman, 40, yPos, width - 80, 'MECHANICAL', [
    ['AC blower and Vane Switch', data.mechanical.acBlower.status, data.mechanical.acBlower.yesNo || ''],
    ['Extractor Vane Switch', data.mechanical.extractor.status, data.mechanical.extractor.yesNo || ''],
    ['Exhaust CFM - Value', data.mechanical.exhaustCFM.status, data.mechanical.exhaustCFM.yesNo || ''],
    ['Light Engine 4 fans with LAD fan', data.mechanical.lightEngine4Fans.status, data.mechanical.lightEngine4Fans.yesNo || ''],
    ['Card Cage Top and Bottom fans', data.mechanical.cardCageFans.status, data.mechanical.cardCageFans.yesNo || ''],
    ['Radiator fan and Pump', data.mechanical.radiatorFan.status, data.mechanical.radiatorFan.yesNo || ''],
    ['Connector and hose for the Pump', data.mechanical.connectorHose.status, data.mechanical.connectorHose.yesNo || ''],
    ['Security and lamp house lock switch', data.mechanical.securityLock.status, data.mechanical.securityLock.yesNo || ''],
  ]);

  yPos = drawSection(page1, timesRomanBold, timesRoman, 40, yPos, width - 80, 'Lamp LOC Mechanism X,', [
    ['Y and Z movement', data.lampLOC.status, data.lampLOC.yesNo || ''],
  ])

  if (data.projectorEnvironment) {
    drawTableRow(page1, timesRomanBold, timesRoman, 40, yPos, width - 80,
      ['Projector placement, room and environment:', data.projectorEnvironment], [200, 335], 40);
    yPos -= 40;
  }

  yPos = height - 50;

  drawTableRow(page2, timesRomanBold, timesRoman, 40, yPos, width - 80,
    ['Lamp Make and Model:', data.lampMake], [150, 365], 20);
  yPos -= 20;

  drawTableRow(page2, timesRomanBold, timesRoman, 40, yPos, width - 80,
    ['Number of hours running:', data.lampHours, 'Current lamp running hours:', data.currentLampHours], [150, 150, 150, 65], 20);
  yPos -= 20;

  drawTableRow(page2, timesRomanBold, timesRomanBold, 40, yPos, width - 80,
    ['Voltage parameters', 'P vs N', 'P vs E', 'N vs E'], [150, 122, 122, 121], 20);
  yPos -= 20;

  drawTableRow(page2, timesRoman, timesRoman, 40, yPos, width - 80,
    ['', data.voltageParams.pvn, data.voltageParams.pve, data.voltageParams.nve], [150, 122, 122, 121], 20);
  yPos -= 20;

  drawTableRow(page2, timesRomanBold, timesRomanBold, 40, yPos, width - 80,
    ['fL measurements:', 'Before', 'After'], [150, 150, 215], 20);
  yPos -= 20;
  drawTableRow(page2, timesRoman, timesRoman, 40, yPos, width - 80,
    ['', data.flBefore, data.flAfter], [150, 150, 215], 20);
  yPos -= 20;

  drawTableRow(page2, timesRomanBold, timesRoman, 40, yPos, width - 80,
    ['Content Player Model:', data.contentPlayer, 'AC Status:', data.acStatus], [150, 150, 95, 120], 20);
  yPos -= 20;

  // const leStatusText = data.leStatus.remarks 
  //   ? `${data.leStatus.status} - ${data.leStatus.remarks}`
  //   : data.leStatus.status;

  // const leStatusLines = wrapText(leStatusText, 365 - 6, timesRoman, 8);
  // const leRowHeight = Math.max(20, (leStatusLines.length * 12) + 8);

  const leStatusStr = data.leStatus.status;
  const leRemarksStr = data.leStatus.remarks;
  const leCombined = (leStatusStr && leRemarksStr)
    ? `${leStatusStr} - ${leRemarksStr}`
    : (leStatusStr || leRemarksStr || '');

  drawTableRow(page2, timesRomanBold, timesRoman, 40, yPos, width - 80,
    ['LE Status during PM:', leCombined], [150, 365], 20);
  yPos -= 20;
  // Draw remarks row with multi-line support
  const remarksText = data.remarks || '';
  const remarksWidth = 285;
  const textSize = 8;
  const lineHeight = 12;
  const maxRemarksWidth = remarksWidth - 6;

  // Calculate how many lines the remarks will take
  const remarksLines = wrapText(remarksText, maxRemarksWidth, timesRoman, textSize);
  const remarksRowHeight = Math.max(40, (remarksLines.length * lineHeight) + 8);

  // Draw the row with dynamic height
  let currentX = 40;

  // Remarks label cell
  page2.drawRectangle({
    x: currentX,
    y: yPos - remarksRowHeight,
    width: 80,
    height: remarksRowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  page2.drawText('Remarks:', {
    x: currentX + 3,
    y: yPos - remarksRowHeight + (remarksRowHeight / 2) - 3,
    size: textSize,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });
  currentX += 80;

  // Remarks content cell (multi-line)
  page2.drawRectangle({
    x: currentX,
    y: yPos - remarksRowHeight,
    width: remarksWidth,
    height: remarksRowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  remarksLines.forEach((line, index) => {
    const lineY = yPos - remarksRowHeight + (remarksRowHeight - (index + 1) * lineHeight) + 4;
    page2.drawText(line, {
      x: currentX + 3,
      y: lineY,
      size: textSize,
      font: timesRoman,
      color: rgb(0, 0, 0),
      maxWidth: maxRemarksWidth,
    });
  });
  currentX += remarksWidth;

  // LE S. No. label cell
  page2.drawRectangle({
    x: currentX,
    y: yPos - remarksRowHeight,
    width: 80,
    height: remarksRowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  page2.drawText('LE S. No.:', {
    x: currentX + 3,
    y: yPos - remarksRowHeight + (remarksRowHeight / 2) - 3,
    size: textSize,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });
  currentX += 80;

  // LE S. No. value cell
  page2.drawRectangle({
    x: currentX,
    y: yPos - remarksRowHeight,
    width: 70,
    height: remarksRowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  page2.drawText(data.leSerialNo || '', {
    x: currentX + 3,
    y: yPos - remarksRowHeight + (remarksRowHeight / 2) - 3,
    size: textSize,
    font: timesRoman,
    color: rgb(0, 0, 0),
    maxWidth: 64,
  });

  yPos -= remarksRowHeight

  const leftTableX = 40
  const rightTableX = 300
  const rightColumnStart = yPos
  let leftY = yPos

  drawTableRow(page2, timesRomanBold, timesRoman, leftTableX, leftY, 240,
    ['Software Version', data.softwareVersion], [80, 160], 20);
  leftY -= 45;

  page2.drawText('Screen Information in metres', {
    x: leftTableX,
    y: leftY,
    size: 10,
    font: timesRomanBold,
  });
  leftY -= 10;

  drawTableRow(page2, timesRomanBold, timesRomanBold, leftTableX, leftY, 240,
    ['', 'Height', 'Width', 'Gain'], [60, 60, 60, 60], 20);
  leftY -= 20;

  drawTableRow(page2, timesRomanBold, timesRoman, leftTableX, leftY, 240,
    ['SCOPE', data.screenInfo.scope.height, data.screenInfo.scope.width, data.screenInfo.scope.gain], [60, 60, 60, 60], 20);
  leftY -= 20;

  drawTableRow(page2, timesRomanBold, timesRoman, leftTableX, leftY, 240,
    ['FLAT', data.screenInfo.flat.height, data.screenInfo.flat.width, data.screenInfo.flat.gain], [60, 60, 60, 60], 20);
  leftY -= 20;

  drawTableRow(page2, timesRomanBold, timesRoman, leftTableX, leftY, 240,
    ['Screen Make', data.screenInfo.make], [120, 120], 20);
  leftY -= 20;

  drawTableRow(page2, timesRomanBold, timesRoman, leftTableX, leftY, 240,
    ['Throw Distance', data.throwDistance], [120, 120], 20);
  leftY -= 40;

  drawTableRow(page2, timesRomanBold, timesRomanBold, leftTableX, leftY, 240,
    ['Image Evaluation', 'OK - Yes/No'], [180, 60], 20);
  leftY -= 20;

  const evaluationItems: [string, StatusItem][] = [
    ['Focus/boresight', data.imageEvaluation.focusBoresite],

    ['Integrator Position', data.imageEvaluation.integratorPosition],
    ['Any Spot on the Screen after PPM', data.imageEvaluation.spotOnScreen],
    ['Check Screen Cropping - FLAT and SCOPE', data.imageEvaluation.screenCropping],
    ['Convergence Checked', data.imageEvaluation.convergence],
    ['Channels Checked - Scope, Flat, Alternative', data.imageEvaluation.channelsChecked],
    ['Pixel defects', data.imageEvaluation.pixelDefects],
    ['Excessive image vibration', data.imageEvaluation.imageVibration],
    ['LiteLOC', data.imageEvaluation.liteLOC],
  ];

  for (const [label, item] of evaluationItems) {
    const itemObj = item as StatusItem; // Type assertion since array elements are inferred as StatusItem
    const statusText = normalizeYesNo(itemObj.yesNo);

    drawTableRow(page2, timesRoman, timesRoman, leftTableX, leftY, 240,
      [label || '', statusText], [180, 60], 16)

    leftY -= 16

    if (itemObj.status) {
      drawTableRow(page2, timesRoman, timesRoman, leftTableX, leftY, 240,
        [`Remarks: ${itemObj.status}`], [240], 16);
      leftY -= 16;
    }
  }

  let rightY = rightColumnStart;

  drawTableRow(page2, timesRomanBold, timesRomanBold, rightTableX, rightY, 255,
    ['MCGD', 'fL', 'x', 'y'], [120, 45, 45, 45], 20);
  rightY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
    ['W2K', data.mcgdData.white2K.fl, data.mcgdData.white2K.x, data.mcgdData.white2K.y], [120, 45, 45, 45], 20);
  rightY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
    ['W4K', data.mcgdData.white4K.fl, data.mcgdData.white4K.x, data.mcgdData.white4K.y], [120, 45, 45, 45], 20);
  rightY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
    ['R2K', data.mcgdData.red2K.fl, data.mcgdData.red2K.x, data.mcgdData.red2K.y], [120, 45, 45, 45], 20);
  rightY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
    ['R4K', data.mcgdData.red4K.fl, data.mcgdData.red4K.x, data.mcgdData.red4K.y], [120, 45, 45, 45], 20);
  rightY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
    ['G2K', data.mcgdData.green2K.fl, data.mcgdData.green2K.x, data.mcgdData.green2K.y], [120, 45, 45, 45], 20);
  rightY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
    ['G4K', data.mcgdData.green4K.fl, data.mcgdData.green4K.x, data.mcgdData.green4K.y], [120, 45, 45, 45], 20);
  rightY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
    ['B2K', data.mcgdData.blue2K.fl, data.mcgdData.blue2K.x, data.mcgdData.blue2K.y], [120, 45, 45, 45], 20);
  rightY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
    ['B4K', data.mcgdData.blue4K.fl, data.mcgdData.blue4K.x, data.mcgdData.blue4K.y], [120, 45, 45, 45], 20);
  rightY -= 40;

  page2.drawText('CIE XYZ Color Accuracy', {
    x: rightTableX,
    y: rightY,
    size: 10,
    font: timesRomanBold,
  });
  rightY -= 10;

  drawTableRow(page2, timesRomanBold, timesRoman, rightTableX, rightY, 255,
    ['Test Pattern', 'x', 'y', 'fL'], [120, 45, 45, 45], 20);
  rightY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
    ['BW Step-10 2K', data.cieXyz2K.x, data.cieXyz2K.y, data.cieXyz2K.fl], [120, 45, 45, 45], 20);
  rightY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
    ['BW Step-10 4K', data.cieXyz4K.x, data.cieXyz4K.y, data.cieXyz4K.fl], [120, 45, 45, 45], 20);
  rightY -= 40;

  page2.drawText('Recommended Parts', {
    x: rightTableX,
    y: rightY,
    size: 10,
    font: timesRomanBold,
  });
  rightY -= 10;
  drawTableRow(page2, timesRomanBold, timesRomanBold, rightTableX, rightY, 255,
    ['Part Name', 'Part Number'], [180, 75], 20);
  rightY -= 20;
  if (data.recommendedParts && data.recommendedParts.length > 0) {
    data.recommendedParts.forEach((part) => {
      // Support both 'name' and 'description' fields (name takes priority)
      const partName = (part as any).name || (part as any).description || ''
      // Support both { partNumber } and { part_number } shapes
      const rawPartNumber = (part as any).partNumber ?? (part as any).part_number ?? ''
      const partNumber = String(rawPartNumber || '')
      const nameLines = partName.length > 30
        ? [partName.substring(0, 30), partName.substring(30)]
        : [partName]

      nameLines.forEach((line, idx) => {
        if (idx === 0) {
          drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
            [line, partNumber], [180, 75], 16);
        } else {
          drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
            [line, ''], [180, 75], 16);
        }
        rightY -= 16
      })
    })
  } else {
    drawTableRow(page2, timesRoman, timesRoman, rightTableX, rightY, 255,
      ['None', '-'], [180, 75], 16);
    rightY -= 16
  }

  // Images Link Section
  if (data.imagesLink || data.imagesUrl) {
    console.log("imagesLink", data.imagesLink, data.imagesUrl);
    let imagesLink = data.imagesLink || data.imagesUrl || '';

    // Ensure the link is absolute (so PDF viewers don't treat it as file://)
    if (imagesLink && !/^https?:\/\//i.test(imagesLink)) {
      if (typeof window !== 'undefined' && window.location?.origin) {
        imagesLink = `${window.location.origin}${imagesLink.startsWith('/') ? '' : '/'}${imagesLink}`;
      }
    }
    const labelX = leftTableX;
    const linkX = leftTableX + 50;
    const cellWidth = width - 350;
    const labelWidth = 50;
    const linkWidth = cellWidth - labelWidth;
    const cellHeight = 20;
    const cellY = leftY - cellHeight;

    // Draw table cells manually to customize colors
    // Label cell
    page2.drawRectangle({
      x: labelX,
      y: cellY,
      width: labelWidth,
      height: cellHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });
    page2.drawText('Image Link', {
      x: labelX + 3,
      y: cellY + 7,
      size: 8,
      font: timesRomanBold,
      color: rgb(0, 0, 1), // Blue color
    });

    // Link cell
    page2.drawRectangle({
      x: linkX,
      y: cellY,
      width: linkWidth,
      height: cellHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });
    const displayText = 'Images';
    page2.drawText(displayText, {
      x: linkX + 3,
      y: cellY + 7,
      size: 8,
      font: timesRoman,
      color: rgb(0, 0, 1), // Blue color for link
      maxWidth: linkWidth - 6,
    });

    // Make the "Images" text clickable with the actual URL
    try {
      // PDF coordinates: origin is at bottom-left
      const linkBottom = cellY;
      const linkTop = cellY + cellHeight;
      const linkLeft = linkX;
      const linkRight = linkX + linkWidth;

      // Create URI action - URI must be a PDFString
      const uriAction = pdfDoc.context.obj({
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(imagesLink),
      });

      // Create link annotation
      const linkAnnotation = pdfDoc.context.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Link'),
        Rect: [linkLeft, linkBottom, linkRight, linkTop],
        Border: [0, 0, 0],
        A: uriAction,
      });

      const annotationRef = pdfDoc.context.register(linkAnnotation);

      // Add annotation to page's Annots array
      const annotsName = PDFName.of('Annots');
      const existingAnnots = page2.node.lookup(annotsName);

      if (existingAnnots) {
        const annotsArray = existingAnnots as any;
        const currentAnnots = annotsArray.array || [];
        page2.node.set(annotsName, pdfDoc.context.obj([...currentAnnots, annotationRef]));
      } else {
        page2.node.set(annotsName, pdfDoc.context.obj([annotationRef]));
      }
    } catch (error) {
      console.warn('Could not add clickable link annotation:', error);
    }

    leftY -= cellHeight;
  }

  rightY -= 10;

  leftY -= 60;

  drawTableRow(page2, timesRomanBold, timesRomanBold, leftTableX, leftY, width - 80,
    ['Air Pollution Level', 'HCHO', 'TVOC', 'PM1.0', 'PM2.5', 'PM10', 'Temperature C', 'Humidity %'], [100, 59, 59, 59, 59, 59, 59, 59], 20);
  leftY -= 20;

  drawTableRow(page2, timesRoman, timesRoman, leftTableX, leftY, width - 80,
    [data.airPollution.airPollutionLevel, data.airPollution.hcho, data.airPollution.tvoc, data.airPollution.pm100, data.airPollution.pm25, data.airPollution.pm10, data.airPollution.temperature, data.airPollution.humidity], [100, 59, 59, 59, 59, 59, 59, 59], 20);

  // Draw signature images and labels
  const signatureLabelY = 30;
  const signatureImageY = 50;
  const signatureHeight = 50;
  const signatureWidth = 120;

  // Client's Signature (left side)
  if (siteSignatureImage) {
    const sigDims = siteSignatureImage.scale(0.25);
    const imgWidth = Math.min(signatureWidth, sigDims.width);
    const imgHeight = Math.min(signatureHeight, sigDims.height);
    page2.drawImage(siteSignatureImage, {
      x: 60,
      y: signatureImageY,
      width: imgWidth,
      height: imgHeight,
    });
  }
  page2.drawText("Client's Signature & Stamp", {
    x: 60,
    y: signatureLabelY,
    size: 10,
    font: timesRomanBold,
  });

  // Engineer's Signature (right side)
  if (engineerSignatureImage) {
    const sigDims = engineerSignatureImage.scale(0.25);
    const imgWidth = Math.min(signatureWidth, sigDims.width);
    const imgHeight = Math.min(signatureHeight, sigDims.height);
    page2.drawImage(engineerSignatureImage, {
      x: width - 180,
      y: signatureImageY,
      width: imgWidth,
      height: imgHeight,
    });
  }
  page2.drawText("Engineer's Signature", {
    x: width - 180,
    y: signatureLabelY,
    size: 10,
    font: timesRomanBold,
  });

  return await pdfDoc.save();
}

// Helper function to wrap text into multiple lines
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [''];

  // Replace newlines with spaces and sanitize text
  const sanitizedText = text.replace(/[\n\r]+/g, ' ').replace(/[^\x20-\x7E]/g, '');
  const words = sanitizedText.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    // Use font.widthOfTextAtSize for accurate text width measurement
    const textWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (textWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // If a single word is too long, break it (though this shouldn't happen normally)
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        // Break long word - split by characters
        let wordPart = '';
        for (const char of word) {
          const testWordPart = wordPart + char;
          if (font.widthOfTextAtSize(testWordPart, fontSize) <= maxWidth) {
            wordPart = testWordPart;
          } else {
            if (wordPart) lines.push(wordPart);
            wordPart = char;
          }
        }
        currentLine = wordPart;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

function drawTableRow(
  page: any,
  boldFont: any,
  regularFont: any,
  x: number,
  y: number,
  _totalWidth: number,
  cells: string[],
  widths: number[],
  height: number
) {
  let currentX = x;

  for (let i = 0; i < cells.length; i++) {
    page.drawRectangle({
      x: currentX,
      y: y - height,
      width: widths[i] || 0,
      height: height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });

    const font = i % 2 === 0 ? boldFont : regularFont;
    const textSize = 8;
    const text = cells[i] || '';
    const textX = currentX + 3;
    const textY = y - height + (height / 2) - 3;

    page.drawText(text, {
      x: textX,
      y: textY,
      size: textSize,
      font: font,
      color: rgb(0, 0, 0),
      maxWidth: (widths[i] || 0) - 6,
    });

    currentX += widths[i] || 0;
  }
}

function drawSection(
  page: any,
  boldFont: any,
  regularFont: any,
  x: number,
  y: number,
  _totalWidth: number,
  sectionName: string,
  items: string[][]
): number {
  const rowHeight = 15;
  let currentY = y;

  page.drawRectangle({
    x: x,
    y: currentY - rowHeight * items.length,
    width: 120,
    height: rowHeight * items.length,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });

  page.drawText(sectionName, {
    x: x + 5,
    y: currentY - 10,
    size: 8,
    font: boldFont,
  });

  for (let i = 0; i < items.length; i++) {
    const itemY = currentY - (i * rowHeight);

    page.drawRectangle({
      x: x + 120,
      y: itemY - rowHeight,
      width: 170,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });

    page.drawText(items[i]?.[0] || '', {
      x: x + 125,
      y: itemY - 10,
      size: 8,
      font: regularFont,
    });

    page.drawRectangle({
      x: x + 290,
      y: itemY - rowHeight,
      width: 165,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });

    page.drawText(items[i]?.[1] || '', {
      x: x + 295,
      y: itemY - 10,
      size: 7,
      font: regularFont,
    });

    page.drawRectangle({
      x: x + 455,
      y: itemY - rowHeight,
      width: 80,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });

    page.drawText(items[i]?.[2] || '', {
      x: x + 460,
      y: itemY - 10,
      size: 8,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
  }

  return currentY - (rowHeight * items.length);
}
