import { DOCUMENT_CONFIG } from "../utils/documentConfig.js";

export const getS3UploadPath = (fieldname) => {
  if (DOCUMENT_CONFIG[fieldname]) {
    const config = DOCUMENT_CONFIG[fieldname];
    return {
      scope: config.scope,
      folder: config.folder,
    };
  }

  switch (fieldname) {
    case "images":
    case "images[]":
      return { scope: "public", folder: "products" };

    case "productImages":
      return { scope: "public", folder: "products" };

    case "productVideos":
      return { scope: "public", folder: "products" };

    case "cropImages":
      return { scope: "public", folder: "crops" };

    case "postImage":
      return { scope: "public", folder: "posts" };

    case "profileImage":
      return { scope: "public", folder: "profiles" };

    case "broadcastImage":
      return { scope: "public", folder: "broadcasts" };

    case "diagnosisImage":
      return { scope: "public", folder: "diagnosis-reports" };

    case "soilHealthCard":
      return { scope: "private", folder: "soil-health" };

    case "labReport":
      return { scope: "private", folder: "lab-reports" };

    case "govtSchemeDocs":
      return { scope: "private", folder: "govt-schemes" };

    case "posterImages":
      return { scope: "public", folder: "posters" };

    case "hardwareProductImages":
      return { scope: "public", folder: "hardware-products" };

    case "hardwareProductVideos":
      return { scope: "public", folder: "hardware-products" };

    default:
      return { scope: "private", folder: "others" };
  }
};
