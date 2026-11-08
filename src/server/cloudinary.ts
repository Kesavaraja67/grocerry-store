import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface SignedUploadParams {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * Generates a server signature for client-side direct image upload.
 * Owner-only; files uploaded to "pandian_store/products".
 */
export function generateSignedUploadParams(): SignedUploadParams {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = "pandian_store/products";

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    process.env.CLOUDINARY_API_SECRET || ""
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    folder,
  };
}

export default cloudinary;
