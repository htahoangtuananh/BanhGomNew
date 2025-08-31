import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Modal, ActivityIndicator, Alert, KeyboardAvoidingView } from 'react-native';
import HeaderNav from '@/app/components/headerNav';
import { useState, useEffect, useRef } from 'react';
import { SetStateAction as SetStateValue } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import { Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { AntDesign, Entypo, EvilIcons } from '@expo/vector-icons';
import React from 'react';
import * as SecureStore from 'expo-secure-store';

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

interface DropdownState {
  [key: number]: boolean;
}

interface Product {
    product_id: number;
    product_name: string;
    product_inventory_status: number;
    brand_name: string;
    price_current: number;
    quantity: number;
    ava: {
        asset_src: string;
    };
    inventory: number;
    product_code: string;
}

interface Customer {
    customer_id: number;
    customer_name: string;
    phone_number: string;
    other_info: string;
}

const productImageSrc = 'https://huelinh.b-cdn.net/api/compress_image/';
const productFullImageSrc = 'https://huelinh.b-cdn.net/assets/img/product_images/';
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

interface ProductSet {
  id: string;
  productId: string;
  amount: string;
  price: string;
  displayPrice: string;
  inventory: string;
  currentPrice: string;
}

interface User {
  user_id: number;
  username: string;
  fullname: string;
}

interface OrderStatus {
  id: string;
  label: string;
}

export default function AddInventoryExportScreen() {
  const [productSets, setProductSets] = useState<ProductSet[]>([
    { id: '1', productId: '', amount: '', price: '', displayPrice: '', inventory: '', currentPrice: '' }
  ]);
  const [search, setSearch] = useState('');
  const [productList, setProductList] = useState<Product[]>([]);
  const [openDropdowns, setOpenDropdowns] = useState<{[key: string]: boolean}>({});
  const [isCreatingInventoryExport, setIsCreatingInventoryExport] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [openCustomerDropdown, setOpenCustomerDropdown] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalPriceDisplay, setTotalPriceDisplay] = useState('0');
  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountDisplay, setDiscountDisplay] = useState('0');
  const [userList, setUserList] = useState<User[]>([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [openSellerDropdown, setOpenSellerDropdown] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('0');
  const [userId, setUserId] = useState('');
  const [store, setStore] = useState('');
  const [storeLoaded, setStoreLoaded] = useState(false);
  const orderStatuses: OrderStatus[] = [
    { id: '0', label: 'Mới tạo' },
    { id: '1', label: 'Đã thanh toán' },
    { id: '2', label: 'Đã hủy' },
    { id: '3', label: 'Đang nợ' },
  ];
  const [showImage, setShowImage] = useState(false);
  const [isDoneChooseProduct, setIsDoneChooseProduct] = useState(false);
  const [imageSource, setImageSource] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    otherInfo: ''
  });

  useEffect(() => {
    const loadAuth = async () => {
      const storeId = await SecureStore.getItemAsync('store');
      const userId = await SecureStore.getItemAsync('userId');
      if (storeId) {
        setStore((parseInt(storeId)+1).toString());
      }
      if (userId) {
        setUserId(userId);
        setSelectedSeller(userId);
      }
      setStoreLoaded(true);
    };
    loadAuth();
  }, []);

  const calculateTotalPrice = (sets: ProductSet[], shouldUpdateDiscount = true) => {
    // Calculate subtotal and total current price
    const subtotal = sets.reduce((total, set) => 
      total + (Number(set.price) * Number(set.amount) || 0), 0
    );
    
    const totalCurrentPrice = sets.reduce((total, set) => 
      total + (Number(unformatPrice(set.currentPrice)) * Number(set.amount) || 0), 0
    );
    // Calculate automatic discount as difference between current total and selling total
    const automaticDiscount = Math.max(0, totalCurrentPrice - subtotal);
    
    // Update discount state if needed
    if (shouldUpdateDiscount) {
      setDiscount(automaticDiscount);
      setDiscountDisplay(formatPrice(automaticDiscount.toString()));
    }
    
    return {
      total: subtotal,
      displayTotal: formatPrice(subtotal.toString()),
      automaticDiscount: automaticDiscount,
      displayDiscount: formatPrice(automaticDiscount.toString())
    };
  };

  const updateProductSet = (index: number, field: keyof ProductSet, value: string) => {
    setProductSets(prevSets => {
      const newSets = prevSets.map((set, i) => {
        if (i === index) {
          const updatedSet = { ...set, [field]: value };
          
          // If updating price, also update displayPrice
          if (field === 'price') {
            updatedSet.displayPrice = formatPrice(value);
          }
          
          return updatedSet;
        }
        return set;
      });

      // Only calculate total price when updating price or amount
      if (field === 'price' || field === 'amount') {
        const { total, displayTotal, automaticDiscount, displayDiscount } = calculateTotalPrice(newSets);
        setTotalPrice(total);
        setTotalPriceDisplay(displayTotal);
        setDiscount(automaticDiscount);
        setDiscountDisplay(displayDiscount);
      }
      
      return newSets;
    });
  };

  const addNewSet = () => {
    // Check if all existing sets are complete
    const allSetsComplete = productSets.every(set => set.productId && set.amount);
    
    if (!allSetsComplete) {
      Alert.alert('Error', 'Please fill in all fields before adding a new set');
      return;
    }

    const newSets = [...productSets, { 
      id: String(productSets.length + 1), 
      productId: '', 
      amount: '1', 
      price: '0', 
      displayPrice: '0', 
      inventory: '0', 
      currentPrice: '0' 
    }];

    setProductSets(newSets);
    setOpenDropdowns({ ...openDropdowns, [productSets.length]: false });
    // Don't calculate total price here as the new set is empty
  };

  const removeSet = (id: string) => {
    if (productSets.length > 1) {
      const newSets = productSets.filter(set => set.id !== id);
      setProductSets(newSets);

      // Calculate new total when removing a set
      const { total, displayTotal } = calculateTotalPrice(newSets);
      setTotalPrice(total);
      setTotalPriceDisplay(displayTotal);
    }
  };

  const getUserList = async () => {
    const response = await fetch('https://huelinh.com/api/get_list_user_api');
    const data = await response.json();
    setUserList(data);
  }

  const handleSearch = async () => {
    try { 
        const response = await fetch(`https://huelinh.com/api/get_list_product_api?inventoryStatus=[1,2]`);
        const data = await response.json();
        // Handle empty or null response
        if (data.product && Array.isArray(data.product)) {
            setProductList(data.product);
        } else {
            setProductList([]); // Set empty array if no results
        }
    } catch (error) {
        Alert.alert('Error', 'Không thể kết nối đến máy chủ!');
        setProductList([]); // Set empty array on error
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

  const scrollViewRef = useRef<ScrollView>(null);

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    // Validate that all sets have both product and amount
    const isValid = productSets.every(set => set.productId && set.amount && set.price);
    
    if (!isValid) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      // Scroll to top first
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      // Small delay to ensure smooth scrolling before showing overlay
      await new Promise(resolve => setTimeout(resolve, 100));

      setIsCreatingInventoryExport(true);
      const formData = new FormData();
      
      formData.append('userId', userId);
      formData.append('productSets', JSON.stringify(productSets));
      formData.append('customerId', selectedCustomer);
      formData.append('note', note);
      formData.append('totalPrice', totalPrice.toString());
      formData.append('discount', discount.toString());
      formData.append('sellerId', selectedSeller);
      formData.append('status', selectedStatus);
      
      const response = await fetchWithTimeout(
        'https://huelinh.com/api/create_inventory_export',
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
      console.log(data);
      Alert.alert(
        'Thành công',
        'Đã tạo đơn hàng mới thành công',
        [
          {
            text: 'OK',
            onPress: () => {
              // Redirect to listProduct screen
              router.push('/listOrder');
            }
          }
        ]
      );
    } catch (error) {
      setIsCreatingInventoryExport(false);
      
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name && !newCustomer.phone) {
        return;
    }
    try {
        setIsCreatingInventoryExport(true);
        const formData = new FormData();
        formData.append('customer_name', newCustomer.name);
        formData.append('customer_phone', newCustomer.phone);
        formData.append('other_info', newCustomer.otherInfo);
        formData.append('user_id', userId);

        const response = await fetch('https://huelinh.com/api/create_customer_api', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            setModalVisible(false);
            setNewCustomer({ name: '', phone: '', otherInfo: '' });
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
        setIsCreatingInventoryExport(false);
    }
  };

  useEffect(() => {
    handleSearch();
    handleCustomerSearch();
  }, [storeLoaded, store]);
  const LoadingOverlay = ({ message }: { message: string }) => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
  // Add this function to check if form is valid
  const isFormValid = () => {
    return productSets.every(set => set.productId && set.amount);
  };

  const isFormCustomerValid = () => {
    return newCustomer.name && newCustomer.phone;
  };

  useEffect(() => {
    getUserList();
  }, []);

  const openImage = (imageSource: string) => {
    setImageSource(imageSource);
    // Check if any dropdown is open
    const isAnyDropdownOpen = Object.values(openDropdowns).some(isOpen => isOpen);
    if (!isAnyDropdownOpen) {
      setShowImage(true);
    }
  };

  const ImageViewer = () => (
    <TouchableOpacity 
      style={styles.imageViewerOverlay} 
      activeOpacity={1}
      onPress={() => setShowImage(false)}
    >
      <View style={styles.imageViewer}>
        <TouchableOpacity 
          style={styles.closeButtonImageViewer}
          onPress={() => setShowImage(false)}
        >
          <AntDesign name="close" size={24} color="white" />
        </TouchableOpacity>
        <Image 
          source={{ uri: productFullImageSrc + imageSource }} 
          style={styles.fullScreenImage}
          contentFit="contain"
          cachePolicy="disk"
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} ref={scrollViewRef}>
      <HeaderNav currentScreen="Tạo đơn hàng"/>
      {isCreatingInventoryExport && (
        <LoadingOverlay message="Đang tạo đơn hàng mới..." />
      )}
      {showImage && <ImageViewer/>}
      {openCustomerDropdown && (
        
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            {modalVisible ? (
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <TouchableOpacity 
                    style={styles.modalContainer} 
                    activeOpacity={1} 
                    onPress={() => setModalVisible(false)}
                >
                    <TouchableOpacity 
                        style={styles.modalContent} 
                        activeOpacity={1} 
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView>
                            <Text style={styles.modalTitle}>Thêm khách hàng mới</Text>
                            
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
                            
                            <TextInput
                                style={[styles.modalInput, styles.modalTextArea]}
                                placeholder="Thông tin khác"
                                value={newCustomer.otherInfo}
                                multiline={true}
                                numberOfLines={4}
                                onChangeText={(text) => setNewCustomer({...newCustomer, otherInfo: text})}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.modalButtonCancel]}
                                    onPress={() => setModalVisible(false)}
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
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </KeyboardAvoidingView>
          ):(
            <>
            <View style={styles.modalHeader}>
                <View style={[styles.searchContainer, {width: '90%'}]}>
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
                    onPress={() => setOpenCustomerDropdown(false)}
                >
                    <AntDesign name="close" size={24} color="black" />
                </TouchableOpacity>
            </View>
            
            <ScrollView nestedScrollEnabled={true}>
                <TouchableOpacity
                    style={styles.addCustomerItem}
                    onPress={() => {
                        setModalVisible(true);
                    }}
                >
                    <View style={styles.addCustomerContent}>
                        <AntDesign name="plus" size={20} color="rgb(40, 167, 69)" />
                        <Text style={styles.addCustomerText}>Thêm khách hàng mới</Text>
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
                                {selectedCustomer === customer.customer_id.toString() && (
                                    <AntDesign name="check" size={20} color="rgb(40, 167, 69)" />
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
      <View style={styles.formContainer}>
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
        {productSets.map((set, index) => (
        <View key={set.id} style={styles.productSetContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.setTitle}>Set {index + 1}</Text>
            {productSets.length > 1 && (
              <TouchableOpacity 
                onPress={() => removeSet(set.id)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sản phẩm</Text>
            <DropDownPicker
                searchable={true}
                searchPlaceholder="Tìm kiếm sản phẩm..."
                open={openDropdowns[set.id] || false}
                setOpen={(value: SetStateValue<boolean>) => {
                    setOpenDropdowns({ ...openDropdowns, [set.id]: value as boolean });
                }}
                value={set.productId}
                setValue={(callback) => {
                    const newValue = callback(set.productId);
                    const selectedProduct = productList.find(product => 
                      product.product_id.toString() === newValue
                    );
                    
                    if (selectedProduct) {
                      setIsDoneChooseProduct(true);
                      updateProductSet(index, 'productId', newValue);
                      updateProductSet(index, 'price', selectedProduct.price_current.toString());
                      updateProductSet(index, 'displayPrice', formatPrice(selectedProduct.price_current.toString()));
                      updateProductSet(index, 'amount', '1');
                      updateProductSet(index, 'currentPrice', formatPrice(selectedProduct.price_current.toString()));
                      updateProductSet(index, 'inventory', selectedProduct.inventory.toString());
                      
                      // Calculate total price after setting all values
                      const updatedSets = productSets.map((s, i) => 
                        i === index ? {
                          ...s,
                          productId: newValue,
                          price: selectedProduct.price_current.toString(),
                          displayPrice: formatPrice(selectedProduct.price_current.toString()),
                          amount: '1',
                          currentPrice: selectedProduct.price_current.toString(),
                          inventory: selectedProduct.inventory.toString()
                        } : s
                      );
                      
                      const { total, displayTotal } = calculateTotalPrice(updatedSets);
                      setTotalPrice(total);
                      setTotalPriceDisplay(displayTotal);
                    }
                }}
                items={productList
                .filter(product => 
                  !productSets.some((set, i) => 
                    i !== index && set.productId === product.product_id.toString()
                  )
                )
                .map(product => ({
                  label: product.product_code + " | " + product.product_name,
                  value: product.product_id.toString(),
                  icon: () => (
                    <TouchableOpacity 
                      onPress={() => openImage(product.ava.asset_src)}
                      style={styles.dropdownItemImageContainer}
                    >
                      <Image 
                        source={{ uri: productImageSrc + product.ava.asset_src }} 
                        style={styles.dropdownItemImage}
                        contentFit="contain"
                        cachePolicy="disk"
                      />
                    </TouchableOpacity>
                  )
                }))}
              placeholder="Chọn sản phẩm"
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
              listItemContainerStyle={{
                borderBottomWidth: 1,
                borderBottomColor: '#ddd',
                flexDirection: 'row',
                alignItems: 'center',
                height: 60
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số lượng</Text>
            <TextInput
              style={styles.input}
              value={set.amount}
              onChangeText={(value) => {
                const productQuantity = productList.find(product => product.product_id.toString() === set.productId)?.quantity;
                if (productQuantity && Number(value) > productQuantity) {
                  Alert.alert('Lỗi', 'Số lượng sản phẩm không được lớn hơn số lượng tồn kho');
                  return;
                }else{
                  updateProductSet(index, 'amount', value)
                }
              }}
              keyboardType="numeric"
              placeholder="Nhập số lượng"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giá hiện tại</Text>
            <TextInput
              style={styles.input}
              value={set.currentPrice}
              editable={false}
              keyboardType="numeric"
              placeholder="Nhập số tiền"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số tiền bán</Text>
            <TextInput
              style={styles.input}
              value={set.displayPrice}
              onChangeText={(text) => {
                const unformatted = unformatPrice(text);
                setProductSets(prevSets => {
                  const newSets = prevSets.map((s, i) => {
                    if (i === index) {
                      return {
                        ...s,
                        price: unformatted,
                        displayPrice: formatPrice(unformatted)
                      };
                    }
                    return s;
                  });
                  
                  // Calculate total with price * amount
                  const newTotal = newSets.reduce((total, set) => 
                  (total + (Number(set.price) * Number(set.amount)) || 0), 0);
                  setTotalPrice(newTotal);
                  setTotalPriceDisplay(formatPrice(newTotal.toString()));
                  calculateTotalPrice(newSets);
                  
                  return newSets;
                });
              }}
              keyboardType="numeric"
              placeholder="Nhập số tiền"
            />
          </View>
        </View>
      ))}
      <TouchableOpacity 
        style={[
          styles.addButton,
          !productSets.every(set => set.productId && set.amount) && styles.addButtonDisabled
        ]}
        disabled={!productSets.every(set => set.productId && set.amount)}
        onPress={addNewSet}
      >
        <Text style={styles.addButtonText}>+ Thêm sản phẩm</Text>
      </TouchableOpacity>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Chiết khấu</Text>
        <View style={styles.discountContainer}>
          <TextInput
            style={[styles.input, {backgroundColor: '#f0f0f0', width: '95%'}]}
            value={discountDisplay}
            editable={false}
            placeholder="Chiết khấu tự động"
          />
          <Text style={styles.discountText}>đ</Text>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ghi chú</Text>
        <TextInput
          style={[styles.input, {height: 120, backgroundColor: 'white'}]}
          value={note}
          onChangeText={setNote}
          placeholder="Nhập ghi chú (nếu có)"
          multiline={true}
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Người bán</Text>
        <DropDownPicker
          searchable={true}
          searchPlaceholder="Tìm kiếm người bán..."
          open={openSellerDropdown}
          setOpen={setOpenSellerDropdown}
          value={selectedSeller}
          setValue={setSelectedSeller}
          items={userList.map(user => ({
            label: `${user.fullname} (${user.username})`,
            value: user.user_id.toString()
          }))}
          placeholder="Chọn người bán"
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
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Trạng thái:</Text>
        <DropDownPicker
            open={openStatus}
            setOpen={setOpenStatus}
            value={selectedStatus}
            setValue={(callback) => setSelectedStatus(callback(0))}
            items={orderStatuses.map(status => ({
                label: status.label,
                value: status.id
            }))}
            listMode="SCROLLVIEW"
            style={styles.dropdownStyle}
            dropDownContainerStyle={styles.dropdownContainer}
            placeholder="Chọn trạng thái"
        />
      </View>
      <View style={styles.totalPriceGroup}>
        <Text style={[styles.label, {fontSize: 16, fontWeight: 'bold'}]}>Tổng tiền</Text>
        <Text style={[styles.totalPriceText, {
          padding: 12,
          fontSize: 16,
          color: '#000',
          fontWeight: 'bold'
        }]}>
          {totalPriceDisplay}
        </Text>
      </View>
      

      <TouchableOpacity 
        style={[
          styles.submitButton,
          !isFormValid() && styles.submitButtonDisabled
        ]}
        disabled={!isFormValid()}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
      </View>
      
    </ScrollView>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(244, 246, 249)',
  },
  formContainer: {
    padding: 16,
  },
  productSetContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  setTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#ff4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  dropdownStyle: {
    backgroundColor: 'white',
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderColor: '#DDD',
    borderWidth: 1,
  },
  searchContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    backgroundColor: 'white',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    maxWidth: 200,
    marginLeft: 'auto',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#28A745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownItemImageContainer: {
    padding: 5,
  },
  dropdownItemImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
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
  addButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  customerDropdown: {
    marginBottom: 20,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 300,
    zIndex: 1000,
    elevation: 5, // for Android
    shadowColor: '#000', // for iOS
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  dropdownArrow: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
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
  modalView: {
    backgroundColor: 'white',
    width: screenWidth,
    height: screenHeight,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalHeader: {
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
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#eee',
  },
  customCloseButtonText: {
    fontSize: 36,
    color: 'black',
  },
  totalPriceGroup:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 16,
  },
  totalPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalContainer: {
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
  modalContent: {
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
  customerInputRow: {
    flexDirection: 'row',
    gap: 10,
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
  imageViewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 99999999,
    height: screenHeight,
  },
  imageViewer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: screenHeight,
  },
  closeButtonImageViewer: {
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