import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import HeaderNav from '@/app/components/headerNav';
import { AntDesign } from '@expo/vector-icons';
import { CameraView, BarcodeScanningResult, Camera } from 'expo-camera';
import * as SecureStore from 'expo-secure-store';

interface ScannedProduct {
  product_id: number;
  product_name: string;
  product_inventory_status: number;
  brand_name: string;
  price_current: number;
  quantity: number;
  ava: {
    asset_src: string;
  };
  product_code: string;
}

interface UnScannedProduct {
  product_id: number;
  product_name: string;
  brand_name: string;
  price_current: number;
  quantity: number;
  ava: {
    asset_src: string;
  };
  product_code: string;
}


const productImageSrc = 'https://huelinh.b-cdn.net/assets/img/product_images/';
const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

const CheckInventory = () => {
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [productIdArray, setProductIdArray] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScannedCode = useRef<string>('');
  const [inventory, setInventory] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Đang tải dữ liệu...');
  const [unscannedProducts, setUnscannedProducts] = useState<UnScannedProduct[]>([]);
  // Filter products based on search term

  const filteredProducts = useMemo(() => {
    return scannedProducts.filter(product => 
      (product.product_name || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [scannedProducts, search]);

  useEffect(() => {
    const getInventory = async () => {
      const inventory = await SecureStore.getItemAsync('store');
      const userId = await SecureStore.getItemAsync('userId');
      if(inventory){
        setInventory(inventory);
      }
      if(userId){
        setUserId(userId);
      }
    };
    getInventory();


  }, []);
  // Request camera permission on component mount
  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const extractProductId = (url: string): string => {
    if (!url.includes('huelinh.com')) {
      return '';
    }
    const parts = url.split('-');
    return parts[parts.length - 1];
  };

  const handleBarCodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    if (isProcessing) return;
    if (lastScannedCode.current === data) return; // Prevent duplicate scans
    
    lastScannedCode.current = data;
    setIsProcessing(true);
    setScanning(false);
    try {
        const productId = extractProductId(data);
        if(productId == ''){
            Alert.alert('Mã QR không hợp lệ!');
            return;
        }
        if (!productIdArray.includes(Number(productId))) {
            setProductIdArray(prev => [...prev, Number(productId)]);
            const response = await fetch(`https://huelinh.com/api/get_simple_product_api/${productId}`);
            const dataProduct = await response.json();
            console.log(dataProduct);
            if (dataProduct.product) {
                setScannedProducts(prev => [...prev, dataProduct.product]);
            }
        }else{
            alert('Sản phẩm đã được quét');
        }
    } catch (error) {
        console.error('Error fetching product data:', error);
    } finally {
        setTimeout(() => {
            setIsProcessing(false);
            lastScannedCode.current = ''; // Reset the last scanned code after delay
        }, 2000);
    }
  };

  const handleScan = () => {
    if (hasPermission) {
      setScanning(true);
    } else {
      alert('Không có quyền truy cập camera');
    }
  };

  const handleSearch = async () => {
    try {
      const params = new URLSearchParams({
        search: search,
      });

      const response = await fetch(`https://huelinh.com/api/get_list_product_api?${params}`);
      const data = await response.json();
      
      if (data.product && Array.isArray(data.product)) {
        setScannedProducts(data.product);
      } else {
        setScannedProducts([]);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
      
    }
  };

  const handleCheckInventory = async () => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('product_id_array', JSON.stringify(productIdArray));
    formData.append('inventory', inventory);
    formData.append('user_id', userId);
    const response = await fetch('https://huelinh.com/api/check_inventory_api', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    console.log(data);
    setIsLoading(false);
    if(data.status == 'success'){
      // Transform the data object into an array
      setUnscannedProducts(data.data);
    }else{
      Alert.alert('Lỗi', data.message);
    }
  };

  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
  
  return (
      <View style={styles.container}>
        {isLoading && (
          <LoadingOverlay />
        )}
        <HeaderNav currentScreen="Kiểm kho"/>
        <View style={styles.listHeaderHolder}>
          <TextInput 
            style={styles.listHeaderSearch} 
            placeholder="Tìm kiếm sản phẩm" 
            value={search} 
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity 
            style={styles.listHeaderButton}
            onPress={handleScan}
          >
            <AntDesign name="scan1" size={24} color="black" />
          </TouchableOpacity>
        </View>

        <View style={[styles.listContent, { flex: 1 }]}>
          <View style={styles.listContentHeader}>
            <Text style={styles.listContentTitle}>Danh sách sản phẩm đã quét</Text>
          </View>
          
          <ScrollView 
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ flexGrow: 0 }}
          >
            {filteredProducts.length > 0 ? (
              <View>
                {filteredProducts.map((product) => (
                  <View key={product.product_id} style={styles.listContentItem}>
                    <Image 
                      source={{ 
                        uri: product.ava?.asset_src 
                          ? productImageSrc + product.ava.asset_src 
                          : ''
                      }} 
                      style={styles.listContentItemImage} 
                      contentFit="contain"
                      cachePolicy="disk"
                    />
                    <View style={styles.listContentItemInfo}>
                      <Text style={styles.productName}>
                        {product.product_code} | {product.product_name}
                      </Text>
                      <Text style={styles.productBrand}>{product.brand_name}</Text>
                      <Text style={styles.productPrice}>
                        {Number(product.price_current).toLocaleString()}đ
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {scannedProducts.length === 0 
                    ? 'Chưa có sản phẩm nào được quét' 
                    : 'Không tìm thấy sản phẩm phù hợp'}
                </Text>
              </View>
            )}
          </ScrollView>
          
          {unscannedProducts.length > 0 && (
            <>
              <View style={styles.listContentHeader}>
                <Text style={styles.listContentTitle}>Danh sách sản phẩm chưa quét</Text>
              </View>

              <ScrollView 
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ flexGrow: 0 }}
              >
                {unscannedProducts.length > 0 ? (
                  <View>
                    {unscannedProducts.map((product) => (
                      <View key={product.product_id} style={styles.listContentItem}>
                        <Image 
                          source={{ 
                            uri: product.ava?.asset_src 
                              ? productImageSrc + product.ava.asset_src 
                              : ''
                          }} 
                          style={styles.listContentItemImage}
                          contentFit="contain"
                          cachePolicy="disk"
                        />
                        <View style={styles.listContentItemInfo}>
                          <Text style={styles.productName}>
                            {product.product_code} | {product.product_name}
                          </Text>
                          <Text style={styles.productBrand}>{product.brand_name}</Text>
                          <Text style={styles.productPrice}>
                            {Number(product.price_current).toLocaleString()}đ
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      {scannedProducts.length === 0 
                        ? 'Chưa có sản phẩm nào được quét' 
                        : 'Không tìm thấy sản phẩm phù hợp'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </>
          )}
          <TouchableOpacity style={styles.listContentButton} onPress={handleCheckInventory}>
              <Text style={styles.listContentButtonText}>
                  Chốt kiểm kho
              </Text>
          </TouchableOpacity>
        </View>
        <Modal
          visible={scanning}
          onRequestClose={() => setScanning(false)}
          animationType="slide"
        >
          <View style={styles.scannerContainer}>
            <CameraView 
              facing={'back'}
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setScanning(false)}
            >
              <AntDesign name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(244, 246, 249)',
    paddingTop: 0,
  },
  listHeaderHolder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: 15,
    paddingBottom: 10,
  },
  listHeaderSearch: {
    flex: 1,
    height: 40,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 228, 0.5)',
    backgroundColor: 'white',
    paddingHorizontal: 10,
  },
  listHeaderButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  listContent: {
    flex: 1,
    padding: 15,
    paddingTop: 5,
  },
  listContentHeader: {
    paddingVertical: 10,
    marginBottom: 5,
  },
  listContentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto_400Regular',
  },
  listContentItem: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContentItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  listContentItemInfo: {
    marginLeft: 15,
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    fontFamily: 'Roboto_400Regular',
  },
  productBrand: {
    fontSize: 15,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: 'Roboto_400Regular',
  },
  productPrice: {
    fontSize: 14,
    color: '#28A745',
    fontFamily: 'Roboto_400Regular',
  },
  productQuantity: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Roboto_400Regular',
    marginTop: 4,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Roboto_400Regular',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  listContentButton: {
    backgroundColor: '#28A745',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  listContentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default CheckInventory;
