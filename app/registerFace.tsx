import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const RegisterFace = () => {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  if (!permission) {
    return <View style={styles.container}><Text>Requesting permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Camera permission is required</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleFacesDetected = ({ faces }: { faces: any[] }) => {
    setIsFaceDetected(faces.length === 1);
  };

  const capturePhoto = async () => {
    if (!isFaceDetected) {
      Alert.alert('No face detected', 'Please position your face in the circle');
      return;
    }

    try {
      setIsProcessing(true);
      // Implement photo capture here
      Alert.alert('Success', 'Face photo captured successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.container}>
        <CameraView style={styles.camera} facing={facing}>
          <View style={styles.overlay}>
            <LinearGradient
              colors={isFaceDetected ? ['rgba(0, 255, 0, 0.3)', 'rgba(0, 255, 0, 0.1)'] : ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.guideFrame,
                { borderColor: isFaceDetected ? '#00ff00' : '#fff' }
              ]}
            />
            <Text style={styles.instructionText}>
              {isFaceDetected 
                ? 'Face detected! You can take the photo'
                : 'Position your face within the circle'}
            </Text>
          </View>

          <View style={styles.controls}>
            {isProcessing ? (
              <ActivityIndicator size="large" color="#0000ff" />
            ) : (
              <TouchableOpacity
                onPress={capturePhoto}
                disabled={!isFaceDetected}
              >
                <LinearGradient
                  colors={isFaceDetected ? ['#667eea', '#764ba2'] : ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.3)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.captureButton,
                    !isFaceDetected && styles.captureButtonDisabled
                  ]}
                >
                  <Text style={styles.captureText}>Register Face</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </CameraView>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderRadius: 125,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 20,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  captureButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default RegisterFace;
