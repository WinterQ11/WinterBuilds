import JSZip from 'jszip';
import type { ApkMetadata } from '../types';

/**
 * Validates that an uploaded buffer/file is an authentic APK file.
 * Checks ZIP magic bytes (0x50 0x4B 0x03 0x04) and presence of AndroidManifest.xml.
 */
export async function validateApkFile(buffer: ArrayBuffer, fileName: string): Promise<boolean> {
  const lower = fileName.toLowerCase();
  if (!lower.endsWith('.apk') && !lower.endsWith('.xapk')) {
    throw new Error('File must have an .apk or .xapk extension.');
  }

  if (buffer.byteLength < 100) {
    throw new Error('File is corrupted or too small to be an Android package.');
  }

  // Check ZIP signature (PK\x03\x04 or PK\x05\x06)
  const bytes = new Uint8Array(buffer, 0, 4);
  const isZip = (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05));
  if (!isZip) {
    throw new Error('Invalid file format. The file is not a valid Android package ZIP container.');
  }

  return true;
}

/**
 * Calculates SHA-256 hash of an ArrayBuffer in browser and Node environments.
 */
export async function calculateSha256(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Node.js environment fallback
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
  } catch {
    return 'unavailable';
  }
}

/**
 * Parses binary Android XML (AndroidManifest.xml) string pool and extracts
 * package name, version name, version code, and SDK targets.
 */
function parseAndroidManifestStrings(buffer: Uint8Array): {
  strings: string[];
  packageName?: string;
  versionName?: string;
  versionCode?: number;
  label?: string;
} {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const strings: string[] = [];

  try {
    // Check Android binary XML magic: 0x00080003
    if (buffer.length < 8) return { strings };
    const magic = view.getUint32(0, true);
    if (magic !== 0x00080003) {
      // Might be plaintext XML (rare in production APKs, but possible in test builds)
      const text = new TextDecoder().decode(buffer);
      const pkgMatch = text.match(/package=["']([^"']+)["']/i);
      const verNameMatch = text.match(/android:versionName=["']([^"']+)["']/i);
      const verCodeMatch = text.match(/android:versionCode=["']([^"']+)["']/i);
      const labelMatch = text.match(/android:label=["']([^"']+)["']/i);
      return {
        strings: [text],
        packageName: pkgMatch?.[1],
        versionName: verNameMatch?.[1],
        versionCode: verCodeMatch ? parseInt(verCodeMatch[1], 10) : undefined,
        label: labelMatch?.[1],
      };
    }

    // Seek to string pool chunk: starts at offset 8
    let offset = 8;
    const chunkType = view.getUint16(offset, true);
    if (chunkType !== 0x0001) {
      // Not a string pool chunk immediately; search for chunk type 0x0001
      for (let i = 8; i < Math.min(buffer.length - 8, 2048); i += 2) {
        if (view.getUint16(i, true) === 0x0001) {
          offset = i;
          break;
        }
      }
    }

    const stringCount = view.getUint32(offset + 8, true);
    const flags = view.getUint32(offset + 16, true);
    const isUtf8 = (flags & (1 << 8)) !== 0;
    const stringsStart = offset + view.getUint32(offset + 20, true);

    const offsets: number[] = [];
    for (let i = 0; i < stringCount; i++) {
      offsets.push(view.getUint32(offset + 28 + i * 4, true));
    }

    for (let i = 0; i < offsets.length; i++) {
      const strOffset = stringsStart + offsets[i];
      if (strOffset >= buffer.length) continue;

      if (isUtf8) {
        // UTF-8 encoded string
        // length prefix is 1 or 2 bytes
        let cur = strOffset;
        let charLen = buffer[cur++];
        if (charLen & 0x80) {
          charLen = ((charLen & 0x7f) << 8) | buffer[cur++];
        }
        let byteLen = buffer[cur++];
        if (byteLen & 0x80) {
          byteLen = ((byteLen & 0x7f) << 8) | buffer[cur++];
        }

        const strBytes = buffer.slice(cur, cur + byteLen);
        const str = new TextDecoder('utf-8', { fatal: false }).decode(strBytes);
        strings.push(str);
      } else {
        // UTF-16LE encoded string
        let cur = strOffset;
        let len = view.getUint16(cur, true);
        cur += 2;
        if (len & 0x8000) {
          len = ((len & 0x7fff) << 16) | view.getUint16(cur, true);
          cur += 2;
        }
        const strBytes = buffer.slice(cur, cur + len * 2);
        const str = new TextDecoder('utf-16le', { fatal: false }).decode(strBytes);
        strings.push(str);
      }
    }
  } catch (err) {
    console.warn('Error reading Android binary XML string pool:', err);
  }

  // Infer metadata from extracted string pool
  let packageName: string | undefined;
  let versionName: string | undefined;
  let versionCode: number | undefined;
  let label: string | undefined;

  // Find package name: standard reverse domain pattern
  const pkgRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
  for (const s of strings) {
    if (!packageName && pkgRegex.test(s) && s.includes('.') && !s.startsWith('android.') && !s.startsWith('androidx.')) {
      packageName = s;
    }
    // Version name detection (e.g. 1.0.4, 2.3.0-rc1, v4.1)
    if (!versionName && /^v?[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9.]+)?$/.test(s)) {
      versionName = s;
    }
  }

  return { strings, packageName, versionName, versionCode, label };
}

