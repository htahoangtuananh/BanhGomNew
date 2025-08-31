import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricType, setBiometricType] = useState<'FACE_ID' | 'TOUCH_ID' | 'NONE'>('NONE');
  const [hasBiometricToken, setHasBiometricToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showTimeoutOverlay, setShowTimeoutOverlay] = useState(false);
  const TIMEOUT_DURATION = 30000; // 30 seconds

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  /*
  const checkToken = async () => {
    setIsLoading(true);
    const token = await SecureStore.getItemAsync('loginToken');
    const userId = await SecureStore.getItemAsync('user_id');
    console.log(token);
    if (token && userId) {
        const formData = new FormData();
        formData.append('token', token);
        formData.append('user_id', userId);
        const response = await fetch('http://huelinh.com/api/login_token', {
            method: 'POST',
            headers: {
            'Content-Type': 'multipart/form-data',
            },
            body: formData,
        });
        const data = await response.json();
        if (data.includes('success')) {
            setIsLoading(false);
            router.push('/dashboard');
        } else {
            setIsLoading(false);
        }
    }
    setIsLoading(false);
  };
  */

  const checkBiometricSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      console.log('Device does not support biometric authentication');
      return;
    }else{
        checkBiometricLoginAccount();
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      setBiometricType('FACE_ID');
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      setBiometricType('TOUCH_ID');
    }

    // You can also log all available types
    console.log('Supported authentication types:', types.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'FaceID';
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Fingerprint';
        default:
          return 'Unknown';
      }
    }));
  };

  const checkBiometricLoginAccount = async () => {
    const token = await SecureStore.getItemAsync('loginToken');
    const userId = await SecureStore.getItemAsync('userId');
    if (token && userId) {
        setIsLoading(true);
        setMessage('Đang lấy thông tin tài khoản...');
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
            if(data.data.is_biometric == 1){
                setHasBiometricToken(true);
            }
        }
        setIsLoading(false);
    }
  }

  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      setMessage('Đang đăng nhập bằng ' + biometricType + '...');
      if (!hasBiometricToken) {
        Alert.alert(
          'Thông báo',
          'Tài khoản chưa cài đặt đăng nhập bằng face ID',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return;
      }
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        return;
      }
      const promptMessage = biometricType === 'FACE_ID' 
        ? 'Login with Face ID'
        : 'Login with Touch ID';

      console.log('Showing authentication prompt...');
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        router.push('/dashboard');
      } else {
        Alert.alert('Lỗi', 'Không thể đăng nhập bằng Face ID hoặc vân tay');
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Lỗi đăng nhập bằng Face ID hoặc vân tay: ' + error);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(
        'Thông báo',
        'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
        setIsLoading(true);
        setMessage('Đang đăng nhập...');
        let notificationToken = '';
        try {
          const tokenResult = await Notifications.getExpoPushTokenAsync({
            projectId: 'bbd8c01d-85c5-40b9-90b1-c83a299b757e'
          });
          notificationToken = tokenResult.data;
          console.log('Notification token:', notificationToken);
        } catch (tokenError) {
          console.error('Failed to get notification token:', tokenError);
          notificationToken = '';
        }
        const formData = new FormData();
        formData.append('username', username.trim());
        formData.append('password', password.trim());
        formData.append('expo_token', notificationToken);
        const response = await fetch('https://huelinh.com/api/login_username_password', {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        const data = await response.json();
        if (data.status == 'success') {
            if(data.data){
                SecureStore.setItemAsync('loginToken', data.data.token);
                SecureStore.setItemAsync('userId', data.data.user_id);
                SecureStore.setItemAsync('userName', data.data.username);
                SecureStore.setItemAsync('role', data.data.role);
                SecureStore.setItemAsync('store', data.data.store);
                SecureStore.setItemAsync('fullname', data.data.fullname);
                router.push('/dashboard');
            }else{
                Alert.alert(
                    'Thông báo',
                    data.message || 'Đăng nhập thất bại. Vui lòng thử lại.',
                    [{ text: 'OK' }]
                );
            }
        }
        else {
            Alert.alert(
            'Thông báo',
            data.message || 'Tên đăng nhập hoặc mật khẩu không đúng',
            [{ text: 'OK' }]
        );
        setIsLoading(false);
      }
    } catch (error) {
        setIsLoading(false);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Login error:', error); // This will print the full error to console
        Alert.alert(
            'Thông báo',
            errorMessage,
            [{ text: 'OK' }]
        );
    }
  };

  const handleLoginWithTimeout = async (requestPromise: Promise<any>) => {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_DURATION);
      });

      const response = await Promise.race([requestPromise, timeoutPromise]);
      return response;
    } catch (error) {
      setShowTimeoutOverlay(true);
      throw error;
    }
  };

  const handleRetry = () => {
    setShowTimeoutOverlay(false);
    setMessage('Đang thử lại...');
    if (isLoading) {
      handleLogin();
    } else {
      checkBiometricLoginAccount();
    }
  };

  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );

  const TimeoutOverlay = () => (
    <View style={styles.loadingOverlay}>
      <Text style={styles.timeoutText}>Không thể kết nối đến máy chủ</Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={handleRetry}
      >
        <Text style={styles.retryButtonText}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    const autoLogin = async () => {
      const token = await SecureStore.getItemAsync('loginToken');
      const userId = await SecureStore.getItemAsync('userId');
      if (token && userId) {
        router.push('/dashboard');  
      }
    }
    autoLogin();
  }, []);

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView behavior={'padding'} style={styles.keyboardContainer}>
        {isLoading && (
          <LoadingOverlay />
        )}
        {showTimeoutOverlay && (
          <TimeoutOverlay />
        )}
        
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeText}>Đăng nhập</Text>
          <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.brandContainer}>
            <View>
              <Image source={require('../assets/images/animated_logo.png')} style={styles.logoImage} />
            </View>
            <Text style={styles.brandName}>Bánh Gôm</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tên đăng nhập"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Mật khẩu"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.loginButton,
              (!username.trim() || !password.trim()) && styles.loginButtonDisabled
            ]}
          >
            <TouchableOpacity 
              style={styles.loginButtonInner}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            </TouchableOpacity>
          </LinearGradient>

          {biometricType !== 'NONE' && (
            <View style={styles.biometricContainer}>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity 
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.biometricGradient}
                >
                  <Ionicons
                    name={biometricType === 'FACE_ID' ? 'scan-outline' : 'finger-print-outline'}
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.biometricText}>
                    {biometricType === 'FACE_ID' ? 'Face ID' : 'Touch ID'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#374151',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  loginButton: {
    height: 56,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#f093fb',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  biometricContainer: {
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  biometricButton: {
    width: '100%',
  },
  biometricGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  biometricText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  timeoutText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoImage: {
    width: 80,
    height: 80,
  },
});

export default LoginScreen;
