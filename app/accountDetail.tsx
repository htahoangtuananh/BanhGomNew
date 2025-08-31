import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import HeaderNav from '@/app/components/headerNav';
import * as SecureStore from 'expo-secure-store';
import { isLoading } from 'expo-font';
import { AntDesign } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';


const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

interface CapturedPhoto {
  uri: string;
  isValid: boolean;
  base64: string;
}

const AccountDetail = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [userId, setUserId] = useState('');
  const [loginToken, setLoginToken] = useState('');
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [message, setMessage] = useState('Đang lấy dữ liệu...');
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [store, setStore] = useState('');
  const MAX_PHOTOS = 5;


  const checkBiometricLoginAccount = async () => {
      const token = await SecureStore.getItemAsync('loginToken');
      const userId = await SecureStore.getItemAsync('userId');
      const store = await SecureStore.getItemAsync('store');
      setLoginToken(token || '');
      setUserId(userId || '');
      setStore(store || '');
      if (token && userId) {
          const formData = new FormData();
          formData.append('token', token);
          formData.append('user_id', userId);
          const response = await fetch('https://huelinh.com/api/check_biometric_token', {
              method: 'POST',
              headers: {
              'Content-Type': 'multipart/form-data',
              },
              body: formData,
          });
          const data = await response.json();
          if (data.status == 'success') {
              if(data.data.is_biometric == 1) {
                  setIsBiometricEnabled(true);
              }
              setUserName(data.data.username);
              setRole(data.data.role);
              setFullName(data.data.fullname);
          }
          getCheckinStatus();
      }
  }

  const getCheckinStatus = async () => {
    const token = await SecureStore.getItemAsync('loginToken');
    const userId = await SecureStore.getItemAsync('userId');
    const formData = new FormData();
    if(token && userId) {
      formData.append('token', token);
      formData.append('user_id', userId);
      const response = await fetch('https://huelinh.com/api/get_checkin_status', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      const data = await response.json();
      console.log(data);
      if(data.status == 'success') {
        setCheckinStatus(true);
      }
    }
  }

  useEffect(() => {
    checkBiometricLoginAccount();
    getCheckinStatus();
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const toggleBiometric = async (value: boolean) => {
      const formData = new FormData();
      formData.append('token', loginToken);
      formData.append('user_id', userId);
      formData.append('is_biometric', isBiometricEnabled ? '0' : '1');
      const response = await fetch('https://huelinh.com/api/update_biometric', {
          method: 'POST',
          headers: {
          'Content-Type': 'multipart/form-data',
          },
          body: formData,
      });
      const data = await response.json();
      if (data.status == 'success') {
          setIsBiometricEnabled(!isBiometricEnabled);
          Alert.alert('Thành công', data.message);
      }else{
          Alert.alert('Thất bại', data.message);
      }

  };

  const validatePassword = (password: string) => {
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const errors = [];
    if (!hasNumber) {
      errors.push('một số');
    }
    if (!hasSpecialChar) {
      errors.push('một ký tự đặc biệt');
    }
    if (password.length < 6) {
      errors.push('ít nhất 6 ký tự');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      Alert.alert(
        'Lỗi',
        `Mật khẩu phải chứa ${validation.errors.join(', ')}`
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append('token', loginToken);
      formData.append('user_id', userId);
      formData.append('current_password', currentPassword);
      formData.append('new_password', newPassword);
      const response = await fetch('https://huelinh.com/api/change_password', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      const data = await response.json();
      if(data.status == 'success') {
        Alert.alert('Thành công', 'Mật khẩu đã được cập nhật thành công');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Thất bại', data.message);
      }
    } catch (error) {
      Alert.alert('Thất bại', 'Cập nhật mật khẩu thất bại');
    }
  };

  const handleOpenCamera = () => {
    setIsCameraOpen(true);
  };

  const handleCreatePerson = async () => {
    if(loginToken && userId) {
      const response = await fetch('https://huelinh.com/api/create_person_api/' + userId);
      const data = await response.json();
      console.log(data);
      if(data.status == 'success') {
        await fetch('https://huelinh.com/api/create_person_face_api/' + userId);
      }
    }
  }


  const handleCapture = async () => {
    if (cameraRef.current && capturedPhotos.length < MAX_PHOTOS) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.4,
          exif: false,
          base64: true,
        });
        setIsLoadingModal(true);
        setMessage('Đang kiểm tra ảnh...');
        try {
          const fd = new FormData();
          fd.append('image', photo?.base64 || '');
          fd.append('user_id', userId);
          const response = await fetch('https://huelinh.com/api/check_photo_valid', {
            method: 'POST',
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            body: fd,
          });
          const result = await response.json();
          setIsLoadingModal(false);
          const isValid = result.status;
          const message = result.message; // Adjust threshold based on your needs
          if (isValid == 'success') {
            setCapturedPhotos([...capturedPhotos, { 
              uri: photo?.uri || '', 
              isValid,
              base64: photo?.base64 || ''
            }]);
            
            if (capturedPhotos.length + 1 === MAX_PHOTOS) {
              Alert.alert('Thành công', 'Tất cả ảnh đã được chụp và hợp lệ');
              setIsCameraOpen(false);
              getCheckinStatus();
              handleCreatePerson();
            }
          } else {
            Alert.alert('Ảnh chưa hợp lệ', message);
          }

        } catch (error) {
          Alert.alert('Lỗi xác thực', 'Không thể xác thực ảnh. Vui lòng thử lại.');
        }
      } catch (error) {
        Alert.alert('Lỗi', 'Lỗi khi chụp ảnh');
      }
    }
  };

  const handleCloseCamera = () => {
    setIsCameraOpen(false);
    setCapturedPhotos([]);
  };

  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );

  const LoadingOverlayModal = () => (
    <View style={styles.loadingOverlayModal}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );

  const handleCheckUpdate = async () => {
    setIsLoading(true);
    setMessage('Đang kiểm tra cập nhật...');
    await checkForUpdates();
    setIsLoading(false);
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView>
        {isLoading && (
            <LoadingOverlay/>
        )}
        <HeaderNav currentScreen="Cài đặt tài khoản"/>
        <View style={styles.listContent}>

        <Text style={styles.title}>Thông tin tài khoản</Text>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionInline}
        >
          <View style={styles.commonInfo}>
            <Text style={styles.infoLabel}>Tài khoản</Text>
            <Text style={styles.infoValue}>{userName}</Text>
          </View>
          <View style={styles.commonInfo}>
            <Text style={styles.infoLabel}>Họ tên</Text>
            <Text style={styles.infoValue}>{fullName}</Text>
          </View>
          <View style={styles.commonInfo}>
            <Text style={styles.infoLabel}>Chi nhánh</Text>
            <Text style={styles.infoValue}>{(store == '0') ? "Hà Nội" : 'Hồ Chí Minh'}</Text>
          </View>
          <View style={styles.commonInfo}>
            <Text style={styles.infoLabel}>Vai trò</Text>
            <Text style={styles.infoValue}>{role}</Text>
          </View>
          <View style={[styles.commonInfo, {paddingVertical: 5}]}>
            <Text style={styles.infoLabel}>Face check-in</Text>
            {checkinStatus ? (
              <View style={styles.checkinStatus}>
                <AntDesign name="checkcircleo" size={24} color="green" style={{marginRight: 5}}/>

              </View>
            ) : (
              <TouchableOpacity style={styles.checkinPhotoButton} onPress={handleOpenCamera}>
                <Text style={styles.checkinPhotoButtonText}>Chưa đăng ký</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
        <Text style={styles.title}>Đổi mật khẩu</Text>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.section}
        >
          <View style={styles.formContainer}>
            <TextInput
              style={styles.textInput}
              secureTextEntry
              placeholder="Mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={styles.textInput}
              secureTextEntry
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.textInput}
              secureTextEntry
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handlePasswordUpdate}
            >
              <Text style={styles.buttonText}>Cập nhật mật khẩu</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.section}
        >
            <Text style={styles.sectionTitle}>Bảo mật</Text>
            <View style={[styles.formContainer, styles.switchContainer]}>
                <Text>Đăng nhập bằng vân tay</Text>
                <Switch
                value={isBiometricEnabled}
                onValueChange={toggleBiometric}
                />
            </View>
        </LinearGradient>
        <TouchableOpacity 
          onPress={handleCheckUpdate}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.updateButton}
          >
            <Text style={styles.updateButtonText}>Kiểm tra cập nhật</Text>
          </LinearGradient>
        </TouchableOpacity>
        </View>
        </ScrollView>
      <Modal
        visible={isCameraOpen}
        animationType="slide"
        onRequestClose={handleCloseCamera}
      >
        {isLoadingModal && (
            <LoadingOverlayModal/>
        )}
        <View style={styles.cameraContainer}>
          <StatusBar style="light" />
          <TouchableOpacity

            style={styles.closeButton}
            onPress={handleCloseCamera}
          >
            <AntDesign name="arrowleft" size={24} color="white" />
          </TouchableOpacity>
          
          <CameraView 
            style={styles.camera} 
            facing={'front'}
            ref={cameraRef}
            mirror={true}
          >
            <View style={styles.cameraButtonContainer}>
              <View style={styles.capturedPhotosContainer}>
                {Array(MAX_PHOTOS).fill(0).map((_, index) => (
                  <View key={index} style={styles.photoSlot}>
                    {capturedPhotos[index] ? (
                      <View style={styles.photoContainer}>
                        <Image 
                          source={{ uri: capturedPhotos[index].uri }} 
                          style={styles.capturedPhoto} 
                        />
                        <View style={[
                          styles.validationBadge,
                          capturedPhotos[index].isValid ? styles.validBadge : styles.invalidBadge
                        ]}>
                          <AntDesign 
                            name={capturedPhotos[index].isValid ? "check" : "close"} 
                            size={12} 
                            color="white" 
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.emptyPhotoSlot}>
                        <Text style={styles.photoNumber}>{index + 1}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              
              <TouchableOpacity
                style={[
                  styles.cameraButton,
                  capturedPhotos.length >= MAX_PHOTOS && styles.disabledButton
                ]}
                onPress={handleCapture}
                disabled={capturedPhotos.length >= MAX_PHOTOS}
              >
                <Text style={styles.cameraButtonText}>
                  {`Capture (${capturedPhotos.length}/${MAX_PHOTOS})`}
                </Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flex: 1,
    flexDirection: 'column',
    gap: 15,
    padding: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  section: {
    marginBottom: 15,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#374151',
  },
  formContainer: {
    borderRadius: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    color: '#374151',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
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
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  sectionInline: {
    marginBottom: 15,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  commonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
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
  loadingOverlayModal: {
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
  checkinStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  checkinPhotoButton: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  checkinPhotoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraButtonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
    paddingHorizontal: 20,
  },
  cameraButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  cameraButtonText: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 2,
    padding: 10,
  },
  capturedPhotosContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
  },
  photoSlot: {
    width: 60,
    height: 60,
    margin: 5,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  validationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validBadge: {
    backgroundColor: '#4CAF50',
  },
  invalidBadge: {
    backgroundColor: '#F44336',
  },
  capturedPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  emptyPhotoSlot: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 5,
  },
  photoNumber: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  updateButton: {
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


export default AccountDetail;