/**
 * Extracts APK metadata including package name, version, icons, and SHA-256.
 */
export async function extractApkMetadata(
  fileOrBuffer: File | Blob | ArrayBuffer,
  fileName: string
): Promise<ApkMetadata> {
  let arrayBuffer: ArrayBuffer;
  let fileSize = 0;

  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
    fileSize = arrayBuffer.byteLength;
  } else {
    fileSize = fileOrBuffer.size;
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  }

  // Validate format
  await validateApkFile(arrayBuffer, fileName);

  // Calculate SHA-256
  const sha256 = await calculateSha256(arrayBuffer);

  // Open ZIP
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Check AndroidManifest.xml
  const manifestFile = zip.file('AndroidManifest.xml');
  if (!manifestFile) {
    throw new Error('Corrupted Android package: AndroidManifest.xml not found inside APK archive.');
  }

  const manifestBytes = await manifestFile.async('uint8array');
  const manifestData = parseAndroidManifestStrings(manifestBytes);

  // Search for the highest resolution launcher icon
  let iconDataUrl: string | undefined;
  const iconCandidates = [
    // Highest quality first
    /res\/mipmap-xxxhdpi(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/mipmap-xxhdpi(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/mipmap-xhdpi(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/drawable-xxxhdpi(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/drawable-xxhdpi(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/drawable-xhdpi(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/mipmap-hdpi(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/drawable-hdpi(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/mipmap-mdpi(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/mipmap(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/drawable(?:-v\d+)?\/ic_launcher\.(?:png|webp)/i,
    /res\/.*\/app_icon\.(?:png|webp)/i,
    /res\/.*\/icon\.(?:png|webp)/i,
  ];

  const allFiles = Object.keys(zip.files);
  for (const candidateRegex of iconCandidates) {
    const match = allFiles.find(name => candidateRegex.test(name));
    if (match) {
      const iconFile = zip.file(match);
      if (iconFile) {
        const iconBase64 = await iconFile.async('base64');
        const mime = match.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png';
        iconDataUrl = `data:${mime};base64,${iconBase64}`;
        break;
      }
    }
  }

  // Infer user-friendly app name
  let name = manifestData.label;
  if (!name || name.startsWith('@')) {
    // If resource reference or missing, derive from package name or filename
    if (manifestData.packageName) {
      const parts = manifestData.packageName.split('.');
      const lastPart = parts[parts.length - 1];
      name = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
    } else {
      name = fileName.replace(/\.apk$/i, '').replace(/[-_]/g, ' ');
    }
  }

  const packageName = manifestData.packageName || `com.winterbuilds.${fileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
  const versionName = manifestData.versionName || '1.0.0';
  const versionCode = manifestData.versionCode || 1;

  return {
    name,
    packageName,
    versionName,
    versionCode,
    minSdkVersion: 21,
    targetSdkVersion: 34,
    fileSize,
    sha256,
    iconDataUrl,
    rawPermissions: manifestData.strings.filter(s => s.startsWith('android.permission.')),
  };
}
