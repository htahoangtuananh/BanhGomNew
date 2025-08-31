import HeaderNav from '@/app/components/headerNav';
import { AntDesign, Entypo } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;
// Add helper functions at the top of the file
const formatPrice = (price: string) => {
  if (!price) return '';
  return Number(price).toLocaleString('de-DE');
};

const unformatPrice = (price: string) => {
  if (!price) return '';
  return price.replace(/\./g, '');
};

const productImageSrc = 'https://huelinh.b-cdn.net/assets/img/product_images/';

// Add with other interfaces
interface FilterValuesState {
  [key: number]: string;
}

interface DropdownState {
  [key: number]: boolean;
}

interface ProductFilter {
  category_filter_id: number;
  filter_name: string;
  filter_value_id?: string;
  filter_list?: {
    category_filter_value_id: number;
    category_filter_value: string;
  }[];
}

interface ApiImage {
  asset_src: string;
  asset_id: number;
}

interface Brand {
  brand_id: number;
  brand_name: string;
}

interface Category {
  product_category_id: number;
  category_name: string;
}

interface ServerImage {
  asset_src: string;
  asset_id: number;
}

interface Customer {
  customer_id: number;
  customer_name: string;
  phone_number: string;
  other_info: string;
  type: number;
}

// Convert mm to pixels (assuming 72 PPI)
const mmToPixels = (mm: number) => Math.round(mm * 2.83465); // 72 PPI / 25.4 mm per inch

// Update size options to use paper height as the base measurement
const sizeOptions = mmToPixels(50);

// Updated preview HTML template with better scaling
const generatePreviewHtml = (qrUrl: string, sizeWidth: number, sizeHeight: number) => {
  return `
    <html>
      <head>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            max-height: 100%;
          }
          img {
            width: ${mmToPixels(sizeWidth)}px;
            height: ${mmToPixels(sizeHeight)}px;
            object-fit: contain;
            display: block;
          }
        </style>
      </head>
      <body>
        <img src="${qrUrl}"/>
      </body>
    </html>
  `;
};

// Add customer function

