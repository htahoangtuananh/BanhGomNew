import { AntDesign } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import HeaderNav from './components/headerNav';

interface Face {
  user_checkin_id: number;
  fullname: string;
  checkin_time: string;
  photo: string;
}

const screenHeight = Dimensions.get('window').height;

export default function CheckIn() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState('back');
  const [checkedInFaces, setCheckedInFaces] = useState<Face[]>([]);
  const [store, setStore] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Đang lấy dữ liệu...');
  const cameraRef = useRef<CameraView>(null);
  const [role, setRole] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeList, setStoreList] = useState([
    { label: 'Hà Nội', value: '0' },
    { label: 'Hồ Chí Minh', value: '1' },
  ]);
  const [showImage, setShowImage] = useState(false);
  const [imageSource, setImageSource] = useState('');

  useEffect(() => {
    const getUserInfo = async () => {
      const store = await SecureStore.getItemAsync('store');
      const role = await SecureStore.getItemAsync('role');
      if(store && role){
        setStore(store);
        setRole(role);
        setIsReady(true);
      }
    };
    getUserInfo();
  }, []);

  const handleStoreChange = async (value: string) => {
    setStore(value);
    await SecureStore.setItemAsync('store', value);
    const response = await fetch('https://huelinh.com/api/get_user_checkin/'+value);
    const data = await response.json();
    if(data){
      setCheckedInFaces(data);
    }
  };

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
    if (store) {
      getCheckedInFaces();
    }
  }, [store]);

  const getCheckedInFaces = async () => {
    if(!isReady){
      return;
    }
    setIsLoading(true);
    const response = await fetch('https://huelinh.com/api/get_user_checkin/'+store);
    const data = await response.json();
    if(data){
      setCheckedInFaces(data);
    }
    console.log(checkedInFaces.length);
    setIsLoading(false);
  }
  
  const handleCheckIn = async () => {
    if (cameraRef.current) {

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.4,
          exif: false,
          base64: true,
        });
        setIsLoading(true);
        setMessage('Đang chấm công...');
        const formData = new FormData();
        formData.append('image', photo?.base64 || '');
        const response = await fetch('https://huelinh.com/api/search_face', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        setIsLoading(false);
        if(data.status === "success"){
          getCheckedInFaces();
        }else{
          Alert.alert('Lỗi', 'Vui lòng thử lại!');
        }
      } catch (error) {
        Alert.alert('Lỗi', 'Vui lòng thử lại');
      }
    }
  };


  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );

  const openImage = (imageSource: string) => {
    setShowImage(true);
    setImageSource(imageSource);
  };

  const ImageViewer = () => {
    const [scale, setScale] = useState(1);
    const [lastDistance, setLastDistance] = useState(0);
    
    const handleTouchMove = (event: any) => {
      // Handle pinch to zoom
      if (event.nativeEvent.touches.length === 2) {
        const touch1 = event.nativeEvent.touches[0];
        const touch2 = event.nativeEvent.touches[1];
        
        const distance = Math.sqrt(
          Math.pow(touch2.pageX - touch1.pageX, 2) +
          Math.pow(touch2.pageY - touch1.pageY, 2)
        );
        
        if (lastDistance > 0) {
          const newScale = scale * (distance / lastDistance);
          // Limit scale between 1 and 5
          setScale(Math.max(1, Math.min(5, newScale)));
        }
        
        setLastDistance(distance);
      }
    };
    
    const handleTouchEnd = () => {
      setLastDistance(0);
    };
    
    return (
      <TouchableOpacity 
        style={styles.imageViewerOverlay} 
        activeOpacity={1}
      >
        <View 
          style={styles.imageViewer}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowImage(false)}
          >
            <AntDesign name="close" size={24} color="white" />
          </TouchableOpacity>
          <Image 
            source={{ uri: imageSource }} 
            style={[
              styles.fullScreenImage, 
              { 
                transform: [
                  { rotate: '90deg' },
                  { scale: scale }
                ] 
              }
            ]}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {isLoading && <LoadingOverlay />}
      {showImage && <ImageViewer/>}
      <View style={styles.container}>
        <HeaderNav currentScreen="Chấm công"/>
        
        <CameraView 
          style={styles.camera} 
          facing={'front'}
          ref={cameraRef}
        >
          {role === 'admin' && (
            <View style={styles.storePickerContainer}>
              <DropDownPicker
                open={storeOpen}
                value={store}
                items={storeList}
                setOpen={setStoreOpen}
                setValue={(callback: any) => handleStoreChange(callback(store))}
                setItems={setStoreList}
                placeholder="Chọn cửa hàng"
                style={styles.dropdownStyle}
                dropDownContainerStyle={styles.dropdownContainer}
                listMode="SCROLLVIEW"
                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
              />
            </View>
          )}
          <View style={styles.buttonContainer}>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.checkedInList}
              contentContainerStyle={styles.checkedInListContent}
            >
              {checkedInFaces.length > 0 ? checkedInFaces.map((face) => (
                <TouchableOpacity key={face.user_checkin_id} style={styles.checkedInItem} onPress={() => openImage(`data:image/jpeg;base64,${face.photo}`)}>
                  <Text style={styles.timeText}>{face.checkin_time}</Text>
                  <AntDesign name="checkcircle" size={24} color="#007AFF" style={{position:'absolute', top:5, right:5, zIndex:100}}/>
                  <Image 
                    source={{ uri: `data:image/jpeg;base64,${face.photo}` }} 
                    style={styles.checkedInImage} 
                  />
                  <Text style={styles.nameText}>{face.fullname}</Text>
                </TouchableOpacity>
              )):null}
            </ScrollView>
            <TouchableOpacity
              onPress={handleCheckIn}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Chấm công</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    </LinearGradient>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  button: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  checkedInList: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    maxHeight: 150,
  },
  checkedInListContent: {
    paddingHorizontal: 10,
  },
  checkedInItem: {
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    width: 120,
    height: 120,
    overflow: 'hidden', // fixed height to accommodate all content
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  checkedInImage: {
    width: 120,
    height: 120,
    marginBottom: 5,
    backgroundColor: '#ccc',
    transform: [{ scaleX: -1 }, { rotate: '90deg' }], // adds a background color to see the image area
  },
  nameText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    position: 'absolute',
    bottom: 5,
  },
  timeText: {
    color: '#fff',
    position: 'absolute',
    top: 5,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    zIndex: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    height: screenHeight,
  },
  storePickerContainer: {
    padding: 25,
    paddingBottom: 0,
    zIndex: 1000,
  },
  dropdownStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 45,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  imageViewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 9999,
  },
  imageViewer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 10,
    zIndex: 10000,
    padding: 10,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});
