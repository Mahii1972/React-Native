
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';

export default function IdScreen() {
  const [inputValue, setInputValue] = useState('');
  const navigation = useNavigation();
  const colorScheme = useColorScheme();

  const handleInputChange = (text) => {
    setInputValue(text);
  };

  const handleSubmit = async () => {
    try {
      await AsyncStorage.setItem('device_id', inputValue);
      navigation.navigate('index');
    } catch (error) {
      console.error('Error saving device ID:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, colorScheme === 'dark' ? styles.labelDark : styles.labelLight]}>Enter ID:</Text>
      <TextInput
        style={[styles.input, colorScheme === 'dark' ? styles.inputDark : styles.inputLight]}
        keyboardType="numeric"
        value={inputValue}
        onChangeText={handleInputChange}
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
  },
  labelLight: {
    color: 'black',
  },
  labelDark: {
    color: 'white',
  },
  input: {
    height: 30, // Smaller height
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 8,
    width: '50%', // Make the input half the width
    borderRadius: 8, // Make the input more stylish
  },
  inputLight: {
    color: 'black',
  },
  inputDark: {
    color: 'white',
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25, // Curvy button
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
