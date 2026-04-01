export const getS3UploadPath = (fieldname) => {
  switch (fieldname) {
    case "images":
    case "images[]":
      return { scope: "public", folder: "products" };

    case "productImages":
      return { scope: "public", folder: "products" };

    case "cropImages":
      return { scope: "public", folder: "crops" };

    case "postImage":
      return { scope: "public", folder: "posts" };

    case "profileImage":
      return { scope: "public", folder: "profiles" };

    case "diagnosisImage":
      return { scope: "private", folder: "diagnosis-reports" };

    case "soilHealthCard":
      return { scope: "private", folder: "soil-health" };

    case "labReport":
      return { scope: "private", folder: "lab-reports" };

    case "govtSchemeDocs":
      return { scope: "private", folder: "govt-schemes" };

    case "governmentDocument":
      return { scope: "private", folder: "government-docs" };

    default:
      return { scope: "private", folder: "others" };
  }
};
