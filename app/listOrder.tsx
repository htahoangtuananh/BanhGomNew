import HeaderNav from '@/app/components/headerNav';
import { AntDesign } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const screenHeight = Dimensions.get("window").height;
const screenWidth = Dimensions.get("window").width;

interface Category {
    product_category_id: number;
    category_name: string;
}

interface Brand {
    brand_id: number;
    brand_name: string;
}

interface FilterValue {
    category_filter_value_id: number;
    category_filter_value: string;
}

interface Product {
    product_id: number;
    product_name: string;
    product_inventory_status: number;
    brand_name: string;
    price_current: number;
    created_at: string;
    ie_date: string;
    ava: {
        asset_src: string;
    };
    order_id: string;
    status: string;
    customer_name: string;
    phone_number: string;
    note: string;
    total_price: number;
    product_code: string;
    seller: string;
    sellername: string;
    paid_amount: string;
}

interface OrderGroup {
    date: string;
    orders: Product[][];
}

interface OrderStatus {
    id: number;
    label: string;
}

interface Customer {
    customer_id: number;
    customer_name: string;
    phone_number: string;
}

interface Seller {
    user_id: number;
    fullname: string;
    username: string;
}

const formatPrice = (price: string) => {
  if (!price) return '';
  return Number(price).toLocaleString('de-DE');
};

const unformatPrice = (price: string) => {
  if (!price) return '';
  return price.replace(/\./g, '');
};

