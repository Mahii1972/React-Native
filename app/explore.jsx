import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  Button,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ViewStoredImagesPage() {
  const [storedImages, setStoredImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const imageDataString = await AsyncStorage.getItem('capturedData');
        if (imageDataString) {
          const images = JSON.parse(imageDataString);
          setStoredImages(images);
        }
      } catch (e) {
        console.log('Error fetching images:', e);
      }
    };

    fetchImages();
  }, []);

  const handleImagePress = (image) => {
    setSelectedImage(image);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const renderImageItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleImagePress(item)}>
      <Image source={{ uri: item.uri }} style={styles.image} />
    </TouchableOpacity>
  );

  const onRefresh = async () => {
    const imageDataString = await AsyncStorage.getItem('capturedData');
    if (imageDataString) {
      const images = JSON.parse(imageDataString);
      setStoredImages(images);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={storedImages}
        keyExtractor={(item) => item.uri}
        renderItem={renderImageItem}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        onRefresh={onRefresh}
        refreshing={false}
        ListHeaderComponent={<View style={{ height: 80 }} />}
      />

      <Modal visible={!!selectedImage} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedImage && (
              <>
                <Image source={{ uri: selectedImage.uri }} style={styles.modalImage} />

                {/* Stems Data */}
                <Text style={styles.modalText}>Number of Stems: {selectedImage.stems.length}</Text>
                {selectedImage.stems.map((stem, index) => (
                  <Text key={index} style={styles.modalText}>Stem {index + 1}: {stem}</Text>
                ))}

                {/* Location Data */}
                {selectedImage.location && (
                  <Text style={styles.modalText}>
                    Location: {selectedImage.location.latitude}, {selectedImage.location.longitude}
                  </Text>
                )}
              </>
            )}
            <Button title="Close" onPress={closeModal} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 10,
  },
});