export default function DetailProductScreen() {
  const { id } = useLocalSearchParams();
  const [tempImages, setTempImages] = useState<string[]>([]);
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('0');
  const [priceCurrent, setPriceCurrent] = useState('0');
  const [priceSale, setPriceSale] = useState('0');
  const [productCode, setProductCode] = useState('');
  const [productSlug, setProductSlug] = useState('');
  const [inventory, setInventory] = useState<string>('0');
  const [inventoryStatus, setInventoryStatus] = useState<string>('1');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [brandList, setBrandList] = useState<Brand[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [displayPrice, setDisplayPrice] = useState('0');
  const [displayPriceCurrent, setDisplayPriceCurrent] = useState('0');
  const [displayPriceSale, setDisplayPriceSale] = useState('0');
  const [serverImages, setServerImages] = useState<ServerImage[]>([]);
  const [openInventory, setOpenInventory] = useState(false);
  const [openInventoryStatus, setOpenInventoryStatus] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const [token, setToken] = useState('');
  const [printedQrCode, setPrintedQrCode] = useState('');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [selectedPrinter, setSelectedPrinter] = useState<Print.Printer | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [sizeWidth, setSizeWidth] = useState('40');
  const [sizeHeight, setSizeHeight] = useState('40');
  const [openSize, setOpenSize] = useState(false);
  const [size, setSize] = useState('40');
  const [isPrinting, setIsPrinting] = useState(false);
  const [productQuantity, setProductQuantity] = useState('1');
  const [openBrand, setOpenBrand] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('device');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedServerImages, setSelectedServerImages] = useState<string[]>([]);
  const [selectedServerImagesId, setSelectedServerImagesId] = useState<number[]>([]);
  const [initialServerImageCount, setInitialServerImageCount] = useState(0);
  const [search, setSearch] = useState('');
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [openCustomerDropdown, setOpenCustomerDropdown] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    otherInfo: '',
    type: ''
  });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [modalCustomerVisible, setModalCustomerVisible] = useState(false);
  const [openCustomerType, setOpenCustomerType] = useState(false);
  const [customerType, setCustomerType] = useState('');

  useEffect(() => {
    const loadAuth = async () => {
      const user_id = await SecureStore.getItemAsync('userId');
      const role = await SecureStore.getItemAsync('role');
      const token = await SecureStore.getItemAsync('loginToken');
      if (user_id && role && token) {
        setUserId(user_id);
        setRole(role);
        setToken(token);
      }
    };
    loadAuth();
    getProductDetail();
    handleCustomerSearch();
  }, []);

  const handleCustomerSearch = async () => {
    try {
        const params = new URLSearchParams({
            search: search
        });
        const response = await fetch(`https://huelinh.com/api/get_list_customer_api?${params}`);
        const data = await response.json();
        if (data && Array.isArray(data)) {
            setCustomerList(data);
        } else {
            setCustomerList([]); // Set empty array if no results
        }
    } catch (error) {
      Alert.alert('Error', 'Không thể kết nối đến máy chủ!');
      setCustomerList([]); // Set empty array on error
    }
  };

  const updatePrintTime = async () => {
    try {
      const response = await fetch(`https://huelinh.com/api/update_print_time/${id}`);
      const data = await response.json();
      if(data.status == 'success'){
        setPrintedQrCode(data.data);
        handleGenerateQR();
      }
    } catch (error) {
      console.error('Error updating print time:', error);
    }
  }

  const getProductDetail = async () => {
    try {
      const response = await fetch(`https://huelinh.com/api/get_detail_product_api/${id}`);
      const data = await response.json();
      if (data.product) {
        setProductName(data.product.product_name);
        setPrice(data.product.price_orig);
        setPriceCurrent(data.product.price_current);
        setPriceSale(data.product.price_sale);
        setDisplayPrice(formatPrice(data.product.price_orig));
        setDisplayPriceCurrent(formatPrice(data.product.price_current));
        setDisplayPriceSale(formatPrice(data.product.price_sale));
        setInventory(data.product.inventory);
        setInventoryStatus(data.product.product_inventory_status);
        setProductCode(data.product.product_code);
        setProductQuantity(data.product.quantity);
        setSelectedBrand(data.product.brand_id.toString());
        setSelectedCategory(data.product.category_id.toString());
        setBrandList(data.brand);
        setCategoryList(data.category);
        setProductSlug(data.product.product_url);
        setPrintedQrCode(data.product.print_time);
        if (data.product_image) {
          setServerImages(data.product_image);
          setInitialServerImageCount(data.product_image.length);
        }
        if(data.product.customer_id) {
          setSelectedCustomerData({
            customer_id: data.product.customer_id,
            customer_name: data.product.customer_name,
            phone_number: data.product.phone_number,
            other_info: data.product.other_info,
            type: data.product.type
          });
          setSelectedCustomer(data.product.customer_id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      await new Promise(resolve => setTimeout(resolve, 100));

      let uploadedImageUrls: number[] = [];

      if (tempImages.length > 0) {
        setIsUploading(true);
        const formData = new FormData();
        
        for (let i = 0; i < tempImages.length; i++) {
          const uri = tempImages[i];
          const fileName = uri.split('/').pop() || `image_${i}.jpg`;
          
          formData.append('images[]', {
            uri: uri,
            name: fileName,
            type: getImageType(uri)
          } as any);
        }

        const response = await fetchWithTimeout(
          'https://www.huelinh.com/api/upload_multiple_images',
          {
            method: 'POST',
            body: formData,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'multipart/form-data',
            },
          },
          60000
        );

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Upload failed');
        }

        uploadedImageUrls = data.image_urls;
        setIsUploading(false);
      }

      setIsCreatingProduct(true);
      const formData = new FormData();
      
      // Get all current server image IDs
      const currentServerImageIds = serverImages.map(img => img.asset_id);
      
      // Use the latest state of selectedServerImagesId
      const allImageIds = [...uploadedImageUrls, ...selectedServerImagesId, ...currentServerImageIds];
      
      formData.append('productName', productName);
      formData.append('priceOrig', price);
      formData.append('priceCurrent', priceCurrent);
      formData.append('priceSale', priceSale);
      formData.append('inventory', inventory);
      formData.append('inventoryStatus', inventoryStatus);
      formData.append('user_id', userId);
      formData.append('token', token);
      formData.append('productCode', productCode);
      formData.append('brandId', selectedBrand);
      formData.append('categoryId', selectedCategory);
      formData.append('quantity', productQuantity);
      if(selectedCustomer) {
        formData.append('customerId', selectedCustomer);
      }
      if (allImageIds.length > 0) {
        formData.append('currentImageArray', JSON.stringify(allImageIds));
      }
      console.log(JSON.stringify(allImageIds));

      const response = await fetchWithTimeout(
        'https://huelinh.com/api/update_product/' + id,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
        60000
      );

      const data = await response.json();
      Alert.alert(
        'Thành công',
        'Sản phẩm đã được cập nhật thành công',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Store the current page before redirecting
              const currentPage = await SecureStore.getItemAsync('page');
              if (currentPage) {
                await SecureStore.setItemAsync('lastPage', currentPage);
              }
              router.push('/listProduct');
            }
          }
        ]
      );
    } catch (error) {
      setIsUploading(false);
      setIsCreatingProduct(false);
      
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    }
  };

  useEffect(() => {
    if (id) {
      getProductDetail();
    }
  }, [id]);
 
  // Add this function to check if form is valid
  const isFormValid = () => {
    return productName.trim() !== '';
  };
  // Add missing fetchWithTimeout function
  const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  };

  // Update handleGenerateQR to use square dimensions
  const handleGenerateQR = () => {
    const qrData = `https://huelinh.com/chi-tiet-san-pham/${productSlug}-${id}`;
    const size = Math.min(parseInt(sizeWidth), parseInt(sizeHeight)); // Use the smaller dimension to ensure square
    const pixelSize = mmToPixels(size);
    // Request a square QR code with no margins
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${pixelSize}x${pixelSize}&data=${encodeURIComponent(qrData)}&margin=0`;
    setQrImageUrl(qrUrl);
    setPreviewHtml(generatePreviewHtml(qrUrl, parseInt(sizeWidth), parseInt(sizeHeight)));
    setQrModalVisible(true);
  };

  // Update handlePrintQR to maintain aspect ratio
  const handlePrintQR = async () => {
    setIsPrinting(true);
    try {
      const pixelWidth = mmToPixels(parseInt(sizeWidth));
      const pixelHeight = mmToPixels(parseInt(sizeHeight));
      
      await Print.printAsync({
        html: previewHtml,
        width: pixelWidth,
        height: pixelHeight,
        printerUrl: selectedPrinter?.url,
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        orientation: 'landscape',
      });

    } catch (error) {
      setIsPrinting(false);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi in mã QR');
    } finally {
      setIsPrinting(false);
    }
  };

  const selectPrinter = async () => {
    try {
      const printer = await Print.selectPrinterAsync();
      setSelectedPrinter(printer);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn máy in');
    }
  };

  const handleDeleteProduct = async () => {
    setDeleteModalVisible(false);
    try {
      setIsDeleting(true);
      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('token', token);
      const response = await fetch(`https://huelinh.com/api/delete_product/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: fd
      });
      const data = await response.json();
      if(data.status == 'success'){
        Alert.alert(
          'Thành công',
          'Sản phẩm và đơn hàng liên quan đã được xóa thành công!',
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/listProduct');
              }
            }
          ]
        );
      }
      setIsDeleting(false);
    } catch (error) {
      console.error('Error deleting product:', error);
      setIsDeleting(false);
    }
  };
  
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 1,
      exif: true,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type || asset.mimeType || getImageType(asset.uri),
        width: asset.width,
        height: asset.height,
      }));
      setTempImages([...tempImages, ...newUris.map(img => img.uri)]);
    }
  };

  const getImageType = (uri: string): string => {
    const extension = uri.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'heic':
      case 'heif':
        return 'image/heif';
      case 'tiff':
      case 'tif':
        return 'image/tiff';
      case 'bmp':
        return 'image/bmp';
      default:
        if (uri.startsWith('data:image/')) {
          return uri.split(';')[0].replace('data:', '');
        }
        return 'image/jpeg';
    }
  };

  const fetchServerImages = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (inventory) params.append('inventory', (parseInt(inventory)+1).toString());
      if (page) params.append('page', page.toString());
      if (selectedBrand) params.append('brand_id', selectedBrand);
      
      const queryString = params.toString();
      const url = `https://huelinh.com/api/get_product_images${queryString ? `?${queryString}` : ''}`;   
      const response = await fetch(url);  
      const data = await response.json();
      
      setHasMore(data.image.length === 20);
      
      if (page === 1) {
        setServerImages(data.image);
      } else {
        setServerImages(prevImages => [...prevImages, ...data.image]);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy dữ liệu từ server. Vui lòng thử lại sau.', [{ text: 'OK' }]);
    }
  };

  const isFormCustomerValid = () => {
    return newCustomer.name && newCustomer.phone;
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name && !newCustomer.phone) {
        return;
    }
    try {
        setIsCreatingCustomer(true);
        const formData = new FormData();
        formData.append('customer_name', newCustomer.name);
        formData.append('customer_phone', newCustomer.phone);
        formData.append('other_info', newCustomer.otherInfo);
        formData.append('user_id', userId);
        formData.append('type', newCustomer.type);

        const response = await fetch('https://huelinh.com/api/create_customer_api', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            setModalCustomerVisible(false);
            setNewCustomer({ name: '', phone: '', otherInfo: '', type: '' });
            handleCustomerSearch(); // Refresh the customer list
            setOpenCustomerDropdown(false);
            setSelectedCustomer(data.data.customer_id.toString());
            setSelectedCustomerData(data.data);
        } else {
          if(data.message) {
            Alert.alert(
                'Lỗi',
                data.message,
                [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
                'Lỗi',
                'Không thể tạo khách hàng. Vui lòng thử lại.',
                [{ text: 'OK' }]
            );
          }
        }
    } catch (error) {
        console.error('Error adding customer:', error);
    } finally {
        setIsCreatingCustomer(false);
    }
  };

  const LoadingOverlay = ({ message }: { message: string }) => (
    <View style={styles.loadingOverlay}>

      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {openCustomerDropdown && (
        
        <View style={styles.modalOverlay2}>
          {isCreatingCustomer && (
            <LoadingOverlay message="Đang tạo khách hàng..." />
          )}
          <View style={styles.modalView}>
            {modalCustomerVisible ? (
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "height" : "height"}
                style={{ flex: 1 }}
            >
                <TouchableOpacity 
                    style={styles.modalContainer2} 
                    activeOpacity={1} 
                    onPress={() => {
                        Keyboard.dismiss();
                    }}
                >
                    <TouchableOpacity 
                        style={styles.modalContent2} 
                        activeOpacity={1} 
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView>
                            <Text style={styles.modalTitle}>Thêm khách bán mới</Text>
                            
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Tên khách hàng"
                                value={newCustomer.name}
                                onChangeText={(text) => setNewCustomer({...newCustomer, name: text})}
                            />
                            
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Số điện thoại"
                                value={newCustomer.phone}
                                keyboardType="phone-pad"
                                onChangeText={(text) => setNewCustomer({...newCustomer, phone: text})}
                            />
                            
                            <View style={styles.inputGroup}>
                              <Text style={styles.label}>Loại khách hàng</Text>
                              <DropDownPicker
                                searchable={true}
                                searchPlaceholder="Tìm kiếm loại khách hàng..."
                                open={openCustomerType}
                                setOpen={setOpenCustomerType}
                                value={newCustomer.type || '1'}
                                setValue={(callback) => setNewCustomer({...newCustomer, type: callback('')})}
                                items={[
                                  { label: 'Mua', value: '0' },
                                  { label: 'Bán', value: '1' },
                                  { label: 'Mua & bán', value: '2' },
                                ]}
                                placeholder="Chọn loại khách hàng"
                                style={styles.dropdownStyle}
                                dropDownContainerStyle={styles.dropdownContainer}
                                searchContainerStyle={styles.searchContainer}
                                searchTextInputStyle={styles.searchInput}
                                listMode="MODAL"
                                modalProps={{
                                  animationType: "fade"
                                }}
                                modalContentContainerStyle={{
                                  backgroundColor: "white"
                                }}
                                selectedItemContainerStyle={{
                                  backgroundColor: '#e6f3ff'
                                }}
                                selectedItemLabelStyle={{
                                  color: '#0066cc',
                                  fontWeight: 'bold'
                                }}
                                tickIconStyle={{
                                  tintColor: '#0066cc'
                                } as any}
                              />
                            </View>
                            <TextInput
                                style={[styles.modalInput, styles.modalTextArea]}
                                placeholder="Thông tin khác"
                                value={newCustomer.otherInfo}
                                multiline={true}
                                numberOfLines={4}
                                onChangeText={(text) => setNewCustomer({...newCustomer, otherInfo: text})}
                            />
                        </ScrollView>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setModalCustomerVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[
                                    styles.modalButton, 
                                    styles.modalButtonAdd,
                                    !isFormCustomerValid() && styles.modalButtonDisabled
                                ]}
                                onPress={handleAddCustomer}
                                disabled={!isFormCustomerValid()}
                            >
                                <Text style={styles.modalButtonText}>Thêm</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </KeyboardAvoidingView>
          ):(
            <>
            <View style={styles.modalHeader2}>
                <View style={[styles.searchContainer, {width: '80%'}]}>
                    <TextInput
                        style={[styles.searchInput, {width: '100%'}]}
                        placeholder="Tìm kiếm khách hàng..."
                        value={search}
                        onChangeText={(text) => setSearch(text)}
                        onSubmitEditing={handleCustomerSearch}
                        returnKeyType="search"
                    />
                </View>
                <TouchableOpacity 
                    onPress={() => handleCustomerSearch()}
                    style={{ marginRight: 5 }}
                >
                    <AntDesign name="sync" size={20} color="black" />
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => setOpenCustomerDropdown(false)}
                >
                    <AntDesign name="close" size={20} color="black" />
                </TouchableOpacity>
            </View>
            
            <ScrollView nestedScrollEnabled={true}>
                <TouchableOpacity
                    style={styles.addCustomerItem}
                    onPress={() => {
                        setModalCustomerVisible(true);
                    }}
                >
                    <View style={styles.addCustomerContent}>
                        <AntDesign name="plus" size={20} color="rgb(40, 167, 69)" />
                        <Text style={styles.addCustomerText}>Thêm khách bán mới</Text>
                    </View>
                </TouchableOpacity>
                {customerList.map((customer) => (
                    <TouchableOpacity
                        key={customer.customer_id}
                        style={[
                            styles.customerItem,
                            selectedCustomer === customer.customer_id.toString() && styles.customerItemSelected
                        ]}
                        onPress={() => {
                            setSelectedCustomer(customer.customer_id.toString());
                            setSelectedCustomerData(customer);
                            setOpenCustomerDropdown(false);
                        }}
                    > 
                        <View style={styles.customerItemInfo}>
                            <View style={styles.customerNameRow}>
                                
                                <Text style={[
                                    styles.customerName,
                                    selectedCustomer === customer.customer_id.toString() && styles.customerNameSelected
                                ]}>
                                    {customer.customer_name}
                                </Text>
                                {customer.type == 0 && (
                                  <Text style={styles.customerType0}>Mua</Text>
                                )}
                                {customer.type == 1 && (
                                  <Text style={styles.customerType1}>Bán</Text>
                                )}
                                {customer.type == 2 && (
                                  <Text style={styles.customerType2}>Mua & bán</Text>
                                )}
                                      </View>
                            <Text style={styles.customerContact}>SĐT: {customer.phone_number}</Text>
                            <Text style={styles.customerContact}>Thông tin khác:</Text>
                            <Text style={styles.customerContact}>{customer.other_info}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
                
            </ScrollView>
            </>
          )}
          </View>
        </View>
      )}
      <ScrollView style={styles.container} ref={scrollViewRef} scrollEnabled={!isUploading && !isCreatingProduct && !openCustomerDropdown}> 
        <HeaderNav currentScreen="Chi tiết sản phẩm"/>
        
        <View style={[
          styles.formContainer,
          (isUploading || isCreatingProduct) && styles.formContainerNoScroll
        ]}>
          {/* Loading overlays */}
          {isUploading && (
            <LoadingOverlay message="Đang tải ảnh lên..." />
          )}
          {isCreatingProduct && (
            <LoadingOverlay message="Đang cập nhật sản phẩm..." />
          )}
          {isDeleting && (
            <LoadingOverlay message="Đang xóa sản phẩm và đơn hàng liên quan..." />
          )}
          {/* Image Upload Section */}
          <View style={styles.imageSection}>
            {/* Show current server images with remove option that shows upload button */}
            {serverImages.length > 0 && (
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>Ảnh hiện tại:</Text>
                <ScrollView 
                  horizontal 
                  style={styles.imageScroll}
                  showsHorizontalScrollIndicator={false}
                >
                  {serverImages.map((image, index) => (
                    <View key={`api-${index}`} style={styles.imageWrapper}>
                      <Image 
                        source={{ uri: `${productImageSrc}${image.asset_src}` }} 
                        style={styles.productImage}
                        contentFit="cover"
                        cachePolicy="disk"
                      />
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => {
                          setServerImages(serverImages.filter((_, i) => i !== index));
                        }}
                      >
                        <Text style={styles.removeButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Show newly selected images if any */}
            {tempImages.length > 0 && (
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>Ảnh mới đã chọn:</Text>
                <ScrollView horizontal style={styles.imageScroll} showsHorizontalScrollIndicator={false}>
                  {tempImages.map((uri, index) => (
                    <View key={`new-${index}`} style={styles.imageWrapper}>
                      <Image 
                        source={{ uri: uri }} 
                        style={styles.productImage} 
                        contentFit="cover"
                        cachePolicy="disk"
                      />
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => setTempImages(tempImages.filter((_, i) => i !== index))}
                      >
                        <Text style={styles.removeButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {/* Show selected server images if any */}
            {selectedServerImages.length > 0 && (
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>Ảnh đã chọn từ thư viện:</Text>
                <ScrollView horizontal style={styles.imageScroll} showsHorizontalScrollIndicator={false}>
                  {selectedServerImages.map((uri, index) => (
                    <View key={`server-${index}`} style={styles.imageWrapper}>
                      <Image 
                      source={{ uri: productImageSrc + uri }} 
                      style={styles.productImage} 
                      contentFit="cover"
                      cachePolicy="disk"
                      />
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => {
                          const newSelectedImages = selectedServerImages.filter((_, i) => i !== index);
                          const newSelectedIds = selectedServerImagesId.filter((_, i) => i !== index);
                          setSelectedServerImages(newSelectedImages);
                          setSelectedServerImagesId(newSelectedIds);
                        }}
                      >
                        <Text style={styles.removeButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {/* Only show upload button if there are no current images or if images have been removed */}
            {(serverImages.length === 0 || serverImages.length < initialServerImageCount) && (
              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={() => {
                  setModalVisible(true);
                  if (activeTab === 'server') {
                    fetchServerImages();
                  }
                }}
              >
                <LinearGradient
                  colors={['#06b6d4', '#0891b2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.uploadButtonGradient}
                >
                  <Text style={styles.uploadButtonText}>
                    {tempImages.length > 0 || selectedServerImages.length > 0 ? 'Chọn thêm ảnh' : 'Chọn ảnh sản phẩm'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mã QR</Text>
            {printedQrCode !== '' ? (
              <View style={styles.qrCodeTimeContainer}>
                <Text style={styles.qrCodeTimeText}>Ngày in: {new Date(printedQrCode).toLocaleDateString()} {new Date(printedQrCode).toLocaleTimeString()}</Text>
                <TouchableOpacity 
                  style={styles.qrCodeReButton}
                  onPress={updatePrintTime}
                >
                  <LinearGradient
                    colors={['#f59e0b', '#d97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.qrCodeReButtonGradient}
                  >
                    <Text style={styles.qrCodeText}>In lại QR</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.qrCodeButton}
                onPress={updatePrintTime}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.qrCodeButtonGradient}
                >
                  <Text style={styles.qrCodeText}>Tạo mã QR</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên sản phẩm</Text>
            <TextInput
              style={[styles.input, { backgroundColor: role === 'admin' ? 'white' : '#f0f0f0' }]}
              value={productName}
              onChangeText={setProductName}
              placeholder="Nhập tên sản phẩm"
              editable={role === 'admin'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giá gốc</Text>
            <TextInput
              style={[styles.input, { backgroundColor: role === 'admin' ? 'white' : '#f0f0f0' }]}
              value={displayPrice}
              onChangeText={(text) => {
                const unformatted = unformatPrice(text);
                setPrice(unformatted);
                setDisplayPrice(formatPrice(unformatted));
              }}
              keyboardType="numeric"
              placeholder="Nhập giá gốc"
              editable={role === 'admin'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giá hiện tại</Text>
            <TextInput
              style={[styles.input, { backgroundColor: role === 'admin' ? 'white' : '#f0f0f0' }]}
              value={displayPriceCurrent}
              onChangeText={(text) => {
                const unformatted = unformatPrice(text);
                setPriceCurrent(unformatted);
                setDisplayPriceCurrent(formatPrice(unformatted));
              }}
              keyboardType="numeric"
              placeholder="Nhập giá hiện tại"
              editable={role === 'admin'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giá khuyến mãi</Text>
            <TextInput
              style={[styles.input, { backgroundColor: role === 'admin' ? 'white' : '#f0f0f0' }]}
              value={displayPriceSale}
              onChangeText={(text) => {
                const unformatted = unformatPrice(text);
                setPriceSale(unformatted);  // Store actual number
                setDisplayPriceSale(formatPrice(unformatted));  // Display formatted
              }}
              keyboardType="numeric"
              placeholder="Nhập giá khuyến mãi"
              editable={role === 'admin'}
            />
          </View>


          <View style={[styles.inputGroup, { zIndex: 3000 }]}>
            <Text style={styles.label}>Kho hàng</Text>
            <DropDownPicker
              open={openInventory}
              setOpen={setOpenInventory}
              value={inventory}
              setValue={(callback) => setInventory(callback(''))}
              items={[
                { label: 'Hà Nội', value: '0' },
                { label: 'Hồ Chí Minh', value: '1' }
              ]}
              placeholder="Chọn kho hàng"
              style={[styles.dropdownStyle, { backgroundColor: role === 'admin' ? 'white' : '#f0f0f0' }]}
              dropDownContainerStyle={[styles.dropdownContainer, { maxHeight: 100 }]}
              listMode="SCROLLVIEW"
              scrollViewProps={{
                nestedScrollEnabled: true,
              }}
              disabled={role !== 'admin'}
              zIndex={3000}
              zIndexInverse={1000}
            />
          </View>

          <View style={[styles.inputGroup, { zIndex: 2000 }]}>
            <Text style={styles.label}>Trạng thái kho</Text>
            <DropDownPicker
              open={openInventoryStatus}
              setOpen={setOpenInventoryStatus}
              value={inventoryStatus}
              setValue={(callback) => setInventoryStatus(callback(''))}
              items={[
                { label: 'Mua lại', value: '1' },
                { label: 'Hết hàng', value: '0' },
                { label: 'Kí gửi', value: '2' }
              ]}
              placeholder="Chọn trạng thái"
              style={[styles.dropdownStyle, { backgroundColor: role === 'admin' ? 'white' : '#f0f0f0' }]}
              dropDownContainerStyle={[styles.dropdownContainer, { maxHeight: 150 }]}
              listMode="SCROLLVIEW"
              scrollViewProps={{
                nestedScrollEnabled: true,
              }}
              disabled={role !== 'admin'}
              zIndex={2000}
              zIndexInverse={2000}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Khách hàng</Text>
            <TouchableOpacity 
              style={styles.dropdownStyle}
              onPress={() => setOpenCustomerDropdown(!openCustomerDropdown)}
            >
              <View style={styles.dropdownTrigger}>
                <Text style={styles.dropdownTriggerText}>
                  {selectedCustomerData ? selectedCustomerData.customer_name + " | " + selectedCustomerData.phone_number : "Chọn khách hàng"}
                </Text>
                {openCustomerDropdown ?(
                  <Entypo name="chevron-thin-up" size={14} color="black" />
                ):(
                  <Entypo name="chevron-thin-down" size={14} color="black" />
                )}
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mã code sản phẩm</Text>
            <TextInput
              style={[styles.input, { backgroundColor: role === 'admin' ? 'white' : '#f0f0f0' }]}
              value={productCode}
              onChangeText={setProductCode}
              placeholder="Nhập mã code sản phẩm"
              editable={role === 'admin'}
            />
          </View>
              
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thương hiệu</Text>
            <DropDownPicker
              searchable={true}
              searchPlaceholder="Tìm kiếm thương hiệu..."
              open={openBrand}
              setOpen={setOpenBrand}
              value={selectedBrand}
              setValue={(callback) => setSelectedBrand(callback(''))}
              items={brandList.map((brand) => ({
                label: brand.brand_name,
                value: brand.brand_id.toString(),
              }))}
              placeholder="Chọn thương hiệu"
              style={styles.dropdownStyle}
              dropDownContainerStyle={styles.dropdownContainer}
              searchContainerStyle={styles.searchContainer}
              searchTextInputStyle={styles.searchInput}
              listMode="MODAL"
              modalProps={{
                animationType: "fade"
              }}
              modalContentContainerStyle={{
                backgroundColor: "white"
              }}
              selectedItemContainerStyle={{
                backgroundColor: '#e6f3ff'
              }}
              selectedItemLabelStyle={{
                color: '#0066cc',
                fontWeight: 'bold'
              }}
              tickIconStyle={{
                tintColor: '#0066cc'
              } as any}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Danh mục</Text>
            <DropDownPicker
              searchable={true}
              searchPlaceholder="Tìm kiếm danh mục..."
              open={openCategory}
              setOpen={setOpenCategory}
              value={selectedCategory}
              setValue={(callback) => {
                const newValue = callback('');
                setSelectedCategory(newValue);
                // The useEffect above will handle calling getFilterByCategory
              }}
              items={categoryList.map((category) => ({
                label: category.category_name,
                value: category.product_category_id.toString(),
              }))}
              placeholder="Chọn danh mục"
              style={styles.dropdownStyle}
              dropDownContainerStyle={styles.dropdownContainer}
              searchContainerStyle={styles.searchContainer}
              searchTextInputStyle={styles.searchInput}
              listMode="MODAL"
              modalProps={{
                animationType: "fade"
              }}
              modalContentContainerStyle={{
                backgroundColor: "white"
              }}
              selectedItemContainerStyle={{
                backgroundColor: '#e6f3ff'
              }}
              selectedItemLabelStyle={{
                color: '#0066cc',
                fontWeight: 'bold'
              }}
              tickIconStyle={{
                tintColor: '#0066cc'
              } as any}
            />
          </View>
          
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              !isFormValid() && styles.submitButtonDisabled
            ]}
            disabled={!isFormValid() || isUploading || isCreatingProduct}
            onPress={handleSubmit}
          >
            <LinearGradient
              colors={!isFormValid() || isUploading || isCreatingProduct ? ['#cccccc', '#bbbbbb'] : ['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButtonGradient}
            >
              <Text style={styles.submitButtonText}>
                {isUploading ? 'Đang tải ảnh lên...' : 
                  isCreatingProduct ? 'Đang cập nhật sản phẩm...' : 
                  'Cập nhật sản phẩm'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => setDeleteModalVisible(true)}>
          <LinearGradient
            colors={['#ef4444', '#dc2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.deleteButtonGradient}
          >
            <Text style={styles.deleteButtonText}>Xóa sản phẩm</Text>
          </LinearGradient>
        </TouchableOpacity>
          </View>
        
        </View>
                 <Modal
           visible={qrModalVisible}
           transparent={true}
           animationType="fade"
           onRequestClose={() => setQrModalVisible(false)}
         >
           <LinearGradient
             colors={['rgba(102, 126, 234, 0.9)', 'rgba(118, 75, 162, 0.9)', 'rgba(240, 147, 251, 0.9)']}
             start={{ x: 0, y: 0 }}
             end={{ x: 1, y: 1 }}
             style={styles.modalOverlay}
           >
                           <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
             {isPrinting && (
               <LoadingOverlay message="Đang in mã QR..." />
             )}
                          <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalContent}
                >
                 <TouchableOpacity 
                   style={styles.closeButton}
                   onPress={() => setQrModalVisible(false)}
                 >
                   <Text style={styles.closeButtonText}>×</Text>
                 </TouchableOpacity>
                 
                 <Text style={styles.modalTitle}>Mã QR Sản phẩm</Text>
                 
                 {qrImageUrl && (
                   <Image
                     source={{ uri: qrImageUrl }}
                     style={styles.qrImage}
                     contentFit="contain"
                     cachePolicy="disk"
                   />
                 )}
                 
                 <View style={styles.modalDivider} />
                 
                 <TouchableOpacity 
                   style={styles.printerSelectButton}
                   onPress={selectPrinter}
                 >
                   <Text style={styles.printerSelectText}>
                     {selectedPrinter ? selectedPrinter.name : 'Chọn máy in'}
                   </Text>
                   {selectedPrinter && (
                     <Text style={styles.printerLocation}>
                       {selectedPrinter.url}
                     </Text>
                   )}
                 </TouchableOpacity>
                 <View style={styles.modalDivider}/>
                 <View style={styles.sizeOptionContainer}>
                   <Text style={styles.sizeLabel}>Kích thước mã QR</Text>
                   <DropDownPicker
                     open={openSize}
                     setOpen={setOpenSize}
                     value={size}
                     setValue={(callback) => {
                       setSize(callback(''))
                       setSizeWidth(size)
                       setSizeHeight(size)
                     }}
                     items={[
                       { label: 'Lớn', value: '50' },
                       { label: 'Vừa', value: '40' },
                       { label: 'Nhỏ', value: '30' },
                     ]}
                     listMode="SCROLLVIEW"
                     scrollViewProps={{
                       nestedScrollEnabled: true,
                     }}
                     style={styles.dropdownStyle}
                     dropDownContainerStyle={[styles.dropdownContainer, { maxHeight: 120 }]}
                     zIndex={3000}
                     zIndexInverse={1000}
                   />
                 </View>
                 <View style={styles.modalDivider}/>
                                  <TouchableOpacity 
                    style={[
                      styles.printButton,
                      !selectedPrinter && styles.printButtonDisabled
                    ]}
                    onPress={handlePrintQR}
                    disabled={!selectedPrinter}
                  >
                    <LinearGradient
                      colors={!selectedPrinter ? ['#cccccc', '#bbbbbb'] : ['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.printButtonGradient}
                    >
                      <Text style={styles.printButtonText}>
                        {!selectedPrinter ? 'Vui lòng chọn máy in' : 'In mã QR'}
                      </Text>
                    </LinearGradient>
                                   </TouchableOpacity>
                  
                </LinearGradient>
              </ScrollView>
            </KeyboardAvoidingView>
          </LinearGradient>
        </Modal>
        <Modal
          visible={deleteModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>Xác nhận xóa</Text>
              <Text style={styles.deleteModalText}>Bạn có chắc chắn muốn xóa sản phẩm này không?</Text>
              
                             <View style={styles.deleteModalButtons}>
                 <TouchableOpacity 
                   style={styles.deleteModalCancel}
                   onPress={() => setDeleteModalVisible(false)}
                 >
                   <LinearGradient
                     colors={['#6b7280', '#4b5563']}
                     start={{ x: 0, y: 0 }}
                     end={{ x: 1, y: 1 }}
                     style={styles.deleteModalCancelGradient}
                   >
                     <Text style={styles.deleteModalCancelText}>Hủy</Text>
                   </LinearGradient>
                 </TouchableOpacity>
                 
                 <TouchableOpacity 
                   style={styles.deleteModalConfirm}
                   onPress={() => {
                     handleDeleteProduct();
                   }}
                 >
                   <LinearGradient
                     colors={['#ef4444', '#dc2626']}
                     start={{ x: 0, y: 0 }}
                     end={{ x: 1, y: 1 }}
                     style={styles.deleteModalConfirmGradient}
                   >
                     <Text style={styles.deleteModalConfirmText}>Xóa sản phẩm</Text>
                   </LinearGradient>
                 </TouchableOpacity>
               </View>
            </View>
          </View>
        </Modal>

        {/* Image selection modal - exactly like in addProduct.tsx */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'device' && styles.activeTab]}
                  onPress={() => setActiveTab('device')}
                >
                  <Text style={[styles.tabText, activeTab === 'device' && styles.activeTabText]}>
                    Tải ảnh lên
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'server' && styles.activeTab]}
                  onPress={() => {
                    setActiveTab('server');
                    fetchServerImages();
                  }}
                >
                  <Text style={[styles.tabText, activeTab === 'server' && styles.activeTabText]}>
                    Chọn từ thư viện
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

                         <View style={styles.imageModalContent}>
              {isUploading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Đang tải ảnh lên...</Text>
                </View>
              ) : (
                activeTab === 'device' ? (
                  <View style={styles.deviceUploadContainer}>
                    {tempImages.length > 0 ? (
                      <ScrollView contentContainerStyle={styles.serverImagesGrid}>
                        {tempImages.map((uri, index) => (
                          <TouchableOpacity
                            key={`temp-${index}`}
                            style={[
                              styles.serverImageWrapper,
                              styles.selectedImage
                            ]}
                            onPress={() => {
                              setTempImages(tempImages.filter((_, i) => i !== index));
                            }}
                          >
                            <Image 
                              source={{ uri }} 
                              style={styles.serverImage}
                              contentFit="cover"
                              cachePolicy="disk"
                            />
                            <View style={styles.tickOverlay}>
                              <Text style={styles.tickIcon}>✓</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <TouchableOpacity style={styles.uploadArea} onPress={pickImage}>
                        <Text style={styles.uploadAreaText}>Nhấn để chọn ảnh từ thiết bị</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <ScrollView contentContainerStyle={styles.serverImagesGrid}>
                    {serverImages.map((image) => (
                      <TouchableOpacity
                        key={image.asset_id}
                        style={[
                          styles.serverImageWrapper,
                          selectedServerImages.includes(image.asset_src) && styles.selectedImage
                        ]}
                        onPress={() => {
                          if (selectedServerImages.includes(image.asset_src)) {
                            const newSelectedImages = selectedServerImages.filter(url => url !== image.asset_src);
                            const newSelectedIds = selectedServerImagesId.filter(id => id !== image.asset_id);
                            setSelectedServerImages(newSelectedImages);
                            setSelectedServerImagesId(newSelectedIds);
                          } else {
                            setSelectedServerImages(prev => [...prev, image.asset_src]);
                            setSelectedServerImagesId(prev => [...prev, image.asset_id]);
                          }
                        }}
                      >
                        <Image 
                          source={{ uri: productImageSrc + image.asset_src }} 
                          style={styles.serverImage}
                          contentFit="cover"
                          cachePolicy="disk"
                        />
                        {selectedServerImages.includes(image.asset_src) && (
                          <View style={styles.tickOverlay}>
                            <Text style={styles.tickIcon}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                    {hasMore && serverImages.length > 0 && (
                      <TouchableOpacity 
                        style={styles.loadMoreButton}
                        onPress={() => {
                          setPage(prevPage => prevPage + 1);
                          fetchServerImages();
                        }}
                      >
                        <Text style={styles.loadMoreButtonText}>Tải thêm ảnh</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )
              )}
            </View>

            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>
    </LinearGradient>
  );
}



// Update styles to match addProduct.tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 25,
    paddingBottom: 100,
  },
  formSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageScroll: {
    flexGrow: 0,
  },
  imageContainer: {
    marginBottom: 15,
  },
  imageWrapper: {
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  imageLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    marginLeft: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  removeButton: {
    position: 'absolute',
    right: 5,
    top: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 17,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  submitButton: {
    borderRadius: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  dropdownStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
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
  searchContainer: {
    borderBottomColor: '#DDD',
    padding: 8,
  },
  searchInput: {
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  deleteButton: {
    borderRadius: 16,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  deleteButtonGradient: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
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
    zIndex: 10000,
    height: screenHeight,
  },
  formContainerNoScroll: {
    overflow: 'hidden',
    height: '100%',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  qrCodeButton: {
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCodeButtonGradient: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrCodeReButton: {
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCodeReButtonGradient: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrCodeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  qrCodeTimeText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  qrImage: {
    width: 250,
    height: 250,
    marginVertical: 25,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 20,
  },
  printerSelectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 16,
    width: '100%',
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  printerSelectText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  printerLocation: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  printButton: {
    borderRadius: 16,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  printButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  printButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  printButtonDisabled: {
    backgroundColor: '#E5E5E5',
    opacity: 0.7,
  },
  sizeOptionContainer: {
    width: '100%',
    marginVertical: 10,
    zIndex: 3000,
  },
  sizeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sizeInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    width: 100,
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  sizeSeparator: {
    fontSize: 20,
    color: '#666',
    fontWeight: '500',
    marginHorizontal: 4,
  },
  sizeUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  qrCodeTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  deleteModalCancel: {
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteModalCancelGradient: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteModalConfirm: {
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteModalConfirmGradient: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadButton: {
    borderRadius: 12,
    marginTop: 10,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonGradient: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  tabContainer: {
    flex: 1,
    flexDirection: 'row',
    marginRight: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  uploadArea: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadAreaText: {
    fontSize: 16,
    color: '#666',
  },
  serverImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  serverImageWrapper: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedImage: {
    borderColor: '#007AFF',
  },
  serverImage: {
    width: '100%',
    height: '100%',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  deviceUploadContainer: {
    flex: 1,
    padding: 16,
  },
  tickOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickIcon: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadMoreButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  loadMoreButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: '#333',
  },
  modalView: {
    backgroundColor: 'white',
    width: screenWidth,
    height: screenHeight,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalHeader2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'black',
    backgroundColor: '#fff',
  },
  customCloseButtonText: {
    fontSize: 36,
    color: 'black',
  },
  modalContainer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent2: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 228, 0.5)',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#dc3545',
  },
  modalButtonAdd: {
    backgroundColor: 'rgb(40, 167, 69)',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  modalButtonDisabled: {
    backgroundColor: 'rgba(40, 167, 69, 0.5)',
  },
  addCustomerItem: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  addCustomerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addCustomerText: {
    fontSize: 16,
    color: 'rgb(40, 167, 69)',
    fontWeight: '500',
  },
  customerListItem: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 228, 0.5)',
  },
  customerItemInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    fontFamily: 'Roboto_400Regular',
  },
  customerContact: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: 'Roboto_400Regular',
  },
  otherInfoLabel: {
    marginBottom: 5,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 228, 0.5)',
    paddingTop: 5,
  },
  customerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  customerItemSelected: {
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
  },
  customerNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerNameSelected: {
    color: 'rgb(40, 167, 69)',
  },
  customerType0: {
    color: 'rgb(0, 123, 255)',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  customerType1: {
    color: 'rgb(40, 167, 69)',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  customerType2: {
    color: 'rgb(255, 193, 7)',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
     modalOverlay2: {
     position: 'absolute',
     top: 0,
     left: 0,
     right: 0,
     bottom: 0,
     backgroundColor: 'rgb(255, 255, 255)',
     zIndex: 1000,
     justifyContent: 'center',
     alignItems: 'center',
     height: screenHeight,
     paddingTop: 60,
   },
   imageModalContent: {
     flex: 1,
     backgroundColor: 'white',
   },
});