const productImageSrc = 'https://huelinh.b-cdn.net/api/compress_image/';
const productFullImageSrc = 'https://huelinh.b-cdn.net/assets/img/product_images/';
export default function ListOrderScreen() {

  const [search, setSearch] = useState('');
  const [productList, setProductList] = useState<Product[]>([]);
  const [brandList, setBrandList] = useState<Brand[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [filterColorList, setFilterColorList] = useState<FilterValue[]>([]);
  const [filterConditionList, setFilterConditionList] = useState<FilterValue[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [slideAnim] = useState(new Animated.Value(-20));
  const [openCategory, setOpenCategory] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openCondition, setOpenCondition] = useState(false);
  const [productListByDate, setProductListByDate] = useState<OrderGroup[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [openProductSelect, setOpenProductSelect] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Product | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPaid, setEditPaid] = useState('0');
  const [editDisplayPaid, setEditDisplayPaid] = useState('0');
  const [openStatus, setOpenStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [openCustomer, setOpenCustomer] = useState(false);
  const [store, setStore] = useState('0');
  const [role, setRole] = useState('0');
  const [userId, setUserId] = useState('0');
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeList, setStoreList] = useState([
    { label: 'Hà Nội', value: '1' },
    { label: 'Hồ Chí Minh', value: '2' },
  ]);
  const [message, setMessage] = useState('Đang tải dữ liệu...');
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [openSeller, setOpenSeller] = useState(false);
  const [sellerList, setSellerList] = useState<Seller[]>([]);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('');
  const [openOrderStatus, setOpenOrderStatus] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [openMonth, setOpenMonth] = useState(false);
  const [monthList, setMonthList] = useState([
    { label: 'Tất cả các tháng', value: '-1' },
    { label: 'Tháng 1', value: '1' },
    { label: 'Tháng 2', value: '2' },
    { label: 'Tháng 3', value: '3' },
    { label: 'Tháng 4', value: '4' },
    { label: 'Tháng 5', value: '5' },
    { label: 'Tháng 6', value: '6' },
    { label: 'Tháng 7', value: '7' },
    { label: 'Tháng 8', value: '8' },
    { label: 'Tháng 9', value: '9' },
    { label: 'Tháng 10', value: '10' },
    { label: 'Tháng 11', value: '11' },
    { label: 'Tháng 12', value: '12' },
  ]);
  const [showImage, setShowImage] = useState(false);
  const [imageSource, setImageSource] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const debounceTimer = useRef<number | null>(null);
  const lastCallTime = useRef<number>(0);
  const isFetching = useRef<boolean>(false);

  const orderStatuses: OrderStatus[] = [
    { id: 1, label: 'Mới tạo' },
    { id: 2, label: 'Đã thanh toán' },
    { id: 3, label: 'Đã hủy' },
    { id: 4, label: 'Thanh Toán 1 phần' },
  ];

  const getCustomer = async () => {
    const response = await fetch('https://huelinh.com/api/get_list_customer_api');
    const data = await response.json();
    if (data && Array.isArray(data.customer)) {
      setCustomerList(data.customer);
    } else {
      setCustomerList([]);
    }
  };

  const getProductList = async () => {
    const params = new URLSearchParams({
        ...({ inventory: store }),
    });
    const response = await fetch(`https://huelinh.com/api/get_list_product_api?${params}`);
    const data = await response.json();
    setProductList(data.product);
    setBrandList(data.brand);
    setCategoryList(data.category);
    setFilterColorList(data.filterColor);
    setFilterConditionList(data.filterCondition);
  };

  const getSellers = async () => {
    try {
      const response = await fetch('https://huelinh.com/api/get_list_store_user_api/'+(parseInt(store)-1));
      const data = await response.json();
      setSellerList(data);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const getOrderList = async () => {
    if (isFetching.current) {
      console.log('getOrderList already in progress, skipping');
      return;
    }
    
    setIsLoading(true);
    console.log('getOrderList');
    isFetching.current = true;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const params = new URLSearchParams();
        if (selectedProduct) {
            params.append('product_id', selectedProduct);
        }
        if (selectedCategory) {
            params.append('category_id', selectedCategory);
        }
        if (selectedBrand) {
            params.append('brand_id', selectedBrand);
        }
        if (selectedColor) {
            params.append('color_id', selectedColor);
        }
        if (selectedCustomer) {
            params.append('customer_id', selectedCustomer);
        }
        if (selectedSeller) {
            params.append('sale', selectedSeller);
        }
        if (selectedOrderStatus) {
            params.append('status', selectedOrderStatus);
        }
        if (selectedMonth && selectedMonth !== '-1') {
            params.append('month', selectedMonth);
        }
        if (store) {
            params.append('inventory', store);
        }
        const response = await fetch(
            `https://huelinh.com/api/get_order?${params}`,
            { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Yêu cầu không thành công');
        }
        const data = await response.json();
        setProductListByDate(groupProductsByDate(data));
    } catch (err) {
        console.log(err);
    } finally {
        setIsLoading(false);
        isFetching.current = false;
        lastCallTime.current = Date.now();
    }
  };
  
  // Debounced version of getOrderList
  const debouncedGetOrderList = useCallback(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime.current;
    
    // If we've called getOrderList in the last 2 seconds, don't call it again
    if (timeSinceLastCall < 2000) {
      console.log('Skipping getOrderList call - too soon after last call');
      return;
    }
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      getOrderList();
    }, 500); // 500ms debounce time
  }, [
    selectedProduct,
    selectedCategory,
    selectedBrand, 
    selectedColor,
    selectedCustomer,
    selectedSeller,
    selectedOrderStatus,
    selectedMonth,
    store
  ]);
  
  useEffect(() => {
    const loadAuth = async () => {
      const storeId = await SecureStore.getItemAsync('store');
      const userId = await SecureStore.getItemAsync('userId');
      const role = await SecureStore.getItemAsync('role');
      const currentMonth = new Date().getMonth() + 1;
      if (storeId) {
        setStore((parseInt(storeId)+1).toString());
      }
      setRole(role || '0');
      setUserId(userId || '0');
      setStoreLoaded(true);
      setSelectedMonth(currentMonth.toString());
    };
    loadAuth();
  }, []);

  // Initial load and when store changes
  useEffect(() => {
    if (storeLoaded) {
      if (isInitialLoad) {
        getOrderList();
        setIsInitialLoad(false);
      } else {
        debouncedGetOrderList();
      }
    }
  }, [
    selectedProduct,
    selectedCategory,
    selectedBrand, 
    selectedColor,
    selectedCustomer,
    selectedSeller,
    selectedOrderStatus,
    selectedMonth,
    store,
    storeLoaded,
    isInitialLoad,
    debouncedGetOrderList
  ]);

  useEffect(() => {
    if (storeLoaded) {
      getProductList();
      getCustomer();
      getSellers();
    }
  }, [store, storeLoaded]);

  const groupProductsByDate = (products: Product[]) => {
    // First group by order_id
    const orderGroups = products.reduce((acc: { [key: string]: Product[] }, product) => {
        const orderId = product.order_id;
        if (!acc[orderId]) {
            acc[orderId] = [];
        }
        acc[orderId].push(product);
        return acc;
    }, {});

    // Then group orders by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateGroups = Object.values(orderGroups).reduce((acc: { [key: string]: Product[][] }, orderGroup) => {
        const firstProduct = orderGroup[0];
        const productDate = new Date(firstProduct.ie_date);
        productDate.setHours(0, 0, 0, 0);
        
        let dateKey: string;
        if (productDate.getTime() === today.getTime()) {
            dateKey = 'Hôm nay';
        } else if (productDate.getTime() === yesterday.getTime()) {
            dateKey = 'Hôm qua';
        } else {
            dateKey = new Date(firstProduct.ie_date).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }
        
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(orderGroup);
        return acc;
    }, {});

    // Convert to array and sort dates in descending order
    return Object.entries(dateGroups)
        .map(([date, orders]) => ({
            date,
            // Sort orders within each date by order_id in descending order
            orders: orders.sort((a, b) => {
                const orderIdA = parseInt(a[0].order_id);
                const orderIdB = parseInt(b[0].order_id);
                return orderIdB - orderIdA;
            })
        }))
        .sort((a, b) => {
            // Always keep "Hôm nay" at the top
            if (a.date === 'Hôm nay') return -1;
            if (b.date === 'Hôm nay') return 1;
            // Keep "Hôm qua" second
            if (a.date === 'Hôm qua') return -1;
            if (b.date === 'Hôm qua') return 1;
            // For other dates, parse and compare in descending order
            const dateA = a.date.split('/').reverse().join('-');
            const dateB = b.date.split('/').reverse().join('-');
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
  };
  const handleSearch = async () => {
    try {
        const params = new URLSearchParams({
            ...(selectedCategory && { category_id: selectedCategory }),
            ...(selectedBrand && { brand_id: selectedBrand }),
            ...(selectedColor && { color_id: selectedColor }),
            ...(search && { search: search })
        });

        const response = await fetch(`https://huelinh.com/api/get_list_product_api?${params}`);
        const data = await response.json();
        if (data.product && Array.isArray(data.product)) {
            setProductList(data.product);
            
        } else {
            setProductList([]);
            
        }
    } catch (error) {
        setProductList([]);
        setProductListByDate([]);
    }
  };
  const toggleFilter = () => {
    if (showFilter) {
        // Slide up animation
        Animated.sequence([
            Animated.timing(slideAnim, {
                toValue: -20,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            setShowFilter(false);
        });
    } else {
        // Slide down animation
        setShowFilter(true);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }
  };
  const handleOrderStatus = (order_status: number) => {
    switch(order_status){
        case 0:
            return <Text style={[styles.orderStatusText, {color: '#007AFF', fontWeight: 'bold'}]}>Mới tạo</Text>
        case 1:
            return <Text style={[styles.orderStatusText, {color: '#28A745', fontWeight: 'bold'}]}>Đã thanh toán</Text>
        case 2:
            return <Text style={[styles.orderStatusText, {color: '#FF0000', fontWeight: 'bold'}]}>Đã hủy</Text>
        case 3:
            return <Text style={[styles.orderStatusText, {color: '#007AFF', fontWeight: 'bold'}]}>Thanh toán 1 phần</Text>
    }
  }
  useEffect(() => {
    Animated.timing(slideAnim, {
        toValue: showFilter ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
    }).start();
  }, [showFilter]);
  useEffect(() => {
    handleSearch();
  }, [selectedCategory, selectedBrand, selectedColor, search]);

  const handleUpdateOrder = async () => {
    try {
        setIsModalVisible(false);
        setIsLoading(true);
        const formData = new FormData();
        formData.append('status', editStatus);
        formData.append('note', editNote);
        formData.append('user_id', userId);
        formData.append('paid_amount', editPaid);
        const response = await fetch('https://huelinh.com/api/update_order/'+selectedOrder?.order_id, {
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            body: formData,
        });
        
        if (response.ok) {
            debouncedGetOrderList();
            setIsLoading(false);
            
            Alert.alert(
                'Thành công',
                'Cập nhật đơn hàng thành công',
                [{ text: 'OK', onPress: () => setIsModalVisible(false) }]
            );
        } else {
            Alert.alert(
                'Lỗi',
                'Cập nhật đơn hàng thất bại',
                [{ text: 'OK', onPress: () => setIsModalVisible(false) }]
            );
            setIsLoading(false);
        }
    } catch (error) {

        setIsLoading(false);
    }
  };
  
  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
  
  // Add refresh functionality
  const onRefresh = () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime.current;
    
    // If we've called getOrderList in the last 2 seconds, don't call it again
    if (timeSinceLastCall < 2000) {
      console.log('Skipping refresh - too soon after last call');
      return;
    }
    
    getOrderList();
  };

  const handleStoreChange = (value: string) => {
    setStore(value);
  };

  const openImage = (imageSource: string) => {
    setShowImage(true);
    setImageSource(imageSource);
  };

  const ImageViewer = () => (
    <TouchableOpacity 
      style={styles.imageViewerOverlay} 
      activeOpacity={1}
      onPress={() => setShowImage(false)}
    >
      <View style={styles.imageViewer}>
        <TouchableOpacity 
          style={styles.closeButton}
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
    <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
    >
        {isLoading && <LoadingOverlay />}
        {showImage && <ImageViewer/>}
        <View style={styles.container}>
          <HeaderNav currentScreen="Quản lý đơn hàng"/>
          {role == 'admin' && (
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
                      dropDownContainerStyle={styles.storeDropdownContainer}
                      listMode="SCROLLVIEW"
                      scrollViewProps={{
                          nestedScrollEnabled: true,
                      }}
                      zIndex={4000}
                      zIndexInverse={4000}
                  />
              </View>
          )}
          
          <View style={styles.mainContent}>
              <View style={styles.filterSection}>
                  <View style={styles.productPickerContainer}>
                      <DropDownPicker
                          searchable={true}
                          searchPlaceholder="Tìm kiếm sản phẩm..."
                          open={openProductSelect}
                          setOpen={setOpenProductSelect}
                          value={selectedProduct}
                          setValue={(callback) => {
                              const newValue = callback('');
                              setSelectedProduct(newValue);
                              if (newValue && newValue !== "-1") {
                                  setSelectedCategory("-1");
                                  setSelectedBrand("-1");
                                  setSelectedColor("-1");
                                  setSelectedCondition("-1");
                              }
                          }}
                          items={[
                              { 
                                  label: "Tất cả sản phẩm", 
                                  value: "-1",
                                  icon: () => <View></View>
                              },
                              ...productList.map((product) => ({
                                  label: product.product_code + " | " + product.product_name,
                                  value: product.product_id.toString(),
                                  icon: () => (
                                      <Image 
                                          source={{ uri: productImageSrc + product.ava.asset_src }} 
                                          style={styles.dropdownItemImage}
                                          contentFit="contain"
                                          cachePolicy="disk"
                                      />
                                  )
                              }))
                          ]}
                          placeholder="Chọn sản phẩm"
                          style={[styles.dropdownStyle, styles.productDropdownStyle]}
                          dropDownContainerStyle={styles.dropdownContainer}
                          searchContainerStyle={styles.searchContainer}
                          searchTextInputStyle={styles.searchInput}
                          listMode="MODAL"
                          modalProps={{
                              animationType: "fade"
                          }}
                          modalContentContainerStyle={styles.modalContentContainer}
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
                              height: 80
                          }}
                          zIndex={3000}
                          zIndexInverse={3000}
                      />
                  </View>
                  <TouchableOpacity 
                      style={styles.filterButton}
                      onPress={toggleFilter}
                      activeOpacity={0.6}
                  >
                      <LinearGradient
                          colors={showFilter ? ['#667eea', '#764ba2'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.filterButtonGradient}
                      >
                          <AntDesign 
                              name="filter" 
                              size={24} 
                              color={showFilter ? "white" : "#667eea"} 
                          />
                      </LinearGradient>
                  </TouchableOpacity>
              </View>

              {showFilter && (
                  <Animated.View style={[
                      styles.filterHolder,
                      {
                          opacity: slideAnim.interpolate({
                              inputRange: [-20, 0],
                              outputRange: [0, 1]
                          }),
                          transform: [{
                              translateY: slideAnim
                          }]
                      }
                  ]}>
                      <LinearGradient
                          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.filterHolderGradient}
                      >
                      <View style={styles.pickerRow}>
                          {(!selectedProduct || selectedProduct === "-1") && (
                              <View style={styles.otherPickersRow}>
                                  <View style={styles.pickerWrapper}>
                                      <DropDownPicker
                                          searchable={true}
                                          searchPlaceholder="Tìm kiếm danh mục..."
                                          open={openCategory}
                                          setOpen={setOpenCategory}
                                          value={selectedCategory}
                                          setValue={(callback) => setSelectedCategory(callback(''))}
                                          items={[
                                              {label: "Tất cả danh mục", value: "-1"},
                                              ...(categoryList || []).map((category) => ({
                                                  label: category.category_name,
                                                  value: category.product_category_id.toString()
                                              }))
                                          ]}
                                          placeholder="Tất cả danh mục"
                                          style={styles.dropdownStyle}
                                          dropDownContainerStyle={styles.dropdownContainer}
                                          searchContainerStyle={styles.searchContainer}
                                          searchTextInputStyle={styles.searchInput}
                                          listMode="MODAL"
                                          modalProps={{
                                              animationType: "fade"
                                          }}
                                          modalContentContainerStyle={styles.modalContentContainer}
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
                                  <View style={styles.pickerWrapper}>
                                      <DropDownPicker
                                          searchable={true}
                                          searchPlaceholder="Tìm kiếm thương hiệu..."
                                          open={openBrand}
                                          setOpen={setOpenBrand}
                                          value={selectedBrand}
                                          setValue={(callback) => setSelectedBrand(callback(''))}
                                          items={[
                                              { label: "Tất cả thương hiệu", value: "-1" },
                                              ...(brandList || []).map((brand) => ({
                                                  label: brand.brand_name,
                                                  value: brand.brand_id.toString()
                                              }))
                                          ]}
                                          placeholder="Tất cả thương hiệu"
                                          style={styles.dropdownStyle}
                                          dropDownContainerStyle={styles.dropdownContainer}
                                          searchContainerStyle={styles.searchContainer}
                                          searchTextInputStyle={styles.searchInput}
                                          listMode="MODAL"
                                          modalProps={{
                                              animationType: "fade"
                                          }}
                                          modalContentContainerStyle={styles.modalContentContainer}
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
                                  
                                  <View style={styles.pickerWrapper}>
                                      <DropDownPicker
                                          searchable={true}
                                          searchPlaceholder="Tìm kiếm khách hàng..."
                                          open={openCustomer}
                                          setOpen={setOpenCustomer}
                                          value={selectedCustomer}
                                          setValue={(callback) => setSelectedCustomer(callback(''))}
                                          items={[
                                              { label: "Tất cả khách hàng", value: "-1" },
                                              ...(customerList || []).map((customer) => ({
                                                  label: `${customer.customer_name} - ${customer.phone_number}`,
                                                  value: customer.customer_id.toString()
                                              }))
                                          ]}
                                          placeholder="Tất cả khách hàng"
                                          style={styles.dropdownStyle}
                                          dropDownContainerStyle={styles.dropdownContainer}
                                          searchContainerStyle={styles.searchContainer}
                                          searchTextInputStyle={styles.searchInput}
                                          listMode="MODAL"
                                          modalProps={{
                                              animationType: "fade"
                                          }}
                                          modalContentContainerStyle={styles.modalContentContainer}
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
                                  <View style={styles.pickerWrapper}>
                                      <DropDownPicker
                                          searchable={true}
                                          searchPlaceholder="Tìm kiếm người bán..."
                                          open={openSeller}
                                          setOpen={setOpenSeller}
                                          value={selectedSeller}
                                          setValue={(callback) => setSelectedSeller(callback(''))}
                                          items={[
                                              { label: "Tất cả người bán", value: "-1" },
                                              ...(sellerList || []).map((seller) => ({
                                                  label: seller.fullname,
                                                  value: seller.user_id.toString()
                                              }))
                                          ]}
                                          placeholder="Tất cả người bán"
                                          style={styles.dropdownStyle}
                                          dropDownContainerStyle={styles.dropdownContainer}
                                          searchContainerStyle={styles.searchContainer}
                                          searchTextInputStyle={styles.searchInput}
                                          listMode="MODAL"
                                          modalProps={{
                                              animationType: "fade"
                                          }}
                                          modalContentContainerStyle={styles.modalContentContainer}
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
                                  <View style={styles.pickerWrapper}>
                                      <DropDownPicker
                                          open={openOrderStatus}
                                          setOpen={setOpenOrderStatus}
                                          value={selectedOrderStatus}
                                          setValue={(callback) => setSelectedOrderStatus(callback(''))}
                                          items={[
                                              { label: "Tất cả trạng thái", value: "-1" },
                                              ...orderStatuses.map(status => ({
                                                  label: status.label,
                                                  value: status.id.toString()
                                              }))
                                          ]}
                                          placeholder="Trạng thái đơn hàng"
                                          style={styles.dropdownStyle}
                                          dropDownContainerStyle={styles.dropdownContainer}
                                          listMode="MODAL"
                                          modalProps={{
                                              animationType: "fade"
                                          }}
                                          modalContentContainerStyle={styles.modalContentContainer}
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
                                  <View style={styles.pickerWrapper}>
                                      <DropDownPicker
                                          open={openMonth}
                                          setOpen={setOpenMonth}
                                          value={selectedMonth}
                                          setValue={(callback) => setSelectedMonth(callback(''))}
                                          items={monthList}
                                          placeholder="Tháng"
                                          style={styles.dropdownStyle}
                                          dropDownContainerStyle={styles.dropdownContainer}
                                          listMode="MODAL"
                                          modalProps={{
                                              animationType: "fade"
                                          }}
                                          modalContentContainerStyle={styles.modalContentContainer}
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
                                  
                              </View>
                          )}
                      </View>
                      </LinearGradient>
                  </Animated.View>
              )}

              <ScrollView 
                  style={styles.orderList}
                  contentContainerStyle={styles.orderListContent}
                  nestedScrollEnabled={true}
              >
                  <View style={styles.listContent}>
                      <View style={styles.listContentHeader}>
                          <Text style={styles.listContentTitle}>Danh sách đơn hàng</Text>
                          <View style={styles.headerActions}>
                              <TouchableOpacity 
                                  onPress={onRefresh}
                                  style={styles.refreshButton}
                                  disabled={isLoading}
                              >
                                  <LinearGradient
                                      colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 1 }}
                                      style={styles.refreshButtonGradient}
                                  >
                                      <AntDesign name="reload1" size={20} color="#667eea" />
                                  </LinearGradient>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                  style={styles.listContentButton} 
                                  onPress={() => router.push(`/addInventoryExport`)} 
                              >
                                  <LinearGradient
                                      colors={['#06b6d4', '#0891b2']}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 1 }}
                                      style={styles.addButtonGradient}
                                  >
                                      <AntDesign name="plus" size={20} color="white" />
                                  </LinearGradient>
                              </TouchableOpacity>
                          </View>
                      </View>
                      {error ? (
                          <View style={styles.errorContainer}>
                              <Text style={styles.errorText}>{error}</Text>
                              <TouchableOpacity 
                                  onPress={onRefresh}
                                  style={styles.retryButton}
                              >
                                  <Text style={styles.retryButtonText}>Thử lại</Text>
                              </TouchableOpacity>
                          </View>
                      ) : productListByDate.length > 0 ? (
                          <ScrollView>
                              {productListByDate.map((group, index) => (
                                  <View key={index} style={styles.dateGroup}>
                                      <Text style={styles.dateHeader}>{group.date}</Text>
                                      {group.orders.map((orderGroup, orderIndex) => (
                                          <View key={orderIndex} style={[styles.orderGroup, {opacity: orderGroup[0].status === '2' ? 0.5 : 1}]}>
                                              <Text style={styles.orderHeader}>
                                                  Đơn hàng: #{orderGroup[0].order_id}
                                              </Text>
                                              <TouchableOpacity 
                                                  style={[styles.listContentItem, {opacity: orderGroup[0].status === '2' ? 0.5 : 1}]}
                                                  onPress={() => {
                                                      if(orderGroup[0].status !== '2'){
                                                        if(orderGroup[0].seller == userId){
                                                          setSelectedOrder(orderGroup[0]);
                                                          setEditNote(orderGroup[0].note || '');
                                                          setEditStatus(orderGroup[0].status);
                                                          setIsModalVisible(true);
                                                        }else{
                                                          router.push({
                                                            pathname: "/detailOrder/[id]",
                                                            params: { id: orderGroup[0].order_id }
                                                          });
                                                        }
                                                      }else{
                                                        router.push({
                                                          pathname: "/detailOrder/[id]",
                                                          params: { id: orderGroup[0].order_id }
                                                        });
                                                      }
                                                  }}
                                                  onLongPress={() => {
                                                    if(orderGroup.length == 1){
                                                      openImage(orderGroup[0].ava.asset_src)
                                                    }
                                                  }}
                                              >
                                                  <LinearGradient
                                                      colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                                      start={{ x: 0, y: 0 }}
                                                      end={{ x: 1, y: 1 }}
                                                      style={styles.orderItemGradient}
                                                  >
                                                      {orderGroup.length > 1 ? (
                                                          <View style={styles.itemCount}>
                                                              <Text style={[styles.itemCountText, {fontSize: 30}]}>{orderGroup.length}</Text>
                                                              <Text style={styles.itemCountText}>Sản phẩm</Text>
                                                          </View>
                                                      ) : (
                                                          <Image 
                                                              source={{ uri: productImageSrc + orderGroup[0].ava.asset_src }} 
                                                              style={styles.listContentItemImage} 
                                                              contentFit="contain"
                                                              cachePolicy="disk"
                                                          />
                                                      )}
                                                      <View style={styles.listContentItemInfo}>
                                                      <Text style={styles.orderHeader}>
                                                          {orderGroup[0].customer_name} - {orderGroup[0].phone_number}
                                                      </Text>
                                                      <View style={styles.orderStatus}>
                                                          <Text style={styles.orderStatusText}>Người bán: {orderGroup[0].sellername}
                                                          </Text>
                                                      </View>
                                                      <View style={styles.orderStatus}>

                                                          <Text style={styles.orderStatusText}>Trạng thái: </Text>
                                                          {handleOrderStatus(parseInt(orderGroup[0].status))}
                                                      </View>
                                                      <Text style={styles.productName}>
                                                          Sản phẩm:
                                                      </Text>
                                                      <View style={styles.productList}>
                                                          {orderGroup.map((product, idx) => (
                                                              <View key={idx} style={styles.productItem}>   
                                                                  {orderGroup.length > 1 ? (
                                                                      <Image 
                                                                          source={{ uri: productImageSrc + product.ava.asset_src }} 
                                                                          style={styles.miniListItemImage} 
                                                                          contentFit="contain"
                                                                          cachePolicy="disk"
                                                                      />
                                                                  ) : null}
                                                                  <Text style={styles.productItemText}>{product.product_name}</Text>
                                                              </View>
                                                          ))}
                                                      </View>
                                                      {orderGroup[0].note && (
                                                          <Text style={styles.orderNoteText}>
                                                              Ghi chú: {orderGroup[0].note}
                                                          </Text>
                                                      )}
                                                      <Text style={styles.productPrice}>
                                                          Tổng: {Number(orderGroup[0].total_price).toLocaleString()}đ
                                                      </Text>
                                                  </View>
                                                  </LinearGradient>
                                              </TouchableOpacity>
                                          </View>
                                      ))}
                                  </View>
                              ))}
                          </ScrollView>
                      ) : (
                          <View style={styles.emptyState}>
                              <LinearGradient
                                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.emptyStateGradient}
                              >
                                  <Text style={styles.emptyStateText}>Không tìm thấy đơn hàng nào</Text>
                              </LinearGradient>
                          </View>
                      )}
                  </View>
              </ScrollView>
          </View>
          
          <Modal
              visible={isModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setIsModalVisible(false)}
          >
              <LinearGradient
                  colors={['rgba(102, 126, 234, 0.9)', 'rgba(118, 75, 162, 0.9)', 'rgba(240, 147, 251, 0.9)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalBackground}
              >
                  <KeyboardAvoidingView 
                      behavior={Platform.OS === "ios" ? "padding" : "height"}
                      style={styles.modalOverlay}
                  >
                      <TouchableOpacity 
                          style={styles.modalOverlay} 
                          activeOpacity={1} 
                          onPress={() => setIsModalVisible(false)}
                      >
                          <TouchableOpacity 
                              activeOpacity={1} 
                              onPress={e => e.stopPropagation()}
                          >
                              <LinearGradient
                                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.modalContent}
                              >
                                  <View style={styles.modalHeader}>
                                      <Text style={styles.modalTitle}>Cập nhật đơn hàng #{selectedOrder?.order_id}</Text>
                                      <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                          <AntDesign name="close" size={24} color="black" />
                                      </TouchableOpacity>
                                  </View>
                                  
                                  <ScrollView style={styles.modalBody}>
                                      <View style={styles.modalSection}>
                                          <Text style={styles.inputLabel}>Trạng thái:</Text>
                                          <DropDownPicker
                                              open={openStatus}
                                              setOpen={setOpenStatus}
                                              value={editStatus}
                                              setValue={(callback) => {
                                                  setEditStatus(callback(''));
                                                  if(callback('') == '3'){
                                                      setEditDisplayPaid(formatPrice('0'));
                                                      setEditPaid('0');
                                                  }else if(callback('') == '1'){
                                                      setEditDisplayPaid(formatPrice(selectedOrder?.total_price.toString() || '0'));
                                                      setEditPaid(selectedOrder?.total_price.toString() || '0');
                                                  }
                                              }}
                                              items={orderStatuses.map(status => ({
                                                  label: status.label,
                                                  value: status.id.toString()
                                              }))}
                                              style={styles.dropdownStyle}
                                              dropDownContainerStyle={[
                                                  styles.dropdownContainer,
                                                  { maxHeight: 200 }
                                              ]}
                                              placeholder="Chọn trạng thái"
                                              listMode="SCROLLVIEW"
                                              scrollViewProps={{
                                                  nestedScrollEnabled: true,
                                              }}
                                              maxHeight={200}
                                          />
                                      </View>

                                      {editStatus == '3' && (
                                          <View style={styles.modalSection}>
                                              <Text style={styles.inputLabel}>Đã thanh toán:</Text>
                                              <View style={styles.inputGroup}>
                                                  <TextInput
                                                      style={styles.partialInput}
                                                      value={editDisplayPaid}
                                                      onChangeText={(text) => {
                                                          const unformatted = unformatPrice(text);
                                                          setEditPaid(unformatted);
                                                          setEditDisplayPaid(formatPrice(unformatted));
                                                          if(Number(unformatted) == Number(selectedOrder?.total_price)){
                                                              setEditStatus('1');
                                                          }
                                                      }}
                                                      keyboardType="numeric"
                                                      placeholder="Nhập số tiền đã thanh toán"
                                                  />
                                                  <View style={styles.totalPriceContainer}>
                                                      <Text style={styles.totalPrice}>
                                                          Tổng: {Number(selectedOrder?.total_price).toLocaleString()}đ
                                                      </Text>
                                                      <Text style={styles.totalPrice}>
                                                          Đã trả: {Number(selectedOrder?.paid_amount).toLocaleString()}đ
                                                      </Text>
                                                  </View>
                                              </View>
                                          </View>
                                      )}

                                      <View style={styles.modalSection}>
                                          <Text style={styles.inputLabel}>Ghi chú:</Text>
                                          <TextInput
                                              style={styles.noteInput}
                                              value={editNote}
                                              onChangeText={setEditNote}
                                              multiline
                                              numberOfLines={4}
                                              placeholder="Nhập ghi chú"
                                          />
                                      </View>
                                      
                                      <View style={styles.modalActions}>
                                          <TouchableOpacity 
                                              style={[styles.modalButton, styles.viewDetailButton]}
                                              onPress={() => {
                                                  setIsModalVisible(false);
                                                  router.push({
                                                      pathname: "/detailOrder/[id]",
                                                      params: { id: selectedOrder?.order_id || '0' }
                                                  });
                                              }}
                                          >
                                              <LinearGradient
                                                  colors={['#667eea', '#764ba2']}
                                                  start={{ x: 0, y: 0 }}
                                                  end={{ x: 1, y: 1 }}
                                                  style={styles.modalButtonGradient}
                                              >
                                                  <Text style={[styles.buttonText, styles.viewDetailButtonText]}>
                                                      Xem chi tiết
                                                  </Text>
                                              </LinearGradient>
                                          </TouchableOpacity>
                                          
                                          <TouchableOpacity 
                                              style={[styles.modalButton, styles.saveButton]}
                                              onPress={handleUpdateOrder}
                                          >
                                              <LinearGradient
                                                  colors={['#10b981', '#059669']}
                                                  start={{ x: 0, y: 0 }}
                                                  end={{ x: 1, y: 1 }}
                                                  style={styles.modalButtonGradient}
                                              >
                                                  <Text style={[styles.buttonText, styles.saveButtonText]}>
                                                      Lưu
                                                  </Text>
                                              </LinearGradient>
                                          </TouchableOpacity>
                                      </View>
                                  </ScrollView>
                              </LinearGradient>
                          </TouchableOpacity>
                      </TouchableOpacity>
                  </KeyboardAvoidingView>
              </LinearGradient>
          </Modal>
        </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(222, 224, 228)',
  },
  icon: {
    width: 24,
    height: 24,
  },
  listHeaderSearch: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 228, 0.5)',
    backgroundColor: 'white',
    padding: 15,
  },
  listHeaderHolder: {
    padding: 16,
    paddingBottom: 0,
    zIndex: 999,
  },
  listHeaderButtonHolder: {
    flexDirection: 'row',
    gap: 5,
  },
  listHeaderButtonSelect: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minWidth: 100,
    alignItems: 'center',
    marginRight: 15,
  },
  listHeaderButton: {
    padding: 10,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  selectedButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  listHeaderButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    fontFamily: 'Roboto_400Regular',
  },
  selectedButtonText: {
    color: 'white',
  },
  listContent: {
    flex: 1,
    flexDirection: 'column',
    gap: 15,
    paddingTop: 0,
    padding: 15,
    marginTop: 0,
    marginBottom: 0,
  },
  listContentHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    gap: 10,
  },
  listContentTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  listContentButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  listContentItem: {
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listContentItemImage: {
    width: 80,
    height: 80,
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
  listContentItemInfo: {
    marginLeft: 15,
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  productBrand: {
    fontSize: 15,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: 'Roboto_400Regular',
  },
  productPrice: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 8,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 25,
    paddingTop: 0,
    paddingBottom: 10,
    gap: 12,
    zIndex: 3000,
  },
  productPickerContainer: {
    flex: 1,
    zIndex: 3000,
  },
  filterButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  filterHolder: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 2000,
  },
  pickerRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 10,
    zIndex: 2000,
  },
  otherPickersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 2000,
  },
  pickerWrapper: {
    flex: 1,
    minWidth: '48%',
    marginBottom: 8,
    zIndex: 2000,
  },
  dropdownStyle: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
  modalContentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  dateGroup: {
    marginBottom: 10,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '700',
    padding: 15,
    paddingBottom: 0,
    borderRadius: 12,
    marginBottom: 10,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dropdownItemImage: {
    width: 60,
    height: 60,
    marginRight: 10,
    borderRadius: 4,
  },
  productDropdownStyle: {
    minHeight: 60,
  },
  orderGroup: {
    marginBottom: 0,
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#374151',
  },
  itemCount: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  itemCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  productItemText: {
    fontSize: 12,
    flexWrap: 'wrap',
    maxWidth: screenWidth*0.4,
    color: '#6b7280',
    fontWeight: '500',
  },
  productList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  miniListItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  orderStatusText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#6b7280',
    fontWeight: '500',
  },
  orderNoteText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    flexWrap: 'wrap',
    maxWidth: screenWidth*0.5,
    fontWeight: '500',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  modalContent: {
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalBody: {
    maxHeight: screenHeight * 0.6,
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
  modalSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  inputGroup: {
    gap: 8,
  },
  partialInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 15,
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
  totalPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  noteInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#374151',
    minHeight: 100,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    paddingBottom: 20,
  },
  modalButton: {
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
  viewDetailButton: {
    // Gradient handled by LinearGradient
  },
  saveButton: {
    // Gradient handled by LinearGradient
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  viewDetailButtonText: {
    color: 'white',
  },
  saveButtonText: {
    fontWeight: 'bold',
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
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storePickerContainer: {
    padding: 25,
    paddingBottom: 15,
    zIndex: 4000,
  },
  storeDropdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
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
  orderList: {
    flex: 1,
    zIndex: 1,
  },
  orderListContent: {
    padding: 0,
  },
  totalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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
  productPickerGradient: {
    borderRadius: 16,
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
  filterButtonGradient: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  filterHolderGradient: {
    borderRadius: 20,
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
  refreshButtonGradient: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 50,
  },
  addButtonGradient: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 50,
  },
  orderItemGradient: {
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyStateGradient: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    width: '100%',
  },
  modalButtonGradient: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
  },
});
