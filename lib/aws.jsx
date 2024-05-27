import { Alert } from 'react-native';
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import 'react-native-get-random-values';

// Access AWS configuration from environment variables
const S3_BUCKET = process.env.EXPO_PUBLIC_S3_BUCKET; 
const REGION = process.env.EXPO_PUBLIC_AWS_REGION;          
const ACCESS_KEY_ID = process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID;     
const SECRET_ACCESS_KEY = process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY;

// Create S3 client
const s3Client = new S3Client({
  region: REGION, 
  credentials: {
    accessKeyId: ACCESS_KEY_ID, 
    secretAccessKey: SECRET_ACCESS_KEY, 
  }
});

// Function to upload a single image to S3
const uploadImageToS3 = async (imageUri) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const filename = `image-${Date.now()}.jpg`; 
    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: filename,
      Body: blob,
      ContentType: 'image/jpeg', 
    };

    const data = await s3Client.send(new PutObjectCommand(uploadParams));
    console.log("Image uploaded to S3:", data); 

    const objectUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${filename}`;
    console.log("Object URL:", objectUrl);

    return objectUrl; 

  } catch (error) {
    console.error('Error uploading image to S3:', error);
    Alert.alert('Error', 'Image upload failed.'); 
    return null; 
  }
};

// Function to upload a single image part (used in bulk upload)
const uploadPart = async (params, uploadId, partNumber, blob) => {
  const uploadPartParams = {
    ...params,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: blob,
  };

  const command = new UploadPartCommand(uploadPartParams);
  return await s3Client.send(command);
};

// Function for bulk uploading images to S3
const bulkUploadToS3 = async (imageUris) => {
  try {
    const uploadPromises = imageUris.map(async (imageUri, index) => {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const filename = `image-${Date.now()}-${index}.jpg`;
      const uploadParams = {
        Bucket: S3_BUCKET,
        Key: filename,
        ContentType: 'image/jpeg',
      };

      // 1. Initiate Multipart Upload
      const uploadCommand = new CreateMultipartUploadCommand(uploadParams);
      const uploadResponse = await s3Client.send(uploadCommand);
      const uploadId = uploadResponse.UploadId;

      // 2. Upload Parts (For simplicity, assuming one part per image)
      const partResponse = await uploadPart(
        uploadParams,
        uploadId,
        1, // Part number
        blob
      );

      // 3. Complete Multipart Upload
      const completeParams = {
        Bucket: S3_BUCKET,
        Key: filename,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: [
            {
              ETag: partResponse.ETag,
              PartNumber: 1,
            },
          ],
        },
      };

      const completeCommand = new CompleteMultipartUploadCommand(completeParams);
      await s3Client.send(completeCommand);

      const objectUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${filename}`;
      return objectUrl;
    });

    const uploadedImageUrls = await Promise.all(uploadPromises);
    console.log("Images uploaded to S3:", uploadedImageUrls);
    return uploadedImageUrls;
  } catch (error) {
    console.error('Error bulk uploading images to S3:', error);
    Alert.alert('Error', 'Bulk image upload failed.');
    return [];
  }
};

export { uploadImageToS3, bulkUploadToS3 }; 