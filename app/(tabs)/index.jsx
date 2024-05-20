import React, { useState, useRef } from 'react';
import { View, Text, Button, StyleSheet, Image, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

export default function YourPage() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState(null);
  const cameraRef = useRef(null);

  const getGPSLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords); 
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Error getting location. Please make sure location services are enabled.');
    }
  };

  // Function to open camera
  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!");
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync();
    if (!cameraResult.canceled) {
      setCapturedImage(cameraResult.assets[0].uri);
      await getGPSLocation(); // Get location after capturing image
    }
  };

  // Function to save image data and form data in AsyncStorage
  const saveDataToStorage = async () => {
    if (capturedImage && name && age) {
      try {
        // Get existing data from storage (if any)
        const existingDataString = await AsyncStorage.getItem('capturedData');
        const existingData = existingDataString ? JSON.parse(existingDataString) : [];

        // Add the new data
        const newData = [...existingData, { 
          uri: capturedImage, 
          name: name, 
          age: age,
          location: location // Add location data 
        }];

        // Store the updated array
        await AsyncStorage.setItem('capturedData', JSON.stringify(newData));
        console.log('Data saved successfully!');

        // Clear the form and image after saving
        setName('');
        setAge('');
        setCapturedImage(null);
        setLocation(null); // Reset location
      } catch (e) {
        console.log('Error saving data:', e);
      }
    } else {
      alert('Please capture an image and fill in all fields!');
    }
  };
  return (
    <View style={styles.container}>
      <Button title="Add Data (Open Camera)" onPress={openCamera} />

      {capturedImage && (
        <View style={styles.formContainer}>
          <Image source={{ uri: capturedImage }} style={styles.image} />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name:</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age:</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="Enter age"
              keyboardType="numeric"
            />
          </View>

          <Button title="Save Data" onPress={saveDataToStorage} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    backgroundColor: 'white', 
    padding: 20,
    borderRadius: 10,
    marginVertical: 20,
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
  },
});