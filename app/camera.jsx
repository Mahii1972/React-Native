import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useImage } from './context/ImageContext'; // Assuming you have ImageContext defined
import { Ionicons } from '@expo/vector-icons';

export default function CameraScreen() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const { setImageUri } = useImage();
  const [capturedImage, setCapturedImage] = useState(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const options = {
        quality: 0.5, // Adjust the quality between 0 and 1
      };
  
      const photo = await cameraRef.current.takePictureAsync(options);
      setCapturedImage(photo.uri);
    }
  };
  

  const confirmPhoto = () => {
    setImageUri(capturedImage);
    navigation.navigate('preview'); 
  };

  return (
    <View style={styles.container}>
      {capturedImage ? (
        <View style={styles.capturedImageContainer}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={confirmPhoto}>
              <Text style={styles.buttonText}>Use Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setCapturedImage(null)}>
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
              <View style={styles.iconCircle}>
                <Ionicons name="camera-reverse-outline" size={30} color="white" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={takePicture}>
              <View style={styles.iconCircle}>
                <Ionicons name="camera-outline" size={40} color="white" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('preview')}>
              <View style={styles.iconCircle}>
                <Ionicons name="arrow-forward-circle-outline" size={30} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
    margin: 20,
  },
  capturedImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  capturedImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
  buttonContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    position: 'absolute', // Position the buttons absolutely
    bottom: 20,            // Place them at the bottom
    left: 0,
    right: 0,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 5,
    paddingVertical: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'flex-end', 
    marginBottom: 30,           
  },
  iconCircle: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,                       
    padding: 15,                          
  },
});