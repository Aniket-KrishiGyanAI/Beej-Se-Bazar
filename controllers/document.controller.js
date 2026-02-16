import { uploadToS3 } from '../utils/s3Upload.js';

export const uploadDocuments = async (req, res) => {
  try {
    console.log('Document upload request received');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    
    // Handle JSON metadata
    if (req.body.documents) {
      return res.status(200).json({
        success: true,
        message: 'Document metadata received successfully',
        documents: req.body.documents
      });
    }
    
    const uploadedDocuments = {};
    
    // Upload Soil Health Card
    if (req.files?.soilHealthCard) {
      console.log('Uploading soil health card...');
      const file = req.files.soilHealthCard[0];
      const soilCardResult = await uploadToS3(file, 'documents');
      uploadedDocuments.soilHealthCard = soilCardResult.url || soilCardResult.Location;
    }
    
    // Upload Lab Report
    if (req.files?.labReport) {
      console.log('Uploading lab report...');
      const file = req.files.labReport[0];
      const labReportResult = await uploadToS3(file, 'documents');
      uploadedDocuments.labReport = labReportResult.url || labReportResult.Location;
    }
    
    // Upload Government Document
    if (req.files?.governmentDocument) {
      console.log('Uploading government document...');
      const file = req.files.governmentDocument[0];
 
      
      const govDocResult = await uploadToS3(file, 'documents');
      uploadedDocuments.governmentDocument = govDocResult.url || govDocResult.Location;
    }
    
    console.log('All documents uploaded successfully:', uploadedDocuments);
    
    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      documents: uploadedDocuments
    });
    
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload documents',
      error: error.message
    });
  }
};