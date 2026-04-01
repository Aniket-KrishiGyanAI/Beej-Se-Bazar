export const getS3UploadPath = (fieldname) => {
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

    case "governmentDocument":
      return { scope: "private", folder: "government-docs" };

    case "seedLicense":
      return { scope: "private", folder: "seed-licenses" };

    case "fertilizerLicense":
      return { scope: "private", folder: "fertilizer-licenses" };

    case "procurementLicense":
      return { scope: "private", folder: "procurement-licenses" };

    case "GSTCertificate":
      return { scope: "private", folder: "gst-certificates" };

    case "posterImages":
      return { scope: "public", folder: "posters" };

    default:
      return { scope: "private", folder: "others" };
  }
};
