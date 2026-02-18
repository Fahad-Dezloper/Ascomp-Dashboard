import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Initialize OAuth2 client for Google Drive
function getOAuth2Client(): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_OAUTH_CLIENT_ID,
    process.env.GMAIL_OAUTH_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
  });

  return oauth2Client;
}

// Get Google Drive instance
function getDriveClient() {
  const auth = getOAuth2Client();
  return google.drive({ version: "v3", auth });
}

/**
 * Create a new folder in Google Drive
 * @param folderName - Name of the folder to create
 * @returns Folder ID and web view link
 */
export async function createDriveFolder(folderName: string): Promise<{
  folderId: string;
  webViewLink: string;
}> {
  const drive = getDriveClient();

  const folderMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: "id, webViewLink",
  });

  if (!folder.data.id || !folder.data.webViewLink) {
    throw new Error("Failed to create folder in Google Drive");
  }

  return {
    folderId: folder.data.id,
    webViewLink: folder.data.webViewLink,
  };
}

/**
 * Set folder permissions to "Anyone with link can view"
 * @param folderId - ID of the folder
 */
export async function setFolderPublicPermissions(folderId: string): Promise<void> {
  const drive = getDriveClient();

  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });
}

/**
 * Upload a PDF from URL or Buffer to Google Drive
 * @param pdfSource - Public URL of the PDF or Buffer/Uint8Array
 * @param fileName - Name for the file in Drive
 * @param folderId - Parent folder ID
 * @returns File ID
 */
export async function uploadPdfToDrive(
  pdfSource: string | Buffer | Uint8Array,
  fileName: string,
  folderId: string
): Promise<string> {
  const drive = getDriveClient();
  let buffer: Buffer;

  if (typeof pdfSource === 'string') {
    // It's a URL - fetch it
    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await fetch(pdfSource, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AscompExportWorker/1.0)'
          }
        });
        
        if (response.ok) break;
        console.log(`Fetch failed (${response.status}), retrying... (${retries} retries left)`);
      } catch (e) {
        console.log(`Fetch error, retrying... (${retries} retries left)`);
      }
      
      retries--;
      if (retries > 0) await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!response || !response.ok) {
        const status = response ? `${response.status} ${response.statusText}` : 'Unknown Error';
        throw new Error(`Failed to fetch PDF from ${pdfSource}: ${status}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    buffer = Buffer.from(pdfBuffer);
  } else {
    // It's already a buffer
    buffer = Buffer.isBuffer(pdfSource) ? pdfSource : Buffer.from(pdfSource);
  }

  // Convert Buffer to Readable stream for googleapis
  const { Readable } = await import('stream');
  const stream = Readable.from(buffer);

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
    mimeType: "application/pdf",
  };

  const media = {
    mimeType: "application/pdf",
    body: stream,
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id",
  });

  if (!file.data.id) {
    throw new Error("Failed to upload PDF to Google Drive");
  }

  return file.data.id;
}

/**
 * Upload multiple PDFs to a Drive folder
 * @param pdfs - Array of {url?, buffer?, fileName} objects
 * @param folderName - Name for the folder
 * @param onProgress - Optional callback for progress updates
 * @returns Folder web view link
 */
export async function uploadPdfsToDrive(
  pdfs: Array<{ url?: string; buffer?: Buffer | Uint8Array; fileName: string }>,
  folderName: string,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  // Create folder
  const { folderId, webViewLink } = await createDriveFolder(folderName);

  // Set public permissions
  await setFolderPublicPermissions(folderId);


  // Upload PDFs in batches to avoid rate limits
  const BATCH_SIZE = 10;
  let uploaded = 0;

  for (let i = 0; i < pdfs.length; i += BATCH_SIZE) {
    const batch = pdfs.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (pdf) => {
        try {
          // Prefer buffer if available, otherwise use URL
          const source = pdf.buffer || pdf.url;
          if (!source) {
            console.error(`Skipping ${pdf.fileName}: No buffer or URL provided`);
            return;
          }
          
          await uploadPdfToDrive(source, pdf.fileName, folderId);
          uploaded++;
          if (onProgress) {
            onProgress(uploaded, pdfs.length);
          }
        } catch (error) {
          console.error(`Failed to upload ${pdf.fileName}:`, error);
          // Continue with other files even if one fails
        }
      })
    );

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < pdfs.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return webViewLink;
}
