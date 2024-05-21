import { Alert } from 'react-native';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

    Alert.alert('Success', 'Image uploaded successfully!');
    return objectUrl; 

  } catch (error) {
    console.error('Error uploading image to S3:', error);
    Alert.alert('Error', 'Image upload failed.'); 
    return null; 
  }
};

export { uploadImageToS3 }; 