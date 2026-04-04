import { uploadToS3 } from "./s3Upload.js";
import { deleteFromS3 } from "./s3Delete.js";
import { DOCUMENT_CONFIG } from "./documentConfig.js";

export const base64ToFile = (base64String, fieldname) => {
  const base64Data = base64String.split(",")[1];
  const mimeType = base64String.split(";")[0].split(":")[1];
  const extension = mimeType.split("/")[1];
  const buffer = Buffer.from(base64Data, "base64");
  const timestamp = Date.now();
  const fileName = `${fieldname}_${timestamp}.${extension}`;

  return {
    buffer,
    originalname: fileName,
    mimetype: mimeType,
    size: buffer.length,
    fieldname: fieldname,
  };
};

export const handleSingleDocument = async (
  fieldname,
  fileOrBase64,
  userId,
  currentDocument,
) => {
  try {
    let fileObject = fileOrBase64;

    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
      fileObject = base64ToFile(fileOrBase64, fieldname);
    }

    const uploaded = await uploadToS3(fileObject, userId);

    // Always delete old document for single-document fields
    if (currentDocument?.key) {
      await deleteFromS3(currentDocument.key);
    }

    return uploaded;
  } catch (error) {
    console.error(`❌ ${fieldname} processing error:`, error.message);
    throw error;
  }
};

export const handleMultipleDocuments = async (
  fieldname,
  filesOrBase64Array,
  userId,
  currentDocuments,
  updateMode = "append",
) => {
  try {
    const docsArray = Array.isArray(filesOrBase64Array)
      ? filesOrBase64Array
      : [filesOrBase64Array];

    const uploadedDocs = [];

    for (let i = 0; i < docsArray.length; i++) {
      const item = docsArray[i];
      let fileObject = item;

      if (typeof item === "string" && item.startsWith("data:")) {
        fileObject = base64ToFile(item, fieldname);
      }

      const uploaded = await uploadToS3(fileObject, userId);
      uploadedDocs.push(uploaded);
    }

    if (uploadedDocs.length === 0) return null;

    // APPEND MODE: Keep existing documents and add new ones
    if (updateMode === "append") {
      const existingDocs = Array.isArray(currentDocuments)
        ? currentDocuments
        : [];
      return [...existingDocs, ...uploadedDocs];
    }

    // REPLACE MODE: Delete old documents and use only new ones
    if (updateMode === "replace") {
      if (Array.isArray(currentDocuments)) {
        for (const doc of currentDocuments) {
          if (doc?.key) await deleteFromS3(doc.key);
        }
      }
      return uploadedDocs;
    }

    return uploadedDocs;
  } catch (error) {
    console.error(`❌ ${fieldname} processing error:`, error.message);
    throw error;
  }
};

export const processDocuments = async (
  role,
  reqBody,
  reqFiles,
  user,
  userId,
) => {
  const updateData = {};

  const roleDocuments = Object.entries(DOCUMENT_CONFIG).filter(
    ([_, config]) => config.role === role,
  );

  for (const [fieldname, config] of roleDocuments) {
    const requestData = reqFiles?.[fieldname]?.[0] || reqBody[fieldname];

    if (!requestData) continue;

    try {
      if (config.isArray) {
        const result = await handleMultipleDocuments(
          fieldname,
          requestData,
          userId,
          user[fieldname],
          config.updateMode, // passes "append" or "replace"
        );
        if (result) updateData[fieldname] = result;
      } else {
        updateData[fieldname] = await handleSingleDocument(
          fieldname,
          requestData,
          userId,
          user[fieldname],
        );
      }
    } catch (error) {
      console.error(`Error processing ${fieldname}:`, error.message);
    }
  }

  return updateData;
};

export const deleteDocuments = async (
  fieldname,
  deleteIndices,
  currentDocuments,
) => {
  try {
    if (!Array.isArray(currentDocuments) || currentDocuments.length === 0) {
      throw new Error(`No documents found for ${fieldname}`);
    }

    // Normalize deleteIndices to array
    const indicesToDelete = Array.isArray(deleteIndices)
      ? deleteIndices
      : [deleteIndices];

    // Sort in descending order to delete from end first (prevents index shifting issues)
    const sortedIndices = [...new Set(indicesToDelete)]
      .map(Number)
      .sort((a, b) => b - a);

    // Validate indices
    for (const idx of sortedIndices) {
      if (idx < 0 || idx >= currentDocuments.length) {
        throw new Error(
          `Invalid index: ${idx}. Valid range: 0-${currentDocuments.length - 1}`,
        );
      }
    }

    // Delete from S3 and track for removal
    const updatedDocs = [...currentDocuments];

    for (const idx of sortedIndices) {
      const doc = updatedDocs[idx];
      if (doc?.key) {
        await deleteFromS3(doc.key);
      }
      updatedDocs.splice(idx, 1); // Remove from array
    }

    return updatedDocs;
  } catch (error) {
    console.error(`❌ ${fieldname} deletion error:`, error.message);
    throw error;
  }
};

export const processDocumentDeletions = async (role, reqBody, user) => {
  const updateData = {};

  const roleDocuments = Object.entries(DOCUMENT_CONFIG).filter(
    ([_, config]) => config.role === role && config.isArray,
  );

  for (const [fieldname, _] of roleDocuments) {
    // Check if deletion request exists: fieldname_delete or fieldname_deleteIndex
    const deleteParam = reqBody[`${fieldname}_delete`] || reqBody[`${fieldname}_deleteIndex`];

    if (deleteParam === undefined || deleteParam === null) continue;

    try {
      const result = await deleteDocuments(
        fieldname,
        deleteParam, // Can be single index or array of indices
        user[fieldname],
      );
      updateData[fieldname] = result;
    } catch (error) {
      console.error(`Error deleting ${fieldname}:`, error.message);
      throw error;
    }
  }

  return updateData;
};