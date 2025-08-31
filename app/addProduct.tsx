import HeaderNav from '@/app/components/headerNav';
import { AntDesign, Entypo } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { SetStateAction as SetStateValue, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;
// Keep the helper functions
const formatPrice = (price: string) => {
  if (!price) return '';
  return Number(price).toLocaleString('de-DE');
};

const unformatPrice = (price: string) => {
  if (!price) return '';
  return price.replace(/\./g, '');
};

// Add this interface after the imports
interface ImageData {
  uri: string;
  type: string;
  name: string;
}

// Add these interfaces after the existing ImageData interface
interface Brand {
  brand_id: number;
  brand_name: string;
}

interface Category {
  product_category_id: number;
  category_name: string;
}

// Add after other interfaces
interface ProductFilter {
  category_filter_id: number;
  filter_name: string;
  filter_value_array?: {
    category_filter_value_id: number;
    category_filter_value: string;
  }[];
}

// Add interface for dropdown state
interface DropdownState {
  [key: number]: boolean;
}

// Add with other interfaces
interface FilterValuesState {
  [key: number]: string;
}

interface ServerImage {
  asset_id: number;
  asset_src: string;
}

interface Customer {
  customer_id: number;
  customer_name: string;
  phone_number: string;
  other_info: string;
  type: number;
}

const productImageSrc = 'https://huelinh.b-cdn.net/assets/img/product_images/';

// Add a timeout wrapper function
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

// Add customer function

export default function AddProductScreen() {
  // Simplified state declarations
  const [images, setImages] = useState<string[]>([]);
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('0');
  const [priceCurrent, setPriceCurrent] = useState('0');
  const [priceSale, setPriceSale] = useState('0');
  const [productCode, setProductCode] = useState('');
  const [productQuantity, setProductQuantity] = useState('1');
  const [inventory, setInventory] = useState<string>('0');
  const [inventoryStatus, setInventoryStatus] = useState<string>('1');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [brandList, setBrandList] = useState<Brand[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [productFilter, setProductFilter] = useState<ProductFilter[]>([]);
  const [filterValues, setFilterValues] = useState<FilterValuesState>({});
  const [openDropdowns, setOpenDropdowns] = useState<DropdownState>({});
  const [displayPrice, setDisplayPrice] = useState('0');
  const [displayPriceCurrent, setDisplayPriceCurrent] = useState('0');
  const [displayPriceSale, setDisplayPriceSale] = useState('0');
  const [openBrand, setOpenBrand] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('device'); // 'device' or 'server'
  const [serverImages, setServerImages] = useState<ServerImage[]>([]);
  const [selectedServerImages, setSelectedServerImages] = useState<string[]>([]);
  const [selectedServerImagesId, setSelectedServerImagesId] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [openInventory, setOpenInventory] = useState(false);
  const [openInventoryStatus, setOpenInventoryStatus] = useState(false);
  const [tempImages, setTempImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [userId, setUserId] = useState('');
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
  
  // Add function to fetch initial data (brands, categories, filters)
  const fetchInitialData = async () => {
    try {
      const response = await fetch('https://huelinh.com/api/get_product_form_data');
      const data = await response.json();
      
      setBrandList(data.brand);
      setCategoryList(data.category);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy dữ liệu từ server. Vui lòng thử lại sau.', [{ text: 'OK' }]);
    }
  };

  // Update the upload function with timeout
  const uploadImages = async (imageUris: string[]) => {
    try {
      const formData = new FormData();
      
      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
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
        60000 // 30 second timeout
      );

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      return data.image_urls;
    } catch (error) {
      setIsUploading(false);
      setIsCreatingProduct(false);
      
      Alert.alert(
        'Lỗi tải ảnh',
        error instanceof Error && error.message === 'Request timeout' 
          ? 'Quá thời gian tải ảnh. Vui lòng thử lại.'
          : error instanceof Error ? error.message : 'Không thể tải ảnh lên. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
      
      return null;
    }
  };

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
  // Updated submit function with separate steps
  const handleSubmit = async () => {
    try {
      // Scroll to top first
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      // Small delay to ensure smooth scrolling before showing overlay
      await new Promise(resolve => setTimeout(resolve, 100));

      let uploadedImageUrls: number[] = [];

      if (tempImages.length > 0) {
        setIsUploading(true);
        const result = await uploadImages(tempImages);
        if (!result) return;
        uploadedImageUrls = result;
        setIsUploading(false);
      }

      setIsCreatingProduct(true);
      const formData = new FormData();
      
      // Combine both arrays of image IDs
      const allImageIds = [...uploadedImageUrls, ...selectedServerImagesId];
      
      // Rest of your form data
      formData.append('productName', productName);
      formData.append('priceOrig', price);
      formData.append('priceCurrent', priceCurrent);
      formData.append('priceSale', priceSale);
      formData.append('inventory', inventory);
      formData.append('inventoryStatus', inventoryStatus);
      formData.append('quantity', productQuantity);
      formData.append('brandId', selectedBrand);
      formData.append('categoryId', selectedCategory);
      formData.append('userId', userId);
      formData.append('productCode', productCode);
      if(selectedCustomer) {
        formData.append('customerId', selectedCustomer);
      }
      const filterValuesArrayFormatted = Object.values(filterValues).map(Number);
      formData.append('filterValueArray', JSON.stringify(filterValuesArrayFormatted));

      if (allImageIds.length > 0) {
        formData.append('currentImageArray', JSON.stringify(allImageIds));
      }
      const response = await fetchWithTimeout(
        'https://huelinh.com/api/create_product',
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
        60000 // 30 second timeout
      );
      const data = await response.json();
      Alert.alert(
        'Thành công',
        'Sản phẩm đã được tạo thành công',

        [
          {
            text: 'OK',
            onPress: () => {
              // Redirect to listProduct screen
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

  const getFilterByCategory = async () => {
    const response = await fetch(`https://huelinh.com/api/get_filter_by_category/${selectedCategory}`);
    const data = await response.json();
    setProductFilter(data);
  }

  const fetchServerImages = async () => {
    try {
      // Build URL params dynamically
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (inventory) params.append('inventory', (parseInt(inventory)+1).toString());
      if (page) params.append('page', page.toString());
      if (selectedBrand) params.append('brand_id', selectedBrand);
      
      // Create URL with params only if they exist
      const queryString = params.toString();
      const url = `https://huelinh.com/api/get_product_images${queryString ? `?${queryString}` : ''}`;   
      const response = await fetch(url);  
      const data = await response.json();
      
      // Check if we received exactly 20 items (indicating there might be more)
      setHasMore(data.image.length === 20);
      
      // Append new images to existing ones instead of replacing
      if (page === 1) {
        setServerImages(data.image);
      } else {
        setServerImages(prevImages => [...prevImages, ...data.image]);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy dữ liệu từ server. Vui lòng thử lại sau.', [{ text: 'OK' }]);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 1,
      // Add support for all image types
      exif: true, // This will give us additional image metadata
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type || asset.mimeType || getImageType(asset.uri), // Try to get the actual mime type
        width: asset.width,
        height: asset.height,
      }));
      setTempImages([...tempImages, ...newUris.map(img => img.uri)]);
    }
  };

  const getImageType = (uri: string): string => {
    // Get file extension from uri or check mime type
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
        return 'image/heif'; // iOS High Efficiency Image Format
      case 'tiff':
      case 'tif':
        return 'image/tiff';
      case 'bmp':
        return 'image/bmp';
      default:
        // If we can't determine the type, let's check the URI for clues
        if (uri.startsWith('data:image/')) {
          return uri.split(';')[0].replace('data:', '');
        }
        return 'image/jpeg'; // fallback to jpeg if we can't determine the type
    }
  };
  // Add this function to check if form is valid
  const isFormValid = () => {
    // Check if there are any images (either from device or server)
    const hasImages = tempImages.length > 0 || selectedServerImages.length > 0;
    
    return hasImages && 
           selectedBrand !== '' && 
           selectedCategory !== '';
  };

  useEffect(() => {
    fetchInitialData();
    handleCustomerSearch();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const userId = await SecureStore.getItemAsync('userId');
      if (userId) {
        setUserId(userId);
      }
    };
    fetchData();
  }, []);

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
  
  const customerTypeMap = (type: string) => {
    switch(type) {
      case '0':
        return 'Mua';
      case '1':
        return 'Bán';
      case '2':
        return 'Mua & bán';
      default:
        return '';
    }
  };
  // Add useEffect to watch selectedCategory
  /*
  useEffect(() => {
    if (selectedCategory) {
      getFilterByCategory();
    } else {
      setProductFilter([]); // Clear filters when no category is selected
    }
  }, [selectedCategory]);
  */
  // Add loading indicator component
  const LoadingOverlay = ({ message }: { message: string }) => (
    <View style={styles.loadingOverlay}>

      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );

  // Add a ref for the ScrollView
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {openCustomerDropdown && (
        <View style={styles.modalOverlay}>
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
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalContent2}
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
                  </LinearGradient>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            ) : (
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
      <ScrollView 
        style={styles.scrollContainer}
        scrollEnabled={!isUploading && !isCreatingProduct && !openCustomerDropdown}
        ref={scrollViewRef}
      >
        <HeaderNav currentScreen="Quản lý sản phẩm"/>
        
        <View style={[
          styles.formContainer,
          (isUploading || isCreatingProduct) && styles.formContainerNoScroll
        ]}>
          {/* Loading overlays */}
          {isUploading && (
            <LoadingOverlay message="Đang tải ảnh lên..." />
          )}
          {isCreatingProduct && (
            <LoadingOverlay message="Đang tạo sản phẩm mới..." />
          )}
          
          {/* Image Upload Section */}
          <View style={styles.imageSection}>
            {(tempImages.length > 0 || selectedServerImages.length > 0) && (
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>Ảnh đã chọn:</Text>
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
                  {selectedServerImages.map((uri, index) => (
                    <View key={`new-${index}`} style={styles.imageWrapper}>
                      <Image 
                        source={{ uri: productImageSrc + uri }} 
                        style={styles.productImage} 
                        contentFit="cover"
                        cachePolicy="disk"
                      />
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => setSelectedServerImages(selectedServerImages.filter((_, i) => i !== index))}
                      >
                        <Text style={styles.removeButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            
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
                  {images.length > 0 ? 'Chọn thêm ảnh' : 'Chọn ảnh sản phẩm'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

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

                <View style={styles.modalContent}>
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
                                setSelectedServerImages(prev => 
                                  prev.filter(url => url !== image.asset_src)
                                );
                                setSelectedServerImagesId(prev => 
                                  prev.filter(id => id !== image.asset_id)
                                );
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
                  <LinearGradient
                    colors={['#06b6d4', '#0891b2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.confirmButtonGradient}
                  >
                    <Text style={styles.confirmButtonText}>Xác nhận</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Modal>
          </View>

          {/* Product Details Form */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên sản phẩm</Text>
              <TextInput
                style={styles.input}
                value={productName}
                onChangeText={setProductName}
                placeholder="Nhập tên sản phẩm"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Giá nhập</Text>
              <TextInput
                style={styles.input}
                value={displayPrice}
                onChangeText={(text) => {
                  const unformatted = unformatPrice(text);
                  setPrice(unformatted);
                  setDisplayPrice(formatPrice(unformatted));
                }}
                keyboardType="numeric"
                placeholder="Nhập giá gốc"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Giá bán</Text>
              <TextInput
                style={styles.input}
                value={displayPriceCurrent}
                onChangeText={(text) => {
                  const unformatted = unformatPrice(text);
                  setPriceCurrent(unformatted);
                  setDisplayPriceCurrent(formatPrice(unformatted));
                }}
                keyboardType="numeric"
                placeholder="Nhập giá hiện tại"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Giá khuyến mãi</Text>
              <TextInput
                style={styles.input}
                value={displayPriceSale}
                onChangeText={(text) => {
                  const unformatted = unformatPrice(text);
                  setPriceSale(unformatted);
                  setDisplayPriceSale(formatPrice(unformatted));
                }}
                keyboardType="numeric"
                placeholder="Nhập giá khuyến mãi"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mã code</Text>
              <TextInput
                style={styles.input}
                value={productCode}
                onChangeText={(text) => {
                  setProductCode(text);
                }}
                placeholder="Nhập code của sản phẩm"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số lượng</Text>
              <TextInput
                style={styles.input}
                value={productQuantity}
                onChangeText={(text) => {
                  setProductQuantity(text);
                }}
                placeholder="Nhập số lượng của sản phẩm"
                keyboardType="numeric"
              />
            </View>    
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kho hàng</Text>
              <DropDownPicker
                searchable={true}
                searchPlaceholder="Tìm kiếm kho hàng..."
                open={openInventory}
                setOpen={setOpenInventory}
                value={inventory}
                setValue={(callback) => {
                  setInventory(callback(''));
                  setPage(1);
                }}
                items={[
                  { label: 'Hà Nội', value: '0' },
                  { label: 'Hồ Chí Minh', value: '1' },
                ]}
                placeholder="Chọn kho hàng"
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
              <Text style={styles.label}>Trạng thái kho</Text>
              <DropDownPicker
                searchable={true}
                searchPlaceholder="Tìm kiếm trạng thái..."
                open={openInventoryStatus}
                setOpen={setOpenInventoryStatus}
                value={inventoryStatus}
                setValue={(callback) => setInventoryStatus(callback(''))}
                items={[
                  { label: 'Mua lại', value: '1' },
                  { label: 'Kí gửi', value: '2' },
                ]}
                placeholder="Chọn trạng thái"
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
            {productFilter.map((filter) => (
              <View key={filter.category_filter_id} style={styles.inputGroup}>
                <Text style={styles.label}>{filter.filter_name}</Text>
                <DropDownPicker
                  searchable={true}
                  searchPlaceholder="Tìm kiếm..."
                  open={openDropdowns[filter.category_filter_id] || false}
                  setOpen={(value: SetStateValue<boolean>) => setOpenDropdowns(prev => ({
                    ...prev,
                    [filter.category_filter_id]: value as boolean
                  }))}
                  value={filterValues[filter.category_filter_id]?.toString() || ''}
                  setValue={(callback) => {
                    setFilterValues(prev => ({
                      ...prev,
                      [filter.category_filter_id]: callback('')
                    }));
                  }}
                  items={filter.filter_value_array?.map((item) => ({
                    label: item.category_filter_value.trim(),
                    value: item.category_filter_value_id.toString(),
                  })) || []}
                  placeholder="Chọn giá trị"
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
            ))}
          </View>
          
          <View style={styles.submitSection}>
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                (!isFormValid() || isUploading || isCreatingProduct) && styles.submitButtonDisabled
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
                   isCreatingProduct ? 'Đang tạo sản phẩm mới...' : 
                   'Lưu sản phẩm'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

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
  uploadButton: {
    borderRadius: 16,
    marginTop: 10,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadButtonGradient: {
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  searchInput: {
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
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
    borderBottomColor: '#06b6d4',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#06b6d4',
    fontWeight: '500',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 16,
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
    borderColor: '#06b6d4',
  },
  serverImage: {
    width: '100%',
    height: '100%',
  },
  confirmButton: {
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonGradient: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  tickOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(6, 182, 212, 0.9)',
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
  deviceUploadContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  submitSection: {
    position: 'relative',
    marginTop: 20,
  },
  formContainerNoScroll: {
    overflow: 'hidden',
    height: '100%',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: '#374151',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    height: screenHeight,
    paddingTop: 60,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 15,
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
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 228, 0.5)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    padding: 12,
    borderRadius: 12,
    minWidth: 100,
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
  modalButtonCancel: {
    backgroundColor: '#ef4444',
  },
  modalButtonAdd: {
    backgroundColor: '#10b981',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalButtonDisabled: {
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
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
    color: '#10b981',
    fontWeight: '600',
  },
  customerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  customerItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  customerItemInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  customerContact: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  customerNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerNameSelected: {
    color: '#10b981',
  },
  customerType0: {
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  customerType1: {
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  customerType2: {
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },
});